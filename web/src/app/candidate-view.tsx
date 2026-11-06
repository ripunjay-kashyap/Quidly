"use client";

import Link from "next/link";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import {
  type Application,
  errorMessage,
  formatClock,
  formatDate,
  formatDateTime,
  formatDuration,
  get,
  money,
  msLeft,
  post,
  type Profile,
  type User,
} from "@/lib/api";
import { Icon } from "@/lib/icons";
import { LoginPanel, WrongRole } from "@/lib/login";
import { candidateStatus } from "@/lib/status";
import { PageSkeleton, Skeleton, SlotPips, StatCard, StatusBadge } from "@/lib/ui";
import { useNow } from "@/lib/use-now";
import { useSession } from "@/lib/use-session";
import { CandidateProfileForm } from "./candidate-profile-form";

type MyApplication = Application & { jobTitle: string };

const PAYOUT = 5;
const ANSWERED = ["REJECTED_RELEASED", "INTERVIEW_PENDING", "INTERVIEW_CONFIRMED", "DISPUTED"];

export function CandidateDashboard() {
  const { user, refreshUser } = useSession();
  if (user === undefined) return <PageSkeleton />;
  if (user === null) return <LoginPanel role="CANDIDATE" />;
  if (user.role === "RECRUITER") return <WrongRole role="RECRUITER" />;
  return <CandidateView user={user} onSlotsChange={refreshUser} />;
}

// Interview invites need the candidate, so they come first; then the soonest deadlines.
function byUrgency(a: MyApplication, b: MyApplication): number {
  const rank = (application: MyApplication) =>
    application.status === "INTERVIEW_PENDING" ? 0 : application.status === "ACTIVE" ? 1 : 2;
  if (rank(a) !== rank(b)) return rank(a) - rank(b);
  if (rank(a) === 1) return a.expiresAt.localeCompare(b.expiresAt);
  return b.createdAt.localeCompare(a.createdAt);
}

function CandidateView({ user, onSlotsChange }: { user: User; onSlotsChange: () => void }) {
  const [mine, setMine] = useState<MyApplication[] | null>(null);
  const [hasResume, setHasResume] = useState<boolean | null>(null);
  const [tab, setTab] = useState<"applications" | "profile">("applications");
  const [message, setMessage] = useState("");
  const now = useNow();

  const refresh = useCallback(() => {
    get<MyApplication[]>("/api/my/applications")
      .then(setMine)
      .catch((error) => setMessage(errorMessage(error)));
    onSlotsChange();
  }, [onSlotsChange]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 3000);
    return () => clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    get<Profile>("/api/profile")
      .then((profile) => setHasResume(Boolean(profile.resumeText?.trim())))
      .catch(() => setHasResume(false));
  }, []);

  const applications = [...(mine ?? [])].sort(byUrgency);
  const waiting = applications.filter((application) => application.status === "ACTIVE");
  const nextDue = now && waiting.length ? Math.min(...waiting.map((application) => msLeft(application.expiresAt, now))) : null;
  const answered = applications.filter((application) => ANSWERED.includes(application.status));
  const interviews = applications.filter((application) => application.status.startsWith("INTERVIEW")).length;
  const missed = applications.filter((application) => application.status === "GHOSTED_PAID_OUT");
  const paid = missed.filter((application) => application.payoutStatus === "SUCCESS").length * PAYOUT;
  const onTheWay =
    missed.filter((application) => application.payoutStatus === "QUEUED" || application.payoutStatus === "PENDING")
      .length * PAYOUT;

  return (
    <main className="flex flex-1 flex-col">
      <section className="border-b border-border bg-surface-2">
        <div className="container-page flex flex-col gap-6 py-10 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="kicker">Job seeker</p>
            <h1 className="h-page mt-2">Your job search</h1>
            <p className="mt-2 truncate text-muted">{user.email}</p>
          </div>
          <Link className="btn btn-primary self-start sm:self-auto" href="/jobs">
            <Icon name="search" />
            Find jobs
          </Link>
        </div>
        <div className="container-page grid gap-4 pb-10 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Open slots"
            value={`${user.availableSlots} of 5`}
            detail="A slot frees up when an application is answered"
          >
            <span className="my-1.5">
              <SlotPips open={user.availableSlots} />
            </span>
          </StatCard>
          <StatCard
            label="Waiting for a reply"
            value={waiting.length}
            detail={nextDue !== null ? `Next answer due in ${formatDuration(nextDue)}` : "Nothing pending"}
          />
          <StatCard
            label="Answers received"
            value={answered.length}
            detail={`${interviews} interview invite${interviews === 1 ? "" : "s"}`}
          />
          <StatCard
            label="Paid to you"
            value={money(paid)}
            detail={onTheWay ? `${money(onTheWay)} on the way` : "From missed deadlines"}
          />
        </div>
      </section>

      <div className="container-page flex flex-1 flex-col gap-6 py-8">
        <div className="tabs" role="tablist">
          <button
            role="tab"
            className="tab"
            aria-selected={tab === "applications"}
            onClick={() => setTab("applications")}
          >
            Applications
            {mine && <span className="badge">{mine.length}</span>}
          </button>
          <button role="tab" className="tab" aria-selected={tab === "profile"} onClick={() => setTab("profile")}>
            Profile and resume
            {hasResume === false && <span className="size-2 rounded-full bg-warn" title="Add your resume" />}
          </button>
        </div>

        {message && (
          <div className="notice notice-danger" role="alert">
            <Icon name="alert" size={18} className="mt-px shrink-0" />
            {message}
          </div>
        )}

        {tab === "profile" && (
          <CandidateProfileForm onSaved={(profile) => setHasResume(Boolean(profile.resumeText?.trim()))} />
        )}
        {tab === "applications" && mine === null && (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-44 rounded-2xl" />
            <Skeleton className="h-44 rounded-2xl" />
          </div>
        )}
        {tab === "applications" && mine?.length === 0 && (
          <GetStarted hasResume={hasResume === true} onAddResume={() => setTab("profile")} />
        )}
        {tab === "applications" && applications.length > 0 && (
          <div className="flex flex-col gap-4">
            {applications.map((application) => (
              <ApplicationCard
                key={application.id}
                application={application}
                now={now}
                onChange={refresh}
                onError={setMessage}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function GetStarted({ hasResume, onAddResume }: { hasResume: boolean; onAddResume: () => void }) {
  const steps: { title: string; text: string; done?: boolean; action?: ReactNode }[] = [
    {
      title: "Add your resume",
      text: "Upload a PDF once and reuse it for every application.",
      done: hasResume,
      action: !hasResume && (
        <button className="btn btn-secondary btn-sm" onClick={onAddResume}>
          Add resume
        </button>
      ),
    },
    {
      title: "Pick a role",
      text: "Every listing promises a reply within 72 hours.",
      action: (
        <Link className="btn btn-secondary btn-sm" href="/jobs">
          Browse jobs
        </Link>
      ),
    },
    { title: "Apply with PayPal", text: "Approve a $2 hold. It's released once the company answers." },
  ];
  return (
    <section className="card p-6 sm:p-10">
      <h2 className="text-xl font-semibold tracking-tight">Start your first application</h2>
      <p className="mt-2 text-muted">Three steps, and the company owes you an answer.</p>
      <ol className="mt-8 grid gap-4 md:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.title} className="flex flex-col items-start gap-3 rounded-2xl border border-border p-5">
            <span
              className={`grid size-8 place-items-center rounded-full text-sm font-semibold ${
                step.done ? "bg-success text-white" : "bg-accent-soft text-accent"
              }`}
            >
              {step.done ? <Icon name="check" size={16} strokeWidth={2.5} /> : index + 1}
            </span>
            <div>
              <p className="font-semibold">{step.title}</p>
              <p className="mt-1 text-sm text-muted">{step.text}</p>
            </div>
            {step.action}
          </li>
        ))}
      </ol>
    </section>
  );
}

function ApplicationCard({
  application,
  now,
  onChange,
  onError,
}: {
  application: MyApplication;
  now: number;
  onChange: () => void;
  onError: (message: string) => void;
}) {
  const [reporting, setReporting] = useState(false);
  const [busy, setBusy] = useState(false);

  async function confirm(genuine: boolean) {
    setBusy(true);
    try {
      await post(`/api/applications/${application.id}/confirm-interview`, { genuine });
      onChange();
    } catch (error) {
      onError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  const status = candidateStatus(application);
  const windowMs = new Date(application.expiresAt).getTime() - new Date(application.createdAt).getTime();
  const left = now ? msLeft(application.expiresAt, now) : null;

  return (
    <article className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            className="text-[1.0625rem] font-semibold tracking-tight transition-colors hover:text-accent-ink"
            href={`/jobs/${application.jobId}`}
          >
            {application.jobTitle}
          </Link>
          <p className="mt-0.5 text-sm text-muted">Applied {formatDate(application.createdAt)}</p>
        </div>
        <StatusBadge {...status} />
      </div>

      {application.status === "ACTIVE" && (
        <div className="mt-5 rounded-xl bg-surface-2 p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-muted">Time left for the company to reply</p>
              <p className="mt-1 font-mono text-2xl font-semibold tracking-tight tabular-nums">
                {left === null ? "--:--:--" : formatClock(left)}
              </p>
            </div>
            <p className="text-sm text-muted sm:text-right">
              If they miss it,
              <br className="hidden sm:block" /> you get <span className="font-semibold text-foreground">$5</span>
            </p>
          </div>
          <div className="meter mt-3">
            <span
              style={{ transform: `scaleX(${left === null || windowMs <= 0 ? 0 : Math.min(1, 1 - left / windowMs)})` }}
            />
          </div>
        </div>
      )}

      {application.status === "INTERVIEW_PENDING" && (
        <div className="mt-5 flex flex-col gap-3 rounded-xl border border-warn/25 bg-warn-soft p-4">
          <p className="flex items-start gap-2.5 text-sm">
            <Icon name="calendar" size={18} className="mt-px shrink-0 text-warn" />
            <span>
              <span className="font-semibold">You&apos;re invited to interview</span>
              {application.interviewAt && <> on {formatDateTime(application.interviewAt)}</>}. Please confirm it&apos;s a
              real invite. Your slot frees up once you do.
            </span>
          </p>
          {reporting ? (
            <div className="flex flex-wrap items-center gap-2">
              <p className="w-full text-sm text-muted">
                Report it only if the company didn&apos;t really invite you. This can&apos;t be undone.
              </p>
              <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => confirm(false)}>
                <Icon name="flag" size={14} />
                Report invite
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setReporting(false)}>
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => confirm(true)}>
                <Icon name="check" size={14} strokeWidth={2.25} />
                Yes, it&apos;s real
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => setReporting(true)}>
                It&apos;s not real
              </button>
            </div>
          )}
        </div>
      )}

      {application.status === "INTERVIEW_CONFIRMED" && (
        <div className="notice notice-success mt-5">
          <Icon name="calendar" size={18} className="mt-px shrink-0" />
          <p>
            Interview confirmed
            {application.interviewAt && <> for {formatDateTime(application.interviewAt)}</>}. Good luck!
          </p>
        </div>
      )}

      {application.status === "DISPUTED" && (
        <div className="notice notice-danger mt-5">
          <Icon name="flag" size={18} className="mt-px shrink-0" />
          You reported this invite as not genuine, so the company&apos;s $5 deposit for you stays locked.
        </div>
      )}

      {application.status === "REJECTED_RELEASED" && (
        <div className="mt-5 rounded-xl border border-border bg-surface-2 p-4">
          <p className="text-xs font-medium text-muted">Feedback from the company</p>
          <p className="mt-2 leading-relaxed">&ldquo;{application.recruiterFeedback}&rdquo;</p>
          {application.unmetRequirement && (
            <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
              Missing requirement:
              <span className="badge badge-warn">{application.unmetRequirement}</span>
            </p>
          )}
          <p className="mt-3 text-[0.8125rem] text-muted">Your slot is free again.</p>
        </div>
      )}

      {application.status === "GHOSTED_PAID_OUT" && (
        <div className={`notice mt-5 ${application.payoutStatus === "FAILED" ? "notice-danger" : "notice-success"}`}>
          <Icon name="wallet" size={18} className="mt-px shrink-0" />
          {application.payoutStatus === "SUCCESS" &&
            "The company didn't reply in time, so $5 was sent to your PayPal."}
          {(application.payoutStatus === "QUEUED" || application.payoutStatus === "PENDING") &&
            "The company didn't reply in time. $5 is on its way to your PayPal."}
          {application.payoutStatus === "FAILED" &&
            "The company didn't reply in time, but the $5 payment to your PayPal failed."}
        </div>
      )}
    </article>
  );
}
