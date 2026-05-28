// scratch/create_elite_lead.ts
import dotenv from "dotenv";
dotenv.config({ path: "c:\\Users\\ali59\\Desktop\\REDC\\.env" });

import { prisma } from "../lib/prisma";

async function main() {
  console.log("Checking for active tenants in the database...");
  
  // Find the first active tenant to link the lead to
  const tenant = await prisma.tenant.findFirst({
    where: { isActive: true },
  });

  if (!tenant) {
    console.error("No active tenant found in the database!");
    process.exit(1);
  }

  console.log(`Found active tenant: ${tenant.companyName} (${tenant.id})`);

  // Check if a duplicate phone number exists
  const existingLead = await prisma.lead.findFirst({
    where: {
      tenantId: tenant.id,
      phone: "055061667",
    },
  });

  if (existingLead) {
    console.log(`Lead with phone 055061667 already exists: ${existingLead.firstName} ${existingLead.lastName}`);
    // Let's update it to ensure it has the latest details
    const updatedLead = await prisma.lead.update({
      where: { id: existingLead.id },
      data: {
        firstName: "elite.orca",
        lastName: "elite",
        email: "elite.orca@outlook.sa",
        source: "التسجيل المباشر عبر الشات",
        city: "الرياض",
      },
    });
    console.log("Successfully updated existing lead details:", updatedLead);
  } else {
    // Create new lead linked to the tenant
    const newLead = await prisma.lead.create({
      data: {
        tenant: {
          connect: { id: tenant.id },
        },
        firstName: "elite.orca",
        lastName: "elite",
        phone: "055061667",
        email: "elite.orca@outlook.sa",
        city: "الرياض",
        source: "التسجيل المباشر عبر الشات",
        status: "NEW",
      },
    });
    console.log("Successfully registered new lead in the database:", newLead);
  }
}

main()
  .catch((e) => {
    console.error("Error creating lead:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
