import { describe, test, expect } from "vitest";
import request from "supertest";
import { z } from "zod";
import { createApp } from "../../server/app.ts";
import { createMockAnthropic } from "../helpers/mock-anthropic.ts";
import { makeMessage, makeTriageResponse } from "../helpers/fixtures.ts";

// Zod schemas that SHOULD be used in production for runtime validation.
// These tests prove that proper schema validation is possible with the
// already-installed Zod dependency.
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

describe("API round-trip integration", () => {
  test("upload then triage round-trip succeeds", async () => {
    const triageResponse = makeTriageResponse();
    const app = createApp(
      createMockAnthropic(JSON.stringify(triageResponse))
    );

    // Step 1: Upload messages
    const messages = [
      makeMessage({ id: 1, channel: "email" }),
      makeMessage({ id: 2, channel: "slack", subject: "Build failed" }),
    ];
    const uploadRes = await request(app)
      .post("/api/upload")
      .attach("file", Buffer.from(JSON.stringify(messages)), "messages.json")
      .expect(200);

    expect(uploadRes.body.messages).toHaveLength(2);

    // Step 2: Run triage with uploaded messages
    const triageRes = await request(app)
      .post("/api/triage")
      .send({ messages: uploadRes.body.messages })
      .expect(200);

    expect(triageRes.body.triagedMessages).toBeDefined();
    expect(triageRes.body.flags).toBeDefined();
    expect(triageRes.body.briefing).toBeDefined();
  });

  test("response structure validated against Zod schema (proving Zod should be used)", async () => {
    const validResponse = makeTriageResponse();
    const app = createApp(
      createMockAnthropic(JSON.stringify(validResponse))
    );

    const res = await request(app)
      .post("/api/triage")
      .send({ messages: [makeMessage()] })
      .expect(200);

    // This validates successfully, proving the schema works
    const parsed = TriageResponseSchema.parse(res.body);
    expect(parsed.triagedMessages).toHaveLength(1);
    expect(parsed.flags).toHaveLength(1);
    expect(parsed.briefing.topPriority).toBeTruthy();
  });

  test("BUG: invalid response passes server but fails Zod validation", async () => {
    // Claude returns completely wrong structure
    const badResponse = { triagedMessages: "not an array", flags: null };
    const app = createApp(
      createMockAnthropic(JSON.stringify(badResponse))
    );

    const res = await request(app)
      .post("/api/triage")
      .send({ messages: [makeMessage()] })
      .expect(200); // Server returns 200 — no validation!

    // But Zod catches it — proving the server SHOULD use Zod
    expect(() => TriageResponseSchema.parse(res.body)).toThrow();
  });

  test("BUG: response with wrong enum values passes server but fails Zod", async () => {
    const badEnumResponse = makeTriageResponse({
      triagedMessages: [
        {
          messageId: 1,
          category: "maybe" as any, // Invalid category
          reason: "not sure",
          urgency: "extreme" as any, // Invalid urgency
        },
      ],
    });
    const app = createApp(
      createMockAnthropic(JSON.stringify(badEnumResponse))
    );

    const res = await request(app)
      .post("/api/triage")
      .send({ messages: [makeMessage()] })
      .expect(200); // Server accepts it

    expect(() => TriageResponseSchema.parse(res.body)).toThrow();
  });

  test("concurrent triage requests complete without cross-contamination", async () => {
    const response1 = makeTriageResponse({
      briefing: { summary: "Response One", keyDecisions: [], scheduleConflicts: [], topPriority: "One" },
    });
    const response2 = makeTriageResponse({
      briefing: { summary: "Response Two", keyDecisions: [], scheduleConflicts: [], topPriority: "Two" },
    });

    let callCount = 0;
    const mockAnthropic = {
      messages: {
        create: vi.fn().mockImplementation(() => {
          callCount++;
          const response = callCount === 1 ? response1 : response2;
          return Promise.resolve({
            content: [{ type: "text", text: JSON.stringify(response) }],
          });
        }),
      },
    } as any;

    const app = createApp(mockAnthropic);

    // Fire two requests concurrently
    const [res1, res2] = await Promise.all([
      request(app)
        .post("/api/triage")
        .send({ messages: [makeMessage({ id: 1 })] }),
      request(app)
        .post("/api/triage")
        .send({ messages: [makeMessage({ id: 2 })] }),
    ]);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    // Both should succeed independently
    expect(res1.body.briefing.topPriority).toBe("One");
    expect(res2.body.briefing.topPriority).toBe("Two");
  });

  test("triage sends all messages to Claude in a single batch", async () => {
    const mockAnthropic = createMockAnthropic(
      JSON.stringify(makeTriageResponse())
    );
    const app = createApp(mockAnthropic);

    const messages = Array.from({ length: 10 }, (_, i) =>
      makeMessage({ id: i + 1, subject: `Message ${i + 1}` })
    );

    await request(app)
      .post("/api/triage")
      .send({ messages })
      .expect(200);

    // Should be called exactly once (single batch, not per-message)
    expect(mockAnthropic.messages.create).toHaveBeenCalledTimes(1);

    const callArgs = (mockAnthropic.messages.create as any).mock.calls[0][0];
    expect(callArgs.messages[0].content).toContain("triage all 10 messages");
  });
});
