"use client";

import { useEffect, useRef, useState } from "react";
import { X, Plus, ChevronDown, UserPlus, Check } from "lucide-react";
import { people } from "@/app/lib/decisions";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/lib/utils";
import { Avatar } from "./Meta";

export type NewDecisionInput = {
  question: string;
  assigneeId: string | null;
  tags: string[];
};

export function AddDecisionDialog({
  open,
  onClose,
  onCreate,
  boardName,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (input: NewDecisionInput) => void;
  boardName: string;
}) {
  const [question, setQuestion] = useState("");
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const questionRef = useRef<HTMLTextAreaElement>(null);
  const assigneeRef = useRef<HTMLDivElement>(null);

  // Reset the form each time the dialog opens.
  useEffect(() => {
    if (open) {
      setQuestion("");
      setAssigneeId(null);
      setTags([]);
      setTagDraft("");
      setAssigneeOpen(false);
      // Focus the question field shortly after mount.
      const t = setTimeout(() => questionRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
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

  // Close the assignee dropdown on outside click.
  useEffect(() => {
    if (!assigneeOpen) return;
    function onClick(e: MouseEvent) {
      if (
        assigneeRef.current &&
        !assigneeRef.current.contains(e.target as Node)
      ) {
        setAssigneeOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [assigneeOpen]);

  if (!open) return null;

  function addTag() {
    const clean = tagDraft.trim().toLowerCase().replace(/^#/, "");
    if (clean && !tags.includes(clean)) setTags((prev) => [...prev, clean]);
    setTagDraft("");
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    onCreate({ question: question.trim(), assigneeId, tags });
    onClose();
  }

  const assignee = assigneeId
    ? people.find((p) => p.id === assigneeId)
    : undefined;

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
        aria-labelledby="add-decision-title"
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2
              id="add-decision-title"
              className="text-sm font-semibold text-foreground"
            >
              Add decision
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              New decision for{" "}
              <span className="text-foreground">{boardName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-5 py-5">
          {/* Question */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="decision-question"
              className="text-xs font-medium text-foreground"
            >
              Question
            </label>
            <textarea
              id="decision-question"
              ref={questionRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={4}
              placeholder="What decision needs to be made?"
              className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm leading-relaxed outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>

          {/* Assignee */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-foreground">
              Assignee
            </span>
            <div className="relative" ref={assigneeRef}>
              <button
                type="button"
                onClick={() => setAssigneeOpen((v) => !v)}
                className="inline-flex w-full items-center gap-2 rounded-md border border-border bg-background px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-accent"
              >
                {assignee ? (
                  <>
                    <Avatar
                      initials={assignee.initials}
                      className="size-5 text-[9px]"
                    />
                    {assignee.name}
                  </>
                ) : (
                  <>
                    <UserPlus className="size-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Unassigned</span>
                  </>
                )}
                <ChevronDown className="ml-auto size-4 text-muted-foreground" />
              </button>
              {assigneeOpen && (
                <div className="absolute left-0 top-full z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-md">
                  {people.map((p) => {
                    const active = assigneeId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setAssigneeId(p.id);
                          setAssigneeOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent",
                          active && "bg-accent",
                        )}
                      >
                        <Avatar
                          initials={p.initials}
                          className="size-5 text-[9px]"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-foreground">
                            {p.name}
                          </span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {p.role}
                          </span>
                        </span>
                        {active && <Check className="size-3.5 text-primary" />}
                      </button>
                    );
                  })}
                  {assigneeId && (
                    <button
                      type="button"
                      onClick={() => {
                        setAssigneeId(null);
                        setAssigneeOpen(false);
                      }}
                      className="mt-1 flex w-full items-center gap-2 rounded-md border-t border-border px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent"
                    >
                      <X className="size-3.5" />
                      Clear assignee
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-foreground">Tags</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 py-0.5 pl-1.5 pr-1 text-[11px] text-muted-foreground"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    aria-label={`Remove tag ${tag}`}
                    className="rounded-sm p-0.5 text-muted-foreground/60 transition-colors hover:bg-background hover:text-foreground"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              <span className="inline-flex items-center gap-1 rounded-md border border-dashed border-border py-0.5 pl-1.5 pr-1 text-[11px]">
                <span className="text-muted-foreground">#</span>
                <input
                  value={tagDraft}
                  onChange={(e) => setTagDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="add tag"
                  className="w-20 bg-transparent text-[11px] text-foreground outline-none placeholder:text-muted-foreground"
                />
                {tagDraft.trim() && (
                  <button
                    type="button"
                    onClick={addTag}
                    aria-label="Add tag"
                    className="rounded-sm p-0.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                  >
                    <Plus className="size-3" />
                  </button>
                )}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!question.trim()}>
              Add decision
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
