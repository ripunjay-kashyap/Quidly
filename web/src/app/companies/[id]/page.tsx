"use client";

import { use, useEffect, useState } from "react";
import { errorMessage, get, type Listing } from "@/lib/api";
import { CompanyBadges, ListingSummary } from "@/lib/listing-summary";

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

  if (error) return <main className="mx-auto w-full max-w-3xl px-4">{error}</main>;
  if (!company) return <main className="mx-auto w-full max-w-3xl px-4">Loading…</main>;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 pb-10">
      <h1 className="flex flex-wrap items-center gap-2 text-3xl font-semibold">
        {company.companyName}
        <CompanyBadges verified={company.companyVerified} sample={company.isSample} />
      </h1>
      <p>
        {company.companyIndustry} · {company.companySize} employees
        {company.companyWebsite && (
          <>
            {" · "}
            <a className="underline" href={company.companyWebsite} target="_blank" rel="noopener noreferrer">
              {company.companyWebsite.replace(/^https?:\/\//, "")}
            </a>
          </>
        )}
      </p>
      <p>{company.companyDescription}</p>
      <h2 className="text-xl font-semibold">Open roles</h2>
      {company.openRoles.length === 0 && <p>No open roles right now.</p>}
      {company.openRoles.map((listing) => (
        <ListingSummary key={listing.id} listing={listing} />
      ))}
    </main>
  );
}
