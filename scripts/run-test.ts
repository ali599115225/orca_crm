// scripts/run-test.ts
import dotenv from "dotenv";
import path from "path";

// Load environment variables first
dotenv.config({ path: path.join("C:\\Users\\ali59\\Desktop\\REDC", ".env") });

async function main() {
  console.log("🚀 Starting Leads Section Automated Test Suite...");

  // Dynamically import prisma and test runner after env is loaded
  const { prisma } = await import("../lib/prisma");
  const { runLeadsTestSuite } = await import("./test-leads");

  // Fetch active tenant and user
  const tenant = await prisma.tenant.findFirst({
    where: { isActive: true },
  });

  if (!tenant) {
    console.error("❌ No active tenant found to run tests.");
    process.exit(1);
  }

  const user = await prisma.user.findFirst({
    where: { tenantId: tenant.id },
  });

  if (!user) {
    console.error(`❌ No user found for tenant ID ${tenant.id}.`);
    process.exit(1);
  }

  console.log(`📡 Tenant resolved: ${tenant.companyName} (${tenant.id})`);
  console.log(`👤 User resolved: ${user.name} (${user.id})`);

  const results = await runLeadsTestSuite(tenant.id, user.id);
  
  console.log("\n📊 Test Results Summary:\n");
  let allPassed = true;

  results.forEach(res => {
    if (res.success) {
      console.log(`  ✅ ${res.step}: PASSED`);
    } else {
      console.log(`  ❌ ${res.step}: FAILED - ${res.message}`);
      allPassed = false;
    }
  });

  console.log("\n------------------------------------------------");
  if (allPassed) {
    console.log("🎉 ALL TESTS PASSED SUCCESSFULLY! (100% SUCCESS RATE)");
    process.exit(0);
  } else {
    console.error("⚠️ SOME TESTS FAILED.");
    process.exit(1);
  }
}

main().catch(err => {
  console.error("Fatal test suite error:", err);
  process.exit(1);
});
