import type {
  Message,
  TriagedMessage,
  Flag,
  DailyBriefing,
  TriageResponse,
} from "../../src/types.ts";

export function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 1,
    channel: "email",
    from: "Alice Johnson",
    subject: "Q2 Revenue Report",
    timestamp: "2026-04-02T09:00:00Z",
    body: "Please review the attached Q2 revenue report before the board meeting.",
    ...overrides,
  };
}

export function makeTriagedMessage(
  overrides: Partial<TriagedMessage> = {}
): TriagedMessage {
  return {
    messageId: 1,
    category: "decide",
    reason: "CEO needs to review revenue figures before the board meeting.",
    draftResponse:
      "Thanks Alice, I'll review the Q2 report this morning and send my comments before the meeting.",
    urgency: "high",
    ...overrides,
  };
}

export function makeFlag(overrides: Partial<Flag> = {}): Flag {
  return {
    title: "Revenue discrepancy",
    description:
      "Q2 numbers in the report differ from the projections shared last week.",
    relatedMessageIds: [1],
    severity: "warning",
    ...overrides,
  };
}

export function makeBriefing(
  overrides: Partial<DailyBriefing> = {}
): DailyBriefing {
  return {
    summary:
      "Your most urgent item today is the Q2 revenue report review before the board meeting at 2pm.\n\nThe team is waiting on your decision regarding the new product launch timeline. There are conflicting signals about the Horizon project status.",
    keyDecisions: [
      "Approve or revise Q2 revenue report",
      "Set product launch timeline",
    ],
    scheduleConflicts: ["Board meeting at 2pm overlaps with client call"],
    topPriority: "Review Q2 revenue report before the 2pm board meeting",
    ...overrides,
  };
}

export function makeTriageResponse(
  overrides: Partial<TriageResponse> = {}
): TriageResponse {
  return {
    triagedMessages: [makeTriagedMessage()],
    flags: [makeFlag()],
    briefing: makeBriefing(),
    ...overrides,
  };
}
