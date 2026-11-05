import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createApp } from "./app.ts";
import * as schema from "./db/schema.ts";
import { createPayPalGateway } from "./paypal.ts";
import { startPoller } from "./poller.ts";

const POLLER_INTERVAL_MS = 2000;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

const db = drizzle(requireEnv("DATABASE_URL"), { schema, casing: "snake_case" });
await migrate(db, { migrationsFolder: "./drizzle" });

const payments = createPayPalGateway({
  baseUrl: "https://api-m.sandbox.paypal.com",
  clientId: requireEnv("PAYPAL_CLIENT_ID"),
  clientSecret: requireEnv("PAYPAL_CLIENT_SECRET"),
});

const app = createApp({
  db,
  payments,
  sessionSecret: requireEnv("SESSION_SECRET"),
  demoModeEnabled: process.env.DEMO_MODE_ENABLED === "true",
});

startPoller(db, payments, POLLER_INTERVAL_MS);

await app.listen({
  host: "0.0.0.0",
  port: Number(process.env.PORT ?? 4000),
});
