import Link from "next/link";
import type { Listing } from "./api";
import { Icon } from "./icons";
import { CompanyAvatar, SpotsLeft } from "./ui";

export function CompanyBadges({ verified, sample }: { verified: boolean; sample: boolean }) {
  return (
    <>
      {verified && (
        <span className="badge badge-accent" title="The company's website was checked and is reachable.">
          <Icon name="badge-check" size={13} />
          Verified
        </span>
      )}
      {sample && (
        <span className="badge" title="An example listing, so you can try Quidly.">
          Sample listing
        </span>
      )}
    </>
  );
}

export function ListingMeta({ listing }: { listing: Listing }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted">
      <li className="flex items-center gap-1.5">
        <Icon name="map-pin" size={15} />
        {listing.location}
      </li>
      <li className="flex items-center gap-1.5">
        <Icon name="briefcase" size={15} />
        {listing.employmentType}
      </li>
      {listing.salaryRange && (
        <li className="flex items-center gap-1.5">
          <Icon name="dollar" size={15} />
          {listing.salaryRange}
        </li>
      )}
    </ul>
  );
}

// A job card. The title link covers the whole card; the company link sits on top of it.
export function ListingSummary({ listing }: { listing: Listing }) {
  return (
    <article className="card card-link relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-5">
      <CompanyAvatar name={listing.companyName} />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h3 className="text-[1.0625rem] leading-snug font-semibold tracking-tight">
          <Link className="stretched transition-colors hover:text-accent-ink" href={`/jobs/${listing.id}`}>
            {listing.title}
          </Link>
        </h3>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <Link
            className="relative z-10 font-medium text-muted transition-colors hover:text-foreground"
            href={`/companies/${listing.companyId}`}
          >
            {listing.companyName}
          </Link>
          <CompanyBadges verified={listing.companyVerified} sample={listing.isSample} />
        </p>
        <div className="mt-1.5">
          <ListingMeta listing={listing} />
        </div>
      </div>
      <div className="flex w-full shrink-0 flex-col items-start gap-3 sm:w-40 sm:items-end">
        <span className="badge badge-accent">
          <Icon name="clock" size={12} />
          Reply in 72h
        </span>
        <SpotsLeft applicantCount={listing.applicantCount} applicantCap={listing.applicantCap} />
      </div>
    </article>
  );
}
