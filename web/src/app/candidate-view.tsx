"use client";

import { useEffect, useState } from "react";
import { type Application, type Config, errorMessage, get, post, timeLeft } from "@/lib/api";
import { PayPalButton } from "@/lib/paypal-button";

type Job = { id: string; title: string; requirementsText: string; applicantCap: number };
type MyApplication = Application & { jobTitle: string };

export function CandidateView({ config, onSlotsChange }: { config: Config; onSlotsChange: () => void }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [mine, setMine] = useState<MyApplication[]>([]);
  const [now, setNow] = useState(0);
  const [message, setMessage] = useState("");
  const [resume, setResume] = useState(
    "Backend engineer with six years of experience. Built payment APIs in Go and Postgres at a fintech startup. Led a migration from a monolith to services. Some AWS Lambda experience. No professional Kubernetes experience listed.",
  );
  const [demoMode, setDemoMode] = useState(false);

  function refresh() {
    Promise.all([get<Job[]>("/api/jobs"), get<MyApplication[]>("/api/my/applications")])
      .then(([openJobs, applications]) => {
        setJobs(openJobs);
        setMine(applications);
      })
      .catch((error) => setMessage(errorMessage(error)));
    onSlotsChange();
  }

  useEffect(() => {
    const tick = () => {
      setNow(Date.now());
      refresh();
    };
    tick();
    const timer = setInterval(tick, 3000);
    return () => clearInterval(timer);
    // refresh only reads setters and props that don't change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function confirm(id: string, genuine: boolean) {
    try {
      await post(`/api/applications/${id}/confirm-interview`, { genuine });
      refresh();
    } catch (error) {
      setMessage(errorMessage(error));
    }
  }

  const appliedJobIds = new Set(mine.map((application) => application.jobId));

  return (
    <section className="flex flex-col gap-6">
      {message && <p role="alert">{message}</p>}

      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">Your resume</h2>
        <textarea className="border p-1" rows={4} value={resume} onChange={(event) => setResume(event.target.value)} />
        {config.demoModeEnabled && (
          <label>
            <input type="checkbox" checked={demoMode} onChange={(event) => setDemoMode(event.target.checked)} /> Demo
            Mode (90-second deadline)
          </label>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Open roles</h2>
        {jobs.length === 0 && <p>No open roles.</p>}
        {jobs.map((job) => (
          <div key={job.id} className="flex flex-col gap-2 border p-3">
            <p>
              <strong>{job.title}</strong>
            </p>
            <p>{job.requirementsText}</p>
            {appliedJobIds.has(job.id) ? (
              <p>Applied.</p>
            ) : (
              <>
                <p>Applying places a $2 hold on your PayPal account and uses 1 slot.</p>
                <PayPalButton
                  clientId={config.paypalClientId}
                  intent="authorize"
                  createOrder={async () => {
                    setMessage("");
                    const order = await post<{ orderId: string }>(`/api/jobs/${job.id}/applications/order`);
                    return order.orderId;
                  }}
                  onApprove={async (orderId) => {
                    await post(`/api/jobs/${job.id}/applications`, { orderId, resumeText: resume, demoMode });
                    setMessage("Applied. The company has until the deadline to respond.");
                    refresh();
                  }}
                  onError={setMessage}
                />
              </>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Your applications</h2>
        {mine.length === 0 && <p>No applications yet.</p>}
        {mine.map((application) => (
          <div key={application.id} className="flex flex-col gap-1 border p-3">
            <p>
              <strong>{application.jobTitle}</strong> · {application.status}
              {application.status === "ACTIVE" && ` · ${timeLeft(application.expiresAt, now)}`}
            </p>
            {application.recruiterFeedback && (
              <p>
                Feedback ({application.unmetRequirement}): {application.recruiterFeedback}
              </p>
            )}
            {application.interviewAt && <p>Interview: {new Date(application.interviewAt).toLocaleString()}</p>}
            {application.payoutStatus && <p>$5 payout: {application.payoutStatus}</p>}
            {application.status === "INTERVIEW_PENDING" && (
              <div className="flex gap-2">
                <button className="border px-3 py-1" onClick={() => confirm(application.id, true)}>
                  Confirm the interview is real
                </button>
                <button className="border px-3 py-1" onClick={() => confirm(application.id, false)}>
                  Report it
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
