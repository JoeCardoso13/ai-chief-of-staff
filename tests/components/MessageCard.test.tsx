import { describe, test, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MessageCard } from "../../src/components/MessageCard.tsx";
import { makeMessage, makeTriagedMessage } from "../helpers/fixtures.ts";

describe("MessageCard", () => {
  describe("basic rendering", () => {
    test("renders sender name", () => {
      render(
        <MessageCard
          message={makeMessage({ from: "Alice Johnson" })}
          triage={makeTriagedMessage()}
        />
      );
      expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
    });

    test("renders triage reason", () => {
      render(
        <MessageCard
          message={makeMessage()}
          triage={makeTriagedMessage({
            reason: "CEO must decide on budget allocation",
          })}
        />
      );
      expect(
        screen.getByText("CEO must decide on budget allocation")
      ).toBeInTheDocument();
    });

    test("renders category label", () => {
      render(
        <MessageCard
          message={makeMessage()}
          triage={makeTriagedMessage({ category: "delegate" })}
        />
      );
      expect(screen.getByText("Delegate")).toBeInTheDocument();
    });

    test("renders urgency badge", () => {
      render(
        <MessageCard
          message={makeMessage()}
          triage={makeTriagedMessage({ urgency: "critical" })}
        />
      );
      expect(screen.getByText("Critical")).toBeInTheDocument();
    });

    test("renders formatted timestamp", () => {
      render(
        <MessageCard
          message={makeMessage({ timestamp: "2026-04-02T14:30:00Z" })}
          triage={makeTriagedMessage()}
        />
      );
      // Should render some time format — exact output depends on locale
      const timeEl = screen.getByText(/\d{1,2}:\d{2}/);
      expect(timeEl).toBeInTheDocument();
    });
  });

  describe("optional fields", () => {
    test("renders subject when present", () => {
      render(
        <MessageCard
          message={makeMessage({ subject: "Quarterly Review" })}
          triage={makeTriagedMessage()}
        />
      );
      expect(screen.getByText("Quarterly Review")).toBeInTheDocument();
    });

    test("hides subject when absent", () => {
      render(
        <MessageCard
          message={makeMessage({ subject: undefined })}
          triage={makeTriagedMessage()}
        />
      );
      expect(screen.queryByText("Q2 Revenue Report")).not.toBeInTheDocument();
    });

    test("renders channel_name when present", () => {
      render(
        <MessageCard
          message={makeMessage({ channel_name: "#engineering" })}
          triage={makeTriagedMessage()}
        />
      );
      expect(screen.getByText("#engineering")).toBeInTheDocument();
    });

    test("hides channel_name when absent", () => {
      render(
        <MessageCard
          message={makeMessage({ channel_name: undefined })}
          triage={makeTriagedMessage()}
        />
      );
      // No channel name shown — just sender
      expect(screen.queryByText("#")).not.toBeInTheDocument();
    });

    test("renders delegateTo badge when present", () => {
      render(
        <MessageCard
          message={makeMessage()}
          triage={makeTriagedMessage({
            category: "delegate",
            delegateTo: "VP Engineering",
          })}
        />
      );
      expect(screen.getByText(/VP Engineering/)).toBeInTheDocument();
    });

    test("hides delegateTo badge when absent", () => {
      render(
        <MessageCard
          message={makeMessage()}
          triage={makeTriagedMessage({
            category: "decide",
            delegateTo: undefined,
          })}
        />
      );
      expect(screen.queryByText(/→/)).not.toBeInTheDocument();
    });
  });

  describe("expand/collapse", () => {
    test("message body is hidden by default", () => {
      render(
        <MessageCard
          message={makeMessage({ body: "Secret body content" })}
          triage={makeTriagedMessage()}
        />
      );
      expect(screen.queryByText("Secret body content")).not.toBeInTheDocument();
    });

    test("clicking header expands to show body", () => {
      render(
        <MessageCard
          message={makeMessage({ body: "Secret body content" })}
          triage={makeTriagedMessage()}
        />
      );
      fireEvent.click(screen.getByText("Alice Johnson").closest("div[class*='cursor-pointer']")!);
      expect(screen.getByText("Secret body content")).toBeInTheDocument();
    });

    test("clicking again collapses the card", () => {
      render(
        <MessageCard
          message={makeMessage({ body: "Secret body content" })}
          triage={makeTriagedMessage()}
        />
      );
      const header = screen.getByText("Alice Johnson").closest("div[class*='cursor-pointer']")!;
      fireEvent.click(header);
      expect(screen.getByText("Secret body content")).toBeInTheDocument();
      fireEvent.click(header);
      expect(screen.queryByText("Secret body content")).not.toBeInTheDocument();
    });

    test("shows draft response when expanded", () => {
      render(
        <MessageCard
          message={makeMessage()}
          triage={makeTriagedMessage({
            draftResponse: "Thanks, I'll review it.",
          })}
        />
      );
      const header = screen.getByText("Alice Johnson").closest("div[class*='cursor-pointer']")!;
      fireEvent.click(header);
      expect(screen.getByText("Thanks, I'll review it.")).toBeInTheDocument();
    });

    test("hides draft response section when draftResponse is absent", () => {
      render(
        <MessageCard
          message={makeMessage()}
          triage={makeTriagedMessage({ draftResponse: undefined })}
        />
      );
      const header = screen.getByText("Alice Johnson").closest("div[class*='cursor-pointer']")!;
      fireEvent.click(header);
      expect(screen.queryByText("Draft Response")).not.toBeInTheDocument();
      expect(screen.queryByText("Draft Handoff")).not.toBeInTheDocument();
    });
  });

  describe("category-specific styling", () => {
    test("'decide' category gets red ring", () => {
      const { container } = render(
        <MessageCard
          message={makeMessage()}
          triage={makeTriagedMessage({ category: "decide" })}
        />
      );
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain("ring-2");
      expect(card.className).toContain("ring-red-200");
    });

    test("'delegate' category does not get red ring", () => {
      const { container } = render(
        <MessageCard
          message={makeMessage()}
          triage={makeTriagedMessage({ category: "delegate" })}
        />
      );
      const card = container.firstChild as HTMLElement;
      expect(card.className).not.toContain("ring-2");
    });

    test("'ignore' category does not get red ring", () => {
      const { container } = render(
        <MessageCard
          message={makeMessage()}
          triage={makeTriagedMessage({ category: "ignore" })}
        />
      );
      const card = container.firstChild as HTMLElement;
      expect(card.className).not.toContain("ring-2");
    });

    test("delegate category shows 'Draft Handoff' label (not 'Draft Response')", () => {
      render(
        <MessageCard
          message={makeMessage()}
          triage={makeTriagedMessage({
            category: "delegate",
            delegateTo: "VP Engineering",
            draftResponse: "Please handle this.",
          })}
        />
      );
      const header = screen.getByText("Alice Johnson").closest("div[class*='cursor-pointer']")!;
      fireEvent.click(header);
      expect(screen.getByText(/Draft Handoff to VP Engineering/)).toBeInTheDocument();
    });

    test("decide category shows 'Draft Response' label", () => {
      render(
        <MessageCard
          message={makeMessage()}
          triage={makeTriagedMessage({
            category: "decide",
            draftResponse: "I'll review this today.",
          })}
        />
      );
      const header = screen.getByText("Alice Johnson").closest("div[class*='cursor-pointer']")!;
      fireEvent.click(header);
      expect(screen.getByText("Draft Response")).toBeInTheDocument();
    });
  });

  describe("channel icons", () => {
    test("renders email icon for email channel", () => {
      const { container } = render(
        <MessageCard
          message={makeMessage({ channel: "email" })}
          triage={makeTriagedMessage()}
        />
      );
      const svg = container.querySelector("svg path");
      expect(svg).toBeTruthy();
    });

    test("renders icon for slack channel", () => {
      const { container } = render(
        <MessageCard
          message={makeMessage({ channel: "slack" })}
          triage={makeTriagedMessage()}
        />
      );
      expect(container.querySelector("svg")).toBeTruthy();
    });

    test("renders icon for whatsapp channel", () => {
      const { container } = render(
        <MessageCard
          message={makeMessage({ channel: "whatsapp" })}
          triage={makeTriagedMessage()}
        />
      );
      expect(container.querySelector("svg")).toBeTruthy();
    });

    test("unknown channel falls back to email icon without crashing", () => {
      render(
        <MessageCard
          message={makeMessage({ channel: "telegram" as any })}
          triage={makeTriagedMessage()}
        />
      );
      // Should render without error, using email icon fallback
      expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
    });
  });

  describe("BUG: edge cases", () => {
    test("BUG: 'Draft Handoff to undefined' when delegateTo is missing", () => {
      render(
        <MessageCard
          message={makeMessage()}
          triage={makeTriagedMessage({
            category: "delegate",
            draftResponse: "Please handle this.",
            delegateTo: undefined,
          })}
        />
      );
      const header = screen.getByText("Alice Johnson").closest("div[class*='cursor-pointer']")!;
      fireEvent.click(header);
      // BUG: Line 160 of MessageCard.tsx uses template literal:
      // `Draft Handoff to ${triage.delegateTo}` — when delegateTo is undefined,
      // this renders "Draft Handoff to undefined" instead of just "Draft Handoff"
      expect(
        screen.getByText(/Draft Handoff to undefined/)
      ).toBeInTheDocument();
    });

    test("BUG: invalid timestamp renders 'Invalid Date'", () => {
      render(
        <MessageCard
          message={makeMessage({ timestamp: "not-a-valid-date" })}
          triage={makeTriagedMessage()}
        />
      );
      // BUG: new Date("not-a-valid-date").toLocaleTimeString() returns "Invalid Date"
      expect(screen.getByText("Invalid Date")).toBeInTheDocument();
    });

    test("renders very long message body without crashing", () => {
      const longBody = "A".repeat(10000);
      render(
        <MessageCard
          message={makeMessage({ body: longBody })}
          triage={makeTriagedMessage()}
        />
      );
      const header = screen.getByText("Alice Johnson").closest("div[class*='cursor-pointer']")!;
      fireEvent.click(header);
      expect(screen.getByText(longBody)).toBeInTheDocument();
    });

    test("renders message with XSS payload safely (React escapes)", () => {
      render(
        <MessageCard
          message={makeMessage({
            from: '<script>alert("xss")</script>',
            body: '<img src=x onerror="alert(1)">',
          })}
          triage={makeTriagedMessage()}
        />
      );
      // React auto-escapes JSX — the script tag renders as text, not HTML
      expect(
        screen.getByText('<script>alert("xss")</script>')
      ).toBeInTheDocument();
    });

    test("renders message with empty body", () => {
      render(
        <MessageCard
          message={makeMessage({ body: "" })}
          triage={makeTriagedMessage()}
        />
      );
      const header = screen.getByText("Alice Johnson").closest("div[class*='cursor-pointer']")!;
      fireEvent.click(header);
      expect(screen.getByText("Original Message")).toBeInTheDocument();
    });

    test("renders all urgency levels", () => {
      const urgencies = ["low", "medium", "high", "critical"] as const;
      for (const urgency of urgencies) {
        const { unmount } = render(
          <MessageCard
            message={makeMessage()}
            triage={makeTriagedMessage({ urgency })}
          />
        );
        const expectedLabels = {
          low: "Low",
          medium: "Medium",
          high: "High",
          critical: "Critical",
        };
        expect(screen.getByText(expectedLabels[urgency])).toBeInTheDocument();
        unmount();
      }
    });
  });
});
