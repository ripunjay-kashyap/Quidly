"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { post, type User } from "./api";
import { Icon } from "./icons";
import { CompanyAvatar, LogoMark } from "./ui";

export type Role = User["role"];

const RETURN_KEY = "quidly:return-to";
const RETURN_MAX_AGE_MS = 30 * 60 * 1000;

// PayPal sends every login back to "/", so the page the person started from is kept
// in this tab and the home page sends them back to it.
function rememberReturn(path: string) {
  try {
    sessionStorage.setItem(RETURN_KEY, JSON.stringify({ path, at: Date.now() }));
  } catch {}
}

export function takeReturnPath(): string | null {
  try {
    const saved = sessionStorage.getItem(RETURN_KEY);
    sessionStorage.removeItem(RETURN_KEY);
    if (!saved) return null;
    const { path, at } = JSON.parse(saved);
    const sameSite = typeof path === "string" && path.startsWith("/") && !path.startsWith("//");
    return sameSite && Date.now() - at < RETURN_MAX_AGE_MS ? path : null;
  } catch {
    return null;
  }
}

// Companies go to their dashboard after logging in. Job seekers go back to the page
// they were on, such as the job they want to apply for.
export function LoginLink({ role, className, children }: { role: Role; className?: string; children: ReactNode }) {
  return (
    <a
      className={className}
      href={`/api/auth/paypal?role=${role}`}
      onClick={() => {
        const { pathname, search } = window.location;
        const toDashboard = role === "RECRUITER" || pathname === "/" || pathname === "/company";
        rememberReturn(toDashboard ? (role === "RECRUITER" ? "/company" : "/candidate") : pathname + search);
      }}
    >
      {children}
    </a>
  );
}

export async function logOut() {
  await post("/api/auth/logout");
  // A full reload clears every copy of the logged-in user, which a client-side push would keep.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign("/");
}

export const testModeNote = "PayPal is in test mode here. Log in with a PayPal sandbox account, not your real one.";

const roleCopy = {
  CANDIDATE: {
    title: "Apply for jobs on Quidly",
    text: "You log in with PayPal. If you're new, this also creates your job seeker account.",
    points: [
      "Applying is free. PayPal holds $2 while you wait, and you're never charged.",
      "Companies must reply within 72 hours, with feedback or an interview invite.",
      "If a company doesn't reply in time, it pays you $5.",
    ],
  },
  RECRUITER: {
    title: "Start hiring on Quidly",
    text: "You log in with your company's PayPal account. If you're new, this also creates your company account.",
    points: [
      "Post a role for $49, plus a $5 deposit for each person who can apply.",
      "Reply to each applicant within 72 hours, with feedback or an interview invite.",
      "Reply to everyone in time, and you get the whole deposit back.",
    ],
  },
};

// What signing up means for each kind of account, and the PayPal button.
// Used in the sign-up window and on the dashboards when nobody is logged in.
export function RoleSignIn({
  role,
  job,
  titleId,
  level = "h2",
}: {
  role: Role;
  job?: { title: string; companyName: string };
  titleId?: string;
  level?: "h1" | "h2";
}) {
  const copy = roleCopy[role];
  const Title = level;
  return (
    <>
      {job ? (
        <div className="flex items-center gap-3 pr-10">
          <CompanyAvatar name={job.companyName} size="sm" />
          <p className="flex min-w-0 flex-col">
            <span className="truncate font-semibold">{job.title}</span>
            <span className="truncate text-sm text-muted">{job.companyName}</span>
          </p>
        </div>
      ) : (
        <LogoMark size={36} />
      )}
      <Title id={titleId} className="mt-6 text-2xl font-semibold tracking-tight">
        {job ? "Log in to apply" : copy.title}
      </Title>
      <p className="mt-2 text-muted">{copy.text}</p>
      <ul className="mt-5 flex flex-col gap-3 text-[0.9375rem] text-pretty">
        {copy.points.map((point) => (
          <li key={point} className="flex gap-3">
            <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
              <Icon name="check" size={12} strokeWidth={2.5} />
            </span>
            {point}
          </li>
        ))}
      </ul>
      <LoginLink role={role} className="btn btn-primary btn-lg mt-7 w-full">
        Continue with PayPal
      </LoginLink>
      <p className="mt-3 text-center text-[0.8125rem] text-muted">{testModeNote}</p>
    </>
  );
}

export function LoginPanel({ role }: { role: Role }) {
  const other =
    role === "CANDIDATE"
      ? { role: "RECRUITER" as const, label: "Hiring? Log in as a company" }
      : { role: "CANDIDATE" as const, label: "Looking for a job? Log in as a job seeker" };
  return (
    <main className="bg-hero flex flex-1 items-center py-16">
      <div className="container-page flex justify-center">
        <div className="card rise w-full max-w-md p-8 shadow-float sm:p-10">
          <RoleSignIn role={role} level="h1" />
          <p className="mt-6 border-t border-border pt-5 text-center text-sm">
            <LoginLink role={other.role} className="link">
              {other.label}
            </LoginLink>
          </p>
        </div>
      </div>
    </main>
  );
}

// Shown when someone opens the other role's dashboard. A role is fixed at first login.
export function WrongRole({ role }: { role: Role }) {
  const candidate = role === "CANDIDATE";
  return (
    <main className="container-page flex flex-1 items-center justify-center py-16">
      <div className="card w-full max-w-md p-8 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-surface-3 text-muted">
          <Icon name="info" size={22} />
        </span>
        <h1 className="mt-5 text-xl font-semibold tracking-tight">
          {candidate ? "This page is for companies" : "This page is for job seekers"}
        </h1>
        <p className="mt-2 text-muted">
          {candidate
            ? "You're logged in as a job seeker. To hire, log out and log in with your company's PayPal account."
            : "You're logged in as a company. To apply for jobs, log out and log in with a personal PayPal account."}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link className="btn btn-primary" href={candidate ? "/candidate" : "/company"}>
            {candidate ? "My applications" : "Company dashboard"}
          </Link>
          <button className="btn btn-secondary" onClick={logOut}>
            Log out
          </button>
        </div>
      </div>
    </main>
  );
}
