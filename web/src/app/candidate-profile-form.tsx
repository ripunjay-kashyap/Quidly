"use client";

import { useEffect, useState } from "react";
import { errorMessage, get, type Profile } from "@/lib/api";
import { Icon } from "@/lib/icons";

export function CandidateProfileForm({ onSaved }: { onSaved?: (profile: Profile) => void }) {
  const [resumeText, setResumeText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [targetRoles, setTargetRoles] = useState("");
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  function show(profile: Profile) {
    setResumeText(profile.resumeText ?? "");
    setFileName(profile.resumeFileName);
    setPortfolioUrl(profile.portfolioUrl ?? "");
    setTargetRoles(profile.targetRoles ?? "");
  }

  useEffect(() => {
    get<Profile>("/api/profile")
      .then(show)
      .catch(() => {});
  }, []);

  async function send(init: RequestInit, done: string) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(init.method === "PUT" ? "/api/profile" : "/api/profile/resume", init);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Saving failed");
      show(data);
      onSaved?.(data);
      setMessage({ tone: "success", text: done });
    } catch (error) {
      setMessage({ tone: "danger", text: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  }

  function upload(file: File | undefined) {
    if (!file) return;
    send(
      {
        method: "POST",
        headers: { "content-type": "application/pdf", "x-file-name": encodeURIComponent(file.name) },
        body: file,
      },
      "Resume read. Check the text below and fix anything the PDF got wrong.",
    );
  }

  function save() {
    send(
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ resumeText, portfolioUrl, targetRoles }),
      },
      "Profile saved.",
    );
  }

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-col gap-6 p-6 sm:p-8">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Your resume</h2>
          <p className="mt-1 text-sm text-muted">
            Companies see it when you apply. AI also reads it to make sure their feedback is really about you.
          </p>
        </div>

        <label
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            if (!busy) upload(event.dataTransfer.files[0]);
          }}
          className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-9 text-center transition-colors focus-within:border-accent focus-within:shadow-[0_0_0_4px_var(--ring)] ${
            dragging ? "border-accent bg-accent-soft" : "border-border-strong bg-surface-2 hover:border-accent/50"
          }`}
        >
          <span className="grid size-11 place-items-center rounded-full bg-white text-accent shadow-card">
            <Icon name="upload" size={20} />
          </span>
          <span className="mt-1 font-medium">
            {busy ? "Reading your resume…" : "Drop your resume PDF here, or click to upload"}
          </span>
          <span className="hint">PDF, up to 4 MB and 10 pages. We turn it into text you can edit.</span>
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            disabled={busy}
            onChange={(event) => {
              upload(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>
        {fileName && (
          <p className="-mt-2 flex items-center gap-2 text-sm text-muted">
            <Icon name="file" size={15} />
            Last upload: <span className="font-medium text-foreground">{fileName}</span>
          </p>
        )}

        <label className="field">
          <span className="label">Resume text</span>
          <textarea
            className="input"
            rows={12}
            value={resumeText}
            placeholder="Upload a PDF above, or paste your resume here"
            onChange={(event) => setResumeText(event.target.value)}
          />
          <span className="hint">Companies see exactly this text. Fix anything the PDF reader got wrong.</span>
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="field">
            <span className="label">Portfolio or LinkedIn</span>
            <input
              className="input"
              placeholder="https://"
              value={portfolioUrl}
              onChange={(event) => setPortfolioUrl(event.target.value)}
            />
            <span className="hint">Optional</span>
          </label>
          <label className="field">
            <span className="label">Roles you&apos;re looking for</span>
            <input
              className="input"
              placeholder="Backend engineer, platform engineer"
              value={targetRoles}
              onChange={(event) => setTargetRoles(event.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-border bg-surface-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div role="status" className="text-sm">
          {message && (
            <span className={`flex items-start gap-2 ${message.tone === "success" ? "text-success" : "text-danger"}`}>
              <Icon name={message.tone === "success" ? "check-circle" : "alert"} size={16} className="mt-0.5 shrink-0" />
              {message.text}
            </span>
          )}
        </div>
        <button className="btn btn-primary shrink-0" disabled={busy} onClick={save}>
          {busy ? "Working…" : "Save profile"}
        </button>
      </div>
    </section>
  );
}
