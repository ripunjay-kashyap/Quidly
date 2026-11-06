"use client";

import { useEffect, useState } from "react";
import { type Config, errorMessage, get } from "@/lib/api";
import { Icon } from "@/lib/icons";

type Company = {
  companyName: string | null;
  companyWebsite: string | null;
  companyIndustry: string | null;
  companySize: string | null;
  companyDescription: string | null;
  companyVerified: boolean;
};

const MIN_DESCRIPTION_LENGTH = 80;

export function CompanyProfileForm({ config, onSaved }: { config: Config; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [size, setSize] = useState("");
  const [description, setDescription] = useState("");
  const [verified, setVerified] = useState(false);
  const [saved, setSaved] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  function show(company: Company) {
    setName(company.companyName ?? "");
    setWebsite(company.companyWebsite ?? "");
    setIndustry(company.companyIndustry ?? "");
    setSize(company.companySize ?? "");
    setDescription(company.companyDescription ?? "");
    setVerified(company.companyVerified);
    setSaved(Boolean(company.companyName));
  }

  useEffect(() => {
    get<Company>("/api/company")
      .then(show)
      .catch(() => {});
  }, []);

  async function save() {
    setBusy(true);
    setProblems([]);
    try {
      const response = await fetch("/api/company", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, website, industry, size, description }),
      });
      const data = await response.json();
      if (!response.ok) {
        setProblems(data.problems ?? [data.error]);
        return;
      }
      show(data);
      onSaved();
    } catch (error) {
      setProblems([errorMessage(error)]);
    } finally {
      setBusy(false);
    }
  }

  const descriptionLength = description.trim().length;

  return (
    <section className="card max-w-3xl overflow-hidden">
      <div className="border-b border-border px-6 py-5 sm:px-8">
        <h2 className="text-lg font-semibold tracking-tight">Company profile</h2>
        <p className="mt-1 text-sm text-muted">Candidates see this on your company page and next to every role.</p>
      </div>

      <div className="flex flex-col gap-5 px-6 py-6 sm:px-8">
        {saved &&
          (verified ? (
            <div className="notice notice-success">
              <Icon name="badge-check" size={18} className="mt-px shrink-0" />
              Verified: your website loads, so your roles show a Verified badge.
            </div>
          ) : (
            <div className="notice notice-neutral">
              <Icon name="info" size={18} className="mt-px shrink-0" />
              Approved to post roles. Add a website that loads to get the Verified badge.
            </div>
          ))}

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="field">
            <span className="label">Company name</span>
            <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="field">
            <span className="label">Website</span>
            <input
              className="input"
              placeholder="https://example.com"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
            />
            <span className="hint">Optional. A website that loads earns the Verified badge.</span>
          </label>
          <label className="field">
            <span className="label">Industry</span>
            <select className="input" value={industry} onChange={(event) => setIndustry(event.target.value)}>
              <option value="">Choose…</option>
              {config.industries.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="label">Company size</span>
            <select className="input" value={size} onChange={(event) => setSize(event.target.value)}>
              <option value="">Choose…</option>
              {config.companySizes.map((option) => (
                <option key={option} value={option}>
                  {option} employees
                </option>
              ))}
            </select>
          </label>
          <label className="field sm:col-span-2">
            <span className="label">About the company</span>
            <textarea
              className="input"
              rows={5}
              value={description}
              placeholder="What does your company do, and what is it like to work there?"
              onChange={(event) => setDescription(event.target.value)}
            />
            <span className="hint">
              {descriptionLength < MIN_DESCRIPTION_LENGTH
                ? `Write a few full sentences: ${descriptionLength} of at least ${MIN_DESCRIPTION_LENGTH} characters.`
                : "Write in full sentences. A list of keywords won't pass the check."}
            </span>
          </label>
        </div>

        {problems.length > 0 && (
          <div className="notice notice-danger" role="alert">
            <Icon name="alert" size={18} className="mt-px shrink-0" />
            <ul className="flex flex-col gap-1">
              {problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex justify-end border-t border-border bg-surface-2 px-6 py-4 sm:px-8">
        <button className="btn btn-primary" disabled={busy} onClick={save}>
          {busy ? "Checking…" : "Save company profile"}
        </button>
      </div>
    </section>
  );
}
