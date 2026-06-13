// scripts/backfill-hashes.ts
// Phase 08-G2C: Backfill NULL hash columns for all existing rows
// Usage:
//   npx tsx scripts/backfill-hashes.ts --dry-run
//   npx tsx scripts/backfill-hashes.ts --check-duplicates
//   npx tsx scripts/backfill-hashes.ts              (actual backfill)
import dotenv from "dotenv";
import path from "path";
import crypto from "crypto";

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const DRY_RUN = process.argv.includes("--dry-run");
const CHECK_DUPLICATES = process.argv.includes("--check-duplicates");
const BATCH_SIZE = 1000;

function getHashKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY || "orca-dev-hash-key";
  return crypto.createHash("sha256").update(String(key)).digest();
}

function normalizePhone(phone: string): string {
  if (!phone) return "";
  return phone.replace(/\D/g, "");
}

function normalizeEmail(email: string): string {
  if (!email) return "";
  return email.trim().toLowerCase();
}

function hashPhone(tenantId: string, phone: string): string {
  const normalized = normalizePhone(phone);
  if (!normalized) return "";
  return crypto.createHmac("sha256", getHashKey()).update(`${tenantId}:${normalized}`).digest("hex");
}

function hashEmail(email: string, tenantId?: string): string {
  const normalized = normalizeEmail(email);
  if (!normalized) return "";
  const material = tenantId ? `${tenantId}:${normalized}` : normalized;
  return crypto.createHmac("sha256", getHashKey()).update(material).digest("hex");
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "****";
  return "***" + digits.slice(-4);
}

async function backfillTable(
  rawPrisma: any,
  table: string,
  hashColumn: string,
  computeHash: (row: any) => string | null,
  label: string
): Promise<{ total: number; updated: number }> {
  const countResult = await rawPrisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*) as count FROM "${table}" WHERE "${hashColumn}" IS NULL`
  );
  const total = Number(countResult[0].count);

  if (total === 0) {
    console.log(`  [${label}] ✅ Already complete — 0 NULL rows`);
    return { total: 0, updated: 0 };
  }

  console.log(`  [${label}] ${total} rows with NULL ${hashColumn}`);

  if (DRY_RUN) {
    console.log(`  [${label}] DRY-RUN: would update ${total} rows`);
    return { total, updated: 0 };
  }

  let updated = 0;
  let remaining = total;

  while (remaining > 0) {
    const rows = await rawPrisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "${table}" WHERE "${hashColumn}" IS NULL LIMIT ${BATCH_SIZE}`
    );

    if (rows.length === 0) break;

    for (const row of rows) {
      const hash = computeHash(row);
      if (hash) {
        await rawPrisma.$queryRawUnsafe(
          `UPDATE "${table}" SET "${hashColumn}" = $1 WHERE id = $2`,
          hash,
          row.id
        );
        updated++;
      }
    }

    remaining = Math.max(0, remaining - rows.length);
    process.stdout.write(`\r  [${label}] ${total - remaining}/${total} (${updated} updated)`);
  }

  // Validate
  const remainingResult = await rawPrisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*) as count FROM "${table}" WHERE "${hashColumn}" IS NULL`
  );
  const remainingCount = Number(remainingResult[0].count);

  if (remainingCount === 0) {
    console.log(`\n  [${label}] ✅ Complete — ${updated} rows updated, 0 remaining NULL`);
  } else {
    console.log(`\n  [${label}] ⚠️ ${remainingCount} rows still NULL after backfill`);
  }

  return { total, updated };
}

async function checkWhatsAppContactDuplicates(rawPrisma: any): Promise<boolean> {
  console.log("\n🔍 Checking WhatsAppContact phoneHash duplicates...");

  const dups = await rawPrisma.$queryRawUnsafe<any[]>(
    `SELECT tenant_id, phone_hash, COUNT(*) as cnt
     FROM whatsapp_contacts
     WHERE phone_hash IS NOT NULL
     GROUP BY tenant_id, phone_hash
     HAVING COUNT(*) > 1
     LIMIT 10`
  );

  if (dups.length === 0) {
    console.log("  ✅ No duplicate phoneHash found — safe for 08-G2D constraint swap");
    return true;
  }

  console.log(`  ❌ BLOCKER: Found ${dups.length} duplicate phoneHash group(s):`);
  for (const d of dups) {
    console.log(`     tenant_id=${d.tenant_id}  phone_hash=${d.phone_hash.substring(0, 16)}...  count=${d.cnt}`);
  }
  return false;
}

async function main() {
  console.log("🔄 Phase 08-G2C: Hash Backfill Script");
  console.log(DRY_RUN ? "   MODE: DRY-RUN (no writes)" : "   MODE: LIVE (will write to DB)");
  console.log("");

  const { rawPrisma } = await import("../lib/prisma");

  if (CHECK_DUPLICATES) {
    const ok = await checkWhatsAppContactDuplicates(rawPrisma);
    await rawPrisma.$disconnect();
    process.exit(ok ? 0 : 1);
  }

  const tables: Array<{
    table: string;
    hashColumn: string;
    computeHash: (row: any) => string | null;
    label: string;
  }> = [
    {
      table: "users",
      hashColumn: "email_hash",
      computeHash: (row) => (row.email ? hashEmail(row.email) : null),
      label: "Users",
    },
    {
      table: "leads",
      hashColumn: "phone_hash",
      computeHash: (row) => (row.phone ? hashPhone(row.tenant_id, row.phone) : null),
      label: "Leads (phone)",
    },
    {
      table: "leads",
      hashColumn: "email_hash",
      computeHash: (row) => (row.email ? hashEmail(row.email, row.tenant_id) : null),
      label: "Leads (email)",
    },
    {
      table: "contacts",
      hashColumn: "phone_hash",
      computeHash: (row) => (row.phone ? hashPhone(row.tenant_id, row.phone) : null),
      label: "Contacts (phone)",
    },
    {
      table: "contacts",
      hashColumn: "email_hash",
      computeHash: (row) => (row.email ? hashEmail(row.email, row.tenant_id) : null),
      label: "Contacts (email)",
    },
    {
      table: "whatsapp_contacts",
      hashColumn: "phone_hash",
      computeHash: (row) => (row.phone ? hashPhone(row.tenant_id, row.phone) : null),
      label: "WhatsApp Contacts",
    },
    {
      table: "whatsapp_messages",
      hashColumn: "phone_hash",
      computeHash: (row) => (row.phone ? hashPhone(row.tenant_id, row.phone) : null),
      label: "WhatsApp Messages",
    },
    {
      table: "mansour_chats",
      hashColumn: "contact_phone_hash",
      computeHash: (row) => (row.contact_phone ? hashPhone(row.tenant_id, row.contact_phone) : null),
      label: "Mansour Chats",
    },
    {
      table: "contracts",
      hashColumn: "buyer_phone_hash",
      computeHash: (row) => (row.buyer_phone ? hashPhone(row.tenant_id, row.buyer_phone) : null),
      label: "Contracts",
    },
  ];

  let grandTotal = 0;
  let grandUpdated = 0;

  for (const t of tables) {
    const { total, updated } = await backfillTable(rawPrisma, t.table, t.hashColumn, t.computeHash, t.label);
    grandTotal += total;
    grandUpdated += updated;
  }

  console.log(`\n📊 Summary: ${grandTotal} total NULL rows, ${grandUpdated} updated`);

  // Duplicate check for WhatsAppContact (critical for 08-G2D)
  const dupOk = await checkWhatsAppContactDuplicates(rawPrisma);
  if (!dupOk) {
    console.log("\n❌ BLOCKER: WhatsAppContact phoneHash duplicates detected. Do NOT proceed to 08-G2D.");
    await rawPrisma.$disconnect();
    process.exit(1);
  }

  await rawPrisma.$disconnect();
  console.log("\n✅ Backfill complete. Safe to proceed to 08-G2D.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal backfill error:", err);
  process.exit(1);
});
