"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { errorMessage, get, type Listing } from "@/lib/api";
import { Icon } from "@/lib/icons";
import { CompanyBadges, ListingSummary } from "@/lib/listing-summary";
import { CompanyAvatar, EmptyState, PageSkeleton } from "@/lib/ui";

type Company = {
  companyName: string;
  companyWebsite: string | null;
  companyIndustry: string;
  companySize: string;
  companyDescription: string;
  companyVerified: boolean;
  isSample: boolean;
  openRoles: Listing[];
};

export default function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [company, setCompany] = useState<Company | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    get<Company>(`/api/companies/${id}`)
      .then(setCompany)
      .catch((failure) => setError(errorMessage(failure)));
  }, [id]);

  if (error) {
    return (
      <EmptyState
        icon={<Icon name="building" size={22} />}
        title="We couldn't find this company"
        text="It may have been removed, or the link may be wrong."
      >
        <Link className="btn btn-primary" href="/jobs">
          Browse open roles
        </Link>
      </EmptyState>
    );
  }
  if (!company) return <PageSkeleton />;

  return (
    <main className="flex flex-1 flex-col">
      <section className="border-b border-border">
        <div className="bg-band h-32 sm:h-40" />
        <div className="container-page pb-8">
          <div className="relative -mt-10 w-fit rounded-2xl bg-white p-1.5 shadow-raised">
            <CompanyAvatar name={company.companyName} size="lg" />
          </div>
          <h1 className="h-page mt-4">{company.companyName}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
            <span className="flex flex-wrap gap-2">
              <CompanyBadges verified={company.companyVerified} sample={company.isSample} />
            </span>
            <span className="flex items-center gap-1.5">
              <Icon name="briefcase" size={15} />
              {company.companyIndustry}
            </span>
            <span className="flex items-center gap-1.5">
              <Icon name="users" size={15} />
              {company.companySize} employees
            </span>
            {company.companyWebsite && (
              <a
                className="link flex items-center gap-1.5"
                href={company.companyWebsite}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon name="globe" size={15} />
                {company.companyWebsite.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>
        </div>
      </section>

      <div className="container-page grid flex-1 items-start gap-8 py-10 lg:grid-cols-[1fr_20rem]">
        <div className="flex min-w-0 flex-col gap-8">
          <section className="card p-6 sm:p-8">
            <h2 className="text-lg font-semibold tracking-tight">About {company.companyName}</h2>
            <p className="mt-3 leading-relaxed whitespace-pre-line text-muted">{company.companyDescription}</p>
          </section>
          <section className="flex flex-col gap-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              Open roles
              <span className="badge">{company.openRoles.length}</span>
            </h2>
            {company.openRoles.length === 0 && (
              <div className="card p-8 text-center text-muted">No open roles right now. Check back soon.</div>
            )}
            {company.openRoles.map((listing) => (
              <ListingSummary key={listing.id} listing={listing} />
            ))}
          </section>
        </div>
        <aside className="card p-6 lg:sticky lg:top-24">
          <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent">
            <Icon name="shield" size={20} />
          </span>
          <p className="mt-4 font-semibold">Replies within 72 hours</p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            {company.companyName} answers every applicant within 72 hours, with feedback or an interview invite. If it
            misses the deadline, the applicant gets $5.
          </p>
        </aside>
      </div>
    </main>
  );
}
