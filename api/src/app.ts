import { randomBytes } from "node:crypto";
import cookie from "@fastify/cookie";
import { and, asc, desc, eq, isNotNull, sql } from "drizzle-orm";
import Fastify, { type FastifyRequest } from "fastify";
import {
  assertCanApply,
  closeJob,
  ConflictError,
  createApplication,
  inviteToInterview,
  rejectApplication,
  resolveInterview,
} from "./applications.ts";
import { COMPANY_SIZES, type CompanyInput, companyProblems, INDUSTRIES, normalizeWebsite } from "./company.ts";
import type { Db } from "./db/index.ts";
import type { FeedbackChecker } from "./feedback.ts";
import { extractResumeText, MAX_RESUME_BYTES, MAX_RESUME_CHARS, ResumeError } from "./resume.ts";
import { applications, jobs, users } from "./db/schema.ts";
import { type LoginGateway, type OrderGateway, PayPalError } from "./paypal.ts";
import type { PaymentGateway } from "./poller.ts";

const LISTING_FEE = 49;
const BOND_PER_APPLICANT = 5;
const HOLD_AMOUNT = "2.00";
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const LOGIN_STATE_MAX_AGE_SECONDS = 10 * 60;

class HttpError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function createApp(deps: {
  db: Db;
  payments: PaymentGateway & OrderGateway & LoginGateway;
  feedback: FeedbackChecker;
  paypalClientId: string;
  checkWebsite: (origin: string) => Promise<boolean>;
  sessionSecret: string;
  appUrl: string;
  demoModeEnabled: boolean;
}) {
  const { db, payments, demoModeEnabled, appUrl } = deps;
  const loginRedirectUri = `${appUrl}/api/auth/paypal/callback`;
  const cookieOptions = {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: appUrl.startsWith("https://"),
    signed: true,
  } as const;
  const app = Fastify({ logger: process.env.NODE_ENV === "production" });
  app.register(cookie, { secret: deps.sessionSecret });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ConflictError) return reply.status(409).send({ error: error.message });
    if (error instanceof ResumeError) return reply.status(422).send({ error: error.message });
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

  async function currentUser(request: FastifyRequest) {
    const session = request.unsignCookie(request.cookies.session ?? "");
    if (!session.valid || !session.value) throw new HttpError(401, "Log in first");

    const [user] = await db.select().from(users).where(eq(users.id, session.value));
    if (!user) throw new HttpError(401, "Log in first");
    return user;
  }

  async function requireUser(request: FastifyRequest, role: "CANDIDATE" | "RECRUITER") {
    const user = await currentUser(request);
    if (user.role !== role) throw new HttpError(403, "This account can't do that");
    return user;
  }

  // Applications to the recruiter's own roles only.
  async function recruiterApplication(request: FastifyRequest<{ Params: { id: string } }>) {
    const recruiter = await requireUser(request, "RECRUITER");
    const [row] = await db
      .select({ application: applications, job: jobs })
      .from(applications)
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .where(and(eq(applications.id, request.params.id), eq(jobs.recruiterId, recruiter.id)));
    if (!row) throw new HttpError(404, "Application not found");
    return row;
  }

  app.get("/api/health", async () => ({ status: "ok" }));

  app.addContentTypeParser("application/pdf", { parseAs: "buffer", bodyLimit: MAX_RESUME_BYTES }, (_request, body, done) =>
    done(null, body),
  );

  const profileFields = {
    resumeText: users.resumeText,
    resumeFileName: users.resumeFileName,
    portfolioUrl: users.portfolioUrl,
    targetRoles: users.targetRoles,
  };

  app.get("/api/profile", async (request) => {
    const candidate = await requireUser(request, "CANDIDATE");
    const [profile] = await db.select(profileFields).from(users).where(eq(users.id, candidate.id));
    return profile;
  });

  // The browser sends the PDF itself as the body, with its name in a header.
  app.post<{ Body: Buffer }>("/api/profile/resume", async (request) => {
    const candidate = await requireUser(request, "CANDIDATE");
    if (!Buffer.isBuffer(request.body)) throw new ResumeError("Upload your resume as a PDF.");
    const resumeText = await extractResumeText(request.body);
    const fileName = String(request.headers["x-file-name"] ?? "resume.pdf").slice(0, 120);

    const [profile] = await db
      .update(users)
      .set({ resumeText, resumeFileName: decodeURIComponent(fileName) })
      .where(eq(users.id, candidate.id))
      .returning(profileFields);
    return profile;
  });

  app.put<{ Body: { resumeText: string; portfolioUrl: string; targetRoles: string } }>(
    "/api/profile",
    {
      schema: {
        body: {
          type: "object",
          required: ["resumeText", "portfolioUrl", "targetRoles"],
          properties: {
            resumeText: { type: "string", maxLength: MAX_RESUME_CHARS },
            portfolioUrl: { type: "string", maxLength: 200 },
            targetRoles: { type: "string", maxLength: 200 },
          },
        },
      },
    },
    async (request) => {
      const candidate = await requireUser(request, "CANDIDATE");
      const { resumeText, portfolioUrl, targetRoles } = request.body;
      const portfolio = portfolioUrl.trim();
      if (portfolio && !/^https?:\/\/[^\s]+$/.test(portfolio)) {
        throw new HttpError(422, "Enter the portfolio link as a full address, such as https://example.com.");
      }

      const [profile] = await db
        .update(users)
        .set({
          resumeText: resumeText.trim() || null,
          portfolioUrl: portfolio || null,
          targetRoles: targetRoles.trim() || null,
        })
        .where(eq(users.id, candidate.id))
        .returning(profileFields);
      return profile;
    },
  );

  // The client ID is public: the PayPal button needs it in the browser.
  app.get("/api/config", async () => ({
    paypalClientId: deps.paypalClientId,
    demoModeEnabled,
    industries: INDUSTRIES,
    companySizes: COMPANY_SIZES,
  }));

  const companyFields = {
    companyName: users.companyName,
    companyWebsite: users.companyWebsite,
    companyIndustry: users.companyIndustry,
    companySize: users.companySize,
    companyDescription: users.companyDescription,
    companyVerified: users.companyVerified,
    isSample: users.isSample,
  };

  const listingFields = {
    id: jobs.id,
    title: jobs.title,
    description: jobs.description,
    requirementsText: jobs.requirementsText,
    location: jobs.location,
    employmentType: jobs.employmentType,
    salaryRange: jobs.salaryRange,
    applicantCap: jobs.applicantCap,
    status: jobs.status,
    createdAt: jobs.createdAt,
    applicantCount: sql<number>`(select count(*)::int from ${applications} where ${applications.jobId} = ${jobs.id})`,
    companyId: users.id,
    companyName: users.companyName,
    companyVerified: users.companyVerified,
    isSample: users.isSample,
  };

  app.get("/api/jobs", async () =>
    db
      .select(listingFields)
      .from(jobs)
      .innerJoin(users, eq(jobs.recruiterId, users.id))
      .where(eq(jobs.status, "OPEN"))
      .orderBy(desc(jobs.createdAt)),
  );

  app.get<{ Params: { id: string } }>(
    "/api/jobs/:id",
    { schema: { params: { type: "object", properties: { id: { type: "string", format: "uuid" } } } } },
    async (request) => {
      const [job] = await db
        .select(listingFields)
        .from(jobs)
        .innerJoin(users, eq(jobs.recruiterId, users.id))
        .where(and(eq(jobs.id, request.params.id), sql`${jobs.status} <> 'DRAFT'`));
      if (!job) throw new HttpError(404, "Role not found");
      return job;
    },
  );

  app.get<{ Params: { id: string } }>(
    "/api/companies/:id",
    { schema: { params: { type: "object", properties: { id: { type: "string", format: "uuid" } } } } },
    async (request) => {
      const [company] = await db
        .select({ id: users.id, ...companyFields })
        .from(users)
        .where(and(eq(users.id, request.params.id), eq(users.role, "RECRUITER"), isNotNull(users.companyName)));
      if (!company) throw new HttpError(404, "Company not found");

      const openRoles = await db
        .select(listingFields)
        .from(jobs)
        .innerJoin(users, eq(jobs.recruiterId, users.id))
        .where(and(eq(jobs.recruiterId, company.id), eq(jobs.status, "OPEN")))
        .orderBy(desc(jobs.createdAt));
      return { ...company, openRoles };
    },
  );

  app.get("/api/company", async (request) => {
    const recruiter = await requireUser(request, "RECRUITER");
    const [company] = await db.select(companyFields).from(users).where(eq(users.id, recruiter.id));
    return company;
  });

  app.put<{ Body: CompanyInput }>(
    "/api/company",
    {
      schema: {
        body: {
          type: "object",
          required: ["name", "industry", "size", "description"],
          properties: {
            name: { type: "string", maxLength: 80 },
            website: { type: "string", maxLength: 200 },
            industry: { type: "string" },
            size: { type: "string" },
            description: { type: "string", maxLength: 2000 },
          },
        },
      },
    },
    async (request, reply) => {
      const recruiter = await requireUser(request, "RECRUITER");
      const problems = companyProblems(request.body);
      if (problems.length > 0) return reply.status(422).send({ error: problems.join(" "), problems });

      const website = request.body.website ? normalizeWebsite(request.body.website) : undefined;
      const [company] = await db
        .update(users)
        .set({
          companyName: request.body.name.trim(),
          companyWebsite: website ?? null,
          companyIndustry: request.body.industry,
          companySize: request.body.size,
          companyDescription: request.body.description.trim(),
          companyVerified: website ? await deps.checkWebsite(website) : false,
        })
        .where(eq(users.id, recruiter.id))
        .returning(companyFields);
      return company;
    },
  );

  app.get("/api/my/jobs", async (request) => {
    const recruiter = await requireUser(request, "RECRUITER");
    const myJobs = await db.select().from(jobs).where(eq(jobs.recruiterId, recruiter.id));
    const rows = await db
      .select({ application: applications })
      .from(applications)
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .where(eq(jobs.recruiterId, recruiter.id))
      .orderBy(asc(applications.createdAt));
    return myJobs.map((job) => ({
      ...job,
      applications: rows.map((row) => row.application).filter((application) => application.jobId === job.id),
    }));
  });

  app.get("/api/my/applications", async (request) => {
    const candidate = await requireUser(request, "CANDIDATE");
    const rows = await db
      .select({ application: applications, jobTitle: jobs.title })
      .from(applications)
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .where(eq(applications.candidateId, candidate.id))
      .orderBy(asc(applications.createdAt));
    return rows.map((row) => ({ ...row.application, jobTitle: row.jobTitle }));
  });

  app.get<{ Querystring: { role: "CANDIDATE" | "RECRUITER" } }>(
    "/api/auth/paypal",
    {
      schema: {
        querystring: {
          type: "object",
          required: ["role"],
          properties: { role: { type: "string", enum: ["CANDIDATE", "RECRUITER"] } },
        },
      },
    },
    async (request, reply) => {
      const state = randomBytes(16).toString("hex");
      reply.setCookie("login_state", `${state}:${request.query.role}`, {
        ...cookieOptions,
        maxAge: LOGIN_STATE_MAX_AGE_SECONDS,
      });
      return reply.redirect(payments.loginUrl(state, loginRedirectUri));
    },
  );

  app.get<{ Querystring: { code?: string; state?: string } }>(
    "/api/auth/paypal/callback",
    async (request, reply) => {
      const stored = request.unsignCookie(request.cookies.login_state ?? "");
      reply.clearCookie("login_state", { path: "/" });

      const [state, role] = stored.value?.split(":") ?? [];
      const { code } = request.query;
      if (!stored.valid || !state || state !== request.query.state || !code) {
        return reply.redirect("/?login=failed");
      }

      try {
        const profile = await payments.getLoginProfile(code);
        // A returning user keeps their role, whichever login button they pressed.
        const [user] = await db
          .insert(users)
          .values({
            role: role as "CANDIDATE" | "RECRUITER",
            email: profile.email,
            paypalPayerId: profile.payerId,
            paypalVerified: profile.verified,
          })
          .onConflictDoUpdate({
            target: users.paypalPayerId,
            set: { email: profile.email, paypalVerified: profile.verified },
          })
          .returning();
        reply.setCookie("session", user.id, { ...cookieOptions, maxAge: SESSION_MAX_AGE_SECONDS });
        return reply.redirect("/");
      } catch (error) {
        request.log.error(error);
        return reply.redirect("/?login=failed");
      }
    },
  );

  app.post("/api/auth/logout", async (_request, reply) => {
    reply.clearCookie("session", { path: "/" });
    return { status: "ok" };
  });

  app.get("/api/me", async (request) => {
    const { id, role, email, companyName, paypalVerified, availableSlots } = await currentUser(request);
    return { id, role, email, companyName, paypalVerified, availableSlots };
  });

  app.post<{
    Body: {
      title: string;
      requirementsText: string;
      applicantCap: number;
      description?: string;
      location?: string;
      employmentType?: string;
      salaryRange?: string;
    };
  }>(
    "/api/jobs",
    {
      schema: {
        body: {
          type: "object",
          required: ["title", "requirementsText", "applicantCap"],
          properties: {
            title: { type: "string", minLength: 1, maxLength: 120 },
            requirementsText: { type: "string", minLength: 1, maxLength: 2000 },
            applicantCap: { type: "integer", minimum: 1, maximum: 500 },
            description: { type: "string", maxLength: 4000 },
            location: { type: "string", minLength: 1, maxLength: 120 },
            employmentType: { type: "string", enum: ["Full-time", "Part-time", "Contract", "Internship"] },
            salaryRange: { type: "string", maxLength: 80 },
          },
        },
      },
    },
    async (request, reply) => {
      const recruiter = await requireUser(request, "RECRUITER");
      if (!recruiter.companyName) throw new ConflictError("Set up your company profile before posting a role");
      const { title, requirementsText, applicantCap, description, location, employmentType, salaryRange } =
        request.body;
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
          description,
          location,
          employmentType,
          salaryRange: salaryRange || null,
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

  app.post<{ Params: { id: string } }>("/api/jobs/:id/close", async (request) => {
    const recruiter = await requireUser(request, "RECRUITER");
    const closed = await closeJob(db, { jobId: request.params.id, recruiterId: recruiter.id });
    if (!closed) throw new HttpError(404, "Role not found");

    const { job, refund } = closed;
    if (job.bondRefunded !== "0.00" || refund === "0.00") {
      return { jobId: job.id, status: job.status, bondRefunded: job.bondRefunded };
    }

    // The fixed request ID makes a retried close return the same refund.
    const result = await payments.refundCapture(job.bondCaptureId!, refund, `refund-${job.id}`);
    if (result.status !== "COMPLETED" && result.status !== "PENDING") {
      throw new ConflictError(`The refund is ${result.status.toLowerCase()}, so try closing again`);
    }
    await db.update(jobs).set({ bondRefunded: refund }).where(eq(jobs.id, job.id));
    return { jobId: job.id, status: job.status, bondRefunded: refund };
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

  const idParams = {
    type: "object",
    properties: { id: { type: "string", format: "uuid" } },
  } as const;

  app.post<{ Params: { id: string }; Body: { unmetRequirement: string; feedback: string } }>(
    "/api/applications/:id/reject",
    {
      schema: {
        params: idParams,
        body: {
          type: "object",
          required: ["unmetRequirement", "feedback"],
          properties: {
            unmetRequirement: { type: "string", minLength: 1 },
            feedback: { type: "string", minLength: 1, maxLength: 2000 },
          },
        },
      },
    },
    async (request, reply) => {
      const { application, job } = await recruiterApplication(request);
      const now = new Date();
      // Checked before Elastic so a late reply doesn't spend an Elastic call.
      if (application.status !== "ACTIVE" || application.expiresAt <= now) {
        throw new ConflictError("This application can no longer be rejected");
      }

      const unmetRequirement = request.body.unmetRequirement.trim();
      if (!job.requirementsText.toLowerCase().includes(unmetRequirement.toLowerCase())) {
        return reply.status(422).send({ error: "Pick a requirement from the role's listing." });
      }

      const verdict = await deps.feedback.check({
        feedback: request.body.feedback,
        resumeText: application.resumeText,
        requirementsText: job.requirementsText,
      });
      if (!verdict.passed) return reply.status(422).send({ error: verdict.reason });

      return rejectApplication(db, {
        id: application.id,
        unmetRequirement,
        feedback: request.body.feedback,
        qualityScore: verdict.qualityScore,
        now: new Date(),
      });
    },
  );

  app.post<{ Params: { id: string }; Body: { interviewAt: string } }>(
    "/api/applications/:id/invite",
    {
      schema: {
        params: idParams,
        body: {
          type: "object",
          required: ["interviewAt"],
          properties: { interviewAt: { type: "string", format: "date-time" } },
        },
      },
    },
    async (request) => {
      const { application } = await recruiterApplication(request);
      const now = new Date();
      const interviewAt = new Date(request.body.interviewAt);
      if (interviewAt <= now) throw new HttpError(422, "Pick an interview time in the future");
      return inviteToInterview(db, { id: application.id, interviewAt, now });
    },
  );

  app.post<{ Params: { id: string }; Body: { genuine: boolean } }>(
    "/api/applications/:id/confirm-interview",
    {
      schema: {
        params: idParams,
        body: {
          type: "object",
          required: ["genuine"],
          properties: { genuine: { type: "boolean" } },
        },
      },
    },
    async (request) => {
      const candidate = await requireUser(request, "CANDIDATE");
      const [application] = await db
        .select({ id: applications.id })
        .from(applications)
        .where(and(eq(applications.id, request.params.id), eq(applications.candidateId, candidate.id)));
      if (!application) throw new HttpError(404, "Application not found");
      return resolveInterview(db, { id: application.id, genuine: request.body.genuine });
    },
  );

  return app;
}
