"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import {
  type Application,
  errorMessage,
  get,
  type Listing,
  post,
  type Profile,
  splitRequirements,
} from "@/lib/api";
import { useAuthDialog } from "@/lib/auth-dialog";
import { Icon } from "@/lib/icons";
import { CompanyBadges, ListingMeta } from "@/lib/listing-summary";
import { PayPalButton } from "@/lib/paypal-button";
import { CompanyAvatar, EmptyState, PageSkeleton, Skeleton, SpotsLeft } from "@/lib/ui";
import { useSession } from "@/lib/use-session";

const afterApplying = [
  { title: "You apply", text: "A $2 hold is placed on your PayPal. It's never charged." },
  { title: "They have 72 hours", text: "To send specific feedback or invite you to interview." },
  { title: "You get an answer", text: "Or $5 goes to your PayPal if they miss the deadline." },
];

export default function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, config, refreshUser } = useSession();
  const openAuth = useAuthDialog();
  const [listing, setListing] = useState<Listing | null>(null);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [resume, setResume] = useState("");
  const [hasProfileResume, setHasProfileResume] = useState(false);
  const [editingResume, setEditingResume] = useState(false);
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
    get<Profile>("/api/profile")
      .then((profile) => {
        setResume(profile.resumeText ?? "");
        setHasProfileResume(Boolean(profile.resumeText?.trim()));
      })
      .catch(() => {});
  }, [user, id]);

  if (error) {
    return (
      <EmptyState
        icon={<Icon name="search" size={22} />}
        title="We couldn't find this role"
        text="It may have been removed, or the link may be wrong."
      >
        <Link className="btn btn-primary" href="/jobs">
          Browse open roles
        </Link>
      </EmptyState>
    );
  }
  if (!listing) return <PageSkeleton />;

  const spotsLeft = Math.max(0, listing.applicantCap - listing.applicantCount);
  const requirements = splitRequirements(listing.requirementsText);

  function applyArea() {
    if (!listing) return null;
    if (listing.status !== "OPEN") {
      return (
        <div className="notice notice-neutral">
          <Icon name="info" size={18} className="mt-px shrink-0" />
          This role is closed and isn&apos;t taking applications.
        </div>
      );
    }
    if (user === undefined) return <Skeleton className="h-12 w-full rounded-xl" />;
    if (user?.role === "CANDIDATE" && applied) {
      return (
        <>
          <div className="notice notice-success">
            <Icon name="check-circle" size={18} className="mt-px shrink-0" />
            <p>
              <span className="font-semibold">You applied.</span> The company has 72 hours to reply, or you get $5.
            </p>
          </div>
          <Link className="btn btn-secondary w-full" href="/candidate">
            Track your application
          </Link>
        </>
      );
    }
    if (spotsLeft === 0) {
      return (
        <div className="notice notice-warn">
          <Icon name="users" size={18} className="mt-px shrink-0" />
          Every spot on this role has been taken.
        </div>
      );
    }
    if (user === null) {
      const job = { title: listing.title, companyName: listing.companyName };
      return (
        <button className="btn btn-primary btn-lg w-full" onClick={() => openAuth({ role: "CANDIDATE", job })}>
          Apply now
        </button>
      );
    }
    if (user.role === "RECRUITER") {
      return (
        <div className="notice notice-neutral">
          <Icon name="info" size={18} className="mt-px shrink-0" />
          You&apos;re logged in as a company. Job seekers apply from their own account.
        </div>
      );
    }
    if (user.availableSlots < 1) {
      return (
        <>
          <div className="notice notice-warn">
            <Icon name="info" size={18} className="mt-px shrink-0" />
            All 5 of your application slots are in use. A slot opens again when one of your applications is
            answered.
          </div>
          <Link className="btn btn-secondary w-full" href="/candidate">
            See my applications
          </Link>
        </>
      );
    }
    if (!config || !listing) return <Skeleton className="h-12 w-full rounded-xl" />;

    const role = listing;
    return (
      <>
        <CostList openSlots={user.availableSlots} />

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="label">Your resume</span>
            {hasProfileResume && (
              <button className="btn btn-ghost btn-sm -mr-2" onClick={() => setEditingResume((editing) => !editing)}>
                {editingResume ? "Done" : "Edit for this role"}
              </button>
            )}
          </div>
          {hasProfileResume && !editingResume ? (
            <div className="flex items-start gap-3 rounded-xl border border-border bg-surface-2 p-3">
              <Icon name="file" size={18} className="mt-0.5 shrink-0 text-muted" />
              <p className="line-clamp-3 text-sm text-muted">{resume || "Your resume is empty."}</p>
            </div>
          ) : (
            <>
              {!hasProfileResume && (
                <p className="hint">
                  Paste it below, or{" "}
                  <Link className="link" href="/candidate">
                    upload a PDF to your profile
                  </Link>{" "}
                  to reuse it every time.
                </p>
              )}
              <textarea
                className="input"
                rows={7}
                value={resume}
                placeholder="Paste your resume text here"
                onChange={(event) => setResume(event.target.value)}
              />
              {hasProfileResume && <p className="hint">Changes here only apply to this application.</p>}
            </>
          )}
        </div>

        {config.demoModeEnabled && (
          <label className="flex items-start gap-3 rounded-xl border border-dashed border-border-strong p-3 text-sm">
            <input
              type="checkbox"
              className="checkbox mt-0.5"
              checked={demoMode}
              onChange={(event) => setDemoMode(event.target.checked)}
            />
            <span>
              <span className="font-medium">Demo mode</span>
              <span className="block text-muted">
                Give the company 90 seconds instead of 72 hours, to see the $5 payout quickly.
              </span>
            </span>
          </label>
        )}

        {message && (
          <div className="notice notice-danger" role="alert">
            <Icon name="alert" size={18} className="mt-px shrink-0" />
            {message}
          </div>
        )}

        {resume.trim() ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Approve the $2 hold to apply</p>
            <PayPalButton
              clientId={config.paypalClientId}
              intent="authorize"
              createOrder={async () => {
                setMessage("");
                const order = await post<{ orderId: string }>(`/api/jobs/${role.id}/applications/order`);
                return order.orderId;
              }}
              onApprove={async (orderId) => {
                await post(`/api/jobs/${role.id}/applications`, { orderId, resumeText: resume, demoMode });
                setApplied(true);
                refreshUser();
              }}
              onError={setMessage}
            />
          </div>
        ) : (
          <button className="btn btn-primary btn-lg w-full" disabled>
            Add your resume to apply
          </button>
        )}
      </>
    );
  }

  return (
    <main className="flex flex-1 flex-col">
      <section className="bg-hero border-b border-border">
        <div className="container-page py-8 md:py-10">
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
          >
            <Icon name="arrow-left" size={14} />
            All jobs
          </Link>
          <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center">
            <CompanyAvatar name={listing.companyName} size="lg" />
            <div className="min-w-0">
              <h1 className="h-page">{listing.title}</h1>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-[0.9375rem]">
                <Link
                  className="font-medium transition-colors hover:text-accent-ink"
                  href={`/companies/${listing.companyId}`}
                >
                  {listing.companyName}
                </Link>
                <CompanyBadges verified={listing.companyVerified} sample={listing.isSample} />
              </p>
            </div>
          </div>
          <div className="mt-5">
            <ListingMeta listing={listing} />
          </div>
        </div>
      </section>

      <div className="container-page grid flex-1 items-start gap-8 py-10 lg:grid-cols-[1fr_23rem]">
        <div className="flex min-w-0 flex-col gap-6">
          {listing.description && (
            <section className="card p-6 sm:p-8">
              <h2 className="text-lg font-semibold tracking-tight">About the role</h2>
              <p className="mt-3 leading-relaxed whitespace-pre-line text-muted">{listing.description}</p>
            </section>
          )}
          <section className="card p-6 sm:p-8">
            <h2 className="text-lg font-semibold tracking-tight">What they&apos;re looking for</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {requirements.map((requirement) => (
                <li key={requirement} className="flex gap-3">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                    <Icon name="check" size={12} strokeWidth={2.5} />
                  </span>
                  <span className="text-[0.9375rem]">{requirement}</span>
                </li>
              ))}
            </ul>
            <p className="hint mt-6">If the company turns you down, its feedback has to name one of these.</p>
          </section>
          <section className="card p-6 sm:p-8">
            <h2 className="text-lg font-semibold tracking-tight">What happens after you apply</h2>
            <ol className="mt-4 flex flex-col divide-y divide-border">
              {afterApplying.map((step, index) => (
                <li key={step.title} className="flex gap-4 py-3.5 sm:items-baseline">
                  <span className="font-mono text-sm text-accent">0{index + 1}</span>
                  <span className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
                    <span className="font-semibold sm:w-40 sm:shrink-0">{step.title}</span>
                    <span className="text-sm leading-relaxed text-muted sm:text-[0.9375rem]">{step.text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="flex flex-col gap-4">
          <div className="card overflow-hidden shadow-raised">
            <div className="flex items-start gap-3 border-b border-border bg-accent-soft/60 p-5">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-accent shadow-card">
                <Icon name="shield" size={20} />
              </span>
              <div>
                <p className="font-semibold">Reply guaranteed</p>
                <p className="text-sm text-muted">Hear back within 72 hours, or get $5 sent to your PayPal.</p>
              </div>
            </div>
            <div className="flex flex-col gap-5 p-5">
              <SpotsLeft applicantCount={listing.applicantCount} applicantCap={listing.applicantCap} />
              {applyArea()}
            </div>
          </div>
          <Link
            href={`/companies/${listing.companyId}`}
            className="card card-link flex items-center gap-3 p-4"
          >
            <CompanyAvatar name={listing.companyName} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{listing.companyName}</span>
              <span className="block text-xs text-muted">See the company and its open roles</span>
            </span>
            <Icon name="arrow-right" size={16} className="text-muted" />
          </Link>
        </aside>
      </div>
    </main>
  );
}

function CostList({ openSlots }: { openSlots: number }) {
  return (
    <ul className="flex flex-col gap-2 text-sm">
      <li className="flex items-start gap-2.5">
        <Icon name="lock" size={16} className="mt-0.5 shrink-0 text-muted" />
        <span>
          <span className="font-medium">$2 hold, never charged.</span>{" "}
          <span className="text-muted">Released once the company answers.</span>
        </span>
      </li>
      <li className="flex items-start gap-2.5">
        <Icon name="briefcase" size={16} className="mt-0.5 shrink-0 text-muted" />
        <span>
          <span className="font-medium">Uses 1 of your 5 slots.</span>{" "}
          <span className="text-muted">You have {openSlots} open right now.</span>
        </span>
      </li>
    </ul>
  );
}
