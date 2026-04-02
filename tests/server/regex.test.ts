import { describe, test, expect } from "vitest";

/**
 * Tests for the JSON extraction regex used in server/app.ts
 * to parse Claude's response text.
 *
 * The regex chain is:
 *   text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/)
 */
function extractJson(text: string): string | null {
  const match =
    text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
  return match ? match[1] : null;
}

describe("JSON extraction regex", () => {
  describe("markdown code block extraction", () => {
    test("extracts JSON from markdown code block", () => {
      const input = '```json\n{"triagedMessages":[]}\n```';
      const result = extractJson(input)!.trim();
      expect(result).toBe('{"triagedMessages":[]}');
    });

    test("extracts JSON from code block with leading whitespace", () => {
      const input = '```json   \n{"a":1}\n```';
      const result = extractJson(input)!.trim();
      expect(result).toBe('{"a":1}');
    });

    test("handles multiline JSON in code block", () => {
      const input = '```json\n{\n  "a": 1,\n  "b": 2\n}\n```';
      const result = extractJson(input);
      expect(JSON.parse(result!)).toEqual({ a: 1, b: 2 });
    });

    test("prefers code block over raw JSON when both present", () => {
      const input =
        'Some text {"ignored":true} then ```json\n{"correct":true}\n```';
      expect(JSON.parse(extractJson(input)!)).toEqual({ correct: true });
    });
  });

  describe("raw JSON fallback extraction", () => {
    test("extracts plain JSON object", () => {
      const input = '{"a":1}';
      expect(extractJson(input)).toBe('{"a":1}');
    });

    test("extracts JSON preceded by text", () => {
      const input = 'Here is the result: {"a":1}';
      expect(extractJson(input)).toBe('{"a":1}');
    });

    test("extracts JSON followed by text (no trailing braces)", () => {
      // When there's no closing brace in trailing text, regex stops at the
      // last } which is in the JSON — correctly extracting just the JSON
      const input = '{"a":1} Hope this helps!';
      expect(extractJson(input)).toBe('{"a":1}');
    });
  });

  describe("BUG: greedy regex edge cases", () => {
    test("BUG: multiple JSON objects — greedy regex matches entire span", () => {
      const input = '{"a":1} some text {"b":2}';
      const result = extractJson(input);
      // The greedy regex /(\{[\s\S]*\})/ matches from first { to last }
      // capturing everything in between, including "some text"
      expect(result).toBe('{"a":1} some text {"b":2}');
      // This is NOT valid JSON — JSON.parse would fail
      expect(() => JSON.parse(result!)).toThrow();
    });

    test("BUG: braces in prose cause incorrect match", () => {
      const input = 'The set {1,2,3} is valid. {"actual":"json"}';
      const result = extractJson(input);
      // Greedy regex matches from {1,2,3} all the way to {"actual":"json"}
      expect(result).toBe('{1,2,3} is valid. {"actual":"json"}');
      expect(() => JSON.parse(result!)).toThrow();
    });

    test("BUG: Claude explanatory text with curly braces breaks extraction", () => {
      const input =
        'I used the format {key: value} as requested. Here is the analysis: {"triagedMessages":[]}';
      const result = extractJson(input);
      // Greedy match spans from {key: value} to the end
      expect(result).toContain("{key: value}");
      expect(() => JSON.parse(result!)).toThrow();
    });
  });

  describe("edge cases", () => {
    test("no JSON at all returns null", () => {
      expect(extractJson("I cannot process this request")).toBeNull();
    });

    test("empty code block returns empty string", () => {
      const input = "```json\n\n```";
      const result = extractJson(input);
      expect(result).toBe("");
    });

    test("nested objects extracted correctly", () => {
      const input = '{"a":{"b":{"c":1}}}';
      expect(JSON.parse(extractJson(input)!)).toEqual({ a: { b: { c: 1 } } });
    });

    test("JSON with arrays extracted correctly", () => {
      const input = '{"items":[1,2,3],"nested":[{"a":1}]}';
      expect(JSON.parse(extractJson(input)!)).toEqual({
        items: [1, 2, 3],
        nested: [{ a: 1 }],
      });
    });

    test("only array (no outer braces) returns null for raw fallback", () => {
      // The regex only matches objects {}, not arrays []
      const input = "[1,2,3]";
      expect(extractJson(input)).toBeNull();
    });
  });
});
