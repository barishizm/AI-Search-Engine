import type { GroundingMetadata } from "@google/genai";
import type { CitationSupport, Source, SourcesPayload } from "@/types";

function safeHostname(uri?: string): string {
  if (!uri) return "";
  try {
    return new URL(uri).hostname;
  } catch {
    return "";
  }
}

export function mapSources(gm: GroundingMetadata): SourcesPayload {
  // Keep every chunk (even rare non-web ones) so ids stay aligned with
  // groundingChunkIndices.
  const sources: Source[] = (gm.groundingChunks ?? []).map((chunk, i) => ({
    id: i + 1,
    title: chunk.web?.title ?? "",
    url: chunk.web?.uri ?? "",
    domain:
      chunk.web?.domain || chunk.web?.title || safeHostname(chunk.web?.uri),
  }));

  return {
    sources,
    searchQueries: gm.webSearchQueries ?? [],
    searchSuggestionHtml: gm.searchEntryPoint?.renderedContent ?? null,
  };
}

/**
 * Segment offsets are UTF-8 byte positions; JS strings index UTF-16 code
 * units. Build a byte→char map so citations land correctly on non-ASCII
 * answers (Turkish text drifts badly otherwise).
 */
function buildByteToCharMap(text: string): Uint32Array {
  const encoder = new TextEncoder();
  const totalBytes = encoder.encode(text).length;
  const map = new Uint32Array(totalBytes + 1);
  let byteIndex = 0;
  let charIndex = 0;
  for (const ch of text) {
    const byteLen = encoder.encode(ch).length;
    for (let k = 0; k < byteLen; k++) {
      map[byteIndex + k] = charIndex;
    }
    byteIndex += byteLen;
    charIndex += ch.length;
  }
  map[byteIndex] = charIndex;
  return map;
}

export function mapSupports(
  gm: GroundingMetadata,
  finalAnswer: string,
): CitationSupport[] {
  const groundingSupports = gm.groundingSupports ?? [];
  if (!finalAnswer || groundingSupports.length === 0) return [];

  const byteToChar = buildByteToCharMap(finalAnswer);
  const supports: CitationSupport[] = [];

  for (const support of groundingSupports) {
    const segment = support.segment;
    if (segment?.startIndex == null || segment?.endIndex == null) continue;

    let start: number | undefined =
      segment.startIndex >= 0 && segment.startIndex < byteToChar.length
        ? byteToChar[segment.startIndex]
        : undefined;
    let end: number | undefined =
      segment.endIndex >= 0 && segment.endIndex < byteToChar.length
        ? byteToChar[segment.endIndex]
        : undefined;

    // Fallback: locate the segment text directly.
    if ((start == null || end == null) && segment.text) {
      const idx = finalAnswer.indexOf(segment.text);
      if (idx >= 0) {
        start = idx;
        end = idx + segment.text.length;
      }
    }
    if (start == null || end == null || end <= start) continue;

    const sourceIds = (support.groundingChunkIndices ?? []).map((i) => i + 1);
    if (sourceIds.length === 0) continue;

    supports.push({ start, end, sourceIds });
  }

  return supports;
}
