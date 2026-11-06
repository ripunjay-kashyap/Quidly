"use client";

import { useEffect, useState } from "react";
import { get, type Listing } from "@/lib/api";
import { Icon } from "@/lib/icons";
import { ListingSummary } from "@/lib/listing-summary";
import { Skeleton } from "@/lib/ui";

const jobTypes = ["Any type", "Full-time", "Part-time", "Contract", "Internship"];
const workplaces = ["Anywhere", "Remote", "Hybrid", "On-site"];

function matchesWorkplace(location: string, workplace: string): boolean {
  const place = location.toLowerCase();
  if (workplace === "Remote") return place.includes("remote");
  if (workplace === "Hybrid") return place.includes("hybrid");
  if (workplace === "On-site") return !place.includes("remote") && !place.includes("hybrid");
  return true;
}

export function JobSearch() {
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [jobType, setJobType] = useState(jobTypes[0]);
  const [workplace, setWorkplace] = useState(workplaces[0]);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sort, setSort] = useState("newest");

  useEffect(() => {
    get<Listing[]>("/api/jobs")
      .catch(() => null)
      .then((open) => {
        setListings(open ?? []);
        setFailed(open === null);
        // The home page search box sends its words here as ?q=
        const fromHome = new URLSearchParams(window.location.search).get("q");
        if (fromHome) setQuery(fromHome);
      });
  }, []);

  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const results = (listings ?? []).filter((listing) => {
    if (jobType !== jobTypes[0] && listing.employmentType !== jobType) return false;
    if (!matchesWorkplace(listing.location, workplace)) return false;
    if (verifiedOnly && !listing.companyVerified) return false;
    const text = [listing.title, listing.companyName, listing.location, listing.requirementsText, listing.description]
      .join(" ")
      .toLowerCase();
    return terms.every((term) => text.includes(term));
  });
  if (sort === "spots") {
    results.sort((a, b) => b.applicantCap - b.applicantCount - (a.applicantCap - a.applicantCount));
  }

  const filtered = query !== "" || jobType !== jobTypes[0] || workplace !== workplaces[0] || verifiedOnly;
  function clearFilters() {
    setQuery("");
    setJobType(jobTypes[0]);
    setWorkplace(workplaces[0]);
    setVerifiedOnly(false);
  }

  return (
    <main className="flex flex-1 flex-col">
      <section className="bg-hero border-b border-border">
        <div className="container-page py-12 md:py-16">
          <p className="kicker">Open roles</p>
          <h1 className="h-section mt-3 max-w-2xl">Find a job that answers back</h1>
          <p className="lead mt-4 max-w-2xl">
            Every company here must reply within 72 hours. If it doesn&apos;t, you get $5.
          </p>
          <label className="mt-8 flex max-w-2xl items-center gap-3 rounded-2xl border border-border bg-white px-4 shadow-raised transition-shadow focus-within:border-accent focus-within:shadow-[0_0_0_4px_var(--ring)]">
            <Icon name="search" size={18} className="shrink-0 text-muted" />
            <span className="sr-only">Search jobs</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by job title, skill, company or city"
              className="h-14 w-full bg-transparent text-base outline-none placeholder:text-[#8c95ab]"
            />
          </label>
        </div>
      </section>

      <div className="container-page grid flex-1 gap-8 py-8 lg:grid-cols-[15rem_1fr] lg:py-10">
        <aside className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start" aria-label="Filters">
          <FilterGroup label="Job type" options={jobTypes} value={jobType} onChange={setJobType} />
          <FilterGroup label="Where" options={workplaces} value={workplace} onChange={setWorkplace} />
          <label className="flex items-center gap-2.5 text-sm font-medium">
            <input
              type="checkbox"
              className="checkbox"
              checked={verifiedOnly}
              onChange={(event) => setVerifiedOnly(event.target.checked)}
            />
            Verified companies only
          </label>
          {filtered && (
            <button className="btn btn-ghost btn-sm self-start px-2" onClick={clearFilters}>
              <Icon name="x" size={14} />
              Clear filters
            </button>
          )}
        </aside>

        <section className="flex min-w-0 flex-col gap-4" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              {listings === null
                ? "Loading roles…"
                : `Showing ${results.length} of ${listings.length} open ${listings.length === 1 ? "role" : "roles"}`}
            </p>
            <label className="flex items-center gap-2 text-sm text-muted">
              Sort by
              <select className="input min-h-9 w-auto py-1.5 text-sm" value={sort} onChange={(event) => setSort(event.target.value)}>
                <option value="newest">Newest</option>
                <option value="spots">Most spots left</option>
              </select>
            </label>
          </div>

          {failed && (
            <div className="notice notice-danger" role="alert">
              <Icon name="alert" size={18} className="mt-px shrink-0" />
              We couldn&apos;t load the roles. Refresh the page to try again.
            </div>
          )}
          {listings === null &&
            Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-32 rounded-2xl" />)}
          {results.map((listing) => (
            <ListingSummary key={listing.id} listing={listing} />
          ))}
          {listings !== null && !failed && results.length === 0 && (
            <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
              <span className="grid size-12 place-items-center rounded-full bg-surface-3 text-muted">
                <Icon name="search" size={22} />
              </span>
              <p className="font-semibold">No roles match your search</p>
              <p className="max-w-sm text-sm text-muted">Try fewer words, or clear the filters to see every open role.</p>
              <button className="btn btn-secondary btn-sm mt-2" onClick={clearFilters}>
                Clear filters
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function FilterGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2.5 text-sm font-semibold">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button key={option} type="button" className="chip" aria-pressed={value === option} onClick={() => onChange(option)}>
            {option}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
