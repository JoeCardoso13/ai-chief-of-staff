import { describe, test, expect } from "vitest";
import request from "supertest";
import { z } from "zod";
import { createApp } from "../../server/app.ts";
import { createMockAnthropic } from "../helpers/mock-anthropic.ts";
import { makeMessage, makeTriagedMessage } from "../helpers/fixtures.ts";
import type { Express } from "express";

const RefinedDraftSchema = z.object({
  draftResponse: z.string(),
});

describe("POST /api/refine-draft", () => {
  function makeApp(responseBody: unknown): Express {
    return createApp(createMockAnthropic(JSON.stringify(responseBody)));
  }

  test("rejects missing message payload", async () => {
    const app = makeApp({ draftResponse: "Rewritten draft" });

    const res = await request(app)
      .post("/api/refine-draft")
      .send({
        triage: makeTriagedMessage(),
        instruction: "Make it more concise",
      })
      .expect(400);

    expect(res.body.error).toBeDefined();
  });

  test("rejects when the triaged message has no draftResponse to refine", async () => {
    const app = makeApp({ draftResponse: "Rewritten draft" });

    const res = await request(app)
      .post("/api/refine-draft")
      .send({
        message: makeMessage(),
        triage: makeTriagedMessage({ draftResponse: undefined }),
        instruction: "Make it more concise",
      })
      .expect(400);

    expect(res.body.error).toBeDefined();
  });

  test("rejects blank instructions", async () => {
    const app = makeApp({ draftResponse: "Rewritten draft" });

    const res = await request(app)
      .post("/api/refine-draft")
      .send({
        message: makeMessage(),
        triage: makeTriagedMessage(),
        instruction: "   ",
      })
      .expect(400);

    expect(res.body.error).toBeDefined();
  });

  test("returns a rewritten draft response", async () => {
    const app = makeApp({
      draftResponse:
        "Thank you for the note. I will review the report and respond by 2 PM.",
    });

    const res = await request(app)
      .post("/api/refine-draft")
      .send({
        message: makeMessage({ id: 4, subject: "Revenue report" }),
        triage: makeTriagedMessage({
          messageId: 4,
          draftResponse: "I'll look at it.",
        }),
        instruction: "Make it more formal and specific.",
      })
      .expect(200);

    expect(RefinedDraftSchema.parse(res.body)).toEqual({
      draftResponse:
        "Thank you for the note. I will review the report and respond by 2 PM.",
    });
  });

  test("includes the existing draft and refinement instruction in the Claude prompt", async () => {
    const mockAnthropic = createMockAnthropic(
      JSON.stringify({ draftResponse: "Tighter and more formal rewrite." })
    );
    const app = createApp(mockAnthropic);

    await request(app)
      .post("/api/refine-draft")
      .send({
        message: makeMessage({ id: 8, from: "Dana" }),
        triage: makeTriagedMessage({
          messageId: 8,
          draftResponse: "I'll handle this.",
        }),
        instruction: "Make it warmer and include a same-day turnaround.",
      })
      .expect(200);

    const callArgs = (mockAnthropic.messages.create as any).mock.calls[0][0];
    expect(callArgs.messages[0].content).toContain("I'll handle this.");
    expect(callArgs.messages[0].content).toContain(
      "Make it warmer and include a same-day turnaround."
    );
  });

  test("rejects invalid AI response schema", async () => {
    const app = makeApp({ draft: "wrong field" });

    const res = await request(app)
      .post("/api/refine-draft")
      .send({
        message: makeMessage(),
        triage: makeTriagedMessage(),
        instruction: "Make it more formal",
      })
      .expect(500);

    expect(res.body.error).toBeDefined();
  });
});
