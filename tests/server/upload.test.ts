import { describe, test, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../server/app.ts";
import { createMockAnthropic } from "../helpers/mock-anthropic.ts";
import { makeMessage } from "../helpers/fixtures.ts";
import type { Express } from "express";

// Upload endpoint doesn't use Anthropic, but createApp requires it
const app: Express = createApp(createMockAnthropic("{}"));

describe("POST /api/upload", () => {
  describe("successful uploads", () => {
    test("accepts valid JSON array of messages", async () => {
      const messages = [makeMessage({ id: 1 }), makeMessage({ id: 2 })];

      const res = await request(app)
        .post("/api/upload")
        .attach("file", Buffer.from(JSON.stringify(messages)), "messages.json")
        .expect(200);

      expect(res.body.messages).toHaveLength(2);
      expect(res.body.messages[0].id).toBe(1);
      expect(res.body.messages[1].id).toBe(2);
    });

    test("accepts empty array", async () => {
      const res = await request(app)
        .post("/api/upload")
        .attach("file", Buffer.from("[]"), "messages.json")
        .expect(200);

      // Empty array is accepted — no minimum message count for upload
      expect(res.body.messages).toEqual([]);
    });

    test("accepts single message", async () => {
      const res = await request(app)
        .post("/api/upload")
        .attach(
          "file",
          Buffer.from(JSON.stringify([makeMessage()])),
          "messages.json"
        )
        .expect(200);

      expect(res.body.messages).toHaveLength(1);
    });
  });

  describe("rejection cases", () => {
    test("rejects request with no file", async () => {
      const res = await request(app).post("/api/upload").expect(400);

      expect(res.body.error).toBe("No file uploaded");
    });

    test("rejects invalid JSON", async () => {
      const res = await request(app)
        .post("/api/upload")
        .attach("file", Buffer.from("not json at all"), "bad.json")
        .expect(400);

      expect(res.body.error).toBe("Invalid JSON file");
    });

    test("rejects JSON object (not array)", async () => {
      const res = await request(app)
        .post("/api/upload")
        .attach(
          "file",
          Buffer.from('{"key":"value"}'),
          "object.json"
        )
        .expect(400);

      expect(res.body.error).toBe("File must contain a JSON array");
    });

    test("rejects JSON string (not array)", async () => {
      const res = await request(app)
        .post("/api/upload")
        .attach("file", Buffer.from('"hello"'), "string.json")
        .expect(400);

      expect(res.body.error).toBe("File must contain a JSON array");
    });

    test("rejects JSON number (not array)", async () => {
      const res = await request(app)
        .post("/api/upload")
        .attach("file", Buffer.from("42"), "number.json")
        .expect(400);

      expect(res.body.error).toBe("File must contain a JSON array");
    });

    test("rejects JSON null", async () => {
      const res = await request(app)
        .post("/api/upload")
        .attach("file", Buffer.from("null"), "null.json")
        .expect(400);

      expect(res.body.error).toBe("File must contain a JSON array");
    });

    test("rejects empty file", async () => {
      const res = await request(app)
        .post("/api/upload")
        .attach("file", Buffer.from(""), "empty.json")
        .expect(400);

      expect(res.body.error).toBe("Invalid JSON file");
    });

    test("rejects file with only whitespace", async () => {
      const res = await request(app)
        .post("/api/upload")
        .attach("file", Buffer.from("   \n\t  "), "whitespace.json")
        .expect(400);

      expect(res.body.error).toBe("Invalid JSON file");
    });
  });

  describe("element validation", () => {
    test("rejects array of primitives as invalid messages", async () => {
      const res = await request(app)
        .post("/api/upload")
        .attach(
          "file",
          Buffer.from('[1, "two", null, true]'),
          "primitives.json"
        )
        .expect(400);

      expect(res.body.error).toBeDefined();
    });

    test("rejects array with missing required fields", async () => {
      const res = await request(app)
        .post("/api/upload")
        .attach(
          "file",
          Buffer.from('[{"id": 1}, {"random": "data"}]'),
          "partial.json"
        )
        .expect(400);

      expect(res.body.error).toBeDefined();
    });

    test("rejects messages with wrong field types", async () => {
      const badMessage = {
        id: "not-a-number",
        channel: 42,
        from: null,
        timestamp: false,
        body: 0,
      };
      const res = await request(app)
        .post("/api/upload")
        .attach(
          "file",
          Buffer.from(JSON.stringify([badMessage])),
          "wrong-types.json"
        )
        .expect(400);

      expect(res.body.error).toBeDefined();
    });
  });

  describe("file handling edge cases", () => {
    test("rejects non-JSON file extensions", async () => {
      const res = await request(app)
        .post("/api/upload")
        .attach(
          "file",
          Buffer.from(JSON.stringify([makeMessage()])),
          "data.exe"
        )
        .expect(400);

      expect(res.body.error).toBeDefined();
    });

    test("handles UTF-8 content correctly", async () => {
      const msg = makeMessage({ body: "Bonjour! Les données sont prêtes. 日本語テスト" });
      const res = await request(app)
        .post("/api/upload")
        .attach(
          "file",
          Buffer.from(JSON.stringify([msg]), "utf-8"),
          "unicode.json"
        )
        .expect(200);

      expect(res.body.messages[0].body).toContain("日本語テスト");
    });

    test("handles JSON with BOM marker", async () => {
      const bom = "\uFEFF";
      const json = JSON.stringify([makeMessage()]);
      const res = await request(app)
        .post("/api/upload")
        .attach("file", Buffer.from(bom + json, "utf-8"), "bom.json")
        .expect(200);

      expect(res.body.messages).toHaveLength(1);
      expect(res.body.messages[0].id).toBe(makeMessage().id);
    });

    test("handles deeply nested JSON", async () => {
      const msg = makeMessage({
        body: JSON.stringify({ a: { b: { c: { d: { e: "deep" } } } } }),
      });
      const res = await request(app)
        .post("/api/upload")
        .attach(
          "file",
          Buffer.from(JSON.stringify([msg])),
          "deep.json"
        )
        .expect(200);

      expect(res.body.messages).toHaveLength(1);
    });
  });
});
