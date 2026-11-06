"use client";

import { useSession } from "@/lib/use-session";
import { CompanyProfileForm } from "../company-profile-form";
import { RecruiterView } from "../recruiter-view";

export default function CompanyDashboard() {
  const { user, config, refreshUser } = useSession();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pb-10">
      <h1 className="text-3xl font-semibold">Company dashboard</h1>
      {(user === undefined || (user && !config)) && <p>Loading…</p>}
      {user === null && (
        <a className="self-start border px-3 py-1" href="/api/auth/paypal?role=RECRUITER">
          Log in with PayPal
        </a>
      )}
      {user?.role === "CANDIDATE" && <p>This page is for companies.</p>}
      {user?.role === "RECRUITER" && config && (
        <>
          <CompanyProfileForm config={config} onSaved={refreshUser} />
          {user.companyName ? (
            <RecruiterView config={config} />
          ) : (
            <p>Save your company profile to start posting roles.</p>
          )}
        </>
      )}
    </main>
  );
}
