"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthButton } from "@/lib/auth-dialog";
import { companyFlow, seekerFlow } from "./ascii";

type Audience = "seekers" | "companies";

const tabs: { id: Audience; label: string }[] = [
  { id: "seekers", label: "For job seekers" },
  { id: "companies", label: "For companies" },
];

const steps: Record<Audience, { title: string; text: string }[]> = {
  seekers: [
    {
      title: "Apply for free",
      text: "Log in with PayPal and apply. PayPal holds $2 while you wait, and you're never charged.",
    },
    {
      title: "Get an answer within 72 hours",
      text: "The company sends feedback that names what you're missing, or invites you to an interview.",
    },
    { title: "Or get $5", text: "If the company doesn't reply in time, it pays you $5 through PayPal." },
  ],
  companies: [
    { title: "Post a role", text: "Pay $49, plus a $5 deposit for each person who can apply." },
    {
      title: "Reply within 72 hours",
      text: "Name the requirement a person is missing, or invite them to an interview.",
    },
    {
      title: "Get your deposit back",
      text: "Close the role when everyone has an answer. If you missed someone, their $5 goes to them.",
    },
  ],
};

export function HowItWorks() {
  const [audience, setAudience] = useState<Audience>("seekers");

  return (
    <section id="how-it-works" className="py-20 md:py-28">
      <div className="container-page grid items-center gap-12 lg:grid-cols-[0.9fr_1.4fr]">
        <div>
          <h2 className="h-section">How Quidly works</h2>
          <p className="lead mt-4">
            Every application starts a 72-hour clock. The company must answer before the clock runs out.
          </p>
          <div className="segmented mt-8" role="tablist" aria-label="Show the steps">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                id={`steps-${tab.id}`}
                role="tab"
                aria-selected={audience === tab.id}
                aria-controls="steps-panel"
                onClick={() => setAudience(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div id="steps-panel" role="tabpanel" aria-labelledby={`steps-${audience}`}>
            <ol className="mt-8 flex flex-col gap-6">
              {steps[audience].map((step, index) => (
                <li key={step.title} className="flex gap-4">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent-soft font-mono text-sm font-medium text-accent-ink">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-semibold">{step.title}</p>
                    <p className="mt-1 leading-relaxed text-muted">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            {audience === "seekers" ? (
              <Link className="btn btn-primary mt-8" href="/jobs">
                Find a job
              </Link>
            ) : (
              <AuthButton role="RECRUITER" className="btn btn-primary mt-8">
                Start hiring
              </AuthButton>
            )}
          </div>
        </div>

        {/* The same steps as a diagram. Too small to read on a phone, so it starts at tablet width. */}
        <div aria-hidden="true" className="card hidden overflow-x-auto bg-surface-2 p-5 sm:block sm:p-8">
          <pre className="ascii text-[11px] text-foreground/85 xl:text-[12.5px]">
            {audience === "seekers" ? seekerFlow : companyFlow}
          </pre>
        </div>
      </div>
    </section>
  );
}
