"use client";

import Link from "next/link";
import { createContext, type ReactNode, useCallback, useContext, useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Icon, type IconName } from "./icons";
import { LoginLink, type Role, RoleSignIn, testModeNote } from "./login";
import { useSession } from "./use-session";

type AuthRequest = { role?: Role; job?: { title: string; companyName: string } };

const AuthDialogContext = createContext<((request: AuthRequest) => void) | null>(null);

// One sign-up and log-in window for the whole site. Logging in with PayPal for the
// first time creates the account, so the same window does both.
export function AuthDialogProvider({ children }: { children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pressedBackdrop = useRef(false);
  const [request, setRequest] = useState<AuthRequest>({});
  const titleId = useId();

  const openAuth = useCallback((next: AuthRequest) => {
    // Render the new content first, so the window opens with the right title and focus.
    flushSync(() => setRequest(next));
    dialog.current?.showModal();
  }, []);

  function close() {
    dialog.current?.close();
  }

  return (
    <AuthDialogContext value={openAuth}>
      {children}
      {/* A click that starts and ends on the dimmed page around the window closes it. */}
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        className="dialog"
        onPointerDown={(event) => {
          pressedBackdrop.current = event.target === event.currentTarget;
        }}
        onClick={(event) => {
          if (pressedBackdrop.current && event.target === event.currentTarget) close();
        }}
      >
        <div className="relative p-6 sm:p-8">
          <button type="button" className="btn btn-ghost btn-sm absolute top-3 right-3 px-2" onClick={close}>
            <Icon name="x" size={18} />
            <span className="sr-only">Close</span>
          </button>
          {request.role ? (
            <>
              <RoleSignIn role={request.role} job={request.job} titleId={titleId} />
              {request.role === "CANDIDATE" && !request.job && (
                <p className="mt-6 border-t border-border pt-5 text-center text-sm text-muted">
                  Just looking?{" "}
                  <Link className="link" href="/jobs" onClick={close}>
                    Browse jobs first
                  </Link>
                </p>
              )}
            </>
          ) : (
            <ChooseRole titleId={titleId} />
          )}
        </div>
      </dialog>
    </AuthDialogContext>
  );
}

export function useAuthDialog() {
  const openAuth = useContext(AuthDialogContext);
  if (!openAuth) throw new Error("useAuthDialog must be used inside AuthDialogProvider");
  return openAuth;
}

// Opens the sign-up window for one kind of account. Someone who is already logged in
// goes straight to that account's dashboard instead.
export function AuthButton({ role, className, children }: { role: Role; className?: string; children: ReactNode }) {
  const { user } = useSession();
  const openAuth = useAuthDialog();
  if (user) {
    return (
      <Link className={className} href={role === "RECRUITER" ? "/company" : "/candidate"}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={className} onClick={() => openAuth({ role })}>
      {children}
    </button>
  );
}

function ChooseRole({ titleId }: { titleId: string }) {
  return (
    <>
      <h2 id={titleId} className="pr-10 text-2xl font-semibold tracking-tight">
        Log in to Quidly
      </h2>
      <p className="mt-2 text-muted">Choose your account type. If you&apos;re new, logging in creates your account.</p>
      <div className="mt-6 flex flex-col gap-3">
        <RoleOption
          role="CANDIDATE"
          icon="search"
          title="I'm looking for a job"
          text="Apply for jobs and see every answer"
        />
        <RoleOption role="RECRUITER" icon="building" title="I'm hiring" text="Post roles and reply to applicants" />
      </div>
      <p className="mt-5 text-center text-[0.8125rem] text-muted">{testModeNote}</p>
    </>
  );
}

function RoleOption({ role, icon, title, text }: { role: Role; icon: IconName; title: string; text: string }) {
  return (
    <LoginLink
      role={role}
      className="flex items-center gap-4 rounded-xl border border-border p-4 transition-colors hover:border-border-strong hover:bg-surface-2"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
        <Icon name={icon} size={20} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-semibold">{title}</span>
        <span className="text-sm text-muted">{text}</span>
      </span>
      <Icon name="arrow-right" size={16} className="shrink-0 text-muted" />
    </LoginLink>
  );
}
