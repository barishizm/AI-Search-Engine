import type { CitationSupport } from "@/types";

export const CITATION_HREF_PREFIX = "#src-";

/**
 * Inserts citation markers into the finished answer as markdown links
 * (`[1](#src-1)`), placed after each supported segment. Inserting from the
 * highest offset down keeps earlier offsets valid.
 */
export function injectCitations(
  answer: string,
  supports: CitationSupport[],
): string {
  if (supports.length === 0) return answer;
  const sorted = [...supports].sort((a, b) => b.end - a.end);
  let out = answer;
  for (const support of sorted) {
    const ids = [...new Set(support.sourceIds)];
    if (ids.length === 0) continue;
    const marker = ids
      .map((id) => `[${id}](${CITATION_HREF_PREFIX}${id})`)
      .join("");
    const pos = Math.min(Math.max(support.end, 0), out.length);
    out = out.slice(0, pos) + marker + out.slice(pos);
  }
  return out;
}
