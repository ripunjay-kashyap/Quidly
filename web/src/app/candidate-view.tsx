"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { type Application, errorMessage, get, post, timeLeft } from "@/lib/api";

type MyApplication = Application & { jobTitle: string };

export function CandidateView({ onSlotsChange }: { onSlotsChange: () => void }) {
  const [mine, setMine] = useState<MyApplication[]>([]);
  const [now, setNow] = useState(0);
  const [message, setMessage] = useState("");

  function refresh() {
    get<MyApplication[]>("/api/my/applications")
      .then(setMine)
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

  return (
    <section className="flex flex-col gap-4">
      {message && <p role="alert">{message}</p>}
      {mine.length === 0 && (
        <p>
          No applications yet.{" "}
          <Link className="underline" href="/">
            Browse jobs
          </Link>
          .
        </p>
      )}
      {mine.map((application) => (
        <div key={application.id} className="flex flex-col gap-1 border p-3">
          <p>
            <Link className="font-semibold underline" href={`/jobs/${application.jobId}`}>
              {application.jobTitle}
            </Link>{" "}
            · {application.status}
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
    </section>
  );
}
