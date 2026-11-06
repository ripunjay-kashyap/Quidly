"use client";

import Link from "next/link";
import { post } from "@/lib/api";
import { useSession } from "@/lib/use-session";

export function SiteHeader() {
  const { user } = useSession();

  async function logOut() {
    await post("/api/auth/logout");
    // A full reload clears every page's copy of the logged-in user, which a client-side push would keep.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/");
  }

  return (
    <header className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-4 px-4 py-4">
      <Link className="text-2xl font-semibold" href="/">
        Quidly
      </Link>
      <Link className="underline" href="/">
        Jobs
      </Link>
      {user === null && (
        <>
          <a className="underline" href="/api/auth/paypal?role=CANDIDATE">
            Log in to apply
          </a>
          <a className="underline" href="/api/auth/paypal?role=RECRUITER">
            Log in to hire
          </a>
        </>
      )}
      {user && (
        <>
          <Link className="underline" href={user.role === "RECRUITER" ? "/company" : "/candidate"}>
            {user.role === "RECRUITER" ? "Company dashboard" : "My applications"}
          </Link>
          <span className="text-sm">
            {user.email}
            {user.role === "CANDIDATE" && ` · ${user.availableSlots} of 5 slots`}
          </span>
          <button className="underline" onClick={logOut}>
            Log out
          </button>
        </>
      )}
    </header>
  );
}
