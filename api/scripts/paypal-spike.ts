// Proves every PayPal call Quidly depends on, against the sandbox only.
// Run with: npm run spike:paypal
import { randomUUID } from "node:crypto";
import { createInterface } from "node:readline/promises";

const BASE_URL = "https://api-m.sandbox.paypal.com";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} in api/.env`);
  return value;
}

const clientId = requireEnv("PAYPAL_CLIENT_ID");
const clientSecret = requireEnv("PAYPAL_CLIENT_SECRET");
const payoutReceiver = requireEnv("PAYPAL_PAYOUT_RECEIVER");

async function getAccessToken(): Promise<string> {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!response.ok) {
    throw new Error(`Token request failed: ${response.status} ${await response.text()}`);
  }
  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

const token = await getAccessToken();
console.log("PASS  sandbox access token");

async function paypal(method: "GET" | "POST", path: string, body?: unknown): Promise<any> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": randomUUID(),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const debugId = response.headers.get("paypal-debug-id");
  if (!response.ok) {
    throw new Error(`${method} ${path} failed: ${response.status} (debug id ${debugId}) ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

const money = (value: string) => ({ currency_code: "USD", value });
const prompt = createInterface({ input: process.stdin, output: process.stdout });

async function createApprovedOrder(intent: "CAPTURE" | "AUTHORIZE", value: string): Promise<string> {
  const order = await paypal("POST", "/v2/checkout/orders", {
    intent,
    purchase_units: [{ amount: money(value) }],
    payment_source: {
      paypal: {
        experience_context: {
          return_url: "https://example.com/approved",
          cancel_url: "https://example.com/cancelled",
          user_action: "PAY_NOW",
        },
      },
    },
  });
  const approval = order.links.find((link: { rel: string }) => link.rel === "payer-action");
  console.log(`\nApprove this ${intent} order with a sandbox personal account:\n${approval.href}`);
  await prompt.question("After you're redirected to example.com, press Enter here...");
  return order.id;
}

// Company bond: capture $55, then partially refund the unused $5.
const captureOrderId = await createApprovedOrder("CAPTURE", "55.00");
const capturedOrder = await paypal("POST", `/v2/checkout/orders/${captureOrderId}/capture`, {});
const capture = capturedOrder.purchase_units[0].payments.captures[0];
console.log(`PASS  capture ${capture.id} (${capture.status})`);
console.log("      breakdown:", JSON.stringify(capture.seller_receivable_breakdown ?? null));

const refund = await paypal("POST", `/v2/payments/captures/${capture.id}/refund`, {
  amount: money("5.00"),
});
console.log(`PASS  partial refund ${refund.id} (${refund.status})`);

// Candidate hold: authorize $2, then void it.
const authorizeOrderId = await createApprovedOrder("AUTHORIZE", "2.00");
const authorizedOrder = await paypal("POST", `/v2/checkout/orders/${authorizeOrderId}/authorize`, {});
const authorization = authorizedOrder.purchase_units[0].payments.authorizations[0];
console.log(`PASS  authorization ${authorization.id} (${authorization.status})`);
console.log(`      expires: ${authorization.expiration_time ?? "not returned"}`);

await paypal("POST", `/v2/payments/authorizations/${authorization.id}/void`);
const voided = await paypal("GET", `/v2/payments/authorizations/${authorization.id}`);
console.log(`PASS  void (${voided.status})`);

// Ghosting penalty: pay the candidate $5, then poll until the batch settles.
const payout = await paypal("POST", "/v1/payments/payouts", {
  sender_batch_header: {
    sender_batch_id: `quidly-spike-${randomUUID()}`,
    email_subject: "Quidly sandbox payout",
  },
  items: [
    {
      recipient_type: "EMAIL",
      receiver: payoutReceiver,
      amount: { currency: "USD", value: "5.00" },
      note: "Quidly sandbox ghosting payout",
    },
  ],
});
const batchId = payout.batch_header.payout_batch_id;
console.log(`PASS  payout batch created ${batchId} (${payout.batch_header.batch_status})`);

let batchStatus = "";
for (let attempt = 0; attempt < 12; attempt += 1) {
  const batch = await paypal("GET", `/v1/payments/payouts/${batchId}`);
  batchStatus = batch.batch_header.batch_status;
  console.log(`      batch status: ${batchStatus}`);
  if (batchStatus !== "PENDING" && batchStatus !== "PROCESSING") break;
  await new Promise((resolve) => setTimeout(resolve, 5000));
}
if (batchStatus !== "SUCCESS") {
  throw new Error(`Payout did not succeed; last status was ${batchStatus}`);
}
console.log("PASS  payout settled");

prompt.close();
console.log("\nAll PayPal calls succeeded.");
