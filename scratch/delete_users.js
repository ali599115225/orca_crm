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
    const deleted = await prisma.user.deleteMany({
      where: {
        NOT: {
          email: 'ali.orca@outlook.sa'
        }
      }
    });
    console.log(`Deleted ${deleted.count} users successfully.`);
  } catch (err) {
    console.error("Error during deletion:", err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
