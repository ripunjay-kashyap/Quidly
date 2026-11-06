import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createApp } from "./app.ts";
import * as schema from "./db/schema.ts";
import { websiteIsReachable } from "./company.ts";
import { createElasticFeedbackChecker } from "./feedback.ts";
import { createPayPalGateway } from "./paypal.ts";
import { startPoller } from "./poller.ts";
import { seedSampleCompanies } from "./seed.ts";

const POLLER_INTERVAL_MS = 2000;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

const db = drizzle(requireEnv("DATABASE_URL"), { schema, casing: "snake_case" });
await migrate(db, { migrationsFolder: "./drizzle" });
console.log(`Added ${await seedSampleCompanies(db)} sample companies`);

const paypalClientId = requireEnv("PAYPAL_CLIENT_ID");
const payments = createPayPalGateway({
  baseUrl: "https://api-m.sandbox.paypal.com",
  loginBaseUrl: "https://www.sandbox.paypal.com",
  clientId: paypalClientId,
  clientSecret: requireEnv("PAYPAL_CLIENT_SECRET"),
});

const feedback = createElasticFeedbackChecker({
  url: requireEnv("ELASTIC_URL"),
  apiKey: requireEnv("ELASTIC_API_KEY"),
});

const app = createApp({
  db,
  payments,
  feedback,
  paypalClientId,
  checkWebsite: websiteIsReachable,
  sessionSecret: requireEnv("SESSION_SECRET"),
  appUrl: requireEnv("APP_URL"),
  demoModeEnabled: process.env.DEMO_MODE_ENABLED === "true",
});

startPoller(db, payments, POLLER_INTERVAL_MS);

await app.listen({
  host: "0.0.0.0",
  port: Number(process.env.PORT ?? 4000),
});
