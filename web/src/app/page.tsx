"use client";

import { useEffect, useState } from "react";

type User = { role: "CANDIDATE" | "RECRUITER"; email: string; availableSlots: number };

const linkClass = "rounded-full bg-foreground px-5 py-3 text-center font-medium text-background";

export default function Home() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [loginFailed, setLoginFailed] = useState(false);

  useEffect(() => {
    fetch("/api/me")
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null)
      .then((current) => {
        setUser(current);
        setLoginFailed(new URLSearchParams(window.location.search).get("login") === "failed");
      });
  }, []);

  async function logOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-6 px-4 py-16">
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
        <div className="flex flex-col items-start gap-3">
          <p>
            Logged in as {user.email} ({user.role === "RECRUITER" ? "company" : "candidate"})
          </p>
          {user.role === "CANDIDATE" && <p>{user.availableSlots} of 5 slots available</p>}
          <button className="underline" onClick={logOut}>
            Log out
          </button>
        </div>
      )}
    </main>
  );
}
