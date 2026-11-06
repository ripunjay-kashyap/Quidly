"use client";

import { useSession } from "@/lib/use-session";
import { CandidateView } from "../candidate-view";

export default function CandidateDashboard() {
  const { user, refreshUser } = useSession();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 pb-10">
      <h1 className="text-3xl font-semibold">My applications</h1>
      {user === undefined && <p>Loading…</p>}
      {user === null && (
        <a className="self-start border px-3 py-1" href="/api/auth/paypal?role=CANDIDATE">
          Log in with PayPal
        </a>
      )}
      {user?.role === "RECRUITER" && <p>This page is for candidates.</p>}
      {user?.role === "CANDIDATE" && (
        <>
          <p>{user.availableSlots} of 5 application slots available.</p>
          <CandidateView onSlotsChange={refreshUser} />
        </>
      )}
    </main>
  );
}
