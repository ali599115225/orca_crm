const { PrismaClient } = require('@prisma/client');
const pg = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: 'c:/Users/ali59/Desktop/REDC/.env' });

async function main() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const securePassword = await bcrypt.hash("123456", 10);

    // 1. Create or Update Professional Tenant
    let proTenant = await prisma.tenant.findUnique({
      where: { subdomain: 'ali-pro' }
    });
    if (!proTenant) {
      proTenant = await prisma.tenant.create({
        data: {
          companyName: "شركة الإبداع الاحترافية",
          subdomain: 'ali-pro',
          subscriptionPlan: 'professional',
          paymentStatus: 'PAID'
        }
      });
      console.log("Created professional tenant:", proTenant.id);
    } else {
      proTenant = await prisma.tenant.update({
        where: { subdomain: 'ali-pro' },
        data: { subscriptionPlan: 'professional', paymentStatus: 'PAID' }
      });
      console.log("Updated professional tenant:", proTenant.id);
    }

    // Create user for professional tenant
    let proUser = await prisma.user.findUnique({
      where: { email: 'ali599115225@gmail.com' }
    });
    if (!proUser) {
      proUser = await prisma.user.create({
        data: {
          tenantId: proTenant.id,
          name: "علي محمد",
          email: 'ali599115225@gmail.com',
          passwordHash: securePassword,
          role: 'ADMIN',
          isActive: true
        }
      });
      console.log("Created professional user:", proUser.email);
    } else {
      console.log("Professional user already exists:", proUser.email);
    }

    // 2. Create or Update Diamond Tenant
    let diamondTenant = await prisma.tenant.findUnique({
      where: { subdomain: 'ali-diamond' }
    });
    if (!diamondTenant) {
      diamondTenant = await prisma.tenant.create({
        data: {
          companyName: "شركة التميز الماسية",
          subdomain: 'ali-diamond',
          subscriptionPlan: 'diamond',
          paymentStatus: 'PAID'
        }
      });
      console.log("Created diamond tenant:", diamondTenant.id);
    } else {
      diamondTenant = await prisma.tenant.update({
        where: { subdomain: 'ali-diamond' },
        data: { subscriptionPlan: 'diamond', paymentStatus: 'PAID' }
      });
      console.log("Updated diamond tenant:", diamondTenant.id);
    }

    // Create user for diamond tenant
    let diamondUser = await prisma.user.findUnique({
      where: { email: 'ali557516311@gmail.com' }
    });
    if (!diamondUser) {
      diamondUser = await prisma.user.create({
        data: {
          tenantId: diamondTenant.id,
          name: "علي محمد",
          email: 'ali557516311@gmail.com',
          passwordHash: securePassword,
          role: 'ADMIN',
          isActive: true
        }
      });
      console.log("Created diamond user:", diamondUser.email);
    } else {
      console.log("Diamond user already exists:", diamondUser.email);
    }

  } catch (err) {
    console.error("Error during database modification:", err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
