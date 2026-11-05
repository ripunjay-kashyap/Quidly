"use client";

import { useEffect, useRef, useState } from "react";
import { type Application, type Config, errorMessage, get, post, timeLeft } from "@/lib/api";
import { PayPalButton } from "@/lib/paypal-button";

type Job = {
  id: string;
  title: string;
  requirementsText: string;
  applicantCap: number;
  status: string;
  bondTotal: string;
  applications: Application[];
};

export function RecruiterView({ config }: { config: Config }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [now, setNow] = useState(0);
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("Senior Backend Engineer");
  const [requirements, setRequirements] = useState(
    "5+ years of backend development, Go, PostgreSQL, running production Kubernetes clusters, on-call experience",
  );
  const [cap, setCap] = useState(10);
  const fundingJobId = useRef("");

  function refresh() {
    get<Job[]>("/api/my/jobs")
      .then(setJobs)
      .catch((error) => setMessage(errorMessage(error)));
  }

  useEffect(() => {
    const tick = () => {
      setNow(Date.now());
      refresh();
    };
    tick();
    const timer = setInterval(tick, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="flex flex-col gap-6">
      {message && <p role="alert">{message}</p>}

      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">Post a role</h2>
        <label className="flex flex-col">
          Title
          <input className="border p-1" value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label className="flex flex-col">
          Requirements
          <textarea
            className="border p-1"
            rows={3}
            value={requirements}
            onChange={(event) => setRequirements(event.target.value)}
          />
        </label>
        <label className="flex flex-col">
          Applicant cap
          <input
            className="border p-1"
            type="number"
            min={1}
            max={500}
            value={cap}
            onChange={(event) => setCap(Number(event.target.value))}
          />
        </label>
        <p>Total: ${49 + cap * 5} ($49 listing fee plus a refundable $5 bond per applicant)</p>
        <PayPalButton
          clientId={config.paypalClientId}
          intent="capture"
          createOrder={async () => {
            setMessage("");
            const created = await post<{ jobId: string; orderId: string }>("/api/jobs", {
              title,
              requirementsText: requirements,
              applicantCap: cap,
            });
            fundingJobId.current = created.jobId;
            return created.orderId;
          }}
          onApprove={async () => {
            await post(`/api/jobs/${fundingJobId.current}/fund`);
            setMessage("Role funded and open.");
            refresh();
          }}
          onError={setMessage}
        />
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Your roles</h2>
        {jobs.length === 0 && <p>No roles yet.</p>}
        {jobs.map((job) => (
          <div key={job.id} className="flex flex-col gap-2 border p-3">
            <p>
              <strong>{job.title}</strong> · {job.status} · cap {job.applicantCap} · bond ${job.bondTotal}
            </p>
            <p>{job.requirementsText}</p>
            {job.applications.length === 0 && <p>No applicants yet.</p>}
            {job.applications.map((application) => (
              <ApplicationRow key={application.id} application={application} now={now} onChange={refresh} />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function ApplicationRow({
  application,
  now,
  onChange,
}: {
  application: Application;
  now: number;
  onChange: () => void;
}) {
  const [requirement, setRequirement] = useState("");
  const [feedback, setFeedback] = useState("");
  const [interviewAt, setInterviewAt] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function act(path: string, body: unknown) {
    setBusy(true);
    setError("");
    try {
      await post(`/api/applications/${application.id}/${path}`, body);
      onChange();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  const open = application.status === "ACTIVE";
  return (
    <div className="flex flex-col gap-2 border-t pt-2">
      <p>
        Status: {application.status}
        {open && ` · ${timeLeft(application.expiresAt, now)}`}
        {application.payoutStatus && ` · payout ${application.payoutStatus}`}
      </p>
      <p>Resume: {application.resumeText}</p>
      {application.recruiterFeedback && <p>Your feedback: {application.recruiterFeedback}</p>}
      {application.interviewAt && <p>Interview: {new Date(application.interviewAt).toLocaleString()}</p>}
      {error && <p role="alert">{error}</p>}

      {open && (
        <>
          <label className="flex flex-col">
            Unmet requirement (copy it from the listing)
            <input className="border p-1" value={requirement} onChange={(event) => setRequirement(event.target.value)} />
          </label>
          <label className="flex flex-col">
            Feedback
            <textarea
              className="border p-1"
              rows={3}
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
            />
          </label>
          <button
            className="self-start border px-3 py-1"
            disabled={busy}
            onClick={() => act("reject", { unmetRequirement: requirement, feedback })}
          >
            Send rejection
          </button>

          <label className="flex flex-col">
            Interview time
            <input
              className="border p-1"
              type="datetime-local"
              value={interviewAt}
              onChange={(event) => setInterviewAt(event.target.value)}
            />
          </label>
          <button
            className="self-start border px-3 py-1"
            disabled={busy || !interviewAt}
            onClick={() => act("invite", { interviewAt: new Date(interviewAt).toISOString() })}
          >
            Send interview invite
          </button>
        </>
      )}
    </div>
  );
}
