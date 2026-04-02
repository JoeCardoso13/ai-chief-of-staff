import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatsBar } from "../../src/components/StatsBar.tsx";
import {
  makeTriageResponse,
  makeTriagedMessage,
} from "../helpers/fixtures.ts";

describe("StatsBar", () => {
  test("renders all four stat labels", () => {
    render(<StatsBar result={makeTriageResponse()} />);
    expect(screen.getByText("Needs Your Decision")).toBeInTheDocument();
    expect(screen.getByText("Delegated")).toBeInTheDocument();
    expect(screen.getByText("Filtered Out")).toBeInTheDocument();
    expect(screen.getByText("Critical")).toBeInTheDocument();
  });

  test("counts categories correctly with mixed messages", () => {
    const result = makeTriageResponse({
      triagedMessages: [
        makeTriagedMessage({ messageId: 1, category: "decide", urgency: "high" }),
        makeTriagedMessage({ messageId: 2, category: "decide", urgency: "critical" }),
        makeTriagedMessage({ messageId: 3, category: "delegate", urgency: "medium" }),
        makeTriagedMessage({ messageId: 4, category: "delegate", urgency: "low" }),
        makeTriagedMessage({ messageId: 5, category: "delegate", urgency: "low" }),
        makeTriagedMessage({ messageId: 6, category: "ignore", urgency: "low" }),
      ],
    });
    render(<StatsBar result={result} />);

    // decide=2, delegate=3, ignore=1, critical=1
    const values = screen.getAllByText(/^[0-6]$/);
    const nums = values.map((el) => parseInt(el.textContent!, 10));
    expect(nums).toContain(2); // decide
    expect(nums).toContain(3); // delegate
    expect(nums).toContain(1); // ignore and critical
  });

  test("zero messages shows all counts as 0", () => {
    render(
      <StatsBar result={makeTriageResponse({ triagedMessages: [] })} />
    );
    const zeros = screen.getAllByText("0");
    expect(zeros).toHaveLength(4);
  });

  test("all messages in same category", () => {
    const result = makeTriageResponse({
      triagedMessages: [
        makeTriagedMessage({ messageId: 1, category: "decide" }),
        makeTriagedMessage({ messageId: 2, category: "decide" }),
        makeTriagedMessage({ messageId: 3, category: "decide" }),
      ],
    });
    render(<StatsBar result={result} />);
    expect(screen.getByText("3")).toBeInTheDocument();
    // delegate and ignore should be 0
    const zeros = screen.getAllByText("0");
    expect(zeros.length).toBeGreaterThanOrEqual(2);
  });

  test("critical > 0 applies red styling", () => {
    const result = makeTriageResponse({
      triagedMessages: [
        makeTriagedMessage({ messageId: 1, urgency: "critical" }),
      ],
    });
    const { container } = render(<StatsBar result={result} />);
    // The critical card should have red background
    const cards = container.querySelectorAll("[class*='card']");
    const criticalCard = Array.from(cards).find((c) =>
      c.textContent?.includes("Critical")
    );
    expect(criticalCard?.className).toContain("bg-red-50");
  });

  test("critical = 0 applies gray styling", () => {
    const result = makeTriageResponse({
      triagedMessages: [
        makeTriagedMessage({ messageId: 1, urgency: "low" }),
      ],
    });
    const { container } = render(<StatsBar result={result} />);
    const cards = container.querySelectorAll("[class*='card']");
    const criticalCard = Array.from(cards).find((c) =>
      c.textContent?.includes("Critical")
    );
    expect(criticalCard?.className).toContain("bg-gray-50");
  });

  test("handles large number of messages", () => {
    const messages = Array.from({ length: 100 }, (_, i) =>
      makeTriagedMessage({
        messageId: i + 1,
        category: i % 3 === 0 ? "decide" : i % 3 === 1 ? "delegate" : "ignore",
        urgency: i % 10 === 0 ? "critical" : "low",
      })
    );
    render(<StatsBar result={makeTriageResponse({ triagedMessages: messages })} />);
    // Should render without crashing
    expect(screen.getByText("Needs Your Decision")).toBeInTheDocument();
  });
});
