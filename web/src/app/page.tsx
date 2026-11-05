"use client";

import { useEffect, useState } from "react";
import { type Config, get, post, type User } from "@/lib/api";
import { CandidateView } from "./candidate-view";
import { RecruiterView } from "./recruiter-view";

const linkClass = "rounded-full bg-foreground px-5 py-3 text-center font-medium text-background";

export default function Home() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [config, setConfig] = useState<Config | null>(null);
  const [loginFailed, setLoginFailed] = useState(false);

  function refreshUser() {
    get<User>("/api/me")
      .then(setUser)
      .catch(() => setUser(null));
  }

  useEffect(() => {
    get<User>("/api/me")
      .catch(() => null)
      .then((current) => {
        setUser(current);
        setLoginFailed(new URLSearchParams(window.location.search).get("login") === "failed");
      });
    get<Config>("/api/config")
      .then(setConfig)
      .catch(() => setConfig(null));
  }, []);

  async function logOut() {
    await post("/api/auth/logout");
    setUser(null);
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10">
      <h1 className="text-3xl font-semibold">Quidly</h1>
      <p>Job listings with a guaranteed response, backed by PayPal.</p>

      {loginFailed && !user && <p role="alert">PayPal login didn&apos;t finish. Please try again.</p>}

      {user === null && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <a className={linkClass} href="/api/auth/paypal?role=RECRUITER">
            Log in as a company
          </a>
          <a className={linkClass} href="/api/auth/paypal?role=CANDIDATE">
            Log in as a candidate
          </a>
        </div>
      )}

      {user && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <p>
              Logged in as {user.email} ({user.role === "RECRUITER" ? "company" : "candidate"})
              {user.role === "CANDIDATE" && ` · ${user.availableSlots} of 5 slots available`}
            </p>
            <button className="underline" onClick={logOut}>
              Log out
            </button>
          </div>
          {!config && <p>Loading…</p>}
          {config && user.role === "RECRUITER" && <RecruiterView config={config} />}
          {config && user.role === "CANDIDATE" && <CandidateView config={config} onSlotsChange={refreshUser} />}
        </>
      )}
    </main>
  );
}
