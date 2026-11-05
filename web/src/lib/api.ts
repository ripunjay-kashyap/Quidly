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

export type User = { role: "CANDIDATE" | "RECRUITER"; email: string; availableSlots: number };
export type Config = { paypalClientId: string; demoModeEnabled: boolean };

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
};

export function timeLeft(expiresAt: string, now: number): string {
  const seconds = Math.max(0, Math.round((new Date(expiresAt).getTime() - now) / 1000));
  if (seconds < 120) return `${seconds}s left`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m left`;
}
