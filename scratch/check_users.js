// scratch/check_users.js
const { PrismaClient } = require('@prisma/client');
const pg = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config({ path: 'c:/Users/ali59/Desktop/REDC/.env' });

async function main() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const users = await prisma.user.findMany({
      include: {
        tenant: true
      }
    });
    console.log("USERS:");
    users.forEach(u => {
      console.log(`- Email: ${u.email}, Role: ${u.role}, Tenant: ${u.tenant?.subdomain}`);
    });
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
