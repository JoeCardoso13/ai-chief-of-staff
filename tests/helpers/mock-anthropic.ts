import { vi } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";

export function createMockAnthropic(responseText: string) {
  return {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: "text" as const, text: responseText }],
      }),
    },
  } as unknown as Anthropic;
}

export function createFailingAnthropic(error: Error) {
  return {
    messages: {
      create: vi.fn().mockRejectedValue(error),
    },
  } as unknown as Anthropic;
}
