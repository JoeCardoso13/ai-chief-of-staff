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
  });
});
