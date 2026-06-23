"use client";

import { useEffect, useRef, useState } from "react";
import { X, Copy, Check } from "lucide-react";
import type { Board } from "@/app/lib/decisions";
import { Button } from "@/app/components/ui/button";

export function EditBoardDialog({
  open,
  onClose,
  board,
  onRename,
}: {
  open: boolean;
  onClose: () => void;
  board: Board;
  /** Persist the rename; resolves once the board is updated server-side. */
  onRename: (boardId: string, name: string) => Promise<void>;
}) {
  // `board.key` is the real boards.id uuid — the value a human pastes into
  // Claude Code when it asks which board to use.
  const boardId = board.key;
  const [name, setName] = useState(board.name);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  // Focus the name field shortly after mount (the parent remounts via `key`).
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => nameRef.current?.select(), 50);
    return () => clearTimeout(t);
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function copyId() {
    try {
      await navigator.clipboard.writeText(boardId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be unavailable (insecure context); the id is still shown.
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = name.trim();
    if (!clean || saving) return;
    setSaving(true);
    try {
      await onRename(boardId, clean);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-board-title"
        className="relative z-10 w-full max-w-md overflow-hidden rounded-xl border border-border bg-card shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2
            id="edit-board-title"
            className="text-sm font-semibold text-foreground"
          >
            Edit board
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-5 py-5">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="board-name"
              className="text-xs font-medium text-foreground"
            >
              Name
            </label>
            <input
              id="board-name"
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Board name"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>

          {/* Board id (read-only + copy) */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-foreground">Board ID</span>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-xs text-muted-foreground">
                {boardId}
              </code>
              <button
                type="button"
                onClick={copyId}
                aria-label="Copy board id"
                className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {copied ? (
                  <Check className="size-4 text-primary" />
                ) : (
                  <Copy className="size-4" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Paste this into Claude Code when it asks which board to use.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
