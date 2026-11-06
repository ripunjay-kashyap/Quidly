"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { type Application, errorMessage, get, type Listing, post } from "@/lib/api";
import { CompanyBadges } from "@/lib/listing-summary";
import { PayPalButton } from "@/lib/paypal-button";
import { useSession } from "@/lib/use-session";

const SAMPLE_RESUME =
  "Backend engineer with six years of experience. Built payment APIs in Go and Postgres at a fintech startup. Led a migration from a monolith to services. Some AWS Lambda experience. No professional Kubernetes experience listed.";

export default function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, config, refreshUser } = useSession();
  const [listing, setListing] = useState<Listing | null>(null);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [resume, setResume] = useState(SAMPLE_RESUME);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    get<Listing>(`/api/jobs/${id}`)
      .then(setListing)
      .catch((failure) => setError(errorMessage(failure)));
  }, [id]);

  useEffect(() => {
    if (user?.role !== "CANDIDATE") return;
    get<Application[]>("/api/my/applications")
      .then((mine) => setApplied(mine.some((application) => application.jobId === id)))
      .catch(() => {});
  }, [user, id]);

  if (error) return <main className="mx-auto w-full max-w-3xl px-4">{error}</main>;
  if (!listing) return <main className="mx-auto w-full max-w-3xl px-4">Loading…</main>;

  const spotsLeft = Math.max(0, listing.applicantCap - listing.applicantCount);
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 pb-10">
      <h1 className="text-3xl font-semibold">{listing.title}</h1>
      <p className="flex flex-wrap items-center gap-2">
        <Link className="underline" href={`/companies/${listing.companyId}`}>
          {listing.companyName}
        </Link>
        <CompanyBadges verified={listing.companyVerified} sample={listing.isSample} />
      </p>
      <p>
        {listing.location} · {listing.employmentType}
        {listing.salaryRange && ` · ${listing.salaryRange}`} · {spotsLeft} of {listing.applicantCap} spots left
      </p>
      {listing.description && <p className="whitespace-pre-line">{listing.description}</p>}
      <h2 className="text-xl font-semibold">Requirements</h2>
      <p className="whitespace-pre-line">{listing.requirementsText}</p>

      <h2 className="text-xl font-semibold">Guaranteed Response</h2>
      <p>
        The company will reply within 72 hours with specific feedback or an interview invite. If it doesn&apos;t,
        Quidly pays you $5 through PayPal. Applying places a $2 hold on your PayPal account, which is released
        once the company replies, and uses 1 of your 5 application slots.
      </p>

      {message && <p role="alert">{message}</p>}
      {listing.status !== "OPEN" && <p>This role is closed.</p>}
      {listing.status === "OPEN" && user === null && (
        <a className="self-start border px-3 py-1" href="/api/auth/paypal?role=CANDIDATE">
          Log in with PayPal to apply
        </a>
      )}
      {listing.status === "OPEN" && user?.role === "RECRUITER" && <p>Log in as a candidate to apply.</p>}
      {listing.status === "OPEN" && user?.role === "CANDIDATE" && applied && (
        <p>
          You&apos;ve applied. Track it in{" "}
          <Link className="underline" href="/candidate">
            My applications
          </Link>
          .
        </p>
      )}
      {listing.status === "OPEN" && user?.role === "CANDIDATE" && !applied && config && spotsLeft > 0 && (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col">
            Your resume
            <textarea className="border p-1" rows={5} value={resume} onChange={(event) => setResume(event.target.value)} />
          </label>
          {config.demoModeEnabled && (
            <label>
              <input type="checkbox" checked={demoMode} onChange={(event) => setDemoMode(event.target.checked)} />{" "}
              Demo Mode (90-second deadline instead of 72 hours)
            </label>
          )}
          <PayPalButton
            clientId={config.paypalClientId}
            intent="authorize"
            createOrder={async () => {
              setMessage("");
              const order = await post<{ orderId: string }>(`/api/jobs/${listing.id}/applications/order`);
              return order.orderId;
            }}
            onApprove={async (orderId) => {
              await post(`/api/jobs/${listing.id}/applications`, { orderId, resumeText: resume, demoMode });
              setApplied(true);
              setMessage("Applied. The company has until the deadline to respond.");
              refreshUser();
            }}
            onError={setMessage}
          />
        </div>
      )}
    </main>
  );
}
