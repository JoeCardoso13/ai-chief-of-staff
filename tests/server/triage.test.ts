import { describe, test, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../server/app.ts";
import {
  createMockAnthropic,
  createFailingAnthropic,
} from "../helpers/mock-anthropic.ts";
import { makeMessage, makeTriageResponse } from "../helpers/fixtures.ts";
import type { Express } from "express";

function validResponseJson() {
  return JSON.stringify(makeTriageResponse());
}

describe("POST /api/triage", () => {
  let app: Express;

  describe("input validation", () => {
    beforeEach(() => {
      app = createApp(createMockAnthropic(validResponseJson()));
    });

    test("rejects missing body", async () => {
      const res = await request(app)
        .post("/api/triage")
        .send({})
        .expect(400);
      expect(res.body.error).toBe("messages array is required");
    });

    test("rejects messages: null", async () => {
      const res = await request(app)
        .post("/api/triage")
        .send({ messages: null })
        .expect(400);
      expect(res.body.error).toBe("messages array is required");
    });

    test("rejects messages as string", async () => {
      const res = await request(app)
        .post("/api/triage")
        .send({ messages: "hello" })
        .expect(400);
      expect(res.body.error).toBe("messages array is required");
    });

    test("rejects empty array", async () => {
      const res = await request(app)
        .post("/api/triage")
        .send({ messages: [] })
        .expect(400);
      expect(res.body.error).toBe("messages array is required");
    });

    test("rejects messages as number", async () => {
      const res = await request(app)
        .post("/api/triage")
        .send({ messages: 42 })
        .expect(400);
      expect(res.body.error).toBe("messages array is required");
    });

    // BUG: No per-element validation — any non-empty array passes through
    test("BUG: accepts array of empty objects (no field validation)", async () => {
      const mockAnthropic = createMockAnthropic(validResponseJson());
      app = createApp(mockAnthropic);

      await request(app).post("/api/triage").send({ messages: [{}] }).expect(200);

      // The empty object was sent directly to Claude with no validation
      expect(mockAnthropic.messages.create).toHaveBeenCalled();
      const callArgs = (mockAnthropic.messages.create as any).mock.calls[0][0];
      expect(callArgs.messages[0].content).toContain("{}");
    });

    test("BUG: accepts array of wrong types (no element type checking)", async () => {
      const mockAnthropic = createMockAnthropic(validResponseJson());
      app = createApp(mockAnthropic);

      await request(app)
        .post("/api/triage")
        .send({ messages: [1, "x", null] })
        .expect(200);

      expect(mockAnthropic.messages.create).toHaveBeenCalled();
    });

    test("BUG: accepts messages with missing required fields", async () => {
      const mockAnthropic = createMockAnthropic(validResponseJson());
      app = createApp(mockAnthropic);

      await request(app)
        .post("/api/triage")
        .send({ messages: [{ id: 1 }] }) // missing channel, from, body, timestamp
        .expect(200);

      expect(mockAnthropic.messages.create).toHaveBeenCalled();
    });
  });

  describe("successful triage", () => {
    test("accepts valid messages and returns triage response", async () => {
      const responseData = makeTriageResponse();
      app = createApp(createMockAnthropic(JSON.stringify(responseData)));

      const res = await request(app)
        .post("/api/triage")
        .send({ messages: [makeMessage()] })
        .expect(200);

      expect(res.body.triagedMessages).toEqual(responseData.triagedMessages);
      expect(res.body.flags).toEqual(responseData.flags);
      expect(res.body.briefing).toEqual(responseData.briefing);
    });

    test("parses JSON from markdown code block", async () => {
      const json = JSON.stringify(makeTriageResponse());
      const wrappedResponse = `Here is the analysis:\n\n\`\`\`json\n${json}\n\`\`\`\n\nLet me know if you need anything else.`;
      app = createApp(createMockAnthropic(wrappedResponse));

      const res = await request(app)
        .post("/api/triage")
        .send({ messages: [makeMessage()] })
        .expect(200);

      expect(res.body.triagedMessages).toBeDefined();
    });

    test("parses raw JSON without code block", async () => {
      app = createApp(createMockAnthropic(validResponseJson()));

      const res = await request(app)
        .post("/api/triage")
        .send({ messages: [makeMessage()] })
        .expect(200);

      expect(res.body.triagedMessages).toBeDefined();
    });

    test("sends correct model and system prompt to Claude", async () => {
      const mockAnthropic = createMockAnthropic(validResponseJson());
      app = createApp(mockAnthropic);

      await request(app)
        .post("/api/triage")
        .send({ messages: [makeMessage()] })
        .expect(200);

      const callArgs = (mockAnthropic.messages.create as any).mock.calls[0][0];
      expect(callArgs.model).toBe("claude-sonnet-4-20250514");
      expect(callArgs.max_tokens).toBe(8192);
      expect(callArgs.system).toContain("AI Chief of Staff");
    });

    test("includes message count in user prompt", async () => {
      const mockAnthropic = createMockAnthropic(validResponseJson());
      app = createApp(mockAnthropic);

      const messages = [makeMessage({ id: 1 }), makeMessage({ id: 2 })];
      await request(app)
        .post("/api/triage")
        .send({ messages })
        .expect(200);

      const callArgs = (mockAnthropic.messages.create as any).mock.calls[0][0];
      expect(callArgs.messages[0].content).toContain("triage all 2 messages");
    });
  });

  describe("BUG: no schema validation on Claude response", () => {
    test("BUG: arbitrary JSON object returned as-is to client", async () => {
      // Claude returns completely wrong schema — app doesn't validate
      app = createApp(createMockAnthropic('{"foo":"bar","baz":42}'));

      const res = await request(app)
        .post("/api/triage")
        .send({ messages: [makeMessage()] })
        .expect(200);

      // The nonsense response is forwarded directly to the client
      expect(res.body).toEqual({ foo: "bar", baz: 42 });
      expect(res.body.triagedMessages).toBeUndefined();
    });

    test("BUG: extra unexpected fields in response forwarded to client", async () => {
      const response = {
        ...makeTriageResponse(),
        maliciousField: "injected data",
        __proto__: { admin: true },
      };
      app = createApp(createMockAnthropic(JSON.stringify(response)));

      const res = await request(app)
        .post("/api/triage")
        .send({ messages: [makeMessage()] })
        .expect(200);

      expect(res.body.maliciousField).toBe("injected data");
    });

    test("BUG: empty triagedMessages array accepted without warning", async () => {
      const response = makeTriageResponse({ triagedMessages: [] });
      app = createApp(createMockAnthropic(JSON.stringify(response)));

      const res = await request(app)
        .post("/api/triage")
        .send({ messages: [makeMessage()] })
        .expect(200);

      // Sent 1 message but got 0 triaged — no validation catches this
      expect(res.body.triagedMessages).toHaveLength(0);
    });
  });

  describe("error handling", () => {
    test("returns 500 when Claude returns non-JSON", async () => {
      app = createApp(
        createMockAnthropic("I cannot process this request at this time.")
      );

      const res = await request(app)
        .post("/api/triage")
        .send({ messages: [makeMessage()] })
        .expect(500);

      expect(res.body.error).toBe("Failed to parse AI response");
    });

    test("returns 500 when Claude returns malformed JSON", async () => {
      app = createApp(createMockAnthropic('{"broken": json here}'));

      const res = await request(app)
        .post("/api/triage")
        .send({ messages: [makeMessage()] })
        .expect(500);

      // JSON.parse throws, caught by outer catch
      expect(res.body.error).toBeDefined();
    });

    test("BUG: error.message from Anthropic SDK leaks to client", async () => {
      const sensitiveError = new Error(
        "Authentication failed for API key sk-ant-api03-FAKE_KEY_HERE"
      );
      app = createApp(createFailingAnthropic(sensitiveError));

      const res = await request(app)
        .post("/api/triage")
        .send({ messages: [makeMessage()] })
        .expect(500);

      // The raw error message containing the API key is sent to the client
      expect(res.body.error).toContain("sk-ant-api03-FAKE_KEY_HERE");
    });

    test("handles Anthropic rate limit error", async () => {
      const rateLimitError = new Error("Rate limit exceeded");
      (rateLimitError as any).status = 429;
      app = createApp(createFailingAnthropic(rateLimitError));

      const res = await request(app)
        .post("/api/triage")
        .send({ messages: [makeMessage()] })
        .expect(500);

      expect(res.body.error).toContain("Rate limit");
    });

    test("handles network timeout error", async () => {
      const timeoutError = new Error("Request timed out");
      (timeoutError as any).code = "ETIMEDOUT";
      app = createApp(createFailingAnthropic(timeoutError));

      const res = await request(app)
        .post("/api/triage")
        .send({ messages: [makeMessage()] })
        .expect(500);

      expect(res.body.error).toBeDefined();
    });

    test("handles empty response content from Claude", async () => {
      const mockAnthropic = {
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [],
          }),
        },
      } as any;
      app = createApp(mockAnthropic);

      const res = await request(app)
        .post("/api/triage")
        .send({ messages: [makeMessage()] })
        .expect(500);

      expect(res.body.error).toBe("Failed to parse AI response");
    });

    test("handles response with only tool_use blocks (no text)", async () => {
      const mockAnthropic = {
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: "tool_use", id: "123", name: "test", input: {} }],
          }),
        },
      } as any;
      app = createApp(mockAnthropic);

      const res = await request(app)
        .post("/api/triage")
        .send({ messages: [makeMessage()] })
        .expect(500);

      expect(res.body.error).toBe("Failed to parse AI response");
    });
  });
});
