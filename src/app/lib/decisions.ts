export type Urgency = "low" | "medium" | "high" | "critical"

export type DecisionStatus =
  | "needs_decision" // waiting for a human to answer
  | "routed" // assigned, waiting on a specific person
  | "answered" // a human answered, flowing back to the session
  | "auto_resolved" // resolved automatically by a rule

export type DecisionKind = "approval" | "choice" | "judgment" | "clarification" | "escalation"

export type BoardKey =
  | "refunds-billing"
  | "legal-contracts"
  | "engineering"
  | "growth-brand"
  | "sprint-005-inbox-view"

export type Board = {
  key: BoardKey
  name: string
  color: string
}

export const boards: Board[] = [
  { key: "refunds-billing", name: "Refunds & billing", color: "bg-chart-2" },
  { key: "legal-contracts", name: "Legal & contracts", color: "bg-destructive" },
  { key: "engineering", name: "Engineering", color: "bg-primary" },
  { key: "growth-brand", name: "Growth & brand", color: "bg-chart-3" },
]

export const archivedBoards: Board[] = [
  { key: "sprint-005-inbox-view", name: "Sprint 005 - Inbox View", color: "bg-chart-3" },
]

export type Person = {
  id: string
  name: string
  initials: string
  role: string
}

export type DecisionOption = {
  id: string
  label: string
  detail?: string
  recommended?: boolean
}

export type DecisionEvent = {
  id: string
  at: string
  label: string
  actor?: string
}

export type ConversationMessage = {
  id: string
  authorType: "user" | "agent"
  authorName: string
  initials: string
  at: string
  text: string
}

export type Decision = {
  id: string
  ref: string
  title: string
  question: string
  context: string
  kind: DecisionKind
  status: DecisionStatus
  board: BoardKey
  urgency: Urgency
  createdAt: string
  waitingFor: string
  session: {
    name: string
    agent: string
    project: string
  }
  routedTo?: Person
  requestedBy: string
  tags: string[]
  options?: DecisionOption[]
  ruleSuggestion?: string
  matchedRule?: string
  answer?: string
  answeredBy?: string
  messages?: ConversationMessage[]
  timeline: DecisionEvent[]
  unread?: boolean
}

export const people: Person[] = [
  { id: "u1", name: "Dana Whitfield", initials: "DW", role: "Head of Legal" },
  { id: "u2", name: "Marcus Lee", initials: "ML", role: "Eng Lead" },
  { id: "u3", name: "Priya Nair", initials: "PN", role: "Finance" },
  { id: "u4", name: "Sam Okafor", initials: "SO", role: "Product" },
  { id: "u5", name: "You", initials: "YO", role: "Operations" },
]

export const decisions: Decision[] = [
  {
    id: "d1",
    ref: "DEC-2041",
    title: "Approve refund above policy limit",
    question:
      "Customer Acme Corp is requesting a $4,200 refund for an annual plan canceled 9 days after the 30-day window. Should I issue the full refund, a prorated refund, or deny it?",
    context:
      "The support agent session reached the refund step. Standard policy caps discretionary refunds at $2,000 and the window has closed. Acme is a 3-year enterprise account ($88k ARR) and the cancellation reason was a billing error on our side.",
    kind: "approval",
    status: "needs_decision",
    board: "refunds-billing",
    urgency: "high",
    createdAt: "2026-06-15T13:42:00Z",
    waitingFor: "12m",
    session: { name: "Support · Ticket #8821", agent: "Support Copilot", project: "Customer Ops" },
    requestedBy: "Support Copilot",
    tags: ["refunds", "exception", "enterprise"],
    options: [
      { id: "o1", label: "Approve full $4,200 refund", detail: "Billing error on our side justifies exception", recommended: true },
      { id: "o2", label: "Approve prorated refund", detail: "Refund unused 11 months only (~$3,850)" },
      { id: "o3", label: "Deny — outside policy window" },
    ],
    ruleSuggestion:
      "When the cancellation reason is a confirmed billing error on our side, auto-approve full refunds up to $5,000 for accounts over $50k ARR.",
    messages: [
      {
        id: "m1",
        authorType: "agent",
        authorName: "Support Copilot",
        initials: "SC",
        at: "13:42",
        text: "Flagging this one — the refund is $2,200 over the discretionary cap and the 30-day window closed 9 days ago.",
      },
      {
        id: "m2",
        authorType: "user",
        authorName: "Priya Nair",
        initials: "PN",
        at: "13:45",
        text: "Can you confirm the cancellation was caused by our billing error and not the customer changing their mind?",
      },
      {
        id: "m3",
        authorType: "agent",
        authorName: "Support Copilot",
        initials: "SC",
        at: "13:47",
        text: "Confirmed — the duplicate charge originated from our retry job on May 3rd. Acme has a clean payment history across 3 years.",
      },
    ],
    timeline: [
      { id: "t1", at: "13:42", label: "Question raised by Support Copilot" },
    ],
    unread: true,
  },
  {
    id: "d2",
    ref: "DEC-2040",
    title: "Pick database for new analytics service",
    question:
      "I'm scaffolding the events analytics service. Should I use ClickHouse, Postgres + TimescaleDB, or BigQuery? The PRD expects ~2B events/month with sub-second dashboard queries.",
    context:
      "Coding session is blocked on infra choice before generating the schema and ingestion layer. Team already runs Postgres for transactional data; no existing ClickHouse footprint.",
    kind: "choice",
    status: "needs_decision",
    board: "engineering",
    urgency: "medium",
    createdAt: "2026-06-15T13:10:00Z",
    waitingFor: "44m",
    session: { name: "Build · analytics-service", agent: "Eng Agent", project: "Platform" },
    requestedBy: "Eng Agent",
    tags: ["infra"],
    options: [
      { id: "o1", label: "ClickHouse", detail: "Best for high-volume analytical queries", recommended: true },
      { id: "o2", label: "Postgres + TimescaleDB", detail: "Reuse existing ops knowledge" },
      { id: "o3", label: "BigQuery", detail: "Managed, but adds vendor + latency" },
    ],
    routedTo: people[1],
    timeline: [
      { id: "t1", at: "13:10", label: "Question raised by Eng Agent" },
    ],
    unread: true,
  },
  {
    id: "d4",
    ref: "DEC-2038",
    title: "Tone for churn win-back email",
    question:
      "Drafting the win-back email for lapsed Pro users. Should the tone be apologetic, value-forward, or incentive-led with a discount?",
    context:
      "Marketing session generating a 3-email sequence. Brand guidelines discourage discounting but allow it for win-back under approval.",
    kind: "judgment",
    status: "needs_decision",
    board: "growth-brand",
    urgency: "low",
    createdAt: "2026-06-15T11:55:00Z",
    waitingFor: "1h 59m",
    session: { name: "Campaign · Win-back Q2", agent: "Marketing Agent", project: "Growth" },
    requestedBy: "Marketing Agent",
    tags: ["brand", "copy"],
    options: [
      { id: "o1", label: "Value-forward, no discount", recommended: true },
      { id: "o2", label: "Incentive-led with 20% off" },
      { id: "o3", label: "Apologetic + roadmap tease" },
    ],
    routedTo: people[3],
    timeline: [
      { id: "t1", at: "11:55", label: "Question raised by Marketing Agent" },
    ],
  },
  {
    id: "d5",
    ref: "DEC-2035",
    title: "Approve expense report over $1k",
    question: "Travel expense of $1,340 submitted without itemized receipts. Approve, request receipts, or reject?",
    context: "Finance session processing reimbursements. Policy requires itemized receipts above $1,000.",
    kind: "approval",
    status: "answered",
    board: "refunds-billing",
    urgency: "medium",
    createdAt: "2026-06-15T10:20:00Z",
    waitingFor: "22m",
    session: { name: "Finance · Reimbursements", agent: "Finance Agent", project: "Finance" },
    requestedBy: "Finance Agent",
    tags: ["expenses", "policy"],
    answer: "Request itemized receipts before approving the $1,340 expense.",
    answeredBy: "Priya Nair",
    routedTo: people[2],
    timeline: [
      { id: "t1", at: "10:20", label: "Question raised by Finance Agent" },
      { id: "t3", at: "10:31", label: "Answered: request itemized receipts", actor: "PN" },
      { id: "t4", at: "10:31", label: "Answer returned to session" },
    ],
  },
  {
    id: "d6",
    ref: "DEC-2042",
    title: "Approve MSA with mutual indemnification edit",
    question:
      "Counterparty redlined the MSA to make indemnification mutual and capped at fees paid. Should I accept the edit, counter with our standard cap, or escalate to Legal?",
    context:
      "Contract review session is finalizing a partner agreement. Our playbook allows mutual indemnification but flags fee-based caps for review on deals over $100k.",
    kind: "approval",
    status: "needs_decision",
    board: "legal-contracts",
    urgency: "high",
    createdAt: "2026-06-15T12:48:00Z",
    waitingFor: "54m",
    session: { name: "Legal · Partner MSA", agent: "Contracts Agent", project: "Legal Ops" },
    requestedBy: "Contracts Agent",
    tags: ["contracts", "indemnification", "review"],
    options: [
      { id: "o1", label: "Counter with standard liability cap", detail: "Cap at 12 months of fees", recommended: true },
      { id: "o2", label: "Accept mutual indemnification as redlined" },
      { id: "o3", label: "Escalate to Legal for full review" },
    ],
    routedTo: people[0],
    messages: [
      {
        id: "m1",
        authorType: "agent",
        authorName: "Contracts Agent",
        initials: "CA",
        at: "12:48",
        text: "Counterparty wants mutual indemnification capped at fees paid. This is a $140k deal, so the fee-based cap trips our review flag.",
      },
      {
        id: "m2",
        authorType: "user",
        authorName: "Dana Whitfield",
        initials: "DW",
        at: "12:55",
        text: "Mutual indemnification is fine, but I'm not comfortable with a fees-paid cap on a deal this size. Let me see the exact redline language.",
      },
    ],
    timeline: [
      { id: "t1", at: "12:48", label: "Question raised by Contracts Agent" },
    ],
    unread: true,
  },
  {
    id: "d7",
    ref: "DEC-2043",
    title: "Choose CI provider for monorepo migration",
    question:
      "Migrating the monorepo CI. Should I move to GitHub Actions, keep CircleCI, or adopt Buildkite for self-hosted runners?",
    context:
      "Platform session is planning the CI migration. Build times have grown 40% this quarter and the team wants faster caching.",
    kind: "choice",
    status: "answered",
    board: "engineering",
    urgency: "medium",
    createdAt: "2026-06-15T09:30:00Z",
    waitingFor: "22m",
    session: { name: "Build · ci-migration", agent: "Eng Agent", project: "Platform" },
    requestedBy: "Eng Agent",
    tags: ["ci", "infra", "tooling"],
    answer: "Adopt GitHub Actions for the monorepo CI migration.",
    answeredBy: "Marcus Lee",
    routedTo: people[1],
    timeline: [
      { id: "t1", at: "09:30", label: "Question raised by Eng Agent" },
      { id: "t3", at: "09:52", label: "Answered: adopt GitHub Actions", actor: "ML" },
      { id: "t4", at: "09:52", label: "Answer returned to session" },
    ],
  },
  {
    id: "d8",
    ref: "DEC-1980",
    title: "Confirm two-pane vs single-column inbox layout",
    question:
      "Should the inbox use a two-pane master/detail layout or a single-column list with a slide-over detail panel?",
    context:
      "Sprint 005 design session for the inbox view. Desktop is the primary surface and reviewers triage many items per session.",
    kind: "choice",
    status: "answered",
    board: "sprint-005-inbox-view",
    urgency: "medium",
    createdAt: "2026-05-28T14:10:00Z",
    waitingFor: "15m",
    session: { name: "Design · Inbox View", agent: "Design Agent", project: "Sprint 005" },
    requestedBy: "Design Agent",
    tags: ["design", "layout"],
    answer: "Use a two-pane master/detail layout for the inbox.",
    answeredBy: "Sam Okafor",
    routedTo: people[3],
    timeline: [
      { id: "t1", at: "14:10", label: "Question raised by Design Agent" },
      { id: "t3", at: "14:25", label: "Answered: two-pane master/detail", actor: "SO" },
      { id: "t4", at: "14:25", label: "Answer returned to session" },
    ],
  },
  {
    id: "d9",
    ref: "DEC-1981",
    title: "Default sort order for the decision list",
    question:
      "Should the decision list default to sorting by urgency, by oldest waiting, or by most recently created?",
    context:
      "Sprint 005 inbox view. SLA targets prioritize the longest-waiting critical items first.",
    kind: "choice",
    status: "answered",
    board: "sprint-005-inbox-view",
    urgency: "low",
    createdAt: "2026-05-28T15:02:00Z",
    waitingFor: "18m",
    session: { name: "Design · Inbox View", agent: "Design Agent", project: "Sprint 005" },
    requestedBy: "Design Agent",
    tags: ["design", "sorting"],
    answer: "Default the decision list to sort by oldest waiting.",
    answeredBy: "Marcus Lee",
    routedTo: people[1],
    timeline: [
      { id: "t1", at: "15:02", label: "Question raised by Design Agent" },
      { id: "t3", at: "15:20", label: "Answered: sort by oldest waiting", actor: "ML" },
      { id: "t4", at: "15:20", label: "Answer returned to session" },
    ],
  },
  {
    id: "d10",
    ref: "DEC-1982",
    title: "Keyboard shortcuts for triage actions",
    question:
      "Should we add keyboard shortcuts (j/k to navigate, e to answer) to the inbox, or ship without them this sprint?",
    context:
      "Sprint 005 inbox view. Power users requested faster triage; scope must fit within the sprint.",
    kind: "approval",
    status: "answered",
    board: "sprint-005-inbox-view",
    urgency: "low",
    createdAt: "2026-05-29T09:45:00Z",
    waitingFor: "20m",
    session: { name: "Design · Inbox View", agent: "Design Agent", project: "Sprint 005" },
    requestedBy: "Design Agent",
    tags: ["design", "shortcuts"],
    answer: "Ship j/k navigation shortcuts only this sprint.",
    answeredBy: "Sam Okafor",
    routedTo: people[3],
    timeline: [
      { id: "t1", at: "09:45", label: "Question raised by Design Agent" },
      { id: "t3", at: "10:05", label: "Answered: ship j/k navigation only", actor: "SO" },
      { id: "t4", at: "10:05", label: "Answer returned to session" },
    ],
  },
]
