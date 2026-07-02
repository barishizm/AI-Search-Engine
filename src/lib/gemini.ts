import {
  ThinkingLevel,
  type Content,
  type GenerateContentConfig,
} from "@google/genai";
import type { HistoryTurn, SearchMode } from "@/types";

// Chat uses the newest flash; search uses 2.5-flash because Google Search
// grounding has free-tier quota there (the 3.x family's grounding allowance
// is not available on free-tier keys — first grounded call 429s).
const CHAT_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.5-flash";
const SEARCH_MODEL = process.env.GEMINI_SEARCH_MODEL ?? "gemini-2.5-flash";

export function modelFor(mode: SearchMode): string {
  return mode === "search" ? SEARCH_MODEL : CHAT_MODEL;
}

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
  model: string,
  mode: SearchMode,
  thinking: boolean,
  abortSignal: AbortSignal,
): GenerateContentConfig {
  // Gemini 3+ takes thinkingLevel; the 2.5 family takes thinkingBudget.
  const thinkingConfig = /^gemini-[3-9]/.test(model)
    ? {
        thinkingLevel: thinking ? ThinkingLevel.HIGH : ThinkingLevel.LOW,
        includeThoughts: thinking,
      }
    : {
        thinkingBudget: thinking ? -1 : 0,
        includeThoughts: thinking,
      };

  return {
    systemInstruction: SYSTEM_PROMPT,
    ...(mode === "search" ? { tools: [{ googleSearch: {} }] } : {}),
    thinkingConfig,
    abortSignal,
  };
}
