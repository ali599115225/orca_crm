const baseUrl = (
  process.env.PRODUCTION_URL || "https://orca.az-ez.pro"
).replace(/\/+$/, "");

const expectedCommit = (process.env.EXPECTED_COMMIT || "").trim();
const attempts = Number(process.env.SMOKE_ATTEMPTS || 20);
const delayMs = Number(process.env.SMOKE_DELAY_MS || 30_000);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON response: ${text.slice(0, 200)}`);
  }
}

async function checkHealth() {
  const response = await fetch(`${baseUrl}/api/health/deployment`, {
    headers: {
      "User-Agent": "ORCA-Production-Smoke/1.0",
      "Cache-Control": "no-cache",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Health returned HTTP ${response.status}`);
  }

  const payload = await readJson(response);
  if (payload.status !== "ok" || payload.service !== "orca-crm") {
    throw new Error("Health payload is not valid");
  }

  if (
    expectedCommit &&
    payload.commit !== expectedCommit &&
    !expectedCommit.startsWith(payload.commit) &&
    !payload.commit.startsWith(expectedCommit)
  ) {
    throw new Error(
      `Production commit ${payload.commit} does not match ${expectedCommit}`,
    );
  }

  const rootResponse = await fetch(baseUrl, {
    headers: {
      "User-Agent": "ORCA-Production-Smoke/1.0",
      "Cache-Control": "no-cache",
    },
    redirect: "follow",
  });

  if (rootResponse.status >= 500) {
    throw new Error(`Root returned HTTP ${rootResponse.status}`);
  }

  return payload;
}

let lastError;

for (let attempt = 1; attempt <= attempts; attempt += 1) {
  try {
    const payload = await checkHealth();
    console.log(
      JSON.stringify(
        {
          result: "PRODUCTION_SMOKE_PASS",
          url: baseUrl,
          commit: payload.commit,
          environment: payload.environment,
          attempt,
        },
        null,
        2,
      ),
    );
    process.exit(0);
  } catch (error) {
    lastError = error;
    console.log(
      `Smoke attempt ${attempt}/${attempts} pending: ${error.message}`,
    );
    if (attempt < attempts) {
      await sleep(delayMs);
    }
  }
}

console.error(
  `PRODUCTION_SMOKE_FAILED: ${lastError?.message || "unknown error"}`,
);
process.exit(1);