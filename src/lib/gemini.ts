import {
  ThinkingLevel,
  type Content,
  type GenerateContentConfig,
} from "@google/genai";
import type { HistoryTurn, SearchMode } from "@/types";

export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.5-flash";

const MAX_HISTORY_TURNS = 6;
const MAX_TURN_CHARS = 8_000;

const SYSTEM_PROMPT = `You are Limited Search, an AI answer engine.

- Always respond in the same language as the user's most recent message (for example, Turkish questions get Turkish answers).
- Format answers with GitHub-flavored Markdown. Prefer short paragraphs and lists; use headings only when the answer is long.
- Be direct and accurate. Lead with the answer, then add supporting detail.
- When web search results are available, ground every claim in them. If they are insufficient or conflicting, say so plainly.
- Never fabricate facts, quotes, or URLs.`;

export function buildContents(
  history: HistoryTurn[],
  query: string,
): Content[] {
  return [
    ...history.slice(-MAX_HISTORY_TURNS).map((turn) => ({
      role: turn.role,
      parts: [{ text: turn.text.slice(0, MAX_TURN_CHARS) }],
    })),
    { role: "user", parts: [{ text: query }] },
  ];
}

export function buildConfig(
  mode: SearchMode,
  thinking: boolean,
  abortSignal: AbortSignal,
): GenerateContentConfig {
  return {
    systemInstruction: SYSTEM_PROMPT,
    ...(mode === "search" ? { tools: [{ googleSearch: {} }] } : {}),
    thinkingConfig: {
      thinkingLevel: thinking ? ThinkingLevel.HIGH : ThinkingLevel.LOW,
      includeThoughts: thinking,
    },
    abortSignal,
  };
}
