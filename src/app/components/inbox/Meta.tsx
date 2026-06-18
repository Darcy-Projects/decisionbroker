import type { DecisionStatus, Urgency } from "@/app/lib/decisions";
import { cn } from "@/app/lib/utils";

export const statusMeta: Record<
  DecisionStatus,
  { label: string; dot: string; text: string }
> = {
  needs_decision: {
    label: "Needs decision",
    dot: "bg-chart-2",
    text: "text-chart-2",
  },
  routed: { label: "Routed", dot: "bg-primary", text: "text-primary" },
  answered: { label: "Answered", dot: "bg-chart-3", text: "text-chart-3" },
  auto_resolved: {
    label: "Auto-resolved",
    dot: "bg-muted-foreground",
    text: "text-muted-foreground",
  },
};

export const urgencyMeta: Record<
  Urgency,
  { label: string; className: string }
> = {
  low: {
    label: "Low",
    className: "text-priority-low border-priority-low/30 bg-priority-low/10",
  },
  medium: {
    label: "Medium",
    className:
      "text-priority-medium border-priority-medium/30 bg-priority-medium/10",
  },
  high: {
    label: "High",
    className: "text-priority-high border-priority-high/30 bg-priority-high/10",
  },
  critical: {
    label: "Critical",
    className:
      "text-priority-critical border-priority-critical/40 bg-priority-critical/15",
  },
};

export function StatusBadge({ status }: { status: DecisionStatus }) {
  const m = statusMeta[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-[11px] font-medium",
        m.text,
      )}
    >
      {m.label}
    </span>
  );
}

export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  const m = urgencyMeta[urgency];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium",
        m.className,
      )}
    >
      {m.label}
    </span>
  );
}

export function Avatar({
  initials,
  className,
}: {
  initials: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-foreground ring-1 ring-border",
        className,
      )}
    >
      {initials}
    </span>
  );
}
