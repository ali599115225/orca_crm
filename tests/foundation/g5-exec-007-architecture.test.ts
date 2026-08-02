import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const roots = ["lib/offer-management", "lib/customer-portal", "lib/exec-007-cutover"];
const files = roots.flatMap((root) => fs.readdirSync(path.join(process.cwd(), root)).map((name) => path.join(root, name)));
const source = files.filter((file) => file.endsWith(".ts")).map((file) => fs.readFileSync(path.join(process.cwd(), file), "utf8")).join("\n");

describe("EXEC-007 architecture boundary", () => {
  it("T-ARCH-01 has no contract or finance writer imports", () => {
    expect(source).not.toMatch(/transaction-spine\/(issue-contract|accept-offer)/);
    expect(source).not.toMatch(/createInvoice|createInstallments|PaymentPlan|RentalLease/);
    expect(source).not.toMatch(/\.unit\.update|Unit\.status/);
  });

  it("T-ARCH-02 keeps customer and employee session boundaries separate", () => {
    expect(source).toContain("orca_customer_session");
    expect(source).toContain("employee session cannot authorize customer portal");
  });
});
