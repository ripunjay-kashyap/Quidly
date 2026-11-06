"use client";

import { useState } from "react";
import { money } from "@/lib/api";
import { AuthButton } from "@/lib/auth-dialog";

const LISTING_FEE = 49;
const DEPOSIT_PER_APPLICANT = 5;
const WIDTH = 38;

const row = (label: string, value: string) => label + value.padStart(WIDTH - label.length);

export function PriceCalculator() {
  const [applicants, setApplicants] = useState(20);
  const deposit = applicants * DEPOSIT_PER_APPLICANT;
  const bill = [
    row("posting fee", money(LISTING_FEE)),
    row(`deposit  ${applicants} x $${DEPOSIT_PER_APPLICANT}`, money(deposit)),
    "-".repeat(WIDTH),
    row("you pay today", money(LISTING_FEE + deposit)),
    "",
    row("back if you answer everyone", `-${money(deposit)}`),
    row("your final cost", money(LISTING_FEE)),
  ].join("\n");

  return (
    <div className="card p-6 shadow-float sm:p-8">
      <label className="flex flex-col gap-3">
        <span className="flex items-baseline justify-between text-muted">
          How many people can apply?
          <span className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">{applicants}</span>
        </span>
        <input
          type="range"
          min={5}
          max={100}
          step={5}
          value={applicants}
          onChange={(event) => setApplicants(Number(event.target.value))}
          className="w-full accent-accent"
        />
      </label>
      <pre
        className="ascii mt-6 overflow-x-auto rounded-xl border border-border bg-surface-2 p-5 text-[11px] sm:text-[13px]"
        aria-live="polite"
      >
        {bill}
      </pre>
      <AuthButton role="RECRUITER" className="btn btn-primary btn-lg mt-6 w-full">
        Start hiring
      </AuthButton>
    </div>
  );
}
