"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { get, type Listing } from "@/lib/api";
import { Icon } from "@/lib/icons";
import { ListingSummary } from "@/lib/listing-summary";
import { Skeleton } from "@/lib/ui";

export function FeaturedJobs() {
  const [listings, setListings] = useState<Listing[] | null>(null);

  useEffect(() => {
    get<Listing[]>("/api/jobs")
      .then(setListings)
      .catch(() => setListings([]));
  }, []);

  if (listings?.length === 0) return null;
  // One row per job title, so the preview shows a spread of roles.
  const featured = (listings ?? [])
    .filter((listing, index, all) => all.findIndex((other) => other.title === listing.title) === index)
    .slice(0, 5);

  return (
    <section id="jobs" className="border-y border-border bg-surface-2 py-20 md:py-28">
      <div className="container-page">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <h2 className="h-section">Jobs you can apply for today</h2>
            <p className="lead mt-4">Every company here must reply within 72 hours, or pay you $5.</p>
          </div>
          <Link className="btn btn-secondary shrink-0 self-start sm:self-auto" href="/jobs">
            See all{listings ? ` ${listings.length}` : ""} jobs
            <Icon name="arrow-right" />
          </Link>
        </div>
        <div className="mt-10 flex flex-col gap-3">
          {listings === null
            ? Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-28 rounded-2xl" />)
            : featured.map((listing) => <ListingSummary key={listing.id} listing={listing} />)}
        </div>
      </div>
    </section>
  );
}
