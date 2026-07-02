import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const files = [
  "lib/revenue-integrity/predictive-intelligence.ts",
  "lib/revenue-integrity/predictive.ts",
  "lib/revenue-integrity/radar.ts",
];

function source(file: string) {
  return fs.readFileSync(path.join(process.cwd(), file), "utf8");
}

describe("R02 Revenue Integrity query safety", () => {
  it("contains no unsafe raw queries", () => {
    for (const file of files) {
      expect(source(file)).not.toMatch(
        /\$(?:queryRawUnsafe|executeRawUnsafe)/,
      );
    }
  });

  it("uses parameterized predictive queries", () => {
    expect(source(files[0]).match(/\$queryRaw</g)).toHaveLength(7);
    expect(source(files[1])).toContain("Prisma.sql`AND UPPER");
    expect(source(files[1])).toContain("${tenantId}::uuid");
  });

  it("uses Prisma.Sql for radar queries", () => {
    const radar = source(files[2]);

    expect(radar).toContain("query: Prisma.Sql");
    expect(radar).toContain("rawPrisma.$queryRaw<T[]>(query)");
    expect(radar.match(/queryRows<[^`]+>\(Prisma\.sql`/g)).toHaveLength(10);
    expect(radar).not.toContain("$1::uuid");
  });
});
