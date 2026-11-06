"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type Application,
  type Config,
  errorMessage,
  formatDateTime,
  formatDuration,
  get,
  money,
  msLeft,
  post,
  splitRequirements,
  type User,
} from "@/lib/api";
import { Icon } from "@/lib/icons";
import { LoginPanel, WrongRole } from "@/lib/login";
import { PayPalButton } from "@/lib/paypal-button";
import { jobStatus, recruiterStatus } from "@/lib/status";
import { CompanyAvatar, PageSkeleton, Skeleton, StatCard, StatusBadge } from "@/lib/ui";
import { useNow } from "@/lib/use-now";
import { useSession } from "@/lib/use-session";
import { CompanyProfileForm } from "./company-profile-form";

type Job = {
  id: string;
  title: string;
  requirementsText: string;
  applicantCap: number;
  status: string;
  bondTotal: string;
  bondForfeited: string;
  bondRefunded: string;
  createdAt: string;
  applications: Application[];
};

type Message = { tone: "success" | "danger"; text: string };

const LISTING_FEE = 49;
const DEPOSIT_PER_APPLICANT = 5;
const URGENT_MS = 12 * 60 * 60 * 1000;

export function CompanyDashboard() {
  const { user, config, refreshUser } = useSession();
  if (user === null) return <LoginPanel role="RECRUITER" />;
  if (user?.role === "CANDIDATE") return <WrongRole role="CANDIDATE" />;
  if (!user || !config) return <PageSkeleton />;
  if (!user.companyName) return <CompanySetup config={config} onSaved={refreshUser} />;
  return <RecruiterView user={user} config={config} onProfileSaved={refreshUser} />;
}

function CompanySetup({ config, onSaved }: { config: Config; onSaved: () => void }) {
  return (
    <main className="flex flex-1 flex-col">
      <section className="border-b border-border bg-surface-2">
        <div className="container-page py-10">
          <p className="kicker">Welcome to Quidly</p>
          <h1 className="h-page mt-2">Set up your company</h1>
          <p className="mt-2 max-w-2xl text-muted">
            Tell candidates who you are. We check these details automatically before you can post a role.
          </p>
          <ol className="mt-8 flex flex-wrap gap-3">
            {["Company profile", "Post a role", "Answer applicants"].map((step, index) => (
              <li
                key={step}
                className={`flex items-center gap-2 rounded-full border py-1.5 pr-4 pl-1.5 text-sm ${
                  index === 0
                    ? "border-accent/30 bg-accent-soft font-medium text-accent-ink"
                    : "border-border bg-white text-muted"
                }`}
              >
                <span
                  className={`grid size-6 place-items-center rounded-full text-xs font-semibold ${
                    index === 0 ? "bg-accent text-white" : "bg-surface-3"
                  }`}
                >
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </section>
      <div className="container-page py-10">
        <CompanyProfileForm config={config} onSaved={onSaved} />
      </div>
    </main>
  );
}

function RecruiterView({ user, config, onProfileSaved }: { user: User; config: Config; onProfileSaved: () => void }) {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [tab, setTab] = useState<"roles" | "profile">("roles");
  const [composerOpen, setComposerOpen] = useState(false);
  const now = useNow();

  const refresh = useCallback(() => {
    get<Job[]>("/api/my/jobs")
      .then(setJobs)
      .catch((error) => setMessage({ tone: "danger", text: errorMessage(error) }));
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 3000);
    return () => clearInterval(timer);
  }, [refresh]);

  // Unpaid drafts can't be finished later, so only paid roles are listed.
  const roles = (jobs ?? [])
    .filter((job) => job.status !== "DRAFT")
    .sort((a, b) => (a.status === b.status ? b.createdAt.localeCompare(a.createdAt) : a.status === "OPEN" ? -1 : 1));
  const openRoles = roles.filter((job) => job.status === "OPEN");
  const applications = roles.flatMap((job) => job.applications);
  const waiting = applications.filter((application) => application.status === "ACTIVE");
  const nextDue = now && waiting.length ? Math.min(...waiting.map((application) => msLeft(application.expiresAt, now))) : null;
  const interviews = applications.filter((application) => application.status.startsWith("INTERVIEW")).length;
  const held = openRoles.reduce(
    (sum, job) => sum + Number(job.bondTotal) - Number(job.bondForfeited) - Number(job.bondRefunded),
    0,
  );
  const paidOut = roles.reduce((sum, job) => sum + Number(job.bondForfeited), 0);
  const showComposer = composerOpen || (jobs !== null && roles.length === 0);

  return (
    <main className="flex flex-1 flex-col">
      <section className="border-b border-border bg-surface-2">
        <div className="container-page flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <CompanyAvatar name={user.companyName ?? ""} size="lg" />
            <div className="min-w-0">
              <p className="kicker">Company dashboard</p>
              <h1 className="h-page mt-1 truncate">{user.companyName}</h1>
              <Link
                className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
                href={`/companies/${user.id}`}
              >
                View your public page
                <Icon name="external" size={13} />
              </Link>
            </div>
          </div>
          <button
            className="btn btn-primary self-start sm:self-auto"
            onClick={() => {
              setTab("roles");
              setComposerOpen(true);
            }}
          >
            <Icon name="plus" />
            Post a role
          </button>
        </div>
        <div className="container-page grid gap-4 pb-10 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Open roles"
            value={openRoles.length}
            detail={`${roles.length - openRoles.length} closed`}
          />
          <StatCard
            label="Waiting for your reply"
            value={waiting.length}
            detail={
              nextDue === null ? (
                "You're all caught up"
              ) : (
                <span className={nextDue < URGENT_MS ? "font-medium text-danger" : undefined}>
                  Next deadline in {formatDuration(nextDue)}
                </span>
              )
            }
          />
          <StatCard label="Interviews" value={interviews} detail="Invites sent or confirmed" />
          <StatCard
            label="Deposit on open roles"
            value={money(held)}
            detail={paidOut ? `${money(paidOut)} paid to candidates so far` : "Nothing paid to candidates"}
          />
        </div>
      </section>

      <div className="container-page flex flex-1 flex-col gap-6 py-8">
        <div className="tabs" role="tablist">
          <button role="tab" className="tab" aria-selected={tab === "roles"} onClick={() => setTab("roles")}>
            Roles and applicants
            {waiting.length > 0 && <span className="badge badge-warn">{waiting.length} waiting</span>}
          </button>
          <button role="tab" className="tab" aria-selected={tab === "profile"} onClick={() => setTab("profile")}>
            Company profile
          </button>
        </div>

        {message && (
          <div className={`notice notice-${message.tone}`} role="status">
            <Icon name={message.tone === "success" ? "check-circle" : "alert"} size={18} className="mt-px shrink-0" />
            {message.text}
          </div>
        )}

        {tab === "profile" && <CompanyProfileForm config={config} onSaved={onProfileSaved} />}

        {tab === "roles" && (
          <>
            {showComposer && (
              <PostRole
                config={config}
                onCancel={roles.length > 0 ? () => setComposerOpen(false) : undefined}
                onPosted={() => {
                  setComposerOpen(false);
                  setMessage({ tone: "success", text: "Your role is live. Candidates can apply now." });
                  refresh();
                }}
                onError={(text) => setMessage({ tone: "danger", text })}
              />
            )}
            {jobs === null && <Skeleton className="h-64 rounded-2xl" />}
            {roles.map((job) => (
              <RoleCard key={job.id} job={job} now={now} onChange={refresh} />
            ))}
          </>
        )}
      </div>
    </main>
  );
}

function PostRole({
  config,
  onCancel,
  onPosted,
  onError,
}: {
  config: Config;
  onCancel?: () => void;
  onPosted: () => void;
  onError: (message: string) => void;
}) {
  const [title, setTitle] = useState("Senior Backend Engineer");
  const [requirements, setRequirements] = useState(
    "5+ years of backend development, Go, PostgreSQL, running production Kubernetes clusters, on-call experience",
  );
  const [cap, setCap] = useState(10);
  const [description, setDescription] = useState(
    "Join the platform team that runs our payment and booking systems. You'll own services end to end, from design to on-call.",
  );
  const [location, setLocation] = useState("Remote (US)");
  const [employmentType, setEmploymentType] = useState("Full-time");
  const [salaryRange, setSalaryRange] = useState("$150k–$180k");
  const fundingJobId = useRef("");
  const deposit = Math.max(0, cap) * DEPOSIT_PER_APPLICANT;

  return (
    <section className="card overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Post a role</h2>
          <p className="mt-0.5 text-sm text-muted">It goes live on the job board as soon as the payment goes through.</p>
        </div>
        {onCancel && (
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
      <div className="grid lg:grid-cols-[1fr_20rem]">
        <div className="grid gap-5 p-6 sm:grid-cols-2">
          <label className="field sm:col-span-2">
            <span className="label">Job title</span>
            <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="field">
            <span className="label">Location</span>
            <input className="input" value={location} onChange={(event) => setLocation(event.target.value)} />
            <span className="hint">For example &ldquo;Remote (US)&rdquo; or &ldquo;Austin, TX (hybrid)&rdquo;</span>
          </label>
          <label className="field">
            <span className="label">Job type</span>
            <select className="input" value={employmentType} onChange={(event) => setEmploymentType(event.target.value)}>
              {["Full-time", "Part-time", "Contract", "Internship"].map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="label">Salary range</span>
            <input className="input" value={salaryRange} onChange={(event) => setSalaryRange(event.target.value)} />
            <span className="hint">Optional</span>
          </label>
          <label className="field">
            <span className="label">How many people can apply?</span>
            <input
              className="input"
              type="number"
              min={1}
              max={500}
              value={cap}
              onChange={(event) => setCap(Number(event.target.value))}
            />
            <span className="hint">Each spot has a $5 refundable deposit.</span>
          </label>
          <label className="field sm:col-span-2">
            <span className="label">About the role</span>
            <textarea
              className="input"
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <label className="field sm:col-span-2">
            <span className="label">Requirements</span>
            <textarea
              className="input"
              rows={3}
              value={requirements}
              onChange={(event) => setRequirements(event.target.value)}
            />
            <span className="hint">
              Separate them with commas. When you turn someone down, you pick the one they&apos;re missing from this
              list.
            </span>
          </label>
        </div>
        <aside className="flex flex-col gap-4 border-t border-border bg-surface-2 p-6 lg:border-t-0 lg:border-l">
          <p className="text-sm font-semibold">Summary</p>
          <dl className="flex flex-col gap-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Listing fee</dt>
              <dd className="tabular-nums">{money(LISTING_FEE)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">
                Deposit ({Math.max(0, cap)} × ${DEPOSIT_PER_APPLICANT})
              </dt>
              <dd className="tabular-nums">{money(deposit)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-2.5 text-base font-semibold">
              <dt>Total today</dt>
              <dd className="tabular-nums">{money(LISTING_FEE + deposit)}</dd>
            </div>
          </dl>
          <p className="hint">
            The deposit comes back when you close the role, except $5 for each applicant you didn&apos;t answer within 72
            hours.
          </p>
          <PayPalButton
            clientId={config.paypalClientId}
            intent="capture"
            createOrder={async () => {
              const created = await post<{ jobId: string; orderId: string }>("/api/jobs", {
                title,
                requirementsText: requirements,
                applicantCap: cap,
                description,
                location,
                employmentType,
                salaryRange,
              });
              fundingJobId.current = created.jobId;
              return created.orderId;
            }}
            onApprove={async () => {
              await post(`/api/jobs/${fundingJobId.current}/fund`);
              onPosted();
            }}
            onError={onError}
          />
        </aside>
      </div>
    </section>
  );
}

function RoleCard({ job, now, onChange }: { job: Job; now: number; onChange: () => void }) {
  const [confirmingClose, setConfirmingClose] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Message | null>(null);

  const waiting = job.applications.filter((application) => application.status === "ACTIVE").length;
  const unanswered = job.applications.some(
    (application) => application.status === "ACTIVE" || application.status === "INTERVIEW_PENDING",
  );
  const disputed = job.applications.filter((application) => application.status === "DISPUTED").length;
  const refund = Math.max(0, Number(job.bondTotal) - Number(job.bondForfeited) - disputed * DEPOSIT_PER_APPLICANT);
  const requirements = splitRequirements(job.requirementsText);

  async function closeRole() {
    setBusy(true);
    setNotice(null);
    try {
      const closed = await post<{ bondRefunded: string }>(`/api/jobs/${job.id}/close`);
      setNotice({ tone: "success", text: `Role closed. ${money(closed.bondRefunded)} of your deposit was refunded.` });
      setConfirmingClose(false);
      onChange();
    } catch (error) {
      setNotice({ tone: "danger", text: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="card overflow-hidden">
      <header className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:p-6">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              className="text-lg font-semibold tracking-tight transition-colors hover:text-accent-ink"
              href={`/jobs/${job.id}`}
            >
              {job.title}
            </Link>
            <StatusBadge {...jobStatus(job.status)} />
          </div>
          <p className="mt-1 text-sm text-muted">
            {job.applications.length} of {job.applicantCap} spots filled
            {waiting > 0 && ` · ${waiting} waiting for your reply`}
          </p>
        </div>
        {job.status === "OPEN" && !confirmingClose && (
          <div className="flex flex-col items-start gap-1 sm:items-end">
            <button className="btn btn-secondary btn-sm" disabled={unanswered} onClick={() => setConfirmingClose(true)}>
              Close role
            </button>
            {unanswered && <span className="text-xs text-muted">Answer every applicant first</span>}
          </div>
        )}
      </header>

      {confirmingClose && (
        <div className="notice notice-warn mx-5 mb-5 flex-col sm:mx-6">
          <p>
            <span className="font-semibold">Close this role?</span> It stops taking applications, and{" "}
            {money(refund)} of your deposit goes back to your PayPal.
          </p>
          <div className="flex gap-2">
            <button className="btn btn-dark btn-sm" disabled={busy} onClick={closeRole}>
              {busy ? "Closing…" : "Close and refund"}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setConfirmingClose(false)}>
              Keep it open
            </button>
          </div>
        </div>
      )}
      {notice && (
        <div className={`notice notice-${notice.tone} mx-5 mb-5 sm:mx-6`} role="status">
          <Icon name={notice.tone === "success" ? "check-circle" : "alert"} size={18} className="mt-px shrink-0" />
          {notice.text}
        </div>
      )}

      <dl className="grid grid-cols-3 divide-x divide-border border-y border-border bg-surface-2 text-sm">
        {[
          ["Deposit paid", job.bondTotal],
          ["Paid to candidates", job.bondForfeited],
          ["Refunded", job.bondRefunded],
        ].map(([label, amount]) => (
          <div key={label} className="px-5 py-3 sm:px-6">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="mt-0.5 font-semibold tabular-nums">{money(amount)}</dd>
          </div>
        ))}
      </dl>

      {job.applications.length === 0 ? (
        <p className="p-6 text-sm text-muted">
          {job.status === "OPEN"
            ? "No applicants yet. Candidates can find this role on the job board."
            : "Nobody applied before this role closed."}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {job.applications.map((application, index) => (
            <ApplicantRow
              key={application.id}
              number={index + 1}
              application={application}
              requirements={requirements}
              now={now}
              onChange={onChange}
            />
          ))}
        </ul>
      )}
    </article>
  );
}

function ApplicantRow({
  number,
  application,
  requirements,
  now,
  onChange,
}: {
  number: number;
  application: Application;
  requirements: string[];
  now: number;
  onChange: () => void;
}) {
  const [showResume, setShowResume] = useState(false);
  const [replying, setReplying] = useState(false);
  const [mode, setMode] = useState<"feedback" | "invite">("feedback");
  const [requirement, setRequirement] = useState("");
  const [feedback, setFeedback] = useState("");
  const [interviewAt, setInterviewAt] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function act(path: string, body: unknown) {
    setBusy(true);
    setError("");
    try {
      await post(`/api/applications/${application.id}/${path}`, body);
      onChange();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  const active = application.status === "ACTIVE";
  const left = now ? msLeft(application.expiresAt, now) : null;

  return (
    <li className="flex flex-col gap-4 p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="font-medium">Applicant {number}</span>
        <StatusBadge {...recruiterStatus(application)} />
        {active && left !== null && (
          <span
            className={`flex items-center gap-1.5 text-sm tabular-nums ${
              left < URGENT_MS ? "font-medium text-danger" : "text-muted"
            }`}
          >
            <Icon name="clock" size={14} />
            {formatDuration(left)} left to reply
          </span>
        )}
        <div className="ml-auto flex gap-2">
          <button
            className="btn btn-ghost btn-sm"
            aria-expanded={showResume}
            onClick={() => setShowResume((shown) => !shown)}
          >
            <Icon name="file" size={14} />
            {showResume ? "Hide resume" : "Show resume"}
          </button>
          {active && (
            <button
              className={`btn btn-sm ${replying ? "btn-secondary" : "btn-primary"}`}
              aria-expanded={replying}
              onClick={() => setReplying((open) => !open)}
            >
              {replying ? "Close" : "Reply"}
            </button>
          )}
        </div>
      </div>

      {showResume && (
        <div className="max-h-80 overflow-auto rounded-xl border border-border bg-surface-2 p-4 text-sm leading-relaxed whitespace-pre-wrap">
          {application.resumeText}
        </div>
      )}
      {application.recruiterFeedback && (
        <div className="rounded-xl border border-border p-4 text-sm">
          <p className="text-xs text-muted">
            Your feedback · missing: <span className="font-medium text-foreground">{application.unmetRequirement}</span>
          </p>
          <p className="mt-1.5 leading-relaxed">{application.recruiterFeedback}</p>
        </div>
      )}
      {application.interviewAt && (
        <p className="flex items-center gap-2 text-sm">
          <Icon name="calendar" size={15} className="text-muted" />
          Interview: {formatDateTime(application.interviewAt)}
        </p>
      )}
      {application.status === "GHOSTED_PAID_OUT" && (
        <p className="text-sm text-muted">The 72 hours ran out, so $5 of your deposit went to this candidate.</p>
      )}

      {active && replying && (
        <div className="rounded-xl border border-border p-4 sm:p-5">
          <div className="segmented" role="tablist" aria-label="How to reply">
            <button role="tab" aria-selected={mode === "feedback"} onClick={() => setMode("feedback")}>
              Send feedback
            </button>
            <button role="tab" aria-selected={mode === "invite"} onClick={() => setMode("invite")}>
              Invite to interview
            </button>
          </div>

          {mode === "feedback" ? (
            <div className="mt-5 flex flex-col gap-5">
              <fieldset>
                <legend className="label mb-2.5">Which requirement is missing?</legend>
                <div className="flex flex-wrap gap-2">
                  {requirements.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className="chip"
                      aria-pressed={requirement === item}
                      onClick={() => setRequirement(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </fieldset>
              <label className="field">
                <span className="label">Feedback for the candidate</span>
                <textarea
                  className="input"
                  rows={4}
                  value={feedback}
                  placeholder="What stood out in their experience, and what's missing for this role?"
                  onChange={(event) => setFeedback(event.target.value)}
                />
                <span className="hint">
                  Write at least two full sentences about their experience. AI blocks copy-paste templates and vague
                  answers.
                </span>
              </label>
              <button
                className="btn btn-primary self-start"
                disabled={busy || !requirement || !feedback.trim()}
                onClick={() => act("reject", { unmetRequirement: requirement, feedback })}
              >
                <Icon name="send" size={15} />
                {busy ? "Checking…" : "Send feedback"}
              </button>
            </div>
          ) : (
            <div className="mt-5 flex flex-col gap-5">
              <label className="field sm:max-w-xs">
                <span className="label">Interview date and time</span>
                <input
                  className="input"
                  type="datetime-local"
                  value={interviewAt}
                  onChange={(event) => setInterviewAt(event.target.value)}
                />
                <span className="hint">We&apos;ll ask the candidate to confirm the invite is real.</span>
              </label>
              <button
                className="btn btn-primary self-start"
                disabled={busy || !interviewAt}
                onClick={() => act("invite", { interviewAt: new Date(interviewAt).toISOString() })}
              >
                <Icon name="calendar" size={15} />
                {busy ? "Sending…" : "Send invite"}
              </button>
            </div>
          )}

          {error && (
            <div className="notice notice-danger mt-4" role="alert">
              <Icon name="alert" size={18} className="mt-px shrink-0" />
              {error}
            </div>
          )}
        </div>
      )}
    </li>
  );
}
