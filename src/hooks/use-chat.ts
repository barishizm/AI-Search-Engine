"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import {
  getMessages,
  saveConversation,
  saveMessage,
} from "@/lib/conversations";
import { streamSearch } from "@/lib/stream-client";
import type {
  CitationSupport,
  HistoryTurn,
  SearchMode,
  Source,
} from "@/types";

export interface ChatMessage {
  id: string;
  query: string;
  answer: string;
  thoughts: string;
  sources: Source[];
  supports: CitationSupport[];
  searchSuggestionHtml: string | null;
  mode: SearchMode;
  thinking: boolean;
  searched: boolean;
  status: "streaming" | "done" | "error";
  errorMessage?: string;
}

export function useChat(userId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [conversationsVersion, setConversationsVersion] = useState(0);
  // Streaming state the async callbacks need without re-subscribing.
  const conversationIdRef = useRef<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  const patchMessage = useCallback(
    (id: string, patch: Partial<ChatMessage> | ((m: ChatMessage) => Partial<ChatMessage>)) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id
            ? { ...m, ...(typeof patch === "function" ? patch(m) : patch) }
            : m,
        ),
      );
    },
    [],
  );

  const runStream = useCallback(
    async (
      localId: string,
      query: string,
      mode: SearchMode,
      thinking: boolean,
      history: HistoryTurn[],
    ) => {
      setIsStreaming(true);

      const finalize = async (searched: boolean) => {
        setIsStreaming(false);
        // Read the finished message back out of state for persistence.
        setMessages((prev) => {
          const finished = prev.find((m) => m.id === localId);
          if (finished) {
            void persistMessage({ ...finished, searched, status: "done" });
          }
          return prev.map((m) =>
            m.id === localId ? { ...m, searched, status: "done" as const } : m,
          );
        });
      };

      const persistMessage = async (finished: ChatMessage) => {
        try {
          let convId = conversationIdRef.current;
          if (!convId) {
            convId = await saveConversation(query.slice(0, 60), userId);
            conversationIdRef.current = convId;
            setActiveConversationId(convId);
          }
          const savedId = await saveMessage({
            conversationId: convId,
            query: finished.query,
            answer: finished.answer || null,
            sources: finished.sources,
            thinking: finished.thinking,
            mode: finished.mode,
          });
          patchMessage(localId, { id: savedId });
          setConversationsVersion((v) => v + 1);
        } catch {
          // History persistence is best-effort; the answer is already shown.
          toast.error("Couldn't save this exchange to your history.");
        }
      };

      await streamSearch(
        { query, mode, thinking, history },
        {
          onDelta: (t) =>
            patchMessage(localId, (m) => ({ answer: m.answer + t })),
          onThought: (t) =>
            patchMessage(localId, (m) => ({ thoughts: m.thoughts + t })),
          onSources: (payload) =>
            patchMessage(localId, {
              sources: payload.sources,
              searchSuggestionHtml: payload.searchSuggestionHtml,
              searched: true,
            }),
          onCitations: (supports) => patchMessage(localId, { supports }),
          onDone: (_finishReason, searched) => {
            void finalize(searched);
          },
          onError: (code, message, retryAfterSec) => {
            setIsStreaming(false);
            const suffix =
              code === "rate_limited" && retryAfterSec
                ? ` Try again in ${retryAfterSec}s.`
                : "";
            setMessages((prev) =>
              prev.map((m) =>
                m.id === localId
                  ? m.answer
                    ? { ...m, status: "done" as const }
                    : {
                        ...m,
                        status: "error" as const,
                        errorMessage: message + suffix,
                      }
                  : m,
              ),
            );
          },
        },
      );
    },
    [patchMessage, userId],
  );

  const submit = useCallback(
    async (query: string, mode: SearchMode, thinking: boolean) => {
      const localId = `local-${Date.now()}`;
      const message: ChatMessage = {
        id: localId,
        query,
        answer: "",
        thoughts: "",
        sources: [],
        supports: [],
        searchSuggestionHtml: null,
        mode,
        thinking,
        searched: false,
        status: "streaming",
      };

      let history: HistoryTurn[] = [];
      setMessages((prev) => {
        history = prev
          .filter((m) => m.status === "done" && m.answer)
          .slice(-3)
          .flatMap((m): HistoryTurn[] => [
            { role: "user", text: m.query },
            { role: "model", text: m.answer },
          ]);
        return [...prev, message];
      });

      await runStream(localId, query, mode, thinking, history);
    },
    [runStream],
  );

  const retry = useCallback(
    async (id: string) => {
      let target: ChatMessage | undefined;
      let history: HistoryTurn[] = [];
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === id);
        if (idx === -1) return prev;
        target = prev[idx];
        history = prev
          .slice(0, idx)
          .filter((m) => m.status === "done" && m.answer)
          .slice(-3)
          .flatMap((m): HistoryTurn[] => [
            { role: "user", text: m.query },
            { role: "model", text: m.answer },
          ]);
        return prev.map((m) =>
          m.id === id
            ? {
                ...m,
                answer: "",
                thoughts: "",
                sources: [],
                supports: [],
                searchSuggestionHtml: null,
                searched: false,
                status: "streaming" as const,
                errorMessage: undefined,
              }
            : m,
        );
      });
      if (!target) return;
      await runStream(id, target.query, target.mode, target.thinking, history);
    },
    [runStream],
  );

  const loadConversation = useCallback(async (conversationId: string) => {
    setActiveConversationId(conversationId);
    conversationIdRef.current = conversationId;
    try {
      const stored = await getMessages(conversationId);
      setMessages(
        stored.map((m) => ({
          id: m.id,
          query: m.query,
          answer: m.ai_summary ?? "",
          thoughts: "",
          sources: m.results ?? [],
          supports: [],
          searchSuggestionHtml: null,
          mode: m.mode ?? "chat",
          thinking: m.thinking,
          searched: (m.results ?? []).length > 0,
          status: "done" as const,
        })),
      );
    } catch {
      toast.error("Couldn't load that conversation.");
    }
  }, []);

  const newChat = useCallback(() => {
    setMessages([]);
    setActiveConversationId(null);
    conversationIdRef.current = null;
  }, []);

  const onConversationDeleted = useCallback(
    (conversationId: string) => {
      if (conversationId === conversationIdRef.current) {
        newChat();
      }
      setConversationsVersion((v) => v + 1);
    },
    [newChat],
  );

  return {
    messages,
    isStreaming,
    activeConversationId,
    conversationsVersion,
    submit,
    retry,
    loadConversation,
    newChat,
    onConversationDeleted,
  };
}
