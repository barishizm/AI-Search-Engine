import { createParser, type EventSourceMessage } from "eventsource-parser";
import type {
  CitationSupport,
  SearchRequestBody,
  SourcesPayload,
  StreamErrorCode,
} from "@/types";

export interface StreamCallbacks {
  onDelta: (t: string) => void;
  onThought: (t: string) => void;
  onSources: (payload: SourcesPayload) => void;
  onCitations: (supports: CitationSupport[]) => void;
  onDone: (finishReason: string, searched: boolean) => void;
  onError: (
    code: StreamErrorCode,
    message: string,
    retryAfterSec?: number,
  ) => void;
}

export async function streamSearch(
  body: SearchRequestBody,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  let res: Response;
  try {
    res = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (e) {
    if ((e as Error)?.name === "AbortError") return;
    callbacks.onError("internal", "Network error — check your connection.");
    return;
  }

  if (!res.ok) {
    let payload: {
      code?: StreamErrorCode;
      message?: string;
      retryAfterSec?: number;
    } | null = null;
    try {
      payload = await res.json();
    } catch {
      payload = null;
    }
    callbacks.onError(
      payload?.code ?? "internal",
      payload?.message ?? "The request failed. Please try again.",
      payload?.retryAfterSec,
    );
    return;
  }

  let sawTerminalEvent = false;
  const parser = createParser({
    onEvent(event: EventSourceMessage) {
      let data: Record<string, unknown>;
      try {
        data = event.data ? JSON.parse(event.data) : {};
      } catch {
        return;
      }
      switch (event.event) {
        case "delta":
          callbacks.onDelta(data.t as string);
          break;
        case "thought":
          callbacks.onThought(data.t as string);
          break;
        case "sources":
          callbacks.onSources(data as unknown as SourcesPayload);
          break;
        case "citations":
          callbacks.onCitations(
            (data.supports as CitationSupport[]) ?? [],
          );
          break;
        case "done":
          sawTerminalEvent = true;
          callbacks.onDone(
            (data.finishReason as string) ?? "STOP",
            data.searched === true,
          );
          break;
        case "error":
          sawTerminalEvent = true;
          callbacks.onError(
            (data.code as StreamErrorCode) ?? "internal",
            (data.message as string) ?? "Something went wrong.",
            data.retryAfterSec as number | undefined,
          );
          break;
      }
    },
  });

  const reader = res.body?.getReader();
  if (!reader) {
    callbacks.onError("internal", "Streaming is not supported here.");
    return;
  }

  const decoder = new TextDecoder();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parser.feed(decoder.decode(value, { stream: true }));
    }
    if (!sawTerminalEvent) {
      callbacks.onError("internal", "The connection dropped mid-answer.");
    }
  } catch (e) {
    if ((e as Error)?.name !== "AbortError" && !sawTerminalEvent) {
      callbacks.onError("internal", "The connection dropped mid-answer.");
    }
  }
}
