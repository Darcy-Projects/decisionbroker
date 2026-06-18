"use client";

import {
  Search,
  SlidersHorizontal,
  ArrowDownNarrowWide,
  ArrowUpNarrowWide,
  Plus,
} from "lucide-react";
import type { Decision } from "@/app/lib/decisions";
import { cn } from "@/app/lib/utils";
import { StatusBadge, UrgencyBadge, Avatar } from "./Meta";

const filters = ["All", "Needs decision", "Answered"] as const;

export function DecisionList({
  decisions,
  selectedId,
  onSelect,
  query,
  onQuery,
  filter,
  onFilter,
  sortDir,
  onToggleSort,
  onAddDecision,
}: {
  decisions: Decision[];
  selectedId: string;
  onSelect: (id: string) => void;
  query: string;
  onQuery: (q: string) => void;
  filter: string;
  onFilter: (f: string) => void;
  sortDir: "desc" | "asc";
  onToggleSort: () => void;
  onAddDecision: () => void;
}) {
  return (
    <div className="flex w-full flex-col border-r border-border lg:max-w-md xl:max-w-lg">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search decisions, sessions, tags…"
            className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </div>
        <button
          onClick={onToggleSort}
          aria-label={
            sortDir === "desc"
              ? "Sort by longest waiting first"
              : "Sort by shortest waiting first"
          }
          title={
            sortDir === "desc"
              ? "Longest waiting first"
              : "Shortest waiting first"
          }
          className="flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {sortDir === "desc" ? (
            <ArrowDownNarrowWide className="size-4" />
          ) : (
            <ArrowUpNarrowWide className="size-4" />
          )}
        </button>
        <button
          aria-label="Filter"
          className="flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <SlidersHorizontal className="size-4" />
        </button>
      </div>

      <div className="flex items-center gap-1 border-b border-border px-3 py-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => onFilter(f)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              filter === f
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <ul className="flex-1 overflow-y-auto">
        {decisions.length === 0 ? (
          <li className="px-4 py-16 text-center text-sm text-muted-foreground">
            No decisions match your filters.
          </li>
        ) : (
          decisions.map((d) => (
            <li key={d.id}>
              <DecisionRow
                decision={d}
                selected={d.id === selectedId}
                onSelect={() => onSelect(d.id)}
              />
            </li>
          ))
        )}
      </ul>

      {(filter === "All" || filter === "Needs decision") && (
        <div className="border-t border-border p-3">
          <button
            onClick={onAddDecision}
            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-ring hover:bg-accent hover:text-foreground"
          >
            <Plus className="size-4" />
            Add decision
          </button>
        </div>
      )}
    </div>
  );
}

function DecisionRow({
  decision,
  selected,
  onSelect,
}: {
  decision: Decision;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "relative flex w-full flex-col gap-2 border-b border-border px-4 py-3 text-left transition-colors",
        selected ? "bg-accent" : "hover:bg-accent/50",
      )}
    >
      {selected && (
        <span className="absolute inset-y-0 left-0 w-0.5 bg-primary" />
      )}
      <div className="flex items-center gap-2">
        {decision.unread && (
          <span className="size-1.5 shrink-0 rounded-full bg-primary" />
        )}
        <span className="font-mono text-[11px] text-muted-foreground">
          {decision.ref}
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-1.5">
          {decision.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-[11px] text-muted-foreground"
            >
              #{tag}
            </span>
          ))}
          <UrgencyBadge urgency={decision.urgency} />
        </span>
      </div>

      <p
        className={cn(
          "line-clamp-1 text-sm",
          decision.unread
            ? "font-semibold text-foreground"
            : "font-medium text-foreground/90",
        )}
      >
        {decision.title}
      </p>
      <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
        {decision.question}
      </p>

      <div className="mt-0.5 flex items-center gap-2">
        <StatusBadge status={decision.status} />
        <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          {decision.routedTo ? (
            <Avatar
              initials={decision.routedTo.initials}
              className="size-5 text-[9px]"
            />
          ) : null}
          <span className="tabular-nums">{decision.waitingFor}</span>
        </span>
      </div>
    </button>
  );
}
