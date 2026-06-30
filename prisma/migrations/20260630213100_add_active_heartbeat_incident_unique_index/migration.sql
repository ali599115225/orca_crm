CREATE UNIQUE INDEX "idx_sentinel_incidents_active_heartbeat_fingerprint_uq"
ON "sentinel_incidents" ("fingerprint")
WHERE "fingerprint" IS NOT NULL
  AND "fingerprint" LIKE 'heartbeat:%'
  AND "status" IN (
    'OPEN'::"SentinelIncidentStatus",
    'ACKNOWLEDGED'::"SentinelIncidentStatus",
    'IN_PROGRESS'::"SentinelIncidentStatus"
  );
