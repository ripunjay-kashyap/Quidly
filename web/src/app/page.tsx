"use client";

import { useEffect, useState } from "react";
import { get, type Listing } from "@/lib/api";
import { ListingSummary } from "@/lib/listing-summary";

export default function JobBoard() {
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [loginFailed, setLoginFailed] = useState(false);

  useEffect(() => {
    get<Listing[]>("/api/jobs")
      .catch(() => [])
      .then((open) => {
        setListings(open);
        setLoginFailed(new URLSearchParams(window.location.search).get("login") === "failed");
      });
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 pb-10">
      <h1 className="text-3xl font-semibold">Jobs with a guaranteed response</h1>
      <p>
        Every company here promises a real reply within 72 hours. If they don&apos;t answer, PayPal pays you $5
        from their bond.
      </p>
      {loginFailed && <p role="alert">PayPal login didn&apos;t finish. Please try again.</p>}
      {listings === null && <p>Loading…</p>}
      {listings?.length === 0 && <p>No open roles yet.</p>}
      {listings?.map((listing) => <ListingSummary key={listing.id} listing={listing} />)}
    </main>
  );
}
