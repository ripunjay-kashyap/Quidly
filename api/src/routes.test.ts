import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "./app.ts";
import type { Db } from "./db/index.ts";
import * as schema from "./db/schema.ts";

const { applications, jobs, users } = schema;

let db: Db;
let app: ReturnType<typeof createApp>;
let recruiterCookie: string;
let candidateCookie: string;
let candidateId: string;
let holdCounter: number;
const payments = {
  createOrder: vi.fn(),
  captureOrder: vi.fn(),
  authorizeOrder: vi.fn(),
  voidAuthorization: vi.fn(),
  sendPayout: vi.fn(),
  getPayoutStatus: vi.fn(),
  loginUrl: vi.fn(),
  getLoginProfile: vi.fn(),
};
const feedback = { check: vi.fn() };

async function login(role: "CANDIDATE" | "RECRUITER", email: string) {
  const [user] = await db.insert(users).values({ role, email }).returning();
  return { id: user.id, cookie: `session=${encodeURIComponent(app.signCookie(user.id))}` };
}

function post(url: string, cookie: string | undefined, payload?: object) {
  return app.inject({
    method: "POST",
    url,
    headers: cookie ? { cookie } : {},
    ...(payload ? { payload } : {}),
  });
}

async function fundedJob(applicantCap = 10): Promise<string> {
  const created = await post("/api/jobs", recruiterCookie, {
    title: "Senior Backend Engineer",
    requirementsText: "Go, Postgres, Kubernetes",
    applicantCap,
  });
  const { jobId } = created.json();
  await post(`/api/jobs/${jobId}/fund`, recruiterCookie);
  return jobId;
}

const applyBody = { orderId: "ORDER-HOLD", resumeText: "Six years of Go" };

beforeEach(async () => {
  const client = new PGlite();
  const database = drizzle(client, { schema, casing: "snake_case" });
  await migrate(database, { migrationsFolder: "./drizzle" });
  db = database as unknown as Db;

  holdCounter = 0;
  vi.resetAllMocks();
  payments.createOrder.mockResolvedValue("ORDER-1");
  payments.captureOrder.mockResolvedValue({ captureId: "CAPTURE-1", status: "COMPLETED" });
  payments.authorizeOrder.mockImplementation(async () => {
    holdCounter += 1;
    return { authorizationId: `AUTH-${holdCounter}`, value: "2.00" };
  });

  payments.loginUrl.mockImplementation((state: string) => `https://paypal.test/login?state=${state}`);
  payments.getLoginProfile.mockResolvedValue({
    payerId: "PAYER-1",
    email: "new@example.com",
    verified: true,
  });

  feedback.check.mockResolvedValue({ passed: true, qualityScore: 0.6 });

  app = createApp({
    db,
    payments,
    feedback,
    sessionSecret: "test-secret",
    appUrl: "https://quidly.test",
    demoModeEnabled: false,
  });
  await app.ready();

  recruiterCookie = (await login("RECRUITER", "hr@example.com")).cookie;
  const candidate = await login("CANDIDATE", "candidate@example.com");
  candidateCookie = candidate.cookie;
  candidateId = candidate.id;
});

describe("sessions", () => {
  it("rejects a missing cookie and a forged one", async () => {
    const body = { title: "Role", requirementsText: "Go", applicantCap: 1 };
    expect((await post("/api/jobs", undefined, body)).statusCode).toBe(401);
    expect((await post("/api/jobs", `session=${candidateId}`, body)).statusCode).toBe(401);
  });

  it("stops candidates creating roles and recruiters applying", async () => {
    const body = { title: "Role", requirementsText: "Go", applicantCap: 1 };
    expect((await post("/api/jobs", candidateCookie, body)).statusCode).toBe(403);
    const jobId = await fundedJob();
    const response = await post(`/api/jobs/${jobId}/applications/order`, recruiterCookie);
    expect(response.statusCode).toBe(403);
  });
});

describe("logging in with PayPal", () => {
  async function startLogin(role: string) {
    const response = await app.inject({ method: "GET", url: `/api/auth/paypal?role=${role}` });
    const state = new URL(response.headers.location as string).searchParams.get("state");
    const stateCookie = response.cookies.find((entry) => entry.name === "login_state")!;
    return { state, cookie: `login_state=${encodeURIComponent(stateCookie.value)}` };
  }

  function callback(query: string, cookie?: string) {
    return app.inject({
      method: "GET",
      url: `/api/auth/paypal/callback?${query}`,
      headers: cookie ? { cookie } : {},
    });
  }

  async function finishLogin(role: string) {
    const { state, cookie } = await startLogin(role);
    return callback(`code=CODE&state=${state}`, cookie);
  }

  function sessionFrom(response: Awaited<ReturnType<typeof callback>>) {
    const session = response.cookies.find((entry) => entry.name === "session")!;
    return `session=${encodeURIComponent(session.value)}`;
  }

  it("creates a user with the chosen role and logs them in", async () => {
    const response = await finishLogin("RECRUITER");
    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe("/");
    expect(payments.loginUrl).toHaveBeenCalledWith(
      expect.any(String),
      "https://quidly.test/api/auth/paypal/callback",
    );

    const me = await app.inject({ method: "GET", url: "/api/me", headers: { cookie: sessionFrom(response) } });
    expect(me.json()).toMatchObject({ role: "RECRUITER", email: "new@example.com", paypalVerified: true });
  });

  it("keeps a returning user's role and updates their email", async () => {
    await finishLogin("CANDIDATE");
    payments.getLoginProfile.mockResolvedValue({
      payerId: "PAYER-1",
      email: "changed@example.com",
      verified: true,
    });
    const response = await finishLogin("RECRUITER");

    const me = await app.inject({ method: "GET", url: "/api/me", headers: { cookie: sessionFrom(response) } });
    expect(me.json()).toMatchObject({ role: "CANDIDATE", email: "changed@example.com" });
  });

  it("refuses a callback with a wrong state or no state cookie", async () => {
    const { cookie } = await startLogin("CANDIDATE");
    for (const response of [await callback("code=CODE&state=wrong", cookie), await callback("code=CODE&state=x")]) {
      expect(response.headers.location).toBe("/?login=failed");
    }
    expect(payments.getLoginProfile).not.toHaveBeenCalled();
  });

  it("refuses a forged state cookie", async () => {
    const response = await callback("code=CODE&state=abc", "login_state=abc:RECRUITER");
    expect(response.headers.location).toBe("/?login=failed");
    expect(payments.getLoginProfile).not.toHaveBeenCalled();
  });

  it("reports a failed login when the user cancels or PayPal fails", async () => {
    const { state, cookie } = await startLogin("CANDIDATE");
    const cancelled = await callback(`error=access_denied&state=${state}`, cookie);
    expect(cancelled.headers.location).toBe("/?login=failed");

    payments.getLoginProfile.mockRejectedValue(new Error("PayPal is down"));
    const failed = await finishLogin("CANDIDATE");
    expect(failed.headers.location).toBe("/?login=failed");
    expect(failed.cookies.find((entry) => entry.name === "session")).toBeUndefined();
  });

  it("rejects an unknown role", async () => {
    const response = await app.inject({ method: "GET", url: "/api/auth/paypal?role=ADMIN" });
    expect(response.statusCode).toBe(400);
  });

  it("logs out", async () => {
    const response = await app.inject({ method: "POST", url: "/api/auth/logout" });
    expect(response.cookies.find((entry) => entry.name === "session")?.value).toBe("");
    expect((await app.inject({ method: "GET", url: "/api/me" })).statusCode).toBe(401);
  });
});

describe("funding a role", () => {
  it("charges the listing fee plus the bond and starts as a draft", async () => {
    const response = await post("/api/jobs", recruiterCookie, {
      title: "Role",
      requirementsText: "Go",
      applicantCap: 10,
    });
    expect(response.statusCode).toBe(201);
    expect(response.json().total).toBe("99.00");
    expect(payments.createOrder).toHaveBeenCalledWith("CAPTURE", "99.00");

    const [job] = await db.select().from(jobs).where(eq(jobs.id, response.json().jobId));
    expect(job.status).toBe("DRAFT");
    expect(job.bondTotal).toBe("50.00");
  });

  it("opens the role after capture, and a retry doesn't capture again", async () => {
    const jobId = await fundedJob();
    const retry = await post(`/api/jobs/${jobId}/fund`, recruiterCookie);
    expect(retry.json().status).toBe("OPEN");
    expect(payments.captureOrder).toHaveBeenCalledTimes(1);

    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
    expect(job.bondCaptureId).toBe("CAPTURE-1");
  });

  it("keeps the role closed if the capture isn't completed", async () => {
    payments.captureOrder.mockResolvedValue({ captureId: "C", status: "PENDING" });
    const jobId = await fundedJob();
    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
    expect(job.status).toBe("DRAFT");
  });

  it("doesn't let another recruiter fund the role", async () => {
    const created = await post("/api/jobs", recruiterCookie, {
      title: "Role",
      requirementsText: "Go",
      applicantCap: 1,
    });
    const other = await login("RECRUITER", "other-hr@example.com");
    const response = await post(`/api/jobs/${created.json().jobId}/fund`, other.cookie);
    expect(response.statusCode).toBe(404);
    expect(payments.captureOrder).not.toHaveBeenCalled();
  });
});

describe("applying", () => {
  it("creates a $2 hold order, then an application using a slot", async () => {
    const jobId = await fundedJob();
    const order = await post(`/api/jobs/${jobId}/applications/order`, candidateCookie);
    expect(order.statusCode).toBe(201);
    expect(payments.createOrder).toHaveBeenLastCalledWith("AUTHORIZE", "2.00");

    const response = await post(`/api/jobs/${jobId}/applications`, candidateCookie, applyBody);
    expect(response.statusCode).toBe(201);
    expect(response.json().paypalAuthId).toBe("AUTH-1");

    const [candidate] = await db.select().from(users).where(eq(users.id, candidateId));
    expect(candidate.availableSlots).toBe(4);
  });

  it("refuses an order for a draft role before asking for a hold", async () => {
    const created = await post("/api/jobs", recruiterCookie, {
      title: "Role",
      requirementsText: "Go",
      applicantCap: 1,
    });
    payments.createOrder.mockClear();
    const response = await post(`/api/jobs/${created.json().jobId}/applications/order`, candidateCookie);
    expect(response.statusCode).toBe(409);
    expect(payments.createOrder).not.toHaveBeenCalled();
  });

  it("voids the hold if the role filled up after approval", async () => {
    const jobId = await fundedJob(1);
    const other = await login("CANDIDATE", "other@example.com");
    await post(`/api/jobs/${jobId}/applications`, other.cookie, applyBody);

    const response = await post(`/api/jobs/${jobId}/applications`, candidateCookie, applyBody);
    expect(response.statusCode).toBe(409);
    expect(payments.voidAuthorization).toHaveBeenCalledWith("AUTH-2");
  });

  it("voids the hold if the amount is wrong", async () => {
    const jobId = await fundedJob();
    payments.authorizeOrder.mockResolvedValue({ authorizationId: "AUTH-X", value: "0.01" });
    const response = await post(`/api/jobs/${jobId}/applications`, candidateCookie, applyBody);
    expect(response.statusCode).toBe(409);
    expect(payments.voidAuthorization).toHaveBeenCalledWith("AUTH-X");
    expect(await db.select().from(applications)).toHaveLength(0);
  });

  it("returns the same application on a retry, without voiding its hold", async () => {
    const jobId = await fundedJob();
    payments.authorizeOrder.mockResolvedValue({ authorizationId: "AUTH-SAME", value: "2.00" });
    const first = await post(`/api/jobs/${jobId}/applications`, candidateCookie, applyBody);
    const retry = await post(`/api/jobs/${jobId}/applications`, candidateCookie, applyBody);

    expect(retry.json().id).toBe(first.json().id);
    expect(payments.voidAuthorization).not.toHaveBeenCalled();
    const [candidate] = await db.select().from(users).where(eq(users.id, candidateId));
    expect(candidate.availableSlots).toBe(4);
  });

  it("refuses to reuse a hold on another role, without voiding it", async () => {
    const firstJob = await fundedJob();
    const secondJob = await fundedJob();
    payments.authorizeOrder.mockResolvedValue({ authorizationId: "AUTH-SAME", value: "2.00" });
    await post(`/api/jobs/${firstJob}/applications`, candidateCookie, applyBody);

    const response = await post(`/api/jobs/${secondJob}/applications`, candidateCookie, applyBody);
    expect(response.statusCode).toBe(409);
    expect(payments.voidAuthorization).not.toHaveBeenCalled();
  });

  it("refuses Demo Mode when it's turned off", async () => {
    const jobId = await fundedJob();
    const response = await post(`/api/jobs/${jobId}/applications`, candidateCookie, {
      ...applyBody,
      demoMode: true,
    });
    expect(response.statusCode).toBe(403);
    expect(payments.authorizeOrder).not.toHaveBeenCalled();
  });
});

describe("responding to an application", () => {
  const rejection = {
    unmetRequirement: "kubernetes",
    feedback: "This role needs production Kubernetes, which your resume doesn't show.",
  };

  async function application(): Promise<string> {
    const jobId = await fundedJob();
    const response = await post(`/api/jobs/${jobId}/applications`, candidateCookie, applyBody);
    return response.json().id;
  }

  async function slots(): Promise<number> {
    const [candidate] = await db.select().from(users).where(eq(users.id, candidateId));
    return candidate.availableSlots;
  }

  it("rejects with feedback that passes the checks and frees the slot", async () => {
    const id = await application();
    const response = await post(`/api/applications/${id}/reject`, recruiterCookie, rejection);
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: "REJECTED_RELEASED", unmetRequirement: "kubernetes" });
    expect(feedback.check).toHaveBeenCalledWith({
      feedback: rejection.feedback,
      resumeText: "Six years of Go",
      requirementsText: "Go, Postgres, Kubernetes",
    });
    expect(await slots()).toBe(5);
  });

  it("explains why feedback was blocked and leaves the application open", async () => {
    const id = await application();
    feedback.check.mockResolvedValue({ passed: false, reason: "Too generic" });
    const response = await post(`/api/applications/${id}/reject`, recruiterCookie, rejection);
    expect(response.statusCode).toBe(422);
    expect(response.json().error).toBe("Too generic");

    const [row] = await db.select().from(applications).where(eq(applications.id, id));
    expect(row.status).toBe("ACTIVE");
  });

  it("needs the unmet requirement to come from the listing", async () => {
    const id = await application();
    const response = await post(`/api/applications/${id}/reject`, recruiterCookie, {
      ...rejection,
      unmetRequirement: "Rust",
    });
    expect(response.statusCode).toBe(422);
    expect(feedback.check).not.toHaveBeenCalled();
  });

  it("refuses a rejection after the deadline without calling Elastic", async () => {
    const id = await application();
    await db.update(applications).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(applications.id, id));
    const response = await post(`/api/applications/${id}/reject`, recruiterCookie, rejection);
    expect(response.statusCode).toBe(409);
    expect(feedback.check).not.toHaveBeenCalled();
  });

  it("hides other recruiters' applications", async () => {
    const id = await application();
    const other = await login("RECRUITER", "other-hr@example.com");
    expect((await post(`/api/applications/${id}/reject`, other.cookie, rejection)).statusCode).toBe(404);
    const invite = { interviewAt: new Date(Date.now() + 86_400_000).toISOString() };
    expect((await post(`/api/applications/${id}/invite`, other.cookie, invite)).statusCode).toBe(404);
  });

  it("invites, then frees the slot when the candidate confirms", async () => {
    const id = await application();
    const interviewAt = new Date(Date.now() + 86_400_000).toISOString();
    const invite = await post(`/api/applications/${id}/invite`, recruiterCookie, { interviewAt });
    expect(invite.json().status).toBe("INTERVIEW_PENDING");
    expect(await slots()).toBe(4);

    const confirm = await post(`/api/applications/${id}/confirm-interview`, candidateCookie, { genuine: true });
    expect(confirm.json().status).toBe("INTERVIEW_CONFIRMED");
    expect(await slots()).toBe(5);
  });

  it("marks a reported invite as disputed and keeps the slot used", async () => {
    const id = await application();
    const interviewAt = new Date(Date.now() + 86_400_000).toISOString();
    await post(`/api/applications/${id}/invite`, recruiterCookie, { interviewAt });
    const report = await post(`/api/applications/${id}/confirm-interview`, candidateCookie, { genuine: false });
    expect(report.json().status).toBe("DISPUTED");
    expect(await slots()).toBe(4);
  });

  it("refuses an interview time in the past", async () => {
    const id = await application();
    const response = await post(`/api/applications/${id}/invite`, recruiterCookie, {
      interviewAt: new Date(Date.now() - 1000).toISOString(),
    });
    expect(response.statusCode).toBe(422);
  });

  it("only lets the candidate who applied confirm, and only after an invite", async () => {
    const id = await application();
    const other = await login("CANDIDATE", "other@example.com");
    const body = { genuine: true };
    expect((await post(`/api/applications/${id}/confirm-interview`, other.cookie, body)).statusCode).toBe(404);
    expect((await post(`/api/applications/${id}/confirm-interview`, candidateCookie, body)).statusCode).toBe(409);
  });
});
