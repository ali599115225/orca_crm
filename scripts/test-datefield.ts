// scripts/test-datefield.ts
import {
  formatDateToDDMMYYYY,
  parseNativeValueToDate,
  parseVisibleToNative,
  isValidDDMMYYYY
} from "../components/ui/DateField";

interface TestResult {
  step: string;
  success: boolean;
  message?: string;
}

const results: TestResult[] = [];

function assert(step: string, condition: boolean, message?: string) {
  if (condition) {
    results.push({ step, success: true });
    console.log(`✅ PASSED: ${step}`);
  } else {
    results.push({ step, success: false, message: message || "Assertion failed" });
    console.error(`❌ FAILED: ${step} - ${message}`);
  }
}

// Simulated range validator (mimics DateRangeField component logic)
function simulateDateRangeSwap(from: string, to: string, newDate: string, fieldChanged: 'from' | 'to') {
  let resolvedFrom = from;
  let resolvedTo = to;
  let warningIssued = false;

  if (fieldChanged === 'from') {
    if (newDate && to) {
      const fromD = parseNativeValueToDate(newDate);
      const toD = parseNativeValueToDate(to);
      if (fromD && toD && fromD > toD) {
        resolvedFrom = to;
        resolvedTo = newDate;
        warningIssued = true;
      } else {
        resolvedFrom = newDate;
      }
    } else {
      resolvedFrom = newDate;
    }
  } else {
    if (from && newDate) {
      const fromD = parseNativeValueToDate(from);
      const toD = parseNativeValueToDate(newDate);
      if (fromD && toD && fromD > toD) {
        resolvedFrom = newDate;
        resolvedTo = from;
        warningIssued = true;
      } else {
        resolvedTo = newDate;
      }
    } else {
      resolvedTo = newDate;
    }
  }
  return { resolvedFrom, resolvedTo, warningIssued };
}

async function runTests() {
  console.log("🚀 Starting DateField utility and validation tests...");

  // 1. Test: formatDateToDDMMYYYY
  const testDate = new Date(2026, 5, 14); // 14 June 2026 (Month is 0-indexed, so 5 = June)
  const formatted = formatDateToDDMMYYYY(testDate);
  assert("formatDateToDDMMYYYY - June 14, 2026", formatted === "14/06/2026", `Expected '14/06/2026', got '${formatted}'`);

  // 2. Test: parseNativeValueToDate
  const parsedDate = parseNativeValueToDate("2026-06-14");
  assert("parseNativeValueToDate - Valid date conversion", parsedDate !== null && parsedDate.getFullYear() === 2026 && parsedDate.getMonth() === 5 && parsedDate.getDate() === 14);
  assert("parseNativeValueToDate - Empty value", parseNativeValueToDate("") === null);
  assert("parseNativeValueToDate - Invalid value format", parseNativeValueToDate("2026/06/14") === null);

  // 3. Test: parseVisibleToNative
  assert("parseVisibleToNative - Standard conversion", parseVisibleToNative("14/06/2026") === "2026-06-14");
  assert("parseVisibleToNative - Empty visible text", parseVisibleToNative("") === "");
  assert("parseVisibleToNative - Invalid layout text", parseVisibleToNative("14-06-2026") === "");

  // 4. Test: isValidDDMMYYYY
  assert("isValidDDMMYYYY - Standard valid date", isValidDDMMYYYY("14/06/2026") === true);
  assert("isValidDDMMYYYY - Non-leap year feb 29", isValidDDMMYYYY("29/02/2025") === false);
  assert("isValidDDMMYYYY - Leap year feb 29", isValidDDMMYYYY("29/02/2024") === true);
  assert("isValidDDMMYYYY - Out of bound month", isValidDDMMYYYY("14/13/2026") === false);
  assert("isValidDDMMYYYY - Out of bound day", isValidDDMMYYYY("32/12/2026") === false);
  assert("isValidDDMMYYYY - Zero day or month", isValidDDMMYYYY("00/06/2026") === false);
  assert("isValidDDMMYYYY - Invalid format layout", isValidDDMMYYYY("14-06-2026") === false);
  assert("isValidDDMMYYYY - Non-numeric characters", isValidDDMMYYYY("dd/mm/yyyy") === false);
  assert("isValidDDMMYYYY - Year boundaries - Min (1899)", isValidDDMMYYYY("15/06/1899") === false);
  assert("isValidDDMMYYYY - Year boundaries - Max (2101)", isValidDDMMYYYY("15/06/2101") === false);

  // 5. Test: DateRange Swap logic
  // Swap Case A: Start date is set after the existing end date
  const rangeA = simulateDateRangeSwap("2026-06-10", "2026-06-12", "2026-06-15", "from");
  assert("DateRangeSwap - Start date > End date triggers swap", 
    rangeA.resolvedFrom === "2026-06-12" && rangeA.resolvedTo === "2026-06-15" && rangeA.warningIssued === true,
    `Expected swap to from: 2026-06-12 and to: 2026-06-15. Got ${rangeA.resolvedFrom} and ${rangeA.resolvedTo}`
  );

  // Swap Case B: End date is set before the existing start date
  const rangeB = simulateDateRangeSwap("2026-06-10", "2026-06-12", "2026-06-08", "to");
  assert("DateRangeSwap - End date < Start date triggers swap",
    rangeB.resolvedFrom === "2026-06-08" && rangeB.resolvedTo === "2026-06-10" && rangeB.warningIssued === true,
    `Expected swap to from: 2026-06-08 and to: 2026-06-10. Got ${rangeB.resolvedFrom} and ${rangeB.resolvedTo}`
  );

  // Normal Case C: Start date set correctly before end date
  const rangeC = simulateDateRangeSwap("2026-06-10", "2026-06-12", "2026-06-09", "from");
  assert("DateRangeSwap - Normal setting start date",
    rangeC.resolvedFrom === "2026-06-09" && rangeC.resolvedTo === "2026-06-12" && rangeC.warningIssued === false
  );

  console.log("\n📊 DateField Test Results Summary:\n");
  const failed = results.filter(r => !r.success);
  if (failed.length === 0) {
    console.log("🎉 ALL TESTS PASSED SUCCESSFULLY!");
    process.exit(0);
  } else {
    console.error(`⚠️ ${failed.length} TESTS FAILED.`);
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
