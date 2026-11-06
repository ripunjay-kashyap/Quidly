import Link from "next/link";
import type { Listing } from "./api";

export function CompanyBadges({ verified, sample }: { verified: boolean; sample: boolean }) {
  return (
    <>
      {verified && <span className="border px-1 text-sm">Verified</span>}
      {sample && <span className="border px-1 text-sm">Sample listing</span>}
    </>
  );
}

export function ListingSummary({ listing }: { listing: Listing }) {
  const spotsLeft = Math.max(0, listing.applicantCap - listing.applicantCount);
  return (
    <div className="flex flex-col gap-1 border p-3">
      <Link className="text-lg font-semibold underline" href={`/jobs/${listing.id}`}>
        {listing.title}
      </Link>
      <p className="flex flex-wrap gap-2">
        <Link className="underline" href={`/companies/${listing.companyId}`}>
          {listing.companyName}
        </Link>
        <CompanyBadges verified={listing.companyVerified} sample={listing.isSample} />
      </p>
      <p>
        {listing.location} · {listing.employmentType}
        {listing.salaryRange && ` · ${listing.salaryRange}`}
      </p>
      <p>
        Guaranteed Response: a reply within 72 hours, or you get $5 · {spotsLeft} of {listing.applicantCap}{" "}
        spots left
      </p>
    </div>
  );
}
