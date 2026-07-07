import { describe, expect, it } from "vitest";
import type { GroundingMetadata } from "@google/genai";
import { mapSources, mapSupports } from "./grounding";

function byteLen(s: string): number {
  return new TextEncoder().encode(s).length;
}

function gm(groundingSupports: GroundingMetadata["groundingSupports"]): GroundingMetadata {
  return { groundingSupports } as GroundingMetadata;
}

describe("mapSources", () => {
  it("assigns 1-based ids aligned to groundingChunkIndices", () => {
    const result = mapSources({
      groundingChunks: [
        { web: { uri: "https://a.com", title: "A" } },
        { web: { uri: "https://b.com", title: "B" } },
      ],
    } as GroundingMetadata);
    expect(result.sources.map((s) => s.id)).toEqual([1, 2]);
  });

  it("falls back from domain to title to hostname", () => {
    const result = mapSources({
      groundingChunks: [
        { web: { uri: "https://example.com/x", domain: "example.com" } },
        { web: { uri: "https://example.com/y", title: "Fallback Title" } },
        { web: { uri: "https://example.com/z" } },
      ],
    } as GroundingMetadata);
    expect(result.sources[0].domain).toBe("example.com");
    expect(result.sources[1].domain).toBe("Fallback Title");
    expect(result.sources[2].domain).toBe("example.com");
  });

  it("never throws on a malformed uri", () => {
    const result = mapSources({
      groundingChunks: [{ web: { uri: "not a url" } }],
    } as GroundingMetadata);
    expect(result.sources[0].domain).toBe("");
  });

  it("keeps every chunk including non-web ones so indices stay aligned", () => {
    const result = mapSources({
      groundingChunks: [{}, { web: { uri: "https://a.com" } }],
    } as GroundingMetadata);
    expect(result.sources).toHaveLength(2);
    expect(result.sources[1].id).toBe(2);
  });
});

describe("mapSupports", () => {
  it("returns [] when there is no answer or no supports", () => {
    expect(mapSupports(gm([]), "hello")).toEqual([]);
    expect(mapSupports(gm([{ segment: { startIndex: 0, endIndex: 1 }, groundingChunkIndices: [0] }]), "")).toEqual(
      [],
    );
  });

  it("maps plain-ASCII byte offsets 1:1 to char offsets", () => {
    const answer = "The sky is blue.";
    const start = answer.indexOf("blue");
    const end = start + "blue".length;
    const supports = mapSupports(
      gm([{ segment: { startIndex: start, endIndex: end }, groundingChunkIndices: [0] }]),
      answer,
    );
    expect(supports).toEqual([{ start, end, sourceIds: [1] }]);
  });

  it("maps multi-byte Turkish prefixes correctly (byte offset != char offset)", () => {
    // Each of ı/ş/ğ/ü/ö/ç is 2 UTF-8 bytes but 1 UTF-16 code unit, so a
    // prefix full of them makes the byte offset drift ahead of the char
    // offset — exactly the drift this mapping exists to correct.
    const prefix = "Türkiye'nin başşehri şöyle: ";
    const target = "Ankara";
    const answer = prefix + target + ".";

    const charStart = prefix.length;
    const charEnd = charStart + target.length;
    const byteStart = byteLen(prefix);
    const byteEnd = byteStart + byteLen(target);

    // Sanity: this fixture actually exercises byte/char drift.
    expect(byteStart).toBeGreaterThan(charStart);

    const supports = mapSupports(
      gm([
        {
          segment: { startIndex: byteStart, endIndex: byteEnd },
          groundingChunkIndices: [2],
        },
      ]),
      answer,
    );

    expect(supports).toEqual([{ start: charStart, end: charEnd, sourceIds: [3] }]);
    expect(answer.slice(supports[0].start, supports[0].end)).toBe(target);
  });

  it("maps offsets correctly across a 4-byte astral character (emoji)", () => {
    const prefix = "Result 🚀 for: ";
    const target = "query";
    const answer = prefix + target;

    const charStart = prefix.length; // UTF-16 code units (emoji = 2 units)
    const charEnd = charStart + target.length;
    const byteStart = byteLen(prefix); // emoji = 4 UTF-8 bytes
    const byteEnd = byteStart + byteLen(target);

    const supports = mapSupports(
      gm([{ segment: { startIndex: byteStart, endIndex: byteEnd }, groundingChunkIndices: [0] }]),
      answer,
    );

    expect(supports).toEqual([{ start: charStart, end: charEnd, sourceIds: [1] }]);
  });

  it("falls back to indexOf(segment.text) when offsets are missing", () => {
    const answer = "Türkiye'nin başkenti Ankara'dır.";
    const supports = mapSupports(
      gm([
        {
          segment: { text: "Ankara" },
          groundingChunkIndices: [0],
        },
      ]),
      answer,
    );
    const idx = answer.indexOf("Ankara");
    expect(supports).toEqual([{ start: idx, end: idx + "Ankara".length, sourceIds: [1] }]);
  });

  it("drops a support with no matching source chunk indices", () => {
    const answer = "hello world";
    const supports = mapSupports(
      gm([{ segment: { startIndex: 0, endIndex: 5 }, groundingChunkIndices: [] }]),
      answer,
    );
    expect(supports).toEqual([]);
  });

  it("drops a support whose segment is malformed (end <= start)", () => {
    const answer = "hello world";
    const supports = mapSupports(
      gm([{ segment: { startIndex: 5, endIndex: 5 }, groundingChunkIndices: [0] }]),
      answer,
    );
    expect(supports).toEqual([]);
  });
});
