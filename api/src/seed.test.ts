import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import { companyProblems } from "./company.ts";
import type { Db } from "./db/index.ts";
import * as schema from "./db/schema.ts";
import { SAMPLE_COMPANIES } from "./sample-data.ts";
import { seedSampleCompanies } from "./seed.ts";

let db: Db;

beforeEach(async () => {
  const database = drizzle(new PGlite(), { schema, casing: "snake_case" });
  await migrate(database, { migrationsFolder: "./drizzle" });
  db = database as unknown as Db;
});

describe("sample companies", () => {
  it("has 20 to 30 companies that pass the same checks as real ones", () => {
    expect(SAMPLE_COMPANIES.length).toBeGreaterThanOrEqual(20);
    expect(SAMPLE_COMPANIES.length).toBeLessThanOrEqual(30);
    for (const company of SAMPLE_COMPANIES) {
      expect(companyProblems({ ...company, website: "" }), company.name).toEqual([]);
    }
    expect(new Set(SAMPLE_COMPANIES.map((company) => company.slug)).size).toBe(SAMPLE_COMPANIES.length);
  });

  it("adds every company and role once, even when run again", async () => {
    expect(await seedSampleCompanies(db)).toBe(SAMPLE_COMPANIES.length);
    expect(await seedSampleCompanies(db)).toBe(0);

    const roleCount = SAMPLE_COMPANIES.reduce((total, company) => total + company.roles.length, 0);
    const openRoles = await db.select().from(schema.jobs).where(eq(schema.jobs.status, "OPEN"));
    expect(openRoles).toHaveLength(roleCount);
    const samples = await db.select().from(schema.users).where(eq(schema.users.isSample, true));
    expect(samples).toHaveLength(SAMPLE_COMPANIES.length);
  });
});
