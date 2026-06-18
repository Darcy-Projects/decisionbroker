"use client";

import { useState } from "react";
import { Zap, ChevronDown } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { boards, archivedBoards, type BoardKey } from "@/app/lib/decisions";

export type Selection = { type: "board"; board: BoardKey };

export function Sidebar({
  selection,
  onSelectBoard,
  boardCounts,
}: {
  selection: Selection;
  onSelectBoard: (b: BoardKey) => void;
  boardCounts: Record<BoardKey, number>;
}) {
  const [queuesOpen, setQueuesOpen] = useState(true);
  const [archiveOpen, setArchiveOpen] = useState(false);
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-sidebar md:flex">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Zap className="size-4" />
        </span>
        <span className="text-sm font-semibold tracking-tight">
          DecisionBroker
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <button
          onClick={() => setQueuesOpen((o) => !o)}
          className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
          aria-expanded={queuesOpen}
        >
          <ChevronDown
            className={cn(
              "size-3.5 transition-transform",
              queuesOpen ? "rotate-0" : "-rotate-90",
            )}
          />
          Boards
        </button>
        {queuesOpen ? (
          <ul className="mt-2 flex flex-col gap-0.5">
            {boards.map((b) => {
              const isActive =
                selection.type === "board" && selection.board === b.key;
              const count = boardCounts[b.key] ?? 0;
              return (
                <li key={b.key}>
                  <button
                    onClick={() => onSelectBoard(b.key)}
                    className={cn(
                      "group flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                      isActive
                        ? "bg-accent font-medium text-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <span className={cn("size-2 rounded-full", b.color)} />
                    <span className="flex-1 truncate text-left">{b.name}</span>
                    {count ? (
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {count}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}

        <button
          onClick={() => setArchiveOpen((o) => !o)}
          className="mt-6 flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
          aria-expanded={archiveOpen}
        >
          <ChevronDown
            className={cn(
              "size-3.5 transition-transform",
              archiveOpen ? "rotate-0" : "-rotate-90",
            )}
          />
          Archive
        </button>
        {archiveOpen ? (
          <ul className="mt-2 flex flex-col gap-0.5">
            {archivedBoards.map((q) => {
              const isActive =
                selection.type === "board" && selection.board === q.key;
              return (
                <li key={q.key}>
                  <button
                    onClick={() => onSelectBoard(q.key)}
                    className={cn(
                      "group flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                      isActive
                        ? "bg-accent font-medium text-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <span className={cn("size-2 rounded-full", q.color)} />
                    <span className="flex-1 truncate text-left">{q.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </nav>

      <div className="border-t border-border p-3">
        <button className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <img
            src="/neil-hanak.jpg"
            alt="Neil Hanak"
            className="size-7 shrink-0 rounded-full object-cover"
          />
          <span className="flex-1 text-left font-medium text-foreground">
            Neil Hanak
          </span>
        </button>
      </div>
    </aside>
  );
}
