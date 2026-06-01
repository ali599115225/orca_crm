const { PrismaClient } = require('@prisma/client');
const pg = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config({ path: 'C:/Users/ali59/Desktop/REDC/.env' });

async function main() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // 1. ali-pro (user ali599115225@gmail.com) -> set to diamond
    const tPro = await prisma.tenant.update({
      where: { subdomain: 'ali-pro' },
      data: { subscriptionPlan: 'diamond' }
    });
    console.log("Updated ali-pro to:", tPro.subscriptionPlan);

    // 2. ali-diamond (user ali557516311@gmail.com) -> set to pro
    const tDiamond = await prisma.tenant.update({
      where: { subdomain: 'ali-diamond' },
      data: { subscriptionPlan: 'pro' }
    });
    console.log("Updated ali-diamond to:", tDiamond.subscriptionPlan);

    // 3. orca-crm-one (user ali.orca@outlook.sa) -> set to basic
    const tOrca = await prisma.tenant.update({
      where: { subdomain: 'orca-crm-one' },
      data: { subscriptionPlan: 'basic' }
    });
    console.log("Updated orca-crm-one to:", tOrca.subscriptionPlan);

  } catch (err) {
    console.error("Error during update:", err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
