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
    const updated = await prisma.tenant.update({
      where: {
        id: 'c03862bf-a3d7-46d6-bddb-abb65244599c'
      },
      data: {
        subscriptionPlan: 'platinum',
        paymentStatus: 'PAID'
      }
    });
    console.log("SUCCESSFULLY UPDATED TENANT PLAN TO PLATINUM:", JSON.stringify(updated, null, 2));
  } catch (err) {
    console.error("Error during update:", err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
