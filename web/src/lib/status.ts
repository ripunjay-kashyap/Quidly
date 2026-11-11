import type { Application } from "./api";
import type { Tone } from "./ui";

type Status = { label: string; tone: Tone };

// Plain-language names for each application state, as the candidate sees them.
export function candidateStatus(application: Application): Status {
  switch (application.status) {
    case "ACTIVE":
      return { label: "Waiting for reply", tone: "accent" };
    case "INTERVIEW_PENDING":
      return { label: "Interview invite", tone: "warn" };
    case "INTERVIEW_CONFIRMED":
      return { label: "Interview confirmed", tone: "success" };
    case "REJECTED_RELEASED":
      return { label: "Not selected", tone: "neutral" };
    case "DISPUTED":
      return { label: "Invite reported", tone: "danger" };
    case "GHOSTED_PAID_OUT":
      if (application.payoutStatus === "FAILED") return { label: "No reply · payment failed", tone: "danger" };
      return {
        label: application.payoutStatus === "SUCCESS" ? "No reply · $5 paid" : "No reply · $5 on the way",
        tone: "success",
      };
    default:
      return { label: application.status, tone: "neutral" };
  }
}

// The same states, as the company sees them.
export function recruiterStatus(application: Application): Status {
  switch (application.status) {
    case "ACTIVE":
      return { label: "Needs your reply", tone: "warn" };
    case "INTERVIEW_PENDING":
      return { label: "Invite sent", tone: "accent" };
    case "INTERVIEW_CONFIRMED":
      return { label: "Interview confirmed", tone: "success" };
    case "REJECTED_RELEASED":
      return { label: "Feedback sent", tone: "neutral" };
    case "DISPUTED":
      return { label: "Invite reported", tone: "danger" };
    case "GHOSTED_PAID_OUT":
      return { label: "Missed · $5 paid out", tone: "danger" };
    default:
      return { label: application.status, tone: "neutral" };
  }
}

export function jobStatus(status: string): Status {
  if (status === "OPEN") return { label: "Open", tone: "success" };
  if (status === "CLOSED") return { label: "Closed", tone: "neutral" };
  return { label: "Not paid yet", tone: "warn" };
}

// Bands set from real Elastic scores: a strong backend resume scored 0.63 against
// a backend role, a frontend one 0.44 and an unrelated nursing one 0.25.
export function matchLevel(score: number | null): { label: string; bars: number } | null {
  if (score === null) return null;
  if (score >= 0.6) return { label: "Strong", bars: 4 };
  if (score >= 0.5) return { label: "Good", bars: 3 };
  if (score >= 0.4) return { label: "Partial", bars: 2 };
  return { label: "Weak", bars: 1 };
}
