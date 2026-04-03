import { expect, test } from "@playwright/test";

const messages = [
  {
    id: 1,
    channel: "email",
    from: "Alice Johnson",
    subject: "Q2 Revenue Report",
    timestamp: "2026-04-02T09:00:00Z",
    body: "Please review the attached Q2 revenue report before the board meeting.",
  },
  {
    id: 2,
    channel: "slack",
    from: "Build Bot",
    channel_name: "#engineering",
    timestamp: "2026-04-02T09:05:00Z",
    body: "The production build failed after the latest deploy.",
  },
];

const triageResponse = {
  triagedMessages: [
    {
      messageId: 1,
      category: "decide",
      reason: "CEO needs to review the report before the board meeting.",
      draftResponse:
        "I will review the report this morning and send comments before the meeting.",
      urgency: "high",
    },
    {
      messageId: 2,
      category: "delegate",
      reason: "Engineering leadership can resolve the build failure.",
      delegateTo: "VP Engineering",
      draftResponse: "Please investigate the deploy failure and send me a status update.",
      urgency: "critical",
    },
  ],
  flags: [
    {
      title: "Production build failure",
      description: "Engineering reported a production build failure after the latest deploy.",
      relatedMessageIds: [2],
      severity: "critical",
    },
  ],
  briefing: {
    summary:
      "The top issue is the production build failure. You also need to review the Q2 revenue report before the board meeting.",
    keyDecisions: ["Review the Q2 revenue report"],
    scheduleConflicts: [],
    topPriority: "Address the production build failure and review the Q2 report",
  },
};

test.describe("mocked browser e2e", () => {
  test("uploads messages, runs triage, and navigates results", async ({
    page,
  }) => {
    await page.route("**/api/upload", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ messages }),
      });
    });

    await page.route("**/api/triage", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(triageResponse),
      });
    });

    await page.goto("/");

    await page.locator('input[type="file"]').setInputFiles({
      name: "messages.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(messages)),
    });

    await expect(
      page.getByText("2 messages loaded", { exact: true })
    ).toBeVisible();

    await page.getByRole("button", { name: "Run Triage" }).click();

    await expect(page.getByText("Top Priority")).toBeVisible();
    await expect(
      page.getByText("Address the production build failure and review the Q2 report")
    ).toBeVisible();

    await page.getByRole("button", { name: "Triage", exact: true }).click();
    await expect(page.getByText("All (2)")).toBeVisible();
    await expect(
      page.getByText("CEO needs to review the report before the board meeting.")
    ).toBeVisible();

    await page.getByRole("button", { name: "Delegate (1)" }).click();
    await expect(
      page.getByText("Engineering leadership can resolve the build failure.")
    ).toBeVisible();
    await expect(
      page.getByText("VP Engineering")
    ).toBeVisible();

    await page.getByRole("button", { name: "Flags (1)" }).click();
    await expect(
      page.getByRole("heading", {
        name: "Production build failure",
        exact: true,
      })
    ).toBeVisible();
  });

  test("shows server error banner when upload fails", async ({ page }) => {
    await page.route("**/api/upload", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "Invalid JSON file" }),
      });
    });

    await page.goto("/");

    await page.locator('input[type="file"]').setInputFiles({
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from("not valid json"),
    });

    await expect(page.getByText("Invalid JSON file")).toBeVisible();
  });
});
