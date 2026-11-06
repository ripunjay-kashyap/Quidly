import type { ReactNode } from "react";

export type Tone = "neutral" | "accent" | "success" | "warn" | "danger";

// A "Q" whose tail is a check mark: every application gets its answer. Same drawing as app/icon.svg.
export function LogoMark({ size = 28 }: { size?: number }) {
  const tail = "m16.75 19.75 3.5 3.5 6.5-6.5";
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 32 32" className="shrink-0">
      <rect width="32" height="32" rx="8" fill="#0c1a44" />
      <circle cx="12.5" cy="15.5" r="7" fill="none" stroke="#ffffff" strokeWidth="3.2" />
      <path d={tail} fill="none" stroke="#0c1a44" strokeWidth="6.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d={tail} fill="none" stroke="#5b7cff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      <span className="text-[1.1875rem] font-semibold tracking-[-0.03em]">Quidly</span>
    </span>
  );
}

const avatarColors = [
  ["#e8edff", "#2f4fe0"],
  ["#efe9ff", "#6141e8"],
  ["#e3f6ee", "#0b7a53"],
  ["#fff1dc", "#a65800"],
  ["#ffe8ef", "#b8245a"],
  ["#e0f3fa", "#09698b"],
  ["#eef0f5", "#36405c"],
  ["#fdece4", "#b2421b"],
];

const avatarSizes = {
  sm: "size-9 rounded-lg text-xs",
  md: "size-12 rounded-xl text-[0.9375rem]",
  lg: "size-16 rounded-2xl text-xl",
};

// A colored monogram, picked from the name so a company always gets the same one.
export function CompanyAvatar({ name, size = "md" }: { name: string; size?: keyof typeof avatarSizes }) {
  let hash = 0;
  for (const character of name) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  const [background, color] = avatarColors[hash % avatarColors.length];
  const initials = name
    .split(/\s+/)
    .filter((word) => /[a-z0-9]/i.test(word.charAt(0)))
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center font-semibold tracking-tight ${avatarSizes[size]}`}
      style={{ background, color }}
    >
      {initials}
    </span>
  );
}

export function StatusBadge({ label, tone }: { label: string; tone: Tone }) {
  return <span className={`badge badge-dot ${tone === "neutral" ? "" : `badge-${tone}`}`}>{label}</span>;
}

export function SpotsLeft({ applicantCount, applicantCap }: { applicantCount: number; applicantCap: number }) {
  const left = Math.max(0, applicantCap - applicantCount);
  const few = left <= 3;
  const label =
    left === 0 ? "No spots left" : few ? `Only ${left} spot${left === 1 ? "" : "s"} left` : `${left} of ${applicantCap} spots left`;
  return (
    <div className="flex w-full flex-col gap-1.5">
      <span className={`text-xs font-medium ${left === 0 ? "text-danger" : few ? "text-warn" : "text-muted"}`}>{label}</span>
      <div className="meter">
        <span
          className={few ? "bg-warn" : undefined}
          style={{ transform: `scaleX(${applicantCap ? Math.min(1, applicantCount / applicantCap) : 0})` }}
        />
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  detail,
  children,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="card flex flex-col gap-1 p-5">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-2xl font-semibold tracking-tight tabular-nums">{value}</span>
      {children}
      {detail && <span className="text-[0.8125rem] text-muted">{detail}</span>}
    </div>
  );
}

// Filled bars for open slots, e.g. 3 of 5.
export function SlotPips({ open, total = 5 }: { open: number; total?: number }) {
  return (
    <span className="flex gap-1" aria-hidden="true">
      {Array.from({ length: total }, (_, index) => (
        <span key={index} className={`h-1.5 w-4 rounded-full ${index < open ? "bg-accent" : "bg-border-strong"}`} />
      ))}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  text,
  children,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  children?: ReactNode;
}) {
  return (
    <main className="container-page flex flex-1 flex-col items-center justify-center gap-3 py-24 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-surface-3 text-muted">{icon}</span>
      <h1 className="mt-2 text-xl font-semibold tracking-tight">{title}</h1>
      <p className="max-w-md text-muted">{text}</p>
      {children && <div className="mt-3 flex gap-2">{children}</div>}
    </main>
  );
}

export function Skeleton({ className }: { className: string }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />;
}

export function PageSkeleton() {
  return (
    <main className="container-page flex flex-1 flex-col gap-6 py-10" aria-busy="true">
      <span className="sr-only">Loading…</span>
      <Skeleton className="h-4 w-28" />
      <div className="flex items-center gap-4">
        <Skeleton className="size-16 rounded-2xl" />
        <div className="flex flex-1 flex-col gap-3">
          <Skeleton className="h-8 w-2/3 max-w-md" />
          <Skeleton className="h-4 w-1/3 max-w-xs" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </main>
  );
}
