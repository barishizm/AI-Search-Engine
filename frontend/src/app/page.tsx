"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Zap } from "lucide-react";
import { search } from "@/lib/api";
import { SearchResult } from "@/types";
import SearchInput from "@/components/SearchInput";
import MessageBubble from "@/components/MessageBubble";
import AIAnswer from "@/components/AIAnswer";

interface Message {
  id: string;
  query: string;
  summary: string | null;
  results: SearchResult[];
  thinking: boolean;
  status: "loading" | "done";
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isSearching = messages.some((m) => m.status === "loading");

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSearch = useCallback(
    async (query: string, thinking: boolean) => {
      const id = Date.now().toString();

      const newMessage: Message = {
        id,
        query,
        summary: null,
        results: [],
        thinking,
        status: "loading",
      };

      setMessages((prev) => [...prev, newMessage]);

      try {
        const response = await search(query, thinking);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === id
              ? {
                  ...m,
                  summary: response.ai_summary,
                  results: response.results || [],
                  status: "done" as const,
                }
              : m,
          ),
        );
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === id
              ? {
                  ...m,
                  summary: "Something went wrong. Please try again.",
                  results: [],
                  status: "done" as const,
                }
              : m,
          ),
        );
      }
    },
    [],
  );

  const handleLogoClick = () => {
    setMessages([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#212121] flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#212121]/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <button
            onClick={handleLogoClick}
            className="flex items-center gap-2 text-white hover:text-purple-400 transition-colors"
          >
            <Zap size={20} className="text-purple-400" />
            <span className="text-sm font-semibold">Universal Search</span>
          </button>
        </div>
      </header>

      {/* Conversation area */}
      <main className="flex-1 pt-14 pb-32">
        <div className="max-w-3xl mx-auto px-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
              <div className="flex items-center gap-3">
                <Zap size={36} className="text-purple-400" />
                <h1 className="text-2xl font-semibold text-white">
                  Universal Search
                </h1>
              </div>
              <p className="text-gray-500 text-sm text-center max-w-md">
                Search across web, films, and music — all at once.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6 py-4">
              {messages.map((message) => (
                <div key={message.id} className="flex flex-col gap-4">
                  <MessageBubble
                    query={message.query}
                    thinking={message.thinking}
                  />
                  <AIAnswer
                    summary={message.summary}
                    results={message.results}
                    status={message.status}
                  />
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </main>

      {/* Input bar */}
      <SearchInput onSubmit={handleSearch} disabled={isSearching} />
    </div>
  );
}
