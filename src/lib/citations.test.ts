import { describe, expect, it } from "vitest";
import type { CitationSupport } from "@/types";
import { CITATION_HREF_PREFIX, injectCitations } from "./citations";

function support(end: number, sourceIds: number[], start = 0): CitationSupport {
  return { start, end, sourceIds };
}

describe("injectCitations", () => {
  it("returns the answer unchanged when there are no supports", () => {
    expect(injectCitations("hello world", [])).toBe("hello world");
  });

  it("inserts a single marker link at the support's end offset", () => {
    const answer = "The sky is blue.";
    const end = answer.indexOf("blue.") + "blue".length;
    const out = injectCitations(answer, [support(end, [1])]);
    expect(out).toBe(
      `The sky is blue${`[1](${CITATION_HREF_PREFIX}1)`}.`,
    );
  });

  it("inserts multiple markers without corrupting earlier offsets", () => {
    const answer = "AAA BBB CCC";
    const supports = [support(3, [1]), support(7, [2]), support(11, [3])];
    const out = injectCitations(answer, supports);
    expect(out).toBe(
      `AAA${`[1](${CITATION_HREF_PREFIX}1)`} BBB${`[2](${CITATION_HREF_PREFIX}2)`} CCC${`[3](${CITATION_HREF_PREFIX}3)`}`,
    );
  });

  it("dedupes repeated source ids within one support", () => {
    const answer = "hello";
    const out = injectCitations(answer, [support(5, [2, 2, 1, 1])]);
    expect(out).toBe(
      `hello${`[2](${CITATION_HREF_PREFIX}2)[1](${CITATION_HREF_PREFIX}1)`}`,
    );
  });

  it("skips a support whose sourceIds are empty", () => {
    const answer = "hello";
    expect(injectCitations(answer, [support(5, [])])).toBe("hello");
  });

  it("clamps an out-of-range end offset into the string bounds", () => {
    const answer = "hi";
    const outHigh = injectCitations(answer, [support(999, [1])]);
    expect(outHigh).toBe(`hi${`[1](${CITATION_HREF_PREFIX}1)`}`);

    const outLow = injectCitations(answer, [support(-5, [1])]);
    expect(outLow).toBe(`${`[1](${CITATION_HREF_PREFIX}1)`}hi`);
  });
});
