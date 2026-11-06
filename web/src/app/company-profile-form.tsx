"use client";

import { useEffect, useState } from "react";
import { type Config, errorMessage, get } from "@/lib/api";

type Company = {
  companyName: string | null;
  companyWebsite: string | null;
  companyIndustry: string | null;
  companySize: string | null;
  companyDescription: string | null;
  companyVerified: boolean;
};

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

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-xl font-semibold">Company profile</h2>
      {saved && (
        <p>
          {verified
            ? "Verified: your website was reachable."
            : "Approved to post roles. Add a reachable website to get the Verified badge."}
        </p>
      )}
      <label className="flex flex-col">
        Company name
        <input className="border p-1" value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label className="flex flex-col">
        Website (optional)
        <input
          className="border p-1"
          placeholder="https://example.com"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </label>
      <label className="flex flex-col">
        Industry
        <select className="border p-1" value={industry} onChange={(event) => setIndustry(event.target.value)}>
          <option value="">Choose…</option>
          {config.industries.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col">
        Company size
        <select className="border p-1" value={size} onChange={(event) => setSize(event.target.value)}>
          <option value="">Choose…</option>
          {config.companySizes.map((option) => (
            <option key={option} value={option}>
              {option} employees
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col">
        About the company
        <textarea
          className="border p-1"
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>
      {problems.length > 0 && (
        <ul role="alert" className="list-disc pl-5">
          {problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      )}
      <button className="self-start border px-3 py-1" disabled={busy} onClick={save}>
        {busy ? "Checking…" : "Save company profile"}
      </button>
    </div>
  );
}
