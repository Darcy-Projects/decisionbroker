"use client";

import { useMemo, useState } from "react";
import type {
  Decision,
  BoardKey,
  InboxData,
} from "@/app/lib/decisions";
import { Sidebar, type Selection } from "./Sidebar";
import { DecisionList } from "./DecisionList";
import { DecisionDetail } from "./DecisionDetail";
import {
  AddDecisionDialog,
  type NewDecisionInput,
} from "./AddDecisionDialog";

const filterToStatus: Record<string, Decision["status"] | undefined> = {
  "Needs decision": "needs_decision",
  Answered: "answered",
};

// Convert a "waitingFor" label like "1h 59m" or "44m" into total minutes for sorting.
function waitedMinutes(label: string): number {
  let total = 0;
  const days = label.match(/(\d+)\s*d/);
  const hours = label.match(/(\d+)\s*h/);
  const minutes = label.match(/(\d+)\s*m/);
  if (days) total += Number(days[1]) * 1440;
  if (hours) total += Number(hours[1]) * 60;
  if (minutes) total += Number(minutes[1]);
  return total;
}

export function InboxShell({ initial }: { initial: InboxData }) {
  const { boards, archivedBoards, people } = initial;
  const allBoards = useMemo(
    () => [...boards, ...archivedBoards],
    [boards, archivedBoards],
  );

  const [items, setItems] = useState<Decision[]>(initial.decisions);
  const [selection, setSelection] = useState<Selection>({
    type: "board",
    board: boards[0]?.key ?? archivedBoards[0]?.key ?? "",
  });
  const [selectedId, setSelectedId] = useState<string>("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [addOpen, setAddOpen] = useState(false);

  const boardCounts = useMemo(() => {
    const counts: Record<BoardKey, number> = {};
    for (const b of boards) counts[b.key] = 0;
    for (const d of items) {
      if (d.status === "needs_decision")
        counts[d.board] = (counts[d.board] ?? 0) + 1;
    }
    return counts;
  }, [items, boards]);

  const visible = useMemo(() => {
    const status = filterToStatus[filter];
    const q = query.trim().toLowerCase();
    const filtered = items.filter((d) => {
      if (d.board !== selection.board) return false;
      if (status && d.status !== status) return false;
      if (!q) return true;
      return (
        d.title.toLowerCase().includes(q) ||
        d.question.toLowerCase().includes(q) ||
        d.ref.toLowerCase().includes(q) ||
        d.session.name.toLowerCase().includes(q) ||
        d.tags.some((t) => t.includes(q))
      );
    });
    return filtered.sort((a, b) => {
      const diff = waitedMinutes(b.waitingFor) - waitedMinutes(a.waitingFor);
      return sortDir === "desc" ? diff : -diff;
    });
  }, [items, selection, filter, query, sortDir]);

  const selected = visible.find((d) => d.id === selectedId) ?? visible[0];

  async function handleResolve(id: string, answerText: string) {
    const res = await fetch(`/api/decisions/${id}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answerText }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(body.error ?? "Could not answer the decision.");
      return;
    }
    const updated: Decision = await res.json();
    setItems((prev) => prev.map((d) => (d.id === id ? updated : d)));
  }

  function handleAddTag(id: string, tag: string) {
    const clean = tag.trim().toLowerCase().replace(/^#/, "");
    if (!clean) return;
    setItems((prev) =>
      prev.map((d) =>
        d.id === id && !d.tags.includes(clean)
          ? { ...d, tags: [...d.tags, clean] }
          : d,
      ),
    );
  }

  function handleRemoveTag(id: string, tag: string) {
    setItems((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, tags: d.tags.filter((t) => t !== tag) } : d,
      ),
    );
  }

  function handleReassign(id: string, personId: string | null) {
    const person = personId ? people.find((p) => p.id === personId) : undefined;
    setItems((prev) =>
      prev.map((d) => (d.id === id ? { ...d, routedTo: person } : d)),
    );
  }

  function handleAddMessage(id: string, text: string) {
    const clean = text.trim();
    if (!clean) return;
    setItems((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              messages: [
                ...(d.messages ?? []),
                {
                  id: `m-${Date.now()}`,
                  authorType: "user",
                  authorName: "You",
                  initials: "YO",
                  at: "now",
                  text: clean,
                },
              ],
            }
          : d,
      ),
    );
  }

  async function handleAddDecision(input: NewDecisionInput) {
    const res = await fetch("/api/decisions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boardId: selection.board, ...input }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(body.error ?? "Could not create the decision.");
      return;
    }
    const created: Decision = await res.json();
    setItems((prev) => [created, ...prev]);
    setSelectedId(created.id);
  }

  return (
    <main className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <Sidebar
        selection={selection}
        onSelectBoard={(b: BoardKey) =>
          setSelection({ type: "board", board: b })
        }
        boardCounts={boardCounts}
        boards={boards}
        archivedBoards={archivedBoards}
      />
      <DecisionList
        decisions={visible}
        selectedId={selected?.id ?? ""}
        onSelect={setSelectedId}
        query={query}
        onQuery={setQuery}
        filter={filter}
        onFilter={setFilter}
        sortDir={sortDir}
        onToggleSort={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
        onAddDecision={() => setAddOpen(true)}
      />
      {selected ? (
        <DecisionDetail
          key={selected.id}
          decision={selected}
          boards={allBoards}
          people={people}
          onResolve={handleResolve}
          onAddTag={handleAddTag}
          onRemoveTag={handleRemoveTag}
          onReassign={handleReassign}
          onAddMessage={handleAddMessage}
        />
      ) : (
        <div className="hidden flex-1 items-center justify-center text-sm text-muted-foreground lg:flex">
          Select a decision to review.
        </div>
      )}

      <AddDecisionDialog
        key={addOpen ? "add-open" : "add-closed"}
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreate={handleAddDecision}
        people={people}
        boardName={
          allBoards.find((b) => b.key === selection.board)?.name ?? "this board"
        }
      />
    </main>
  );
}
