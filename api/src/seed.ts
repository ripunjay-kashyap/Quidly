import type { Db } from "./db/index.ts";
import { jobs, users } from "./db/schema.ts";
import { SAMPLE_COMPANIES } from "./sample-data.ts";

const BOND_PER_APPLICANT = 5;
const HOUR_MS = 60 * 60 * 1000;

// Adds any sample company that isn't there yet, so it's safe to run on every start.
// Sample roles have no PayPal capture: their companies can't log in, so they're never closed.
export async function seedSampleCompanies(db: Db, now = new Date()): Promise<number> {
  let added = 0;
  for (const [index, company] of SAMPLE_COMPANIES.entries()) {
    const [recruiter] = await db
      .insert(users)
      .values({
        role: "RECRUITER",
        email: `talent@${company.slug}.example`,
        isSample: true,
        companyName: company.name,
        companyIndustry: company.industry,
        companySize: company.size,
        companyDescription: company.description,
      })
      .onConflictDoNothing({ target: users.email })
      .returning();
    if (!recruiter) continue;

    await db.insert(jobs).values(
      company.roles.map((role, roleIndex) => ({
        ...role,
        recruiterId: recruiter.id,
        bondTotal: (role.applicantCap * BOND_PER_APPLICANT).toFixed(2),
        status: "OPEN" as const,
        // Spread over the past few days so the board isn't all posted at once.
        createdAt: new Date(now.getTime() - (index * 3 + roleIndex + 1) * HOUR_MS),
      })),
    );
    added += 1;
  }
  return added;
}
