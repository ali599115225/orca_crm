import pg from "pg";

const { Client } = pg;
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");

const first = new Client({ connectionString: url });
const second = new Client({ connectionString: url });
await Promise.all([first.connect(), second.connect()]);

try {
  await first.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
  await second.query("BEGIN ISOLATION LEVEL SERIALIZABLE");

  const one = await first.query(
    'SELECT mode, version FROM exec007_cutover_control WHERE singleton_key=1 FOR UPDATE',
  );
  if (one.rows[0]?.mode !== "LEGACY_ONLY" || Number(one.rows[0]?.version) < 1) {
    throw new Error("T-CUT-03 invalid frozen initial cutover state");
  }

  const blocked = second.query(
    `UPDATE exec007_cutover_control
       SET mode='EXEC007_READY', version=version+1,
           authorized_release_sha=$1
     WHERE singleton_key=1 AND version=$2`,
    ["a".repeat(40), Number(one.rows[0].version)],
  );

  await first.query(
    `UPDATE exec007_cutover_control
       SET mode='EXEC007_READY', version=version+1,
           authorized_release_sha=$1
     WHERE singleton_key=1 AND version=$2`,
    ["b".repeat(40), Number(one.rows[0].version)],
  );
  await first.query("COMMIT");

  let failedClosed = false;
  try {
    const result = await blocked;
    await second.query("COMMIT");
    failedClosed = result.rowCount === 0;
  } catch (error) {
    await second.query("ROLLBACK");
    failedClosed = error?.code === "40001" || error?.code === "40P01";
  }
  if (!failedClosed) throw new Error("T-CHG-02 concurrent stale cutover write did not fail closed");

  const final = await first.query(
    'SELECT mode, version FROM exec007_cutover_control WHERE singleton_key=1',
  );
  if (final.rows[0]?.mode !== "EXEC007_READY") {
    throw new Error("T-CUT-03 winning transition was not persisted atomically");
  }

  console.log(JSON.stringify({ status: "PASS", tests: ["T-CHG-02", "T-CUT-03"] }));
} finally {
  await Promise.allSettled([first.end(), second.end()]);
}
