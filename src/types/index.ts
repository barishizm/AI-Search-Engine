export type SearchMode = "chat" | "search";

/** A web source backing an answer, derived from Gemini grounding chunks. */
export interface Source {
  id: number;
  title: string;
  url: string;
  domain: string;
}

/** Character-index range of the answer supported by the given sources. */
export interface CitationSupport {
  start: number;
  end: number;
  sourceIds: number[];
}

export interface HistoryTurn {
  role: "user" | "model";
  text: string;
}

export interface SearchRequestBody {
  query: string;
  mode: SearchMode;
  thinking: boolean;
  history: HistoryTurn[];
}

export type StreamErrorCode =
  | "unauthorized"
  | "rate_limited"
  | "quota_exhausted"
  | "blocked"
  | "timeout"
  | "internal";

export interface SourcesPayload {
  sources: Source[];
  searchQueries: string[];
  searchSuggestionHtml: string | null;
}

/** Server-sent events emitted by POST /api/search. */
export type StreamEvent =
  | { type: "delta"; t: string }
  | { type: "thought"; t: string }
  | ({ type: "sources" } & SourcesPayload)
  | { type: "citations"; supports: CitationSupport[] }
  | { type: "done"; finishReason: string; searched: boolean }
  | {
      type: "error";
      code: StreamErrorCode;
      message: string;
      retryAfterSec?: number;
    };

// ── Supabase rows ──

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface StoredMessage {
  id: string;
  conversation_id: string;
  query: string;
  ai_summary: string | null;
  results: Source[];
  thinking: boolean;
  mode: SearchMode;
  created_at: string;
}

export interface Feedback {
  id: string;
  user_id: string;
  conversation_id: string | null;
  message_id: string | null;
  note: string | null;
  created_at: string;
}
