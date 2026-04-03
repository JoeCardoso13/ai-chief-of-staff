import { describe, test, expect } from "vitest";
import request from "supertest";
import { z } from "zod";
import { createApp } from "../../server/app.ts";
import { createMockAnthropic } from "../helpers/mock-anthropic.ts";
import { makeMessage, makeTriagedMessage } from "../helpers/fixtures.ts";
import type { Express } from "express";

const ReclassifiedMessageSchema = z.object({
  messageId: z.number(),
  category: z.enum(["ignore", "delegate", "decide"]),
  reason: z.string(),
  delegateTo: z.string().optional(),
  draftResponse: z.string(),
  urgency: z.enum(["low", "medium", "high", "critical"]),
});

describe("POST /api/reclassify", () => {
  function makeApp(responseBody: unknown): Express {
    return createApp(createMockAnthropic(JSON.stringify(responseBody)));
  }

  test("rejects missing message payload", async () => {
    const app = makeApp(makeTriagedMessage());

    const res = await request(app)
      .post("/api/reclassify")
      .send({
        triage: makeTriagedMessage(),
        category: "delegate",
      })
      .expect(400);

    expect(res.body.error).toBeDefined();
  });

  test("rejects missing triage payload", async () => {
    const app = makeApp(makeTriagedMessage());

    const res = await request(app)
      .post("/api/reclassify")
      .send({
        message: makeMessage(),
        category: "delegate",
      })
      .expect(400);

    expect(res.body.error).toBeDefined();
  });

  test("rejects when the requested category matches the current category", async () => {
    const app = makeApp(makeTriagedMessage());

    const res = await request(app)
      .post("/api/reclassify")
      .send({
        message: makeMessage(),
        triage: makeTriagedMessage({ category: "delegate" }),
        category: "delegate",
      })
      .expect(400);

    expect(res.body.error).toBeDefined();
  });

  test("returns a reclassified triaged message with a new Claude-generated draft", async () => {
    const updatedTriage = makeTriagedMessage({
      messageId: 7,
      category: "delegate",
      delegateTo: "VP Engineering",
      reason: "This can be handled by the VP Engineering team.",
      draftResponse: "Please take point on this and send me a short update by noon.",
      urgency: "medium",
    });
    const app = makeApp(updatedTriage);

    const res = await request(app)
      .post("/api/reclassify")
      .send({
        message: makeMessage({ id: 7, from: "Morgan", subject: "Prod issue" }),
        triage: makeTriagedMessage({
          messageId: 7,
          category: "decide",
          reason: "CEO should personally respond.",
          draftResponse: "I'll jump on this now.",
        }),
        category: "delegate",
        delegateTo: "VP Engineering",
        reason: "This can be handled by the VP Engineering team.",
      })
      .expect(200);

    expect(ReclassifiedMessageSchema.parse(res.body)).toEqual(updatedTriage);
  });

  test("includes the requested category, delegate target, and reason in the Claude prompt", async () => {
    const mockAnthropic = createMockAnthropic(
      JSON.stringify(
        makeTriagedMessage({
          category: "delegate",
          delegateTo: "Chief of Staff",
          draftResponse: "Please handle this and keep me posted.",
        })
      )
    );
    const app = createApp(mockAnthropic);

    await request(app)
      .post("/api/reclassify")
      .send({
        message: makeMessage({ id: 11, subject: "Board follow-up" }),
        triage: makeTriagedMessage({
          messageId: 11,
          category: "decide",
          draftResponse: "I'll review it personally.",
        }),
        category: "delegate",
        delegateTo: "Chief of Staff",
        reason: "This only needs coordination.",
      })
      .expect(200);

    const callArgs = (mockAnthropic.messages.create as any).mock.calls[0][0];
    expect(callArgs.messages[0].content).toContain('"category":"delegate"');
    expect(callArgs.messages[0].content).toContain("Chief of Staff");
    expect(callArgs.messages[0].content).toContain("This only needs coordination.");
  });

  test("rejects invalid AI response schema", async () => {
    const app = makeApp({ draftResponse: "missing the rest" });

    const res = await request(app)
      .post("/api/reclassify")
      .send({
        message: makeMessage(),
        triage: makeTriagedMessage(),
        category: "ignore",
      })
      .expect(500);

    expect(res.body.error).toBeDefined();
  });
});
