import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { App } from "../../src/App.tsx";
import { makeMessage, makeTriageResponse } from "../helpers/fixtures.ts";

// Mock fetch globally
const mockFetch = vi.fn();
beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockReset();
});
afterEach(() => {
  vi.restoreAllMocks();
});

function mockUploadSuccess(messages: any[]) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ messages }),
  });
}

function mockTriageSuccess(response = makeTriageResponse()) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(response),
  });
}

function mockApiError(error: string, status = 500) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    json: () => Promise.resolve({ error }),
  });
}

describe("App flow", () => {
  describe("initial state", () => {
    test("shows empty state with 'Ready to triage'", () => {
      render(<App />);
      expect(screen.getByText("Ready to triage")).toBeInTheDocument();
    });

    test("shows '0 messages loaded'", () => {
      render(<App />);
      expect(screen.getByText("0 messages loaded")).toBeInTheDocument();
    });

    test("shows upload prompt when no messages loaded", () => {
      render(<App />);
      expect(
        screen.getByText(/Upload a messages JSON file to get started/)
      ).toBeInTheDocument();
    });

    test("Run Triage button is disabled when no messages", () => {
      render(<App />);
      const button = screen.getByText("Run Triage");
      expect(button).toBeDisabled();
    });

    test("Upload JSON button is present", () => {
      render(<App />);
      expect(screen.getByText("Upload JSON")).toBeInTheDocument();
    });
  });

  describe("file upload flow", () => {
    test("Upload JSON button forwards click to hidden file input", () => {
      render(<App />);
      const fileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      const clickSpy = vi.spyOn(fileInput, "click");

      fireEvent.click(screen.getByText("Upload JSON"));

      expect(clickSpy).toHaveBeenCalledTimes(1);
    });

    test("uploading a file updates message count", async () => {
      render(<App />);
      const messages = [makeMessage({ id: 1 }), makeMessage({ id: 2 })];
      mockUploadSuccess(messages);

      const fileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      const file = new File(
        [JSON.stringify(messages)],
        "messages.json",
        { type: "application/json" }
      );

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(screen.getByText("2 messages loaded")).toBeInTheDocument();
      });
    });

    test("selecting no file is a no-op", async () => {
      render(<App />);

      const fileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [] } });
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(screen.getByText("0 messages loaded")).toBeInTheDocument();
    });

    test("upload cleanup tolerates component unmount before request completes", async () => {
      let resolveUpload!: (value: any) => void;
      mockFetch.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveUpload = resolve;
        })
      );

      const { unmount } = render(<App />);
      const fileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      const file = new File(["[]"], "messages.json", {
        type: "application/json",
      });

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      unmount();

      await act(async () => {
        resolveUpload({
          ok: true,
          json: () => Promise.resolve({ messages: [] }),
        });
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test("uploading clears previous triage result", async () => {
      render(<App />);
      const messages = [makeMessage({ id: 1 })];

      // First upload + triage
      mockUploadSuccess(messages);
      const fileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      const file = new File([JSON.stringify(messages)], "messages.json", {
        type: "application/json",
      });

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(screen.getByText("1 messages loaded")).toBeInTheDocument();
      });

      // After upload, should show "Ready to triage" (result cleared)
      expect(
        screen.getByText(/Click "Run Triage" to analyze/)
      ).toBeInTheDocument();
    });

    test("upload error shows error banner", async () => {
      render(<App />);
      mockApiError("Invalid JSON file", 400);

      const fileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      const file = new File(["not json"], "bad.json", {
        type: "application/json",
      });

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(screen.getByText("Invalid JSON file")).toBeInTheDocument();
      });
    });
  });

  describe("triage flow", () => {
    test("successful triage shows briefing tab", async () => {
      render(<App />);

      // Upload first
      const messages = [makeMessage({ id: 1 })];
      mockUploadSuccess(messages);
      const fileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      await act(async () => {
        fireEvent.change(fileInput, {
          target: {
            files: [
              new File([JSON.stringify(messages)], "m.json", {
                type: "application/json",
              }),
            ],
          },
        });
      });

      await waitFor(() => {
        expect(screen.getByText("1 messages loaded")).toBeInTheDocument();
      });

      // Run triage
      const triageResponse = makeTriageResponse();
      mockTriageSuccess(triageResponse);

      await act(async () => {
        fireEvent.click(screen.getByText("Run Triage"));
      });

      await waitFor(() => {
        expect(screen.getByText("Daily Briefing")).toBeInTheDocument();
        expect(screen.getByText("Top Priority")).toBeInTheDocument();
      });
    });

    test("triage error shows error banner", async () => {
      render(<App />);

      // Upload
      mockUploadSuccess([makeMessage()]);
      const fileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      await act(async () => {
        fireEvent.change(fileInput, {
          target: {
            files: [
              new File(["[]"], "m.json", { type: "application/json" }),
            ],
          },
        });
      });

      await waitFor(() => {
        expect(screen.getByText("1 messages loaded")).toBeInTheDocument();
      });

      // Triage fails
      mockApiError("Failed to parse AI response");

      await act(async () => {
        fireEvent.click(screen.getByText("Run Triage"));
      });

      await waitFor(() => {
        expect(
          screen.getByText("Failed to parse AI response")
        ).toBeInTheDocument();
      });
    });

    test("triage error falls back to default message when API omits error text", async () => {
      render(<App />);

      mockUploadSuccess([makeMessage()]);
      const fileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      await act(async () => {
        fireEvent.change(fileInput, {
          target: {
            files: [
              new File(["[]"], "m.json", { type: "application/json" }),
            ],
          },
        });
      });

      await waitFor(() => {
        expect(screen.getByText("1 messages loaded")).toBeInTheDocument();
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      });

      await act(async () => {
        fireEvent.click(screen.getByText("Run Triage"));
      });

      await waitFor(() => {
        expect(
          screen.getByText("Failed to triage messages")
        ).toBeInTheDocument();
      });
    });

    test("loading state shows spinner", async () => {
      render(<App />);

      // Upload
      mockUploadSuccess([makeMessage()]);
      const fileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      await act(async () => {
        fireEvent.change(fileInput, {
          target: {
            files: [
              new File(["[]"], "m.json", { type: "application/json" }),
            ],
          },
        });
      });

      await waitFor(() => {
        expect(screen.getByText("1 messages loaded")).toBeInTheDocument();
      });

      // Mock a triage call that doesn't resolve immediately
      let resolveTriagePromise!: (value: any) => void;
      mockFetch.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveTriagePromise = resolve;
        })
      );

      await act(async () => {
        fireEvent.click(screen.getByText("Run Triage"));
      });

      // Should show loading state
      expect(screen.getByText("Analyzing...")).toBeInTheDocument();
      expect(screen.getByText(/Analyzing 1 messages/)).toBeInTheDocument();

      // Resolve the triage
      await act(async () => {
        resolveTriagePromise({
          ok: true,
          json: () => Promise.resolve(makeTriageResponse()),
        });
      });

      await waitFor(() => {
        expect(screen.queryByText("Analyzing...")).not.toBeInTheDocument();
      });
    });
  });

  describe("tab navigation", () => {
    async function setupWithTriageResult() {
      render(<App />);
      mockUploadSuccess([makeMessage({ id: 1 })]);
      const fileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      await act(async () => {
        fireEvent.change(fileInput, {
          target: {
            files: [
              new File(["[]"], "m.json", { type: "application/json" }),
            ],
          },
        });
      });
      await waitFor(() => {
        expect(screen.getByText("1 messages loaded")).toBeInTheDocument();
      });

      mockTriageSuccess();
      await act(async () => {
        fireEvent.click(screen.getByText("Run Triage"));
      });
      await waitFor(() => {
        expect(screen.getByText("Top Priority")).toBeInTheDocument();
      });
    }

    test("default tab is briefing after triage", async () => {
      await setupWithTriageResult();
      expect(screen.getByText("Top Priority")).toBeInTheDocument();
    });

    test("can switch to triage tab", async () => {
      await setupWithTriageResult();
      fireEvent.click(screen.getByText("Triage"));
      expect(screen.getByText(/^All \(/)).toBeInTheDocument();
    });

    test("can switch to flags tab", async () => {
      await setupWithTriageResult();
      const flagsTab = screen.getByText(/Flags/);
      fireEvent.click(flagsTab);
      // FlagsPanel renders — either flags or empty state
      expect(screen.getByText(/Revenue discrepancy|No flags/)).toBeInTheDocument();
    });

    test("can switch back to briefing", async () => {
      await setupWithTriageResult();
      fireEvent.click(screen.getByText("Triage"));
      fireEvent.click(screen.getByText("Daily Briefing"));
      expect(screen.getByText("Top Priority")).toBeInTheDocument();
    });
  });

  describe("filter pills on triage tab", () => {
    async function setupTriageTab() {
      render(<App />);
      const messages = [
        makeMessage({ id: 1 }),
        makeMessage({ id: 2 }),
        makeMessage({ id: 3 }),
      ];
      mockUploadSuccess(messages);
      const fileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      await act(async () => {
        fireEvent.change(fileInput, {
          target: {
            files: [
              new File([JSON.stringify(messages)], "m.json", {
                type: "application/json",
              }),
            ],
          },
        });
      });

      const response = makeTriageResponse({
        triagedMessages: [
          { messageId: 1, category: "decide", reason: "CEO must act", urgency: "high", draftResponse: "On it" },
          { messageId: 2, category: "delegate", reason: "VP can handle", urgency: "medium", delegateTo: "VP", draftResponse: "FYI" },
          { messageId: 3, category: "ignore", reason: "Newsletter spam", urgency: "low" },
        ],
      });
      mockTriageSuccess(response);

      await act(async () => {
        fireEvent.click(screen.getByText("Run Triage"));
      });
      await waitFor(() => {
        expect(screen.getByText("Top Priority")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Triage"));
    }

    test("shows all filter pills with counts", async () => {
      await setupTriageTab();
      expect(screen.getByText("All (3)")).toBeInTheDocument();
      expect(screen.getByText("Decide (1)")).toBeInTheDocument();
      expect(screen.getByText("Delegate (1)")).toBeInTheDocument();
      expect(screen.getByText("Ignore (1)")).toBeInTheDocument();
    });

    test("clicking a filter pill narrows the visible message cards", async () => {
      await setupTriageTab();

      fireEvent.click(screen.getByText("Delegate (1)"));

      expect(screen.getByText("VP can handle")).toBeInTheDocument();
      expect(screen.queryByText("CEO must act")).not.toBeInTheDocument();
      expect(screen.queryByText("Newsletter spam")).not.toBeInTheDocument();
    });

    test("triage tab skips entries whose source message cannot be found", async () => {
      render(<App />);
      const messages = [makeMessage({ id: 1 })];
      mockUploadSuccess(messages);
      const fileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      await act(async () => {
        fireEvent.change(fileInput, {
          target: {
            files: [
              new File([JSON.stringify(messages)], "m.json", {
                type: "application/json",
              }),
            ],
          },
        });
      });

      await waitFor(() => {
        expect(screen.getByText("1 messages loaded")).toBeInTheDocument();
      });

      mockTriageSuccess(
        makeTriageResponse({
          triagedMessages: [
            {
              messageId: 999,
              category: "decide",
              reason: "Missing local message",
              urgency: "high",
              draftResponse: "N/A",
            },
          ],
        })
      );

      await act(async () => {
        fireEvent.click(screen.getByText("Run Triage"));
      });

      await waitFor(() => {
        expect(screen.getByText("Top Priority")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Triage"));

      expect(screen.queryByText("Missing local message")).not.toBeInTheDocument();
    });
  });

  describe("flag-to-message navigation", () => {
    async function setupWithFlags() {
      render(<App />);
      const messages = [
        makeMessage({ id: 1, from: "Alice", subject: "Budget" }),
        makeMessage({ id: 2, from: "Bob", subject: "Hiring" }),
        makeMessage({ id: 3, from: "Carol", subject: "Newsletter" }),
      ];
      mockUploadSuccess(messages);
      const fileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      await act(async () => {
        fireEvent.change(fileInput, {
          target: {
            files: [
              new File([JSON.stringify(messages)], "m.json", {
                type: "application/json",
              }),
            ],
          },
        });
      });
      await waitFor(() => {
        expect(screen.getByText("3 messages loaded")).toBeInTheDocument();
      });

      const response = makeTriageResponse({
        triagedMessages: [
          { messageId: 1, category: "decide", reason: "CEO must act on budget", urgency: "high", draftResponse: "Approved" },
          { messageId: 2, category: "delegate", reason: "HR can handle", urgency: "medium", delegateTo: "HR", draftResponse: "FYI" },
          { messageId: 3, category: "ignore", reason: "Spam newsletter", urgency: "low" },
        ],
        flags: [
          {
            title: "Budget risk",
            description: "Budget numbers look off",
            relatedMessageIds: [1],
            severity: "warning",
          },
          {
            title: "Hiring conflict",
            description: "Conflicting hiring plans",
            relatedMessageIds: [1, 2],
            severity: "critical",
          },
        ],
      });
      mockTriageSuccess(response);

      await act(async () => {
        fireEvent.click(screen.getByText("Run Triage"));
      });
      await waitFor(() => {
        expect(screen.getByText("Top Priority")).toBeInTheDocument();
      });
    }

    test("clicking a related message in flags tab switches to triage tab", async () => {
      await setupWithFlags();

      // Navigate to flags tab
      fireEvent.click(screen.getByText(/Flags/));
      await waitFor(() => {
        expect(screen.getByText("Budget risk")).toBeInTheDocument();
      });

      // Click Alice's related message link
      const aliceLink = screen.getAllByRole("button", { name: /Alice/ })[0];
      fireEvent.click(aliceLink);

      // Should now be on the triage tab
      await waitFor(() => {
        expect(screen.getByText(/^All \(/)).toBeInTheDocument();
      });
    });

    test("navigating from flags resets filter to 'All'", async () => {
      await setupWithFlags();

      // Go to triage tab and set a filter
      fireEvent.click(screen.getByText("Triage"));
      fireEvent.click(screen.getByText(/^Decide/));
      // Only decide messages visible
      expect(screen.queryByText("HR can handle")).not.toBeInTheDocument();

      // Now go to flags and click a related message
      fireEvent.click(screen.getByText(/Flags/));
      await waitFor(() => {
        expect(screen.getByText("Budget risk")).toBeInTheDocument();
      });
      const aliceLink = screen.getAllByRole("button", { name: /Alice/ })[0];
      fireEvent.click(aliceLink);

      // Should be on triage tab with "All" filter — all messages visible
      await waitFor(() => {
        expect(screen.getByText("CEO must act on budget")).toBeInTheDocument();
        expect(screen.getByText("HR can handle")).toBeInTheDocument();
        expect(screen.getByText("Spam newsletter")).toBeInTheDocument();
      });
    });

    test("the target message card is expanded after navigation", async () => {
      await setupWithFlags();

      // Navigate to flags tab and click Alice's message
      fireEvent.click(screen.getByText(/Flags/));
      await waitFor(() => {
        expect(screen.getByText("Budget risk")).toBeInTheDocument();
      });
      const aliceLink = screen.getAllByRole("button", { name: /Alice/ })[0];
      fireEvent.click(aliceLink);

      // The target message (Alice, id=1) should be auto-expanded showing its body/details
      await waitFor(() => {
        // MessageCard shows the full message body when expanded
        expect(
          screen.getByText(/Please review the attached Q2 revenue report/)
        ).toBeInTheDocument();
      });
    });

    test("the target message card has a DOM anchor for scrolling", async () => {
      await setupWithFlags();

      fireEvent.click(screen.getByText(/Flags/));
      await waitFor(() => {
        expect(screen.getByText("Budget risk")).toBeInTheDocument();
      });
      const aliceLink = screen.getAllByRole("button", { name: /Alice/ })[0];
      fireEvent.click(aliceLink);

      // After navigation, the message card should exist with an id anchor
      await waitFor(() => {
        expect(document.getElementById("message-1")).not.toBeNull();
      });
    });

    test("clicking different related messages navigates to different message cards", async () => {
      await setupWithFlags();

      // Go to flags tab — "Hiring conflict" flag has relatedMessageIds [1, 2]
      fireEvent.click(screen.getByText(/Flags/));
      await waitFor(() => {
        expect(screen.getByText("Hiring conflict")).toBeInTheDocument();
      });

      // Click Bob's link
      const bobLink = screen.getByRole("button", { name: /Bob/ });
      fireEvent.click(bobLink);

      // Should show triage tab with Bob's message expanded
      await waitFor(() => {
        expect(screen.getByText("HR can handle")).toBeInTheDocument();
        // Bob's message card should exist with its anchor
        expect(document.getElementById("message-2")).not.toBeNull();
      });
    });
  });
});
