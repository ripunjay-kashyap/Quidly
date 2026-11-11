"use client";

import {
  AllCommunityModule,
  type ColDef,
  type ICellRendererParams,
  ModuleRegistry,
  type RowClassRules,
  themeQuartz,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useMemo, useState } from "react";
import { type Application, errorMessage, formatDuration, money, post } from "@/lib/api";
import { Icon } from "@/lib/icons";
import { matchLevel, recruiterStatus } from "@/lib/status";
import { StatusBadge } from "@/lib/ui";

ModuleRegistry.registerModules([AllCommunityModule]);

const DEPOSIT_PER_APPLICANT = 5;
const DEMO_DEADLINE_MS = 45 * 1000;

type QueueJob = { id: string; title: string; applications: Application[] };

type QueueRow = {
  id: string;
  applicant: string;
  role: string;
  match: number | null;
  status: string;
  // Waiting applications sort by deadline; answered ones go last.
  deadline: number;
  left: number | null;
  urgency: "calm" | "soon" | "due" | "missed" | "done";
  atRisk: number;
  application: Application;
};

type QueueContext = {
  demoModeEnabled: boolean;
  onReply: (id: string) => void;
  onDemoDeadline: (id: string) => void;
};

const theme = themeQuartz.withParams({
  accentColor: "#3858f6",
  foregroundColor: "#0b1638",
  backgroundColor: "#ffffff",
  borderColor: "#e3e8f2",
  headerBackgroundColor: "#f6f8fc",
  headerTextColor: "#56607a",
  headerFontWeight: 500,
  headerFontSize: 13,
  fontFamily: "inherit",
  fontSize: 14,
  rowHeight: 60,
  headerHeight: 42,
  wrapperBorder: false,
  wrapperBorderRadius: 0,
  selectedRowBackgroundColor: "#eef1ff",
  browserColorScheme: "light",
});

function toRows(jobs: QueueJob[], now: number): QueueRow[] {
  return jobs.flatMap((job) =>
    job.applications.map((application, index) => {
      const expiresAt = new Date(application.expiresAt).getTime();
      const waiting = application.status === "ACTIVE";
      const left = waiting && now ? Math.max(0, expiresAt - now) : null;
      const windowMs = expiresAt - new Date(application.createdAt).getTime();
      const urgency: QueueRow["urgency"] =
        application.status === "GHOSTED_PAID_OUT"
          ? "missed"
          : !waiting
            ? "done"
            : left !== null && (left < windowMs * 0.25 || left < 60 * 1000)
              ? "due"
              : left !== null && left < windowMs * 0.5
                ? "soon"
                : "calm";
      return {
        id: application.id,
        applicant: `Applicant ${index + 1}`,
        role: job.title,
        match: application.elasticMatchScore,
        status: recruiterStatus(application).label,
        deadline: waiting ? expiresAt : Number.MAX_SAFE_INTEGER,
        left,
        urgency,
        atRisk: waiting ? DEPOSIT_PER_APPLICANT : 0,
        application,
      };
    }),
  );
}

function ApplicantCell({ data }: ICellRendererParams<QueueRow>) {
  if (!data) return null;
  return (
    <div className="flex h-full min-w-0 flex-col justify-center leading-tight">
      <span className="truncate font-medium">{data.applicant}</span>
      <span className="truncate text-xs text-muted">{data.role}</span>
    </div>
  );
}

export function MatchMeter({ score }: { score: number | null }) {
  const level = matchLevel(score);
  if (!level) return <span className="text-muted">Not scored</span>;
  return (
    <span className="match" aria-label={`${level.label} match`}>
      <span className="match-bars" aria-hidden>
        {[1, 2, 3, 4].map((bar) => (
          <span key={bar} data-on={bar <= level.bars || undefined} />
        ))}
      </span>
      {level.label} match
    </span>
  );
}

function MatchCell({ data }: ICellRendererParams<QueueRow>) {
  return data ? <MatchMeter score={data.match} /> : null;
}

function StatusCell({ data }: ICellRendererParams<QueueRow>) {
  return data ? <StatusBadge {...recruiterStatus(data.application)} /> : null;
}

function TimeLeftCell({ data }: ICellRendererParams<QueueRow>) {
  if (!data) return null;
  if (data.urgency === "missed") return <span className="font-medium text-danger">Ran out</span>;
  if (data.left === null) return <span className="text-muted">Answered</span>;
  return (
    <span
      className={`inline-flex items-center gap-1.5 tabular-nums ${
        data.urgency === "due" ? "font-semibold text-danger" : data.urgency === "soon" ? "font-medium text-warn" : ""
      }`}
    >
      <Icon name="clock" size={14} />
      {formatDuration(data.left)}
    </span>
  );
}

function AtRiskCell({ data }: ICellRendererParams<QueueRow>) {
  if (!data) return null;
  if (data.urgency === "missed") return <span className="font-medium text-danger">{money(DEPOSIT_PER_APPLICANT)} paid</span>;
  return <span className={data.atRisk ? "font-medium tabular-nums" : "text-muted tabular-nums"}>{money(data.atRisk)}</span>;
}

function canSkip(row: QueueRow | undefined): boolean {
  return row?.left != null && row.left > DEMO_DEADLINE_MS;
}

function ActionsCell({ data, context }: ICellRendererParams<QueueRow, unknown, QueueContext>) {
  if (!data) return null;
  const waiting = data.application.status === "ACTIVE";
  return (
    <div className="flex h-full items-center justify-end gap-2">
      {context.demoModeEnabled && canSkip(data) && (
        <button className="btn btn-ghost btn-sm" onClick={() => context.onDemoDeadline(data.id)}>
          Skip to 45s
        </button>
      )}
      <button
        className={`btn btn-sm ${waiting ? "btn-primary" : "btn-secondary"}`}
        onClick={() => context.onReply(data.id)}
      >
        {waiting ? "Reply" : "View"}
      </button>
    </div>
  );
}

const columns: ColDef<QueueRow>[] = [
  {
    headerName: "Applicant",
    field: "applicant",
    cellRenderer: ApplicantCell,
    flex: 1.4,
    minWidth: 190,
    comparator: (_a, _b, nodeA, nodeB) =>
      `${nodeA.data?.role} ${nodeA.data?.applicant}`.localeCompare(`${nodeB.data?.role} ${nodeB.data?.applicant}`),
  },
  {
    headerName: "Match",
    field: "match",
    cellRenderer: MatchCell,
    sort: "desc",
    sortIndex: 1,
    minWidth: 165,
    flex: 1,
  },
  {
    headerName: "Status",
    field: "status",
    cellRenderer: StatusCell,
    enableCellChangeFlash: true,
    minWidth: 190,
    flex: 1.2,
  },
  {
    headerName: "Time left",
    colId: "deadline",
    // The value changes every second, so the countdown redraws; sorting uses the fixed deadline.
    valueGetter: (params) => params.data?.left,
    comparator: (_a, _b, nodeA, nodeB) => (nodeA.data?.deadline ?? 0) - (nodeB.data?.deadline ?? 0),
    cellRenderer: TimeLeftCell,
    sort: "asc",
    sortIndex: 0,
    minWidth: 130,
    flex: 1,
  },
  {
    headerName: "At risk",
    field: "atRisk",
    cellRenderer: AtRiskCell,
    minWidth: 110,
    flex: 0.8,
  },
  {
    headerName: "",
    colId: "actions",
    // Redraws when the buttons it shows change.
    valueGetter: (params) => `${params.data?.application.status}:${canSkip(params.data)}`,
    cellRenderer: ActionsCell,
    sortable: false,
    minWidth: 190,
    flex: 1.2,
  },
];

const rowClassRules: RowClassRules<QueueRow> = {
  "queue-row-soon": (params) => params.data?.urgency === "soon",
  "queue-row-due": (params) => params.data?.urgency === "due" || params.data?.urgency === "missed",
};

export function ReplyQueue({
  jobs,
  now,
  demoModeEnabled,
  onSelect,
  onChange,
}: {
  jobs: QueueJob[];
  now: number;
  demoModeEnabled: boolean;
  onSelect: (id: string) => void;
  onChange: () => void;
}) {
  const [error, setError] = useState("");
  const rows = toRows(jobs, now);
  const waiting = rows.filter((row) => row.left !== null);
  const atRisk = waiting.length * DEPOSIT_PER_APPLICANT;
  const next = waiting.reduce<QueueRow | null>((soonest, row) => (!soonest || row.deadline < soonest.deadline ? row : soonest), null);
  const paid = rows.filter((row) => row.urgency === "missed").length * DEPOSIT_PER_APPLICANT;

  const context = useMemo<QueueContext>(
    () => ({
      demoModeEnabled,
      onReply: onSelect,
      onDemoDeadline: (id) => {
        setError("");
        post(`/api/applications/${id}/demo-deadline`)
          .then(onChange)
          .catch((failure) => setError(errorMessage(failure)));
      },
    }),
    [demoModeEnabled, onSelect, onChange],
  );

  return (
    <section className="card overflow-hidden">
      <header className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Reply queue</h2>
          <p className="mt-0.5 text-sm text-muted">Everyone who applied to your roles, most urgent first.</p>
        </div>
        <div className={`risk ${atRisk ? "risk-live" : ""}`} role="status">
          <span className="text-sm text-muted">Deposit at risk</span>
          <span className="text-2xl font-semibold tracking-tight tabular-nums">{money(atRisk)}</span>
          <span className="text-sm">
            {next?.left != null
              ? `Next $5 payout in ${formatDuration(next.left)}`
              : paid
                ? `${money(paid)} paid to candidates so far`
                : "Nobody is waiting"}
          </span>
        </div>
      </header>
      {error && (
        <div className="notice notice-danger m-5 sm:mx-6" role="alert">
          <Icon name="alert" size={18} className="mt-px shrink-0" />
          {error}
        </div>
      )}
      {rows.length === 0 ? (
        <p className="p-6 text-sm text-muted">No applicants yet. They show up here as soon as someone applies.</p>
      ) : (
        <AgGridReact<QueueRow>
          theme={theme}
          rowData={rows}
          columnDefs={columns}
          getRowId={(params) => params.data.id}
          rowClassRules={rowClassRules}
          context={context}
          domLayout="autoHeight"
          suppressCellFocus
          rowSelection={{ mode: "singleRow", checkboxes: false, enableClickSelection: true }}
          onRowSelected={(event) => {
            if (event.node.isSelected() && event.data) onSelect(event.data.id);
          }}
        />
      )}
    </section>
  );
}
