"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bot,
  Send,
  Sparkles,
  Check,
  Clock,
  Plus,
  X,
  ChevronDown,
  UserPlus,
  CornerDownLeft,
} from "lucide-react";
import type { Board, Decision, Person } from "@/app/lib/decisions";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/lib/utils";
import { StatusBadge, UrgencyBadge, Avatar, statusMeta } from "./Meta";

export function DecisionDetail({
  decision,
  boards,
  people,
  onResolve,
  onAddTag,
  onRemoveTag,
  onReassign,
  onAddMessage,
}: {
  decision: Decision;
  boards: Board[];
  people: Person[];
  onResolve: (id: string, answerText: string) => void;
  onAddTag: (id: string, tag: string) => void;
  onRemoveTag: (id: string, tag: string) => void;
  onReassign: (id: string, personId: string | null) => void;
  onAddMessage: (id: string, text: string) => void;
}) {
  const [note, setNote] = useState("");
  const [addingTag, setAddingTag] = useState(false);
  const [tagDraft, setTagDraft] = useState("");
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [messageDraft, setMessageDraft] = useState("");
  const tagInputRef = useRef<HTMLInputElement>(null);
  const assigneeRef = useRef<HTMLDivElement>(null);

  // Working state resets per decision via a `key` on this component in the
  // parent (which remounts it), so no reset effect is needed here.

  // Focus the tag input when it appears.
  useEffect(() => {
    if (addingTag) tagInputRef.current?.focus();
  }, [addingTag]);

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

  function commitTag() {
    if (tagDraft.trim()) onAddTag(decision.id, tagDraft);
    setTagDraft("");
    setAddingTag(false);
  }

  function commitMessage() {
    if (!messageDraft.trim()) return;
    onAddMessage(decision.id, messageDraft);
    setMessageDraft("");
  }

  const isOpen =
    decision.status === "needs_decision" || decision.status === "routed";
  const canSubmit = isOpen && note.trim().length > 0;
  const board = boards.find((b) => b.key === decision.board);

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-background">
      {/* Header */}
      <div className="flex min-h-14 items-center gap-3 border-b border-border px-5 py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">
            {decision.ref}
          </span>
          <span className="text-muted-foreground">·</span>
          <StatusBadge status={decision.status} />
        </div>
        <UrgencyBadge urgency={decision.urgency} />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-5 py-6">
          <h1 className="text-balance text-lg font-semibold tracking-tight">
            {decision.title}
          </h1>

          {/* Meta strip */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            {board && (
              <span className="inline-flex items-center gap-1.5">
                <span className={cn("size-2 rounded-full", board.color)} />
                {board.name}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" />
              {decision.status === "answered" ? "Waited" : "Waiting"}{" "}
              {decision.waitingFor}
            </span>
          </div>

          {/* Editable properties: assignee + tags */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {/* Assignee dropdown */}
            <div className="relative" ref={assigneeRef}>
              <button
                onClick={() => setAssigneeOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground transition-colors hover:bg-accent"
              >
                {decision.routedTo ? (
                  <>
                    <Avatar
                      initials={decision.routedTo.initials}
                      className="size-4 text-[8px]"
                    />
                    {decision.routedTo.name}
                  </>
                ) : (
                  <>
                    <UserPlus className="size-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Unassigned</span>
                  </>
                )}
                <ChevronDown className="size-3 text-muted-foreground" />
              </button>
              {assigneeOpen && (
                <div className="absolute left-0 top-full z-10 mt-1 w-52 overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-md">
                  {people.map((p) => {
                    const active = decision.routedTo?.id === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          onReassign(decision.id, p.id);
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
                  {decision.routedTo && (
                    <button
                      onClick={() => {
                        onReassign(decision.id, null);
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

            <span className="text-muted-foreground/40">·</span>

            {/* Tags */}
            {decision.tags.map((tag) => (
              <span
                key={tag}
                className="group inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 py-0.5 pl-1.5 pr-1 text-[11px] text-muted-foreground"
              >
                #{tag}
                <button
                  onClick={() => onRemoveTag(decision.id, tag)}
                  aria-label={`Remove tag ${tag}`}
                  className="rounded-sm p-0.5 text-muted-foreground/60 transition-colors hover:bg-background hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}

            {addingTag ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-ring bg-background py-0.5 pl-1.5 pr-1 text-[11px]">
                <span className="text-muted-foreground">#</span>
                <input
                  ref={tagInputRef}
                  value={tagDraft}
                  onChange={(e) => setTagDraft(e.target.value)}
                  onBlur={commitTag}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitTag();
                    if (e.key === "Escape") {
                      setTagDraft("");
                      setAddingTag(false);
                    }
                  }}
                  placeholder="add tag"
                  className="w-20 bg-transparent text-[11px] text-foreground outline-none placeholder:text-muted-foreground"
                />
              </span>
            ) : (
              <button
                onClick={() => setAddingTag(true)}
                className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
              >
                <Plus className="size-3" />
                Tag
              </button>
            )}
          </div>

          {/* Question from the AI session */}
          <div className="mt-5 rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Bot className="size-4 text-primary" />
              {decision.session.agent} is asking
            </div>
            <p className="mt-2.5 text-pretty text-sm leading-relaxed text-foreground">
              {decision.question}
            </p>
          </div>

          {/* Answer (answered) */}
          {decision.status === "answered" && decision.answer && (
            <section className="mt-5">
              <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Answer
              </h2>
              <div className="mt-2.5 flex items-start gap-2.5 rounded-lg border border-primary/40 bg-primary/5 p-3.5">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                <div className="text-sm">
                  <p className="text-pretty font-medium leading-relaxed text-foreground">
                    {decision.answer}
                  </p>
                  {decision.answeredBy && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Answered by {decision.answeredBy}
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Conversation */}
          {!(
            decision.status === "answered" &&
            (!decision.messages || decision.messages.length === 0)
          ) && (
            <section className="mt-6">
              <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Conversation
              </h2>
              <div className="mt-3 flex flex-col gap-4">
                {decision.messages && decision.messages.length > 0 ? (
                  decision.messages.map((m) => (
                    <div key={m.id} className="flex items-start gap-2.5">
                      {m.authorType === "agent" ? (
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Bot className="size-4" />
                        </span>
                      ) : (
                        <Avatar
                          initials={m.initials}
                          className="size-7 text-[10px]"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {m.authorName}
                          </span>
                          {m.authorType === "agent" && (
                            <span className="rounded border border-primary/30 bg-primary/10 px-1 py-0.5 text-[9px] font-medium uppercase tracking-wide text-primary">
                              Agent
                            </span>
                          )}
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {m.at}
                          </span>
                        </div>
                        <p className="mt-1 text-pretty text-sm leading-relaxed text-foreground/90">
                          {m.text}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No messages yet. Start the discussion below.
                  </p>
                )}
              </div>

              {/* Message input */}
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/40">
                <input
                  value={messageDraft}
                  onChange={(e) => setMessageDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      commitMessage();
                    }
                  }}
                  placeholder="Add a message to the conversation…"
                  aria-label="Add a message to the conversation"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={!messageDraft.trim()}
                  onClick={commitMessage}
                >
                  <CornerDownLeft />
                  Send
                </Button>
              </div>
            </section>
          )}

          {/* Timeline */}
          <section className="mt-6">
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Activity
            </h2>
            <ol className="mt-3 flex flex-col gap-3 border-l border-border pl-4">
              {decision.timeline.map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute -left-[21px] top-1 size-2 rounded-full bg-muted-foreground ring-4 ring-background" />
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {e.at}
                    </span>
                    <span className="text-sm text-foreground/90">
                      {e.label}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>

      {/* Action bar */}
      {decision.status !== "answered" && (
        <div className="border-t border-border bg-card/60 p-4">
          {isOpen ? (
            <div className="mx-auto max-w-2xl">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Add reasoning or instructions for the session… (optional)"
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              />
              <div className="mt-2.5 flex items-center gap-2">
                <Button
                  disabled={!canSubmit}
                  onClick={() => onResolve(decision.id, note)}
                  size="sm"
                >
                  <Send />
                  Answer
                </Button>
                <Button variant="outline" size="sm">
                  <Sparkles />
                  Generate Answer
                </Button>
              </div>
            </div>
          ) : (
            <div className="mx-auto flex max-w-2xl items-center gap-2 text-sm">
              <span
                className={cn(
                  "flex items-center gap-1.5 font-medium",
                  statusMeta[decision.status].text,
                )}
              >
                <Check className="size-4" />
                Resolved automatically
              </span>
              <Button variant="ghost" size="sm" className="ml-auto">
                View session
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
