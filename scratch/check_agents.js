// scratch/check_agents.js
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
    const tenant = await prisma.tenant.findUnique({
      where: { subdomain: "orca-crm-one" },
      include: {
        agentSlots: true,
        _count: {
          select: {
            users: true,
            projects: true,
            leads: true,
            tasks: true
          }
        }
      }
    });

    if (!tenant) {
      console.log("Tenant orca-crm-one not found");
      return;
    }

    console.log("TENANT INFO:");
    console.log(`- Name: ${tenant.companyName}`);
    console.log(`- Subdomain: ${tenant.subdomain}`);
    console.log(`- Plan: ${tenant.subscriptionPlan}`);
    console.log(`- Extra Agents: ${tenant.extraAgents}`);
    console.log(`- WhatsApp Connected: ${tenant.whatsappConnected}`);
    console.log(`- Total Projects: ${tenant._count.projects}`);
    console.log(`- Total Leads: ${tenant._count.leads}`);
    console.log(`- Total Tasks: ${tenant._count.tasks}`);

    console.log("\nAGENT SLOTS:");
    tenant.agentSlots.forEach(slot => {
      console.log(`- Slot ${slot.slotNumber}: Agent Type: ${slot.agentType}, Active: ${slot.isActive}`);
    });

    const contractsCount = await prisma.contract.count({
      where: { unit: { project: { tenantId: tenant.id } } }
    });
    console.log(`\n- Total Contracts: ${contractsCount}`);

    const paidInstallments = await prisma.installment.findMany({
      where: {
        paymentStatus: "Paid",
        contract: { unit: { project: { tenantId: tenant.id } } }
      }
    });
    const paidSum = paidInstallments.reduce((sum, i) => sum + Number(i.amountSar), 0);
    console.log(`- Paid Installments Sum: ${paidSum.toLocaleString()} SAR (Count: ${paidInstallments.length})`);

    const pendingInstallments = await prisma.installment.findMany({
      where: {
        paymentStatus: "Pending",
        contract: { unit: { project: { tenantId: tenant.id } } }
      }
    });
    const pendingSum = pendingInstallments.reduce((sum, i) => sum + Number(i.amountSar), 0);
    console.log(`- Pending Installments Sum: ${pendingSum.toLocaleString()} SAR (Count: ${pendingInstallments.length})`);

    const totalLogs = await prisma.agentTelemetryLog.count({
      where: { tenantId: tenant.id }
    });
    const successLogs = await prisma.agentTelemetryLog.count({
      where: { tenantId: tenant.id, severity: "Info" }
    });
    console.log(`- Total Telemetry Logs: ${totalLogs}`);
    console.log(`- Success Telemetry Logs: ${successLogs} (${totalLogs > 0 ? Math.round((successLogs / totalLogs) * 100) : 0}% success/compliance)`);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
