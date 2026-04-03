import { expect, test } from "@playwright/test";

const liveEnabled = Boolean(
  process.env.PLAYWRIGHT_LIVE_ANTHROPIC && process.env.ANTHROPIC_API_KEY
);

test.describe("live Anthropic smoke", () => {
  test.skip(
    !liveEnabled,
    "Set PLAYWRIGHT_LIVE_ANTHROPIC=1 and ANTHROPIC_API_KEY to run live smoke tests."
  );

  test("upload and triage succeeds against the real API", async ({ page }) => {
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
        from: "Ben Carter",
        channel_name: "#leadership",
        timestamp: "2026-04-02T09:12:00Z",
        body: "The board deck still needs your sign-off before noon.",
      },
    ];

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

    await expect(page.getByText("Top Priority")).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByRole("button", { name: /Flags \(\d+\)/ })).toBeVisible();
  });
});
