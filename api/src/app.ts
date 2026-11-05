import cookie from "@fastify/cookie";
import { and, eq } from "drizzle-orm";
import Fastify, { type FastifyRequest } from "fastify";
import { assertCanApply, ConflictError, createApplication } from "./applications.ts";
import type { Db } from "./db/index.ts";
import { applications, jobs, users } from "./db/schema.ts";
import { type OrderGateway, PayPalError } from "./paypal.ts";
import type { PaymentGateway } from "./poller.ts";

const LISTING_FEE = 49;
const BOND_PER_APPLICANT = 5;
const HOLD_AMOUNT = "2.00";

class HttpError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function createApp(deps: {
  db: Db;
  payments: PaymentGateway & OrderGateway;
  sessionSecret: string;
  demoModeEnabled: boolean;
}) {
  const { db, payments, demoModeEnabled } = deps;
  const app = Fastify({ logger: process.env.NODE_ENV === "production" });
  app.register(cookie, { secret: deps.sessionSecret });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ConflictError) return reply.status(409).send({ error: error.message });
    if (error instanceof HttpError) return reply.status(error.statusCode).send({ error: error.message });
    if (error instanceof PayPalError) {
      request.log.error(error);
      return reply.status(502).send({ error: "PayPal could not complete this request" });
    }
    const { statusCode } = error as { statusCode?: number };
    if (statusCode && statusCode < 500) return reply.status(statusCode).send({ error: (error as Error).message });
    request.log.error(error);
    return reply.status(500).send({ error: "Something went wrong" });
  });

  async function requireUser(request: FastifyRequest, role: "CANDIDATE" | "RECRUITER") {
    const session = request.unsignCookie(request.cookies.session ?? "");
    if (!session.valid || !session.value) throw new HttpError(401, "Log in first");

    const [user] = await db.select().from(users).where(eq(users.id, session.value));
    if (!user) throw new HttpError(401, "Log in first");
    if (user.role !== role) throw new HttpError(403, "This account can't do that");
    return user;
  }

  app.get("/api/health", async () => ({ status: "ok" }));

  app.post<{ Body: { title: string; requirementsText: string; applicantCap: number } }>(
    "/api/jobs",
    {
      schema: {
        body: {
          type: "object",
          required: ["title", "requirementsText", "applicantCap"],
          properties: {
            title: { type: "string", minLength: 1 },
            requirementsText: { type: "string", minLength: 1 },
            applicantCap: { type: "integer", minimum: 1, maximum: 500 },
          },
        },
      },
    },
    async (request, reply) => {
      const recruiter = await requireUser(request, "RECRUITER");
      const { title, requirementsText, applicantCap } = request.body;
      const bondTotal = applicantCap * BOND_PER_APPLICANT;
      const total = (LISTING_FEE + bondTotal).toFixed(2);
      const orderId = await payments.createOrder("CAPTURE", total);

      const [job] = await db
        .insert(jobs)
        .values({
          recruiterId: recruiter.id,
          title,
          requirementsText,
          applicantCap,
          bondTotal: bondTotal.toFixed(2),
          fundingOrderId: orderId,
        })
        .returning();
      return reply.status(201).send({ jobId: job.id, orderId, total });
    },
  );

  // The order is read from the job, so a client can't fund a role with another order.
  app.post<{ Params: { id: string } }>("/api/jobs/:id/fund", async (request) => {
    const recruiter = await requireUser(request, "RECRUITER");
    const [job] = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, request.params.id), eq(jobs.recruiterId, recruiter.id)));
    if (!job) throw new HttpError(404, "Role not found");
    if (job.status !== "DRAFT") return { jobId: job.id, status: job.status };

    const capture = await payments.captureOrder(job.fundingOrderId!);
    if (capture.status !== "COMPLETED") {
      throw new ConflictError(`Payment is ${capture.status.toLowerCase()}, so the role isn't open yet`);
    }

    const [opened] = await db
      .update(jobs)
      .set({ status: "OPEN", bondCaptureId: capture.captureId })
      .where(and(eq(jobs.id, job.id), eq(jobs.status, "DRAFT")))
      .returning();
    return { jobId: job.id, status: opened?.status ?? "OPEN" };
  });

  app.post<{ Params: { id: string } }>("/api/jobs/:id/applications/order", async (request, reply) => {
    const candidate = await requireUser(request, "CANDIDATE");
    await assertCanApply(db, request.params.id, candidate.id);
    const orderId = await payments.createOrder("AUTHORIZE", HOLD_AMOUNT);
    return reply.status(201).send({ orderId });
  });

  app.post<{
    Params: { id: string };
    Body: { orderId: string; resumeText: string; demoMode?: boolean };
  }>(
    "/api/jobs/:id/applications",
    {
      schema: {
        body: {
          type: "object",
          required: ["orderId", "resumeText"],
          properties: {
            orderId: { type: "string", minLength: 1 },
            resumeText: { type: "string", minLength: 1 },
            demoMode: { type: "boolean" },
          },
        },
      },
    },
    async (request, reply) => {
      const candidate = await requireUser(request, "CANDIDATE");
      const { orderId, resumeText, demoMode = false } = request.body;
      if (demoMode && !demoModeEnabled) throw new HttpError(403, "Demo Mode is turned off");

      const hold = await payments.authorizeOrder(orderId);

      // A retried request gets the same hold back. Never void a hold that's in use.
      const [existing] = await db
        .select()
        .from(applications)
        .where(eq(applications.paypalAuthId, hold.authorizationId));
      if (existing) {
        if (existing.candidateId === candidate.id && existing.jobId === request.params.id) {
          return existing;
        }
        throw new ConflictError("This payment has already been used");
      }

      try {
        if (hold.value !== HOLD_AMOUNT) throw new ConflictError("The hold amount is wrong");
        const application = await createApplication(db, {
          jobId: request.params.id,
          candidateId: candidate.id,
          resumeText,
          paypalAuthId: hold.authorizationId,
          demoMode,
          now: new Date(),
        });
        return reply.status(201).send(application);
      } catch (error) {
        if (error instanceof ConflictError) await payments.voidAuthorization(hold.authorizationId);
        throw error;
      }
    },
  );

  return app;
}
