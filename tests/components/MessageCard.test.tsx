import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MessageCard } from "../../src/components/MessageCard.tsx";
import { makeMessage, makeTriagedMessage } from "../helpers/fixtures.ts";

describe("MessageCard", () => {
  describe("DOM anchoring", () => {
    test("has an id attribute matching the message id for scroll targeting", () => {
      const { container } = render(
        <MessageCard
          message={makeMessage({ id: 7 })}
          triage={makeTriagedMessage({ messageId: 7 })}
        />
      );
      expect(container.querySelector("#message-7")).not.toBeNull();
    });

    test("different message ids produce different anchors", () => {
      const { container: c1 } = render(
        <MessageCard
          message={makeMessage({ id: 99 })}
          triage={makeTriagedMessage({ messageId: 99 })}
        />
      );
      expect(c1.querySelector("#message-99")).not.toBeNull();
      expect(c1.querySelector("#message-7")).toBeNull();
    });
  });

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

  describe("reclassify", () => {
    test("shows a Reclassify button when the card is expanded", () => {
      render(
        <MessageCard
          message={makeMessage()}
          triage={makeTriagedMessage()}
          defaultExpanded
          onReclassify={() => {}}
        />
      );
      expect(
        screen.getByRole("button", { name: /Reclassify/i })
      ).toBeInTheDocument();
    });

    test("Reclassify button is hidden when the card is collapsed", () => {
      render(
        <MessageCard
          message={makeMessage()}
          triage={makeTriagedMessage()}
          onReclassify={() => {}}
        />
      );
      expect(
        screen.queryByRole("button", { name: /Reclassify/i })
      ).not.toBeInTheDocument();
    });

    test("Reclassify button is not rendered when onReclassify is not provided", () => {
      render(
        <MessageCard
          message={makeMessage()}
          triage={makeTriagedMessage()}
          defaultExpanded
        />
      );
      expect(
        screen.queryByRole("button", { name: /Reclassify/i })
      ).not.toBeInTheDocument();
    });

    test("clicking Reclassify shows a form with category options", () => {
      render(
        <MessageCard
          message={makeMessage()}
          triage={makeTriagedMessage({ category: "decide" })}
          defaultExpanded
          onReclassify={() => {}}
        />
      );
      fireEvent.click(screen.getByRole("button", { name: /Reclassify/i }));

      // Should show a category select/dropdown
      const select = screen.getByRole("combobox", { name: /category/i });
      expect(select).toBeInTheDocument();

      // Should show delegate and ignore options, but NOT the current category (decide)
      const options = Array.from(select.querySelectorAll("option")).map(
        (o: HTMLOptionElement) => o.value
      );
      expect(options).toContain("delegate");
      expect(options).toContain("ignore");
      expect(options).not.toContain("decide");
    });

    test("reclassify form for a 'delegate' message excludes 'delegate' from options", () => {
      render(
        <MessageCard
          message={makeMessage()}
          triage={makeTriagedMessage({ category: "delegate" })}
          defaultExpanded
          onReclassify={() => {}}
        />
      );
      fireEvent.click(screen.getByRole("button", { name: /Reclassify/i }));

      const select = screen.getByRole("combobox", { name: /category/i });
      const options = Array.from(select.querySelectorAll("option")).map(
        (o: HTMLOptionElement) => o.value
      );
      expect(options).toContain("decide");
      expect(options).toContain("ignore");
      expect(options).not.toContain("delegate");
    });

    test("reclassify form shows a delegate-to input field", () => {
      render(
        <MessageCard
          message={makeMessage()}
          triage={makeTriagedMessage({ category: "decide" })}
          defaultExpanded
          onReclassify={() => {}}
        />
      );
      fireEvent.click(screen.getByRole("button", { name: /Reclassify/i }));

      expect(
        screen.getByPlaceholderText(/delegate to/i)
      ).toBeInTheDocument();
    });

    test("reclassify form shows a reason input field", () => {
      render(
        <MessageCard
          message={makeMessage()}
          triage={makeTriagedMessage({ category: "decide" })}
          defaultExpanded
          onReclassify={() => {}}
        />
      );
      fireEvent.click(screen.getByRole("button", { name: /Reclassify/i }));

      expect(
        screen.getByPlaceholderText(/reason/i)
      ).toBeInTheDocument();
    });

    test("reclassify form has an Apply button", () => {
      render(
        <MessageCard
          message={makeMessage()}
          triage={makeTriagedMessage({ category: "decide" })}
          defaultExpanded
          onReclassify={() => {}}
        />
      );
      fireEvent.click(screen.getByRole("button", { name: /Reclassify/i }));

      expect(
        screen.getByRole("button", { name: /Apply/i })
      ).toBeInTheDocument();
    });

    test("clicking Apply calls onReclassify with messageId, new category, delegateTo, and reason", () => {
      const handleReclassify = vi.fn();
      render(
        <MessageCard
          message={makeMessage({ id: 42 })}
          triage={makeTriagedMessage({ messageId: 42, category: "decide" })}
          defaultExpanded
          onReclassify={handleReclassify}
        />
      );
      fireEvent.click(screen.getByRole("button", { name: /Reclassify/i }));

      // Select "delegate" category
      fireEvent.change(screen.getByRole("combobox", { name: /category/i }), {
        target: { value: "delegate" },
      });
      // Fill in delegate-to
      fireEvent.change(screen.getByPlaceholderText(/delegate to/i), {
        target: { value: "VP Engineering" },
      });
      // Fill in reason
      fireEvent.change(screen.getByPlaceholderText(/reason/i), {
        target: { value: "VP can handle this" },
      });

      fireEvent.click(screen.getByRole("button", { name: /Apply/i }));

      expect(handleReclassify).toHaveBeenCalledWith(
        42,
        "delegate",
        "VP Engineering",
        "VP can handle this"
      );
    });

    test("clicking Apply with only category (no delegateTo/reason) still calls onReclassify", () => {
      const handleReclassify = vi.fn();
      render(
        <MessageCard
          message={makeMessage({ id: 5 })}
          triage={makeTriagedMessage({ messageId: 5, category: "delegate" })}
          defaultExpanded
          onReclassify={handleReclassify}
        />
      );
      fireEvent.click(screen.getByRole("button", { name: /Reclassify/i }));

      // Just click Apply without filling optional fields
      fireEvent.click(screen.getByRole("button", { name: /Apply/i }));

      expect(handleReclassify).toHaveBeenCalledWith(
        5,
        expect.any(String),     // one of the other categories
        undefined,              // delegateTo omitted
        undefined               // reason omitted
      );
    });

    test("clicking Reclassify again toggles the form off", () => {
      render(
        <MessageCard
          message={makeMessage()}
          triage={makeTriagedMessage({ category: "decide" })}
          defaultExpanded
          onReclassify={() => {}}
        />
      );
      const reclassifyBtn = screen.getByRole("button", { name: /Reclassify/i });
      fireEvent.click(reclassifyBtn);
      expect(screen.getByRole("combobox", { name: /category/i })).toBeInTheDocument();

      fireEvent.click(reclassifyBtn);
      expect(screen.queryByRole("combobox", { name: /category/i })).not.toBeInTheDocument();
    });
  });

  describe("refine draft", () => {
    test("shows a Refine Draft button when expanded and draftResponse exists", () => {
      render(
        <MessageCard
          message={makeMessage()}
          triage={makeTriagedMessage({ draftResponse: "I'll review it." })}
          defaultExpanded
          onRefineDraft={() => {}}
        />
      );
      expect(
        screen.getByRole("button", { name: /Refine Draft/i })
      ).toBeInTheDocument();
    });

    test("Refine Draft button is hidden when draftResponse is absent", () => {
      render(
        <MessageCard
          message={makeMessage()}
          triage={makeTriagedMessage({ draftResponse: undefined })}
          defaultExpanded
          onRefineDraft={() => {}}
        />
      );
      expect(
        screen.queryByRole("button", { name: /Refine Draft/i })
      ).not.toBeInTheDocument();
    });

    test("Refine Draft button is not rendered when onRefineDraft is not provided", () => {
      render(
        <MessageCard
          message={makeMessage()}
          triage={makeTriagedMessage({ draftResponse: "I'll review it." })}
          defaultExpanded
        />
      );
      expect(
        screen.queryByRole("button", { name: /Refine Draft/i })
      ).not.toBeInTheDocument();
    });

    test("Refine Draft button is hidden when card is collapsed", () => {
      render(
        <MessageCard
          message={makeMessage()}
          triage={makeTriagedMessage({ draftResponse: "I'll review it." })}
          onRefineDraft={() => {}}
        />
      );
      expect(
        screen.queryByRole("button", { name: /Refine Draft/i })
      ).not.toBeInTheDocument();
    });

    test("clicking Refine Draft shows an instruction input and Refine button", () => {
      render(
        <MessageCard
          message={makeMessage()}
          triage={makeTriagedMessage({ draftResponse: "I'll review it." })}
          defaultExpanded
          onRefineDraft={() => {}}
        />
      );
      fireEvent.click(screen.getByRole("button", { name: /Refine Draft/i }));

      expect(
        screen.getByPlaceholderText(/e\.g\.|make it|more formal|instruction/i)
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /^Refine$/i })
      ).toBeInTheDocument();
    });

    test("clicking Refine calls onRefineDraft with messageId and instruction", () => {
      const handleRefine = vi.fn();
      render(
        <MessageCard
          message={makeMessage({ id: 10 })}
          triage={makeTriagedMessage({
            messageId: 10,
            draftResponse: "I'll review it.",
          })}
          defaultExpanded
          onRefineDraft={handleRefine}
        />
      );
      fireEvent.click(screen.getByRole("button", { name: /Refine Draft/i }));

      const input = screen.getByPlaceholderText(
        /e\.g\.|make it|more formal|instruction/i
      );
      fireEvent.change(input, {
        target: { value: "make it more formal" },
      });

      fireEvent.click(screen.getByRole("button", { name: /^Refine$/i }));

      expect(handleRefine).toHaveBeenCalledWith(10, "make it more formal");
    });

    test("Refine button does nothing when instruction is empty", () => {
      const handleRefine = vi.fn();
      render(
        <MessageCard
          message={makeMessage({ id: 10 })}
          triage={makeTriagedMessage({
            messageId: 10,
            draftResponse: "I'll review it.",
          })}
          defaultExpanded
          onRefineDraft={handleRefine}
        />
      );
      fireEvent.click(screen.getByRole("button", { name: /Refine Draft/i }));

      // Click Refine without typing anything
      fireEvent.click(screen.getByRole("button", { name: /^Refine$/i }));

      expect(handleRefine).not.toHaveBeenCalled();
    });

    test("clicking Refine Draft again toggles the form off", () => {
      render(
        <MessageCard
          message={makeMessage()}
          triage={makeTriagedMessage({ draftResponse: "I'll review it." })}
          defaultExpanded
          onRefineDraft={() => {}}
        />
      );
      const refineBtn = screen.getByRole("button", { name: /Refine Draft/i });
      fireEvent.click(refineBtn);
      expect(
        screen.getByPlaceholderText(/e\.g\.|make it|more formal|instruction/i)
      ).toBeInTheDocument();

      fireEvent.click(refineBtn);
      expect(
        screen.queryByPlaceholderText(/e\.g\.|make it|more formal|instruction/i)
      ).not.toBeInTheDocument();
    });

    test("opening reclassify form closes refine form and vice versa", () => {
      render(
        <MessageCard
          message={makeMessage()}
          triage={makeTriagedMessage({
            category: "decide",
            draftResponse: "I'll review it.",
          })}
          defaultExpanded
          onReclassify={() => {}}
          onRefineDraft={() => {}}
        />
      );

      // Open refine form
      fireEvent.click(screen.getByRole("button", { name: /Refine Draft/i }));
      expect(
        screen.getByPlaceholderText(/e\.g\.|make it|more formal|instruction/i)
      ).toBeInTheDocument();

      // Open reclassify form — refine form should close
      fireEvent.click(screen.getByRole("button", { name: /Reclassify/i }));
      expect(
        screen.getByRole("combobox", { name: /category/i })
      ).toBeInTheDocument();
      expect(
        screen.queryByPlaceholderText(/e\.g\.|make it|more formal|instruction/i)
      ).not.toBeInTheDocument();

      // Open refine form again — reclassify form should close
      fireEvent.click(screen.getByRole("button", { name: /Refine Draft/i }));
      expect(
        screen.queryByRole("combobox", { name: /category/i })
      ).not.toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/e\.g\.|make it|more formal|instruction/i)
      ).toBeInTheDocument();
    });
  });

  describe("regression: edge cases", () => {
    test("delegate handoff label does not render 'undefined' when delegateTo is missing", () => {
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
      expect(screen.getByText(/Draft Handoff/)).toBeInTheDocument();
      expect(
        screen.queryByText(/Draft Handoff to undefined/)
      ).not.toBeInTheDocument();
    });

    test("invalid timestamp does not render 'Invalid Date' to the user", () => {
      render(
        <MessageCard
          message={makeMessage({ timestamp: "not-a-valid-date" })}
          triage={makeTriagedMessage()}
        />
      );
      expect(screen.queryByText("Invalid Date")).not.toBeInTheDocument();
      expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
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
