import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FlagsPanel } from "../../src/components/FlagsPanel.tsx";
import { makeMessage, makeFlag } from "../helpers/fixtures.ts";

describe("FlagsPanel", () => {
  describe("empty state", () => {
    test("shows 'No flags raised' when flags array is empty", () => {
      render(<FlagsPanel flags={[]} messages={[]} />);
      expect(screen.getByText(/No flags raised/)).toBeInTheDocument();
    });

    test("shows 'All clear' in empty state", () => {
      render(<FlagsPanel flags={[]} messages={[]} />);
      expect(screen.getByText(/All clear/)).toBeInTheDocument();
    });
  });

  describe("flag rendering", () => {
    test("renders flag title", () => {
      render(
        <FlagsPanel
          flags={[makeFlag({ title: "Schedule conflict detected" })]}
          messages={[makeMessage()]}
        />
      );
      expect(
        screen.getByText("Schedule conflict detected")
      ).toBeInTheDocument();
    });

    test("renders flag description", () => {
      render(
        <FlagsPanel
          flags={[
            makeFlag({
              description: "Two meetings overlap at 2pm",
            }),
          ]}
          messages={[makeMessage()]}
        />
      );
      expect(
        screen.getByText("Two meetings overlap at 2pm")
      ).toBeInTheDocument();
    });

    test("renders severity label for critical", () => {
      render(
        <FlagsPanel
          flags={[makeFlag({ severity: "critical" })]}
          messages={[makeMessage()]}
        />
      );
      expect(screen.getByText("Critical")).toBeInTheDocument();
    });

    test("renders severity label for warning", () => {
      render(
        <FlagsPanel
          flags={[makeFlag({ severity: "warning" })]}
          messages={[makeMessage()]}
        />
      );
      expect(screen.getByText("Warning")).toBeInTheDocument();
    });

    test("renders severity label for info", () => {
      render(
        <FlagsPanel
          flags={[makeFlag({ severity: "info" })]}
          messages={[makeMessage()]}
        />
      );
      expect(screen.getByText("Info")).toBeInTheDocument();
    });

    test("renders multiple flags", () => {
      render(
        <FlagsPanel
          flags={[
            makeFlag({ title: "Flag 1", severity: "critical" }),
            makeFlag({ title: "Flag 2", severity: "info" }),
            makeFlag({ title: "Flag 3", severity: "warning" }),
          ]}
          messages={[makeMessage()]}
        />
      );
      expect(screen.getByText("Flag 1")).toBeInTheDocument();
      expect(screen.getByText("Flag 2")).toBeInTheDocument();
      expect(screen.getByText("Flag 3")).toBeInTheDocument();
    });
  });

  describe("related messages", () => {
    test("shows related message sender name", () => {
      render(
        <FlagsPanel
          flags={[makeFlag({ relatedMessageIds: [1] })]}
          messages={[makeMessage({ id: 1, from: "Bob Smith" })]}
        />
      );
      expect(screen.getByText("Bob Smith")).toBeInTheDocument();
    });

    test("shows related message subject when present", () => {
      render(
        <FlagsPanel
          flags={[makeFlag({ relatedMessageIds: [1] })]}
          messages={[
            makeMessage({ id: 1, subject: "Important subject" }),
          ]}
        />
      );
      expect(screen.getByText(/Important subject/)).toBeInTheDocument();
    });

    test("shows 'Related Messages' label when related messages exist", () => {
      render(
        <FlagsPanel
          flags={[makeFlag({ relatedMessageIds: [1] })]}
          messages={[makeMessage({ id: 1 })]}
        />
      );
      expect(screen.getByText("Related Messages")).toBeInTheDocument();
    });

    test("silently filters out non-existent message IDs", () => {
      render(
        <FlagsPanel
          flags={[makeFlag({ relatedMessageIds: [999] })]}
          messages={[makeMessage({ id: 1 })]}
        />
      );
      // No "Related Messages" section shown because no messages matched
      expect(screen.queryByText("Related Messages")).not.toBeInTheDocument();
    });

    test("shows only existing messages when some IDs are invalid", () => {
      render(
        <FlagsPanel
          flags={[makeFlag({ relatedMessageIds: [1, 999] })]}
          messages={[makeMessage({ id: 1, from: "Alice" })]}
        />
      );
      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("Related Messages")).toBeInTheDocument();
    });

    test("hides related messages section when relatedMessageIds is empty", () => {
      render(
        <FlagsPanel
          flags={[makeFlag({ relatedMessageIds: [] })]}
          messages={[makeMessage()]}
        />
      );
      expect(screen.queryByText("Related Messages")).not.toBeInTheDocument();
    });

    test("shows multiple related messages", () => {
      render(
        <FlagsPanel
          flags={[makeFlag({ relatedMessageIds: [1, 2] })]}
          messages={[
            makeMessage({ id: 1, from: "Alice" }),
            makeMessage({ id: 2, from: "Bob" }),
          ]}
        />
      );
      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("Bob")).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    test("renders flag with very long title", () => {
      const longTitle = "Security Alert: ".repeat(50);
      const { container } = render(
        <FlagsPanel
          flags={[makeFlag({ title: longTitle })]}
          messages={[]}
        />
      );
      expect(container.textContent).toContain("Security Alert: Security Alert:");
    });

    test("renders flag with very long description", () => {
      const longDesc = "Details ".repeat(500);
      const { container } = render(
        <FlagsPanel
          flags={[makeFlag({ description: longDesc })]}
          messages={[]}
        />
      );
      expect(container.textContent).toContain("Details Details Details");
    });

    test("renders flag with XSS in title safely", () => {
      render(
        <FlagsPanel
          flags={[makeFlag({ title: '<img src=x onerror="alert(1)">' })]}
          messages={[]}
        />
      );
      // React escapes HTML — renders as text
      expect(
        screen.getByText('<img src=x onerror="alert(1)">')
      ).toBeInTheDocument();
    });
  });
});
