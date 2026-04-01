export interface Message {
  id: number;
  channel: "email" | "slack" | "whatsapp";
  from: string;
  to?: string;
  subject?: string;
  channel_name?: string;
  timestamp: string;
  body: string;
}

export type TriageCategory = "ignore" | "delegate" | "decide";

export interface TriagedMessage {
  messageId: number;
  category: TriageCategory;
  reason: string;
  delegateTo?: string;
  draftResponse?: string;
  urgency: "low" | "medium" | "high" | "critical";
}

export interface Flag {
  title: string;
  description: string;
  relatedMessageIds: number[];
  severity: "info" | "warning" | "critical";
}

export interface DailyBriefing {
  summary: string;
  keyDecisions: string[];
  scheduleConflicts: string[];
  topPriority: string;
}

export interface TriageResponse {
  triagedMessages: TriagedMessage[];
  flags: Flag[];
  briefing: DailyBriefing;
}
