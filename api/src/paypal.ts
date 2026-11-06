import type { PaymentGateway } from "./poller.ts";

const FAILED_ITEM_STATUSES = new Set(["FAILED", "RETURNED", "BLOCKED", "REFUNDED", "REVERSED", "DENIED"]);

export class PayPalError extends Error {
  readonly status: number;
  readonly body: any;

  constructor(path: string, status: number, body: any) {
    super(`PayPal ${path} failed with ${status}: ${JSON.stringify(body)}`);
    this.status = status;
    this.body = body;
  }
}

export interface OrderGateway {
  createOrder(intent: "CAPTURE" | "AUTHORIZE", value: string): Promise<string>;
  // Both are safe to retry: PayPal returns the original result for the same order.
  captureOrder(orderId: string): Promise<{ captureId: string; status: string }>;
  authorizeOrder(orderId: string): Promise<{ authorizationId: string; value: string }>;
  // Safe to retry with the same requestId: PayPal returns the original refund.
  refundCapture(captureId: string, value: string, requestId: string): Promise<{ status: string }>;
}

export interface LoginGateway {
  loginUrl(state: string, redirectUri: string): string;
  getLoginProfile(code: string): Promise<{ payerId: string; email: string; verified: boolean }>;
}

export function createPayPalGateway(config: {
  baseUrl: string;
  loginBaseUrl: string;
  clientId: string;
  clientSecret: string;
}): PaymentGateway & OrderGateway & LoginGateway {
  let token: { value: string; expiresAt: number } | undefined;

  async function getToken(): Promise<string> {
    if (token && Date.now() < token.expiresAt) return token.value;

    const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");
    const response = await fetch(`${config.baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    const data = await response.json();
    if (!response.ok) throw new PayPalError("/v1/oauth2/token", response.status, data);

    token = { value: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
    return token.value;
  }

  async function request(
    method: "GET" | "POST",
    path: string,
    body?: unknown,
    requestId?: string,
  ): Promise<any> {
    const response = await fetch(`${config.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${await getToken()}`,
        "Content-Type": "application/json",
        ...(requestId ? { "PayPal-Request-Id": requestId } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) throw new PayPalError(path, response.status, data);
    return data;
  }

  return {
    loginUrl(state, redirectUri) {
      const query = new URLSearchParams({
        client_id: config.clientId,
        response_type: "code",
        scope: "openid email profile",
        redirect_uri: redirectUri,
        state,
      });
      return `${config.loginBaseUrl}/signin/authorize?${query}`;
    },

    async getLoginProfile(code) {
      const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");
      const tokenResponse = await fetch(`${config.baseUrl}/v1/oauth2/token`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ grant_type: "authorization_code", code }),
      });
      const tokens = await tokenResponse.json();
      if (!tokenResponse.ok) throw new PayPalError("/v1/oauth2/token", tokenResponse.status, tokens);

      const path = "/v1/identity/oauth2/userinfo?schema=paypalv1.1";
      const profileResponse = await fetch(`${config.baseUrl}${path}`, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const profile = await profileResponse.json();
      if (!profileResponse.ok) throw new PayPalError(path, profileResponse.status, profile);

      const email = profile.emails?.find((entry: any) => entry.primary)?.value ?? profile.emails?.[0]?.value;
      if (!email) throw new PayPalError(path, profileResponse.status, { error: "no email returned" });
      return {
        payerId: profile.payer_id ?? profile.user_id,
        email,
        verified: String(profile.verified_account) === "true",
      };
    },

    async createOrder(intent, value) {
      const order = await request("POST", "/v2/checkout/orders", {
        intent,
        purchase_units: [{ amount: { currency_code: "USD", value } }],
      });
      return order.id;
    },

    async captureOrder(orderId) {
      const order = await request(
        "POST",
        `/v2/checkout/orders/${orderId}/capture`,
        {},
        `capture-${orderId}`,
      );
      const capture = order.purchase_units[0].payments.captures[0];
      return { captureId: capture.id, status: capture.status };
    },

    async authorizeOrder(orderId) {
      const order = await request(
        "POST",
        `/v2/checkout/orders/${orderId}/authorize`,
        {},
        `authorize-${orderId}`,
      );
      const authorization = order.purchase_units[0].payments.authorizations[0];
      return { authorizationId: authorization.id, value: authorization.amount.value };
    },

    async refundCapture(captureId, value, requestId) {
      const refund = await request(
        "POST",
        `/v2/payments/captures/${captureId}/refund`,
        { amount: { currency_code: "USD", value } },
        requestId,
      );
      return { status: refund.status };
    },

    async voidAuthorization(authorizationId) {
      try {
        await request("POST", `/v2/payments/authorizations/${authorizationId}/void`);
      } catch (error) {
        // A retry after a lost response finds the hold already void.
        const issue = error instanceof PayPalError ? error.body?.details?.[0]?.issue : undefined;
        if (issue !== "PREVIOUSLY_VOIDED") throw error;
      }
    },

    async sendPayout({ senderBatchId, receiver, value }) {
      try {
        const payout = await request("POST", "/v1/payments/payouts", {
          sender_batch_header: {
            sender_batch_id: senderBatchId,
            email_subject: "You received $5 from Quidly",
          },
          items: [
            {
              recipient_type: "EMAIL",
              receiver,
              amount: { currency: "USD", value },
              note: "A company missed its response deadline on your application.",
            },
          ],
        });
        return payout.batch_header.payout_batch_id;
      } catch (error) {
        // PayPal refuses a repeated batch ID and links to the original batch,
        // so a retry after a lost response recovers the batch without paying twice.
        const detail = error instanceof PayPalError ? error.body?.details?.[0] : undefined;
        const existingBatchId =
          detail?.field === "SENDER_BATCH_ID" ? detail.link?.[0]?.href?.split("/").pop() : undefined;
        if (!existingBatchId) throw error;
        return existingBatchId;
      }
    },

    // A batch can succeed while its item fails, so this reads the item status.
    async getPayoutStatus(batchId) {
      const batch = await request("GET", `/v1/payments/payouts/${batchId}`);
      const itemStatus = batch.items?.[0]?.transaction_status;
      if (itemStatus === "SUCCESS") return "SUCCESS";
      if (FAILED_ITEM_STATUSES.has(itemStatus)) return "FAILED";
      return "PENDING";
    },
  };
}
