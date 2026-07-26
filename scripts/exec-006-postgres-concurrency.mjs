import pg from "pg";

const { Client } = pg;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const ids = {
  tenantA: "00000000-0000-0000-0000-000000000101",
  tenantB: "00000000-0000-0000-0000-000000000102",
  actor: "00000000-0000-0000-0000-000000000201",
  grantor: "00000000-0000-0000-0000-000000000202",
  staffB: "00000000-0000-0000-0000-000000000203",
  otherActor: "00000000-0000-0000-0000-000000000204",
  branchA: "00000000-0000-0000-0000-000000000301",
  branchB: "00000000-0000-0000-0000-000000000302",
  assignmentActor: "00000000-0000-0000-0000-000000000401",
  assignmentStaffB: "00000000-0000-0000-0000-000000000402",
  projectA: "00000000-0000-0000-0000-000000000501",
  projectB: "00000000-0000-0000-0000-000000000502",
  unitA: "00000000-0000-0000-0000-000000000601",
  unitB: "00000000-0000-0000-0000-000000000602",
  unitC: "00000000-0000-0000-0000-000000000603",
  unitD: "00000000-0000-0000-0000-000000000604",
  unitMissingSource: "00000000-0000-0000-0000-000000000605",
  otherUnit: "00000000-0000-0000-0000-000000000606",
  partyA: "00000000-0000-0000-0000-000000000701",
};

const admin = new Client({ connectionString });
const left = new Client({ connectionString });
const right = new Client({ connectionString });
await Promise.all([admin.connect(), left.connect(), right.connect()]);

function hash(character) {
  return character.repeat(64);
}

async function createCommitment(
  client,
  {
    unitId,
    type = "HOLD",
    status = type === "HOLD" ? "ACTIVE" : "PENDING_APPROVAL",
    key,
    payloadHash,
    now = "2026-07-26T12:00:00.000Z",
    expires = "2026-07-27T12:00:00.000Z",
  },
) {
  const result = await client.query(
    `SELECT "exec006_create_commitment"(
      $1::uuid,$2::uuid,$3::uuid,$4::text,$5::text,$6::uuid,
      NULL::uuid,NULL::uuid,$7::timestamptz,$8::uuid,$9::uuid,
      NULL::uuid,NULL::jsonb,NULL::text,$10::text,$11::text,$12::text,
      $13::text,$14::timestamptz
    ) AS id`,
    [
      ids.tenantA,
      ids.branchA,
      unitId,
      type,
      status,
      ids.partyA,
      expires,
      ids.actor,
      ids.assignmentActor,
      "postgres concurrency drill",
      `corr-${key}`,
      key,
      payloadHash,
      now,
    ],
  );
  return result.rows[0].id;
}

async function releaseCommitment(client, commitmentId, version, key) {
  const result = await client.query(
    `SELECT "exec006_release_commitment"(
      $1::uuid,$2::uuid,'RELEASED',$3::uuid,$4::uuid,$5::integer,
      'controlled release',$6::text,$7::text,$8::text,$9::timestamptz
    ) AS id`,
    [
      ids.tenantA,
      commitmentId,
      ids.actor,
      ids.assignmentActor,
      version,
      `corr-${key}`,
      key,
      hash("r"),
      "2026-07-26T12:30:00.000Z",
    ],
  );
  return result.rows[0].id;
}

function exactlyOneFulfilled(results, label) {
  const fulfilled = results.filter((result) => result.status === "fulfilled");
  const rejected = results.filter((result) => result.status === "rejected");
  if (fulfilled.length !== 1 || rejected.length !== 1) {
    throw new Error(
      `${label}: expected exactly one success and one rejection; got ${JSON.stringify(
        results.map((result) =>
          result.status === "fulfilled"
            ? { status: result.status, value: result.value }
            : { status: result.status, reason: result.reason?.message },
        ),
      )}`,
    );
  }
  return fulfilled[0].value;
}

try {
  await admin.query(`
    INSERT INTO "tenants" ("id", "company_name", "subdomain") VALUES
      ('${ids.tenantA}', 'EXEC006 A', 'exec006-a'),
      ('${ids.tenantB}', 'EXEC006 B', 'exec006-b');

    INSERT INTO "users" (
      "id", "tenant_id", "name", "email", "password_hash", "role"
    ) VALUES
      ('${ids.actor}', '${ids.tenantA}', 'Actor', 'exec006-actor@example.test', 'x', 'ADMIN'),
      ('${ids.grantor}', '${ids.tenantA}', 'Grantor', 'exec006-grantor@example.test', 'x', 'ADMIN'),
      ('${ids.staffB}', '${ids.tenantA}', 'Staff B', 'exec006-staff-b@example.test', 'x', 'SALES_EMPLOYEE'),
      ('${ids.otherActor}', '${ids.tenantB}', 'Other Actor', 'exec006-other@example.test', 'x', 'ADMIN');

    INSERT INTO "projects" ("id", "tenant_id", "name", "city", "status") VALUES
      ('${ids.projectA}', '${ids.tenantA}', 'Project A', 'Riyadh', 'PLANNING'),
      ('${ids.projectB}', '${ids.tenantB}', 'Project B', 'Riyadh', 'PLANNING');

    INSERT INTO "units" (
      "id", "tenant_id", "project_id", "unit_number", "type", "area", "price", "status"
    ) VALUES
      ('${ids.unitA}', '${ids.tenantA}', '${ids.projectA}', 'A-1', 'Apartment', 100, 100000, 'Available'),
      ('${ids.unitB}', '${ids.tenantA}', '${ids.projectA}', 'A-2', 'Apartment', 100, 100000, 'Available'),
      ('${ids.unitC}', '${ids.tenantA}', '${ids.projectA}', 'A-3', 'Apartment', 100, 100000, 'Available'),
      ('${ids.unitD}', '${ids.tenantA}', '${ids.projectA}', 'A-4', 'Apartment', 100, 100000, 'Available'),
      ('${ids.unitMissingSource}', '${ids.tenantA}', '${ids.projectA}', 'A-5', 'Apartment', 100, 100000, 'Available'),
      ('${ids.otherUnit}', '${ids.tenantB}', '${ids.projectB}', 'B-1', 'Apartment', 100, 100000, 'Available');

    INSERT INTO "organization_branches" (
      "id", "tenant_id", "code", "name", "is_central"
    ) VALUES
      ('${ids.branchA}', '${ids.tenantA}', 'A01', 'Branch A', TRUE),
      ('${ids.branchB}', '${ids.tenantB}', 'B01', 'Branch B', TRUE);

    INSERT INTO "user_scope_assignments" (
      "id", "tenant_id", "user_id", "security_role", "scope_type",
      "branch_id", "is_active", "assigned_by_user_id"
    ) VALUES
      ('${ids.assignmentActor}', '${ids.tenantA}', '${ids.actor}',
       'SALES_LEASING_MANAGER', 'BRANCH', '${ids.branchA}', TRUE, '${ids.grantor}'),
      ('${ids.assignmentStaffB}', '${ids.tenantA}', '${ids.staffB}',
       'BROKER_AGENT', 'BRANCH', '${ids.branchA}', TRUE, '${ids.grantor}');

    INSERT INTO "customer_parties" (
      "id", "tenant_id", "party_type", "branch_id", "created_by_user_id"
    ) VALUES
      ('${ids.partyA}', '${ids.tenantA}', 'PERSON', '${ids.branchA}', '${ids.actor}');

    INSERT INTO "unit_availability_sources" (
      "tenant_id", "unit_id", "branch_id", "project_id", "unit_type",
      "base_state", "consistency_state", "source_version", "policy_version",
      "legacy_projection_status", "updated_by_user_id"
    ) VALUES
      ('${ids.tenantA}', '${ids.unitA}', '${ids.branchA}', '${ids.projectA}', 'Apartment',
       'ACTIVE', 'CONSISTENT', 1, 'EXEC-006-v1', 'Available', '${ids.actor}'),
      ('${ids.tenantA}', '${ids.unitB}', '${ids.branchA}', '${ids.projectA}', 'Apartment',
       'ACTIVE', 'CONSISTENT', 1, 'EXEC-006-v1', 'Available', '${ids.actor}'),
      ('${ids.tenantA}', '${ids.unitC}', '${ids.branchA}', '${ids.projectA}', 'Apartment',
       'ACTIVE', 'CONSISTENT', 1, 'EXEC-006-v1', 'Available', '${ids.actor}'),
      ('${ids.tenantA}', '${ids.unitD}', '${ids.branchA}', '${ids.projectA}', 'Apartment',
       'ACTIVE', 'CONSISTENT', 1, 'EXEC-006-v1', 'Available', '${ids.actor}');
  `);

  const holdRace = await Promise.allSettled([
    createCommitment(left, {
      unitId: ids.unitA,
      key: "hold-race-left",
      payloadHash: hash("a"),
    }),
    createCommitment(right, {
      unitId: ids.unitA,
      key: "hold-race-right",
      payloadHash: hash("b"),
    }),
  ]);
  const firstWinner = exactlyOneFulfilled(holdRace, "concurrent Hold race");
  const activeAfterHoldRace = await admin.query(
    `SELECT "id", "version" FROM "unit_commitments"
     WHERE "tenant_id"=$1 AND "unit_id"=$2 AND "status"='ACTIVE'`,
    [ids.tenantA, ids.unitA],
  );
  if (activeAfterHoldRace.rowCount !== 1) {
    throw new Error("concurrent Hold race did not leave exactly one active row");
  }
  await releaseCommitment(
    admin,
    activeAfterHoldRace.rows[0].id,
    activeAfterHoldRace.rows[0].version,
    "release-after-hold-race",
  );

  const mixedRace = await Promise.allSettled([
    createCommitment(left, {
      unitId: ids.unitA,
      type: "HOLD",
      key: "mixed-hold",
      payloadHash: hash("c"),
    }),
    createCommitment(right, {
      unitId: ids.unitA,
      type: "RESERVATION",
      status: "PENDING_APPROVAL",
      key: "mixed-reservation",
      payloadHash: hash("d"),
      expires: "2026-08-02T12:00:00.000Z",
    }),
  ]);
  exactlyOneFulfilled(mixedRace, "concurrent Hold/Reservation race");
  const mixedWinner = await admin.query(
    `SELECT "id", "version" FROM "unit_commitments"
     WHERE "tenant_id"=$1 AND "unit_id"=$2
       AND "status" IN ('ACTIVE','PENDING_APPROVAL')`,
    [ids.tenantA, ids.unitA],
  );
  if (mixedWinner.rowCount !== 1) {
    throw new Error("mixed race did not leave exactly one blocking row");
  }
  await releaseCommitment(
    admin,
    mixedWinner.rows[0].id,
    mixedWinner.rows[0].version,
    "release-after-mixed-race",
  );

  const idempotentFirst = await createCommitment(admin, {
    unitId: ids.unitB,
    key: "idempotency-same",
    payloadHash: hash("e"),
  });
  const idempotentSecond = await createCommitment(admin, {
    unitId: ids.unitB,
    key: "idempotency-same",
    payloadHash: hash("e"),
  });
  if (idempotentFirst !== idempotentSecond) {
    throw new Error("same idempotency key/payload did not return prior result");
  }
  let payloadMismatchDenied = false;
  try {
    await createCommitment(admin, {
      unitId: ids.unitB,
      key: "idempotency-same",
      payloadHash: hash("f"),
    });
  } catch (error) {
    payloadMismatchDenied = /idempotency payload mismatch/i.test(error.message);
  }
  if (!payloadMismatchDenied) {
    throw new Error("idempotency payload mismatch was not denied");
  }

  const releaseExtendRace = await Promise.allSettled([
    releaseCommitment(left, idempotentFirst, 1, "release-vs-extend"),
    right
      .query(
        `SELECT "exec006_extend_commitment"(
          $1::uuid,$2::uuid,$3::timestamptz,$4::uuid,$5::uuid,$6::integer,
          NULL::jsonb,'controlled extension',$7::text,$8::text,$9::text,$10::timestamptz
        ) AS id`,
        [
          ids.tenantA,
          idempotentFirst,
          "2026-07-28T12:00:00.000Z",
          ids.actor,
          ids.assignmentActor,
          1,
          "corr-release-vs-extend",
          "extend-vs-release",
          hash("g"),
          "2026-07-26T12:30:00.000Z",
        ],
      )
      .then((result) => result.rows[0].id),
  ]);
  exactlyOneFulfilled(releaseExtendRace, "concurrent Release/Extend race");
  const releaseExtendState = await admin.query(
    `SELECT "status", "version" FROM "unit_commitments" WHERE "id"=$1`,
    [idempotentFirst],
  );
  if (
    ![
      "RELEASED:2",
      "ACTIVE:2",
    ].includes(`${releaseExtendState.rows[0].status}:${releaseExtendState.rows[0].version}`)
  ) {
    throw new Error("Release/Extend race produced a lost or incoherent update");
  }
  if (releaseExtendState.rows[0].status === "ACTIVE") {
    await releaseCommitment(
      admin,
      idempotentFirst,
      releaseExtendState.rows[0].version,
      "cleanup-extended-hold",
    );
  }

  const historicalNow = "2026-07-26T12:00:00.000Z";
  const expiryPoint = "2026-07-26T13:00:00.000Z";
  const expiringHold = await createCommitment(admin, {
    unitId: ids.unitC,
    key: "conversion-expiry-source",
    payloadHash: hash("h"),
    now: historicalNow,
    expires: expiryPoint,
  });
  const conversionExpiryRace = await Promise.allSettled([
    left
      .query(
        `SELECT "exec006_convert_hold_to_reservation"(
          $1::uuid,$2::uuid,$3::uuid,$4::uuid,1,$5::timestamptz,
          'conversion-evidence','convert at expiry',$6::text,$7::text,$8::text,$9::timestamptz
        ) AS id`,
        [
          ids.tenantA,
          expiringHold,
          ids.actor,
          ids.assignmentActor,
          "2026-08-02T13:00:00.000Z",
          "corr-conversion-expiry",
          "conversion-at-expiry",
          hash("i"),
          expiryPoint,
        ],
      )
      .then((result) => result.rows[0].id),
    right.query(
      `SELECT * FROM "exec006_reconcile_expired_commitments"(
        $1::uuid,$2::uuid,$3::uuid,10,NULL::uuid,$4::text,$5::timestamptz
      )`,
      [
        ids.tenantA,
        ids.actor,
        ids.assignmentActor,
        "corr-conversion-expiry-reconcile",
        expiryPoint,
      ],
    ),
  ]);
  const reconcileSuccesses = conversionExpiryRace.filter(
    (result, index) => index === 1 && result.status === "fulfilled",
  );
  if (reconcileSuccesses.length !== 1) {
    throw new Error("expiry reconciliation did not win at the exact expiry boundary");
  }
  const expiryState = await admin.query(
    `SELECT "status" FROM "unit_commitments" WHERE "id"=$1`,
    [expiringHold],
  );
  if (expiryState.rows[0].status !== "EXPIRED") {
    throw new Error("conversion/expiry race did not converge to EXPIRED");
  }

  const convertibleHold = await createCommitment(admin, {
    unitId: ids.unitD,
    key: "conversion-success-source",
    payloadHash: hash("j"),
  });
  const converted = await admin.query(
    `SELECT "exec006_convert_hold_to_reservation"(
      $1::uuid,$2::uuid,$3::uuid,$4::uuid,1,$5::timestamptz,
      'conversion-evidence','atomic conversion',$6::text,$7::text,$8::text,$9::timestamptz
    ) AS id`,
    [
      ids.tenantA,
      convertibleHold,
      ids.actor,
      ids.assignmentActor,
      "2026-08-02T12:00:00.000Z",
      "corr-conversion-success",
      "conversion-success",
      hash("k"),
      "2026-07-26T12:30:00.000Z",
    ],
  );
  const conversionRows = await admin.query(
    `SELECT "commitment_type", "status", "converted_from_commitment_id",
            "converted_to_commitment_id"
     FROM "unit_commitments" WHERE "id" IN ($1,$2) ORDER BY "commitment_type"`,
    [convertibleHold, converted.rows[0].id],
  );
  if (
    conversionRows.rowCount !== 2 ||
    !conversionRows.rows.some((row) => row.commitment_type === "HOLD" && row.status === "CONVERTED") ||
    !conversionRows.rows.some((row) => row.commitment_type === "RESERVATION" && row.status === "ACTIVE")
  ) {
    throw new Error("atomic Hold conversion did not produce one converted Hold and one active Reservation");
  }

  const availabilityWithTourBefore = await admin.query(
    `SELECT availability_state FROM "exec006_evaluate_unit_availability"($1,$2,$3)`,
    [ids.tenantA, ids.unitA, "2026-07-27T05:00:00.000Z"],
  );
  if (availabilityWithTourBefore.rows[0].availability_state !== "AVAILABLE") {
    throw new Error("Unit A should be available before Tour creation");
  }

  const tourRace = await Promise.allSettled([
    left
      .query(
        `SELECT "exec006_create_tour_appointment"(
          $1::uuid,$2::uuid,$3::uuid,$4::uuid,NULL::text,$5::uuid,
          NULL::uuid,NULL::uuid,$6::timestamptz,$7::timestamptz,'Asia/Riyadh',
          'Unit A',$8::uuid,$9::uuid,'tour race',$10::text,$11::text,$12::text,$13::timestamptz
        ) AS id`,
        [
          ids.tenantA, ids.branchA, ids.unitA, ids.actor, ids.partyA,
          "2026-07-27T06:00:00.000Z", "2026-07-27T07:00:00.000Z",
          ids.actor, ids.assignmentActor, "corr-tour-left", "tour-left", hash("l"),
          "2026-07-26T12:00:00.000Z",
        ],
      )
      .then((result) => result.rows[0].id),
    right
      .query(
        `SELECT "exec006_create_tour_appointment"(
          $1::uuid,$2::uuid,$3::uuid,$4::uuid,NULL::text,$5::uuid,
          NULL::uuid,NULL::uuid,$6::timestamptz,$7::timestamptz,'Asia/Riyadh',
          'Unit A',$8::uuid,$9::uuid,'tour race',$10::text,$11::text,$12::text,$13::timestamptz
        ) AS id`,
        [
          ids.tenantA, ids.branchA, ids.unitA, ids.actor, ids.partyA,
          "2026-07-27T06:30:00.000Z", "2026-07-27T07:30:00.000Z",
          ids.actor, ids.assignmentActor, "corr-tour-right", "tour-right", hash("m"),
          "2026-07-26T12:00:00.000Z",
        ],
      )
      .then((result) => result.rows[0].id),
  ]);
  const winningTour = exactlyOneFulfilled(tourRace, "concurrent staff Tour race");

  let unitTourConflictDenied = false;
  try {
    await admin.query(
      `SELECT "exec006_create_tour_appointment"(
        $1::uuid,$2::uuid,$3::uuid,$4::uuid,NULL::text,$5::uuid,
        NULL::uuid,NULL::uuid,$6::timestamptz,$7::timestamptz,'Asia/Riyadh',
        'Unit A',$8::uuid,$9::uuid,'unit overlap',$10::text,$11::text,$12::text,$13::timestamptz
      )`,
      [
        ids.tenantA, ids.branchA, ids.unitA, ids.staffB, ids.partyA,
        "2026-07-27T06:15:00.000Z", "2026-07-27T06:45:00.000Z",
        ids.actor, ids.assignmentActor, "corr-tour-unit", "tour-unit", hash("n"),
        "2026-07-26T12:00:00.000Z",
      ],
    );
  } catch (error) {
    unitTourConflictDenied = /conflicting key value|exclusion constraint/i.test(error.message);
  }
  if (!unitTourConflictDenied) {
    throw new Error("default Unit Tour overlap was not denied");
  }

  const availabilityWithTourAfter = await admin.query(
    `SELECT availability_state FROM "exec006_evaluate_unit_availability"($1,$2,$3)`,
    [ids.tenantA, ids.unitA, "2026-07-27T06:30:00.000Z"],
  );
  if (availabilityWithTourAfter.rows[0].availability_state !== "AVAILABLE") {
    throw new Error("Tour incorrectly blocked Unit availability");
  }

  const unknown = await admin.query(
    `SELECT availability_state FROM "exec006_evaluate_unit_availability"($1,$2,$3)`,
    [ids.tenantA, ids.unitMissingSource, "2026-07-26T12:00:00.000Z"],
  );
  if (unknown.rows[0].availability_state !== "UNKNOWN_FAIL_CLOSED") {
    throw new Error("missing availability source did not fail closed");
  }

  let crossTenantDenied = false;
  try {
    await admin.query(
      `INSERT INTO "unit_commitments" (
        "tenant_id","branch_id","unit_id","commitment_type","status","party_id",
        "starts_at","expires_at","initiated_by_user_id"
      ) VALUES ($1,$2,$3,'HOLD','ACTIVE',$4,$5,$6,$7)`,
      [
        ids.tenantA, ids.branchA, ids.otherUnit, ids.partyA,
        "2026-07-26T12:00:00.000Z", "2026-07-27T12:00:00.000Z", ids.actor,
      ],
    );
  } catch (error) {
    crossTenantDenied = /mismatch|foreign key/i.test(error.message);
  }
  if (!crossTenantDenied) throw new Error("cross-tenant Unit reference was accepted");

  let auditMutationDenied = false;
  try {
    await admin.query(`UPDATE "unit_commitment_audit" SET "reason"='tampered'`);
  } catch (error) {
    auditMutationDenied = /append-only/i.test(error.message);
  }
  if (!auditMutationDenied) throw new Error("Audit UPDATE was not denied");

  let historyMutationDenied = false;
  try {
    await admin.query(`DELETE FROM "unit_commitment_history"`);
  } catch (error) {
    historyMutationDenied = /append-only/i.test(error.message);
  }
  if (!historyMutationDenied) throw new Error("History DELETE was not denied");

  let legacyDirectWriteDenied = false;
  try {
    await admin.query(`UPDATE "units" SET "status"='Reserved' WHERE "id"=$1`, [ids.unitA]);
  } catch (error) {
    legacyDirectWriteDenied = /must be projected/i.test(error.message);
  }
  if (!legacyDirectWriteDenied) throw new Error("legacy exclusive Unit status write was accepted");
  await admin.query(`SELECT "exec006_project_legacy_unit_status"($1,$2,'Reserved')`, [ids.tenantA, ids.unitA]);

  console.log(
    JSON.stringify(
      {
        result: "PASS",
        holdRaceWinner: firstWinner,
        convertedReservation: converted.rows[0].id,
        winningTour,
        checks: {
          concurrentHold: true,
          concurrentHoldReservation: true,
          releaseExtendNoLostUpdate: true,
          conversionExpiryConsistent: true,
          atomicConversion: true,
          idempotencyReplay: true,
          idempotencyPayloadMismatch: true,
          staffTourOverlap: true,
          unitTourOverlap: true,
          tourDoesNotReserve: true,
          unknownFailClosed: true,
          crossTenantIntegrity: true,
          auditAppendOnly: true,
          historyAppendOnly: true,
          legacyProjectionGuard: true,
        },
      },
      null,
      2,
    ),
  );
} finally {
  await Promise.allSettled([admin.end(), left.end(), right.end()]);
}