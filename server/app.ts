import cors from "cors";
import express from "express";
import multer from "multer";
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const upload = multer({ storage: multer.memoryStorage() });

const MessageSchema = z.object({
  id: z.number(),
  channel: z.enum(["email", "slack", "whatsapp"]),
  from: z.string(),
  to: z.string().optional(),
  subject: z.string().optional(),
  channel_name: z.string().optional(),
  timestamp: z.string(),
  body: z.string(),
});

const TriagedMessageSchema = z.object({
  messageId: z.number(),
  category: z.enum(["ignore", "delegate", "decide"]),
  reason: z.string(),
  delegateTo: z.string().optional(),
  draftResponse: z.string().optional(),
  urgency: z.enum(["low", "medium", "high", "critical"]),
});

const FlagSchema = z.object({
  title: z.string(),
  description: z.string(),
  relatedMessageIds: z.array(z.number()),
  severity: z.enum(["info", "warning", "critical"]),
});

const BriefingSchema = z.object({
  summary: z.string(),
  keyDecisions: z.array(z.string()),
  scheduleConflicts: z.array(z.string()),
  topPriority: z.string(),
});

const TriageResponseSchema = z.object({
  triagedMessages: z.array(TriagedMessageSchema),
  flags: z.array(FlagSchema),
  briefing: BriefingSchema,
});

const ReclassifyRequestSchema = z.object({
  message: MessageSchema,
  triage: TriagedMessageSchema,
  category: z.enum(["ignore", "delegate", "decide"]),
  delegateTo: z.string().optional(),
  reason: z.string().optional(),
});

const ReclassifiedMessageSchema = z.object({
  messageId: z.number(),
  category: z.enum(["ignore", "delegate", "decide"]),
  reason: z.string(),
  delegateTo: z.string().optional(),
  draftResponse: z.string(),
  urgency: z.enum(["low", "medium", "high", "critical"]),
});

const RefineDraftRequestSchema = z.object({
  message: MessageSchema,
  triage: TriagedMessageSchema,
  instruction: z.string(),
});

const RefinedDraftSchema = z.object({
  draftResponse: z.string(),
});

function hasDuplicateMessageIds(messages: Array<{ id: number }>) {
  const ids = new Set<number>();
  for (const message of messages) {
    if (ids.has(message.id)) return true;
    ids.add(message.id);
  }
  return false;
}

function sanitizeErrorMessage(message: string) {
  return message.replace(/sk-[A-Za-z0-9_-]+/g, "[redacted-api-key]");
}

function extractFirstJsonObject(text: string): string | null {
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (start === -1) {
      if (char === "{") {
        start = i;
        depth = 1;
        inString = false;
        escaped = false;
      }
      continue;
    }

    // Only double-quotes are tracked: single-quoted strings aren't valid JSON,
    // and JSON.parse below will reject any mis-extracted candidate anyway.
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char !== "}") continue;

    depth -= 1;
    if (depth !== 0) continue;

    const candidate = text.slice(start, i + 1);
    try {
      JSON.parse(candidate);
      return candidate;
    } catch {
      start = -1;
      depth = 0;
      inString = false;
      escaped = false;
    }
  }

  return null;
}

export function extractJson(text: string): string | null {
  const codeBlockMatch = text.match(/```json\s*([\s\S]*?)```/i);
  if (codeBlockMatch) {
    return codeBlockMatch[1];
  }

  return extractFirstJsonObject(text);
}

export const SYSTEM_PROMPT = `You are an AI Chief of Staff for a CEO. You receive a batch of incoming messages from a single morning across email, Slack, and WhatsApp.

Your job is to:
1. **Triage** every message into one of three categories:
   - **ignore**: No CEO involvement needed (spam, newsletters, FYI-only updates, phishing, personal messages)
   - **delegate**: Can be handled by someone else — identify who and draft a handoff message
   - **decide**: The CEO must personally act on this — draft a response for them

2. **Flag** anything the CEO should be aware of, even if it's handled by someone else. Look for:
   - Conflicts or contradictions between messages
   - Time-sensitive items
   - Risks (security, financial, operational, reputational)
   - Good news worth celebrating
   - Patterns that suggest deeper issues

3. **Daily Briefing**: Write a concise briefing the CEO can read in under 2 minutes. It should:
   - Open with the single most important thing
   - Summarize what needs their attention today
   - Note any schedule conflicts
   - End with key decisions needed

Be decisive. A good Chief of Staff protects the CEO's time ruthlessly. When in doubt between "delegate" and "decide", ask: "Would a competent delegate handle this well, or does this genuinely need the CEO's judgment?"

For urgency levels:
- **critical**: Needs attention within the hour (production issues, time-sensitive deals)
- **high**: Needs attention today
- **medium**: Needs attention this week
- **low**: Can wait

Respond with valid JSON matching this exact schema:
{
  "triagedMessages": [
    {
      "messageId": <number>,
      "category": "ignore" | "delegate" | "decide",
      "reason": "<one sentence explaining why>",
      "delegateTo": "<person or role, only if category is delegate>",
      "draftResponse": "<drafted response text, required for delegate and decide>",
      "urgency": "low" | "medium" | "high" | "critical"
    }
  ],
  "flags": [
    {
      "title": "<short title>",
      "description": "<explanation of what the CEO should know>",
      "relatedMessageIds": [<message ids>],
      "severity": "info" | "warning" | "critical"
    }
  ],
  "briefing": {
    "summary": "<2-3 paragraph briefing, readable in under 2 minutes>",
    "keyDecisions": ["<decision 1>", "<decision 2>"],
    "scheduleConflicts": ["<conflict 1>"],
    "topPriority": "<the single most important thing right now>"
  }
}`;

async function createAnthropicTextResponse(
  anthropic: Anthropic,
  system: string,
  content: string
) {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    system,
    messages: [
      {
        role: "user",
        content,
      },
    ],
  });

  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");
}

export function createApp(anthropic: Anthropic) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.post("/api/triage", async (req, res) => {
    try {
      const messagesInput = req.body.messages;
      if (!Array.isArray(messagesInput) || messagesInput.length === 0) {
        res.status(400).json({ error: "messages array is required" });
        return;
      }

      const parsedMessages = z.array(MessageSchema).safeParse(messagesInput);
      if (!parsedMessages.success) {
        res.status(400).json({ error: "Invalid message payload" });
        return;
      }

      const messages = parsedMessages.data;
      if (hasDuplicateMessageIds(messages)) {
        res.status(400).json({ error: "Duplicate message ids are not allowed" });
        return;
      }

      const text = await createAnthropicTextResponse(
        anthropic,
        SYSTEM_PROMPT,
        `Here are today's incoming messages:\n\n${JSON.stringify(messages, null, 2)}\n\nPlease triage all ${messages.length} messages and produce the full analysis.`
      );

      const extractedJson = extractJson(text);
      if (!extractedJson) {
        res.status(500).json({ error: "Failed to parse AI response" });
        return;
      }

      const parsedResponse = TriageResponseSchema.safeParse(
        JSON.parse(extractedJson)
      );
      if (!parsedResponse.success) {
        res.status(500).json({ error: "Invalid AI response schema" });
        return;
      }

      if (messages.length > 0 && parsedResponse.data.triagedMessages.length === 0) {
        res.status(500).json({ error: "Invalid AI response schema" });
        return;
      }

      res.json(parsedResponse.data);
    } catch (error: any) {
      console.error("Triage error:", error);
      res.status(500).json({
        error: sanitizeErrorMessage(
          error?.message || "Internal server error"
        ),
      });
    }
  });

  app.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }

      if (!req.file.originalname.toLowerCase().endsWith(".json")) {
        res.status(400).json({ error: "Only .json files are supported" });
        return;
      }

      const raw = req.file.buffer.toString("utf-8").replace(/^\uFEFF/, "");
      const messagesInput = JSON.parse(raw);
      if (!Array.isArray(messagesInput)) {
        res.status(400).json({ error: "File must contain a JSON array" });
        return;
      }

      const parsedMessages = z.array(MessageSchema).safeParse(messagesInput);
      if (!parsedMessages.success) {
        res.status(400).json({ error: "Invalid message payload" });
        return;
      }

      if (hasDuplicateMessageIds(parsedMessages.data)) {
        res.status(400).json({ error: "Duplicate message ids are not allowed" });
        return;
      }

      res.json({ messages: parsedMessages.data });
    } catch {
      res.status(400).json({ error: "Invalid JSON file" });
    }
  });

  app.post("/api/reclassify", async (req, res) => {
    try {
      const parsedRequest = ReclassifyRequestSchema.safeParse(req.body);
      if (!parsedRequest.success) {
        res.status(400).json({ error: "Invalid reclassify payload" });
        return;
      }

      const { message, triage, category, delegateTo, reason } = parsedRequest.data;
      if (triage.category === category) {
        res.status(400).json({ error: "Requested category must differ from current category" });
        return;
      }

      const text = await createAnthropicTextResponse(
        anthropic,
        "You revise a single triaged CEO message. Return only valid JSON matching the requested schema.",
        `Reclassify this message based on updated instructions.\n\nOriginal message:\n${JSON.stringify(message, null, 2)}\n\nCurrent triage:\n${JSON.stringify(triage, null, 2)}\n\nRequested update:\n${JSON.stringify(
          {
            category,
            delegateTo,
            reason,
          }
        )}\n\nReturn valid JSON with this exact schema:\n{\n  "messageId": <number>,\n  "category": "ignore" | "delegate" | "decide",\n  "reason": "<one sentence explaining why>",\n  "delegateTo": "<person or role, only if category is delegate>",\n  "draftResponse": "<drafted response text>",\n  "urgency": "low" | "medium" | "high" | "critical"\n}`
      );

      const extractedJson = extractJson(text);
      if (!extractedJson) {
        res.status(500).json({ error: "Failed to parse AI response" });
        return;
      }

      const parsedResponse = ReclassifiedMessageSchema.safeParse(
        JSON.parse(extractedJson)
      );
      if (!parsedResponse.success) {
        res.status(500).json({ error: "Invalid AI response schema" });
        return;
      }

      res.json(parsedResponse.data);
    } catch (error: any) {
      console.error("Reclassify error:", error);
      res.status(500).json({
        error: sanitizeErrorMessage(
          error?.message || "Internal server error"
        ),
      });
    }
  });

  app.post("/api/refine-draft", async (req, res) => {
    try {
      const parsedRequest = RefineDraftRequestSchema.safeParse(req.body);
      if (!parsedRequest.success) {
        res.status(400).json({ error: "Invalid refine draft payload" });
        return;
      }

      const { message, triage, instruction } = parsedRequest.data;
      if (!triage.draftResponse) {
        res.status(400).json({ error: "draftResponse is required to refine a draft" });
        return;
      }
      if (!instruction.trim()) {
        res.status(400).json({ error: "instruction is required" });
        return;
      }

      const text = await createAnthropicTextResponse(
        anthropic,
        "You rewrite an existing CEO draft. Return only valid JSON matching the requested schema.",
        `Refine the existing draft using the instruction below.\n\nOriginal message:\n${JSON.stringify(message, null, 2)}\n\nCurrent triage:\n${JSON.stringify(triage, null, 2)}\n\nExisting draft:\n${triage.draftResponse}\n\nInstruction:\n${instruction.trim()}\n\nReturn valid JSON with this exact schema:\n{\n  "draftResponse": "<rewritten draft text>"\n}`
      );

      const extractedJson = extractJson(text);
      if (!extractedJson) {
        res.status(500).json({ error: "Failed to parse AI response" });
        return;
      }

      const parsedResponse = RefinedDraftSchema.safeParse(
        JSON.parse(extractedJson)
      );
      if (!parsedResponse.success) {
        res.status(500).json({ error: "Invalid AI response schema" });
        return;
      }

      res.json(parsedResponse.data);
    } catch (error: any) {
      console.error("Refine draft error:", error);
      res.status(500).json({
        error: sanitizeErrorMessage(
          error?.message || "Internal server error"
        ),
      });
    }
  });

  return app;
}
