async function send<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error ?? `Request failed (${response.status})`);
  return data;
}

export function get<T>(path: string): Promise<T> {
  return send(path, {});
}

// No body means no JSON header, because the backend refuses an empty JSON body.
export function post<T>(path: string, body?: unknown): Promise<T> {
  if (body === undefined) return send(path, { method: "POST" });
  return send(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export type User = {
  id: string;
  role: "CANDIDATE" | "RECRUITER";
  email: string;
  companyName: string | null;
  availableSlots: number;
};
export type Config = {
  paypalClientId: string;
  demoModeEnabled: boolean;
  industries: string[];
  companySizes: string[];
};

export type Profile = {
  resumeText: string | null;
  resumeFileName: string | null;
  portfolioUrl: string | null;
  targetRoles: string | null;
};

export type Listing = {
  id: string;
  title: string;
  description: string;
  requirementsText: string;
  location: string;
  employmentType: string;
  salaryRange: string | null;
  applicantCap: number;
  applicantCount: number;
  status: string;
  companyId: string;
  companyName: string;
  companyVerified: boolean;
  isSample: boolean;
};

export type Application = {
  id: string;
  jobId: string;
  resumeText: string;
  status: string;
  expiresAt: string;
  interviewAt: string | null;
  unmetRequirement: string | null;
  recruiterFeedback: string | null;
  payoutStatus: string | null;
  createdAt: string;
};

export function msLeft(expiresAt: string, now: number): number {
  return Math.max(0, new Date(expiresAt).getTime() - now);
}

// "51h 07m", then "4m 09s" in the last hour, so short demo deadlines still tick.
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  if (minutes > 0) return `${minutes}m ${String(seconds % 60).padStart(2, "0")}s`;
  return `${seconds % 60}s`;
}

// "51:07:09"
export function formatClock(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return [Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), seconds % 60]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function money(amount: number | string): string {
  return `$${Number(amount).toFixed(2)}`;
}

// Listings write requirements as a comma-separated list.
export function splitRequirements(text: string): string[] {
  return text
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}
