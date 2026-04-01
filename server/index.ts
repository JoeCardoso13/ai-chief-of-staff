import Anthropic from "@anthropic-ai/sdk";
import cors from "cors";
import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const upload = multer({ storage: multer.memoryStorage() });

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are an AI Chief of Staff for a CEO. You receive a batch of incoming messages from a single morning across email, Slack, and WhatsApp.

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

app.post("/api/triage", async (req, res) => {
  try {
    const messages = req.body.messages;
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "messages array is required" });
      return;
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Here are today's incoming messages:\n\n${JSON.stringify(messages, null, 2)}\n\nPlease triage all ${messages.length} messages and produce the full analysis.`,
        },
      ],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
    if (!jsonMatch) {
      res.status(500).json({ error: "Failed to parse AI response" });
      return;
    }

    const result = JSON.parse(jsonMatch[1]);
    res.json(result);
  } catch (error: any) {
    console.error("Triage error:", error);
    res.status(500).json({
      error: error.message || "Internal server error",
    });
  }
});

app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }
    const messages = JSON.parse(req.file.buffer.toString("utf-8"));
    if (!Array.isArray(messages)) {
      res.status(400).json({ error: "File must contain a JSON array" });
      return;
    }
    res.json({ messages });
  } catch {
    res.status(400).json({ error: "Invalid JSON file" });
  }
});


// In production, serve the built frontend
const distPath = path.join(ROOT, "dist");
try {
  await fs.access(distPath);
  app.use(express.static(distPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
} catch {
  // dist doesn't exist yet — dev mode, Vite serves frontend
}

const PORT = parseInt(process.env.PORT ?? "3001", 10);
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
