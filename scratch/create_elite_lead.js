// scratch/create_elite_lead.js
const pg = require('pg');
require('dotenv').config({ path: "c:\\Users\\ali59\\Desktop\\REDC\\.env" });

async function main() {
  console.log("Connecting to PostgreSQL...");
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // 1. Get first active tenant
    const tenantRes = await pool.query('SELECT id, company_name FROM tenants WHERE is_active = true LIMIT 1');
    if (tenantRes.rows.length === 0) {
      console.error("No active tenant found in the database!");
      return;
    }
    const tenant = tenantRes.rows[0];
    console.log(`Found active tenant: ${tenant.company_name} (${tenant.id})`);

    const phone = "055061667";
    const firstName = "elite.orca";
    const lastName = "elite";
    const email = "elite.orca@outlook.sa";
    const city = "الرياض";
    const source = "التسجيل المباشر عبر الشات";
    const status = "NEW";

    // 2. Check if lead already exists
    const leadRes = await pool.query(
      'SELECT id FROM leads WHERE tenant_id = $1 AND phone = $2',
      [tenant.id, phone]
    );

    if (leadRes.rows.length > 0) {
      const existingLeadId = leadRes.rows[0].id;
      console.log(`Lead with phone ${phone} already exists (ID: ${existingLeadId}). Updating...`);

      // Update lead
      await pool.query(
        'UPDATE leads SET first_name = $1, last_name = $2, email = $3, source = $4, city = $5, updated_at = NOW() WHERE id = $6',
        [firstName, lastName, email, source, city, existingLeadId]
      );
      console.log("Successfully updated lead details.");
    } else {
      console.log(`Lead with phone ${phone} does not exist. Inserting new lead...`);

      // Insert lead
      await pool.query(
        'INSERT INTO leads (tenant_id, first_name, last_name, phone, email, city, source, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [tenant.id, firstName, lastName, phone, email, city, source, status]
      );
      console.log("Successfully inserted new lead.");
    }

  } catch (err) {
    console.error("Database operation failed:", err.message);
  } finally {
    await pool.end();
  }
}

main();
