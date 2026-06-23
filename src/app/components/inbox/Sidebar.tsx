"use client";

import { useEffect, useState } from "react";
import { Zap, ChevronDown, Pencil } from "lucide-react";
import { cn } from "@/app/lib/utils";
import type { Board, BoardKey } from "@/app/lib/decisions";

export type Selection = { type: "board"; board: BoardKey };

type BoardMenu = { board: Board; x: number; y: number };

export function Sidebar({
  selection,
  onSelectBoard,
  onEditBoard,
  boardCounts,
  boards,
  archivedBoards,
}: {
  selection: Selection;
  onSelectBoard: (b: BoardKey) => void;
  onEditBoard: (board: Board) => void;
  boardCounts: Record<BoardKey, number>;
  boards: Board[];
  archivedBoards: Board[];
}) {
  const [queuesOpen, setQueuesOpen] = useState(true);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [menu, setMenu] = useState<BoardMenu | null>(null);

  // Close the board context menu on any outside click or Escape.
  useEffect(() => {
    if (!menu) return;
    function onClick() {
      setMenu(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenu(null);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  function openMenu(e: React.MouseEvent, board: Board) {
    e.preventDefault();
    setMenu({ board, x: e.clientX, y: e.clientY });
  }

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
                <li key={b.key} className="group relative">
                  <button
                    onClick={() => onSelectBoard(b.key)}
                    onContextMenu={(e) => openMenu(e, b)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                      isActive
                        ? "bg-accent font-medium text-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <span className={cn("size-2 rounded-full", b.color)} />
                    <span className="flex-1 truncate text-left">{b.name}</span>
                    {count ? (
                      <span className="text-xs tabular-nums text-muted-foreground transition-opacity group-hover:opacity-0">
                        {count}
                      </span>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    onClick={() => onEditBoard(b)}
                    aria-label={`Edit ${b.name}`}
                    title="Edit board"
                    className="pointer-events-none absolute right-1 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-background hover:text-foreground focus-visible:pointer-events-auto focus-visible:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100"
                  >
                    <Pencil className="size-3.5" />
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
                <li key={q.key} className="group relative">
                  <button
                    onClick={() => onSelectBoard(q.key)}
                    onContextMenu={(e) => openMenu(e, q)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                      isActive
                        ? "bg-accent font-medium text-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <span className={cn("size-2 rounded-full", q.color)} />
                    <span className="flex-1 truncate text-left">{q.name}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onEditBoard(q)}
                    aria-label={`Edit ${q.name}`}
                    title="Edit board"
                    className="pointer-events-none absolute right-1 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-background hover:text-foreground focus-visible:pointer-events-auto focus-visible:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100"
                  >
                    <Pencil className="size-3.5" />
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

      {menu ? (
        <div
          role="menu"
          // Positioned at the cursor; stop the document mousedown handler from
          // closing it before the item's click registers.
          onMouseDown={(e) => e.stopPropagation()}
          style={{ top: menu.y, left: menu.x }}
          className="fixed z-50 min-w-40 overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-md"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onEditBoard(menu.board);
              setMenu(null);
            }}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-accent"
          >
            <Pencil className="size-3.5 text-muted-foreground" />
            Edit board
          </button>
        </div>
      ) : null}
    </aside>
  );
}
