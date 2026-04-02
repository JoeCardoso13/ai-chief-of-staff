import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BriefingView } from "../../src/components/BriefingView.tsx";
import { makeBriefing } from "../helpers/fixtures.ts";

describe("BriefingView", () => {
  describe("complete briefing rendering", () => {
    test("renders top priority", () => {
      render(
        <BriefingView
          briefing={makeBriefing({
            topPriority: "Close the Series B deal today",
          })}
        />
      );
      expect(
        screen.getByText("Close the Series B deal today")
      ).toBeInTheDocument();
    });

    test("renders 'Top Priority' label", () => {
      render(<BriefingView briefing={makeBriefing()} />);
      expect(screen.getByText("Top Priority")).toBeInTheDocument();
    });

    test("renders summary text", () => {
      render(
        <BriefingView
          briefing={makeBriefing({
            summary: "Today's most pressing issue is the board meeting.",
          })}
        />
      );
      expect(
        screen.getByText("Today's most pressing issue is the board meeting.")
      ).toBeInTheDocument();
    });

    test("renders 'Morning Briefing' heading", () => {
      render(<BriefingView briefing={makeBriefing()} />);
      expect(screen.getByText("Morning Briefing")).toBeInTheDocument();
    });

    test("renders key decisions with numbering", () => {
      render(
        <BriefingView
          briefing={makeBriefing({
            keyDecisions: ["Approve budget", "Hire VP Sales"],
          })}
        />
      );
      expect(screen.getByText("Approve budget")).toBeInTheDocument();
      expect(screen.getByText("Hire VP Sales")).toBeInTheDocument();
      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    test("renders schedule conflicts", () => {
      render(
        <BriefingView
          briefing={makeBriefing({
            scheduleConflicts: ["Board meeting overlaps with client call"],
          })}
        />
      );
      expect(
        screen.getByText("Board meeting overlaps with client call")
      ).toBeInTheDocument();
    });

    test("renders 'Decisions Needed' heading", () => {
      render(<BriefingView briefing={makeBriefing()} />);
      expect(screen.getByText("Decisions Needed")).toBeInTheDocument();
    });

    test("renders 'Schedule Conflicts' heading", () => {
      render(<BriefingView briefing={makeBriefing()} />);
      expect(screen.getByText("Schedule Conflicts")).toBeInTheDocument();
    });
  });

  describe("empty states", () => {
    test("empty scheduleConflicts shows 'No conflicts detected'", () => {
      render(
        <BriefingView
          briefing={makeBriefing({ scheduleConflicts: [] })}
        />
      );
      expect(screen.getByText("No conflicts detected")).toBeInTheDocument();
    });

    test("BUG: empty keyDecisions renders empty list (no empty state message)", () => {
      const { container } = render(
        <BriefingView
          briefing={makeBriefing({ keyDecisions: [] })}
        />
      );
      // BUG: Unlike scheduleConflicts which shows "No conflicts detected",
      // empty keyDecisions renders an empty <ul> with no items and no fallback message.
      // The "Decisions Needed" heading is still shown, but the list is empty.
      expect(screen.getByText("Decisions Needed")).toBeInTheDocument();

      // The <ul> exists but has no <li> children
      const ul = container.querySelector("ul");
      expect(ul).toBeTruthy();
      expect(ul!.children).toHaveLength(0);

      // No "no decisions needed" or similar fallback message
      expect(screen.queryByText(/no decisions/i)).not.toBeInTheDocument();
    });

    test("empty topPriority renders blank banner", () => {
      render(
        <BriefingView briefing={makeBriefing({ topPriority: "" })} />
      );
      // The banner still renders but with empty text
      expect(screen.getByText("Top Priority")).toBeInTheDocument();
    });

    test("empty summary renders empty div", () => {
      render(
        <BriefingView briefing={makeBriefing({ summary: "" })} />
      );
      expect(screen.getByText("Morning Briefing")).toBeInTheDocument();
    });
  });

  describe("text formatting", () => {
    test("preserves newlines in summary (whitespace-pre-wrap)", () => {
      const { container } = render(
        <BriefingView
          briefing={makeBriefing({
            summary: "Line one\nLine two\n\nLine four",
          })}
        />
      );
      const summaryDiv = container.querySelector(".whitespace-pre-wrap");
      expect(summaryDiv).toBeTruthy();
      expect(summaryDiv!.textContent).toBe("Line one\nLine two\n\nLine four");
    });

    test("renders very long topPriority without crashing", () => {
      const longPriority = "Urgent: ".repeat(500);
      const { container } = render(
        <BriefingView briefing={makeBriefing({ topPriority: longPriority })} />
      );
      expect(container.textContent).toContain("Urgent: Urgent:");
    });

    test("renders many decisions", () => {
      const decisions = Array.from({ length: 20 }, (_, i) => `Decision ${i + 1}`);
      render(
        <BriefingView briefing={makeBriefing({ keyDecisions: decisions })} />
      );
      expect(screen.getByText("Decision 1")).toBeInTheDocument();
      expect(screen.getByText("Decision 20")).toBeInTheDocument();
    });

    test("renders special characters in decisions", () => {
      render(
        <BriefingView
          briefing={makeBriefing({
            keyDecisions: ["Approve $2M budget & sign NDA <confidential>"],
          })}
        />
      );
      expect(
        screen.getByText("Approve $2M budget & sign NDA <confidential>")
      ).toBeInTheDocument();
    });
  });
});
