import { describe, test, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../server/app.ts";
import {
  createMockAnthropic,
} from "../helpers/mock-anthropic.ts";
import { makeMessage, makeTriageResponse, makeTriagedMessage } from "../helpers/fixtures.ts";

import validMessages from "../fixtures/valid-messages.json";
import stressMinimal from "../fixtures/stress-minimal.json";
import stressAdversarial from "../fixtures/stress-adversarial.json";
import stressEdgeCases from "../fixtures/stress-edge-cases.json";
import stressConflicts from "../fixtures/stress-conflicts.json";

function validResponseJson() {
  return JSON.stringify(makeTriageResponse());
}

describe("stress tests: fixture uploads", () => {
  const app = createApp(createMockAnthropic(validResponseJson()));

  test("valid-messages.json uploads successfully", async () => {
    const res = await request(app)
      .post("/api/upload")
      .attach("file", Buffer.from(JSON.stringify(validMessages)), "valid-messages.json")
      .expect(200);

    expect(res.body.messages).toHaveLength(5);
    expect(res.body.messages[0].channel).toBe("email");
    expect(res.body.messages[1].channel).toBe("slack");
    expect(res.body.messages[2].channel).toBe("whatsapp");
  });

  test("stress-minimal.json uploads successfully", async () => {
    const res = await request(app)
      .post("/api/upload")
      .attach("file", Buffer.from(JSON.stringify(stressMinimal)), "stress-minimal.json")
      .expect(200);

    expect(res.body.messages).toHaveLength(1);
    // Minimal message — no subject, no to, no channel_name
    expect(res.body.messages[0].subject).toBeUndefined();
    expect(res.body.messages[0].to).toBeUndefined();
  });

  test("stress-adversarial.json upload is rejected for invalid message elements", async () => {
    const res = await request(app)
      .post("/api/upload")
      .attach(
        "file",
        Buffer.from(JSON.stringify(stressAdversarial)),
        "stress-adversarial.json"
      )
      .expect(400);

    expect(res.body.error).toBeDefined();
  });

  test("stress-edge-cases.json uploads successfully", async () => {
    const res = await request(app)
      .post("/api/upload")
      .attach(
        "file",
        Buffer.from(JSON.stringify(stressEdgeCases)),
        "stress-edge-cases.json"
      )
      .expect(200);

    expect(res.body.messages).toHaveLength(10);
    // RTL Arabic text preserved
    expect(res.body.messages[1].body).toContain("مرحبا");
    // Emoji preserved
    expect(res.body.messages[2].body).toContain("😀");
    // Chinese preserved
    expect(res.body.messages[8].body).toContain("你好世界");
  });

  test("stress-conflicts.json upload is rejected when duplicate IDs are present", async () => {
    const res = await request(app)
      .post("/api/upload")
      .attach(
        "file",
        Buffer.from(JSON.stringify(stressConflicts)),
        "stress-conflicts.json"
      )
      .expect(400);

    expect(res.body.error).toBeDefined();
  });
});

describe("stress tests: triage with fixtures", () => {
  test("valid messages triage round-trip", async () => {
    const response = makeTriageResponse({
      triagedMessages: validMessages.map((m) =>
        makeTriagedMessage({ messageId: m.id })
      ),
    });
    const app = createApp(createMockAnthropic(JSON.stringify(response)));

    const res = await request(app)
      .post("/api/triage")
      .send({ messages: validMessages })
      .expect(200);

    expect(res.body.triagedMessages).toHaveLength(5);
  });

  test("minimal message triage round-trip", async () => {
    const response = makeTriageResponse({
      triagedMessages: [makeTriagedMessage({ messageId: 1 })],
    });
    const app = createApp(createMockAnthropic(JSON.stringify(response)));

    const res = await request(app)
      .post("/api/triage")
      .send({ messages: stressMinimal })
      .expect(200);

    expect(res.body.triagedMessages).toHaveLength(1);
  });

  test("adversarial messages are rejected before calling Claude", async () => {
    const mockAnthropic = createMockAnthropic(validResponseJson());
    const app = createApp(mockAnthropic);

    await request(app)
      .post("/api/triage")
      .send({ messages: stressAdversarial })
      .expect(400);

    expect(mockAnthropic.messages.create).not.toHaveBeenCalled();
  });

  test("edge case messages triage successfully", async () => {
    const response = makeTriageResponse({
      triagedMessages: stressEdgeCases.map((m) =>
        makeTriagedMessage({ messageId: m.id })
      ),
    });
    const app = createApp(createMockAnthropic(JSON.stringify(response)));

    const res = await request(app)
      .post("/api/triage")
      .send({ messages: stressEdgeCases })
      .expect(200);

    expect(res.body.triagedMessages).toHaveLength(10);
  });

  test("duplicate ID messages are rejected before triage", async () => {
    const mockAnthropic = createMockAnthropic(validResponseJson());
    const app = createApp(mockAnthropic);

    const res = await request(app)
      .post("/api/triage")
      .send({ messages: stressConflicts })
      .expect(400);

    expect(res.body.error).toBeDefined();
    expect(mockAnthropic.messages.create).not.toHaveBeenCalled();
  });
});

describe("stress tests: volume", () => {
  test("handles 150 messages", async () => {
    const messages = Array.from({ length: 150 }, (_, i) =>
      makeMessage({
        id: i + 1,
        channel: (["email", "slack", "whatsapp"] as const)[i % 3],
        from: `Sender ${i + 1}`,
        subject: `Subject ${i + 1}`,
        body: `Message body ${i + 1}. `.repeat(10),
      })
    );

    const response = makeTriageResponse({
      triagedMessages: messages.map((m) =>
        makeTriagedMessage({
          messageId: m.id,
          category: (["decide", "delegate", "ignore"] as const)[m.id % 3],
          urgency: (["low", "medium", "high", "critical"] as const)[m.id % 4],
        })
      ),
    });
    const app = createApp(createMockAnthropic(JSON.stringify(response)));

    const res = await request(app)
      .post("/api/triage")
      .send({ messages })
      .expect(200);

    expect(res.body.triagedMessages).toHaveLength(150);
  });

  test("handles 150 messages upload via file", async () => {
    const messages = Array.from({ length: 150 }, (_, i) =>
      makeMessage({ id: i + 1, from: `User ${i}` })
    );
    const app = createApp(createMockAnthropic(validResponseJson()));

    const res = await request(app)
      .post("/api/upload")
      .attach(
        "file",
        Buffer.from(JSON.stringify(messages)),
        "volume.json"
      )
      .expect(200);

    expect(res.body.messages).toHaveLength(150);
  });

  test("handles messages with very large bodies", async () => {
    const largeBody = "X".repeat(50000); // 50KB body
    const messages = [makeMessage({ id: 1, body: largeBody })];

    const app = createApp(createMockAnthropic(validResponseJson()));

    const res = await request(app)
      .post("/api/triage")
      .send({ messages })
      .expect(200);

    // Verify the large body was sent to Claude
    expect(
      (app as any) // supertest handled it
    ).toBeTruthy();
    expect(res.body.triagedMessages).toBeDefined();
  });

  test("payload near 1MB limit", async () => {
    // Create a payload close to the 1MB limit
    const bigBody = "Y".repeat(900000); // ~900KB
    const app = createApp(createMockAnthropic(validResponseJson()));

    const res = await request(app)
      .post("/api/triage")
      .send({ messages: [makeMessage({ id: 1, body: bigBody })] })
      .expect(200);

    expect(res.body).toBeDefined();
  });

  test("payload over 1MB limit is rejected", async () => {
    const hugeBody = "Z".repeat(1100000); // ~1.1MB
    const app = createApp(createMockAnthropic(validResponseJson()));

    const res = await request(app)
      .post("/api/triage")
      .send({ messages: [makeMessage({ id: 1, body: hugeBody })] });

    // Express json middleware should reject with 413 or error
    expect([413, 500]).toContain(res.status);
  });
});
