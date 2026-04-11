"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Zap } from "lucide-react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase";
import { search, saveConversation, saveMessage, getMessages } from "@/lib/api";
import { SearchResult } from "@/types";
import SearchInput from "@/components/SearchInput";
import MessageBubble from "@/components/MessageBubble";
import AIAnswer from "@/components/AIAnswer";
import AuthButton from "@/components/auth/AuthButton";
import Sidebar from "@/components/Sidebar";

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
  const [user, setUser] = useState<User | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isSearching = messages.some((m) => m.status === "loading");

  // Listen for auth state
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setMessages([]);
        setActiveConversationId(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

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

        // Persist to Supabase if logged in
        if (user) {
          try {
            let convId = activeConversationId;
            if (!convId) {
              convId = await saveConversation(query.slice(0, 50), user.id);
              setActiveConversationId(convId);
              setSidebarRefreshKey((k) => k + 1);
            }
            await saveMessage(
              convId,
              query,
              response.ai_summary,
              response.results || [],
              thinking,
            );
          } catch (err) {
            console.error("Failed to save conversation:", err);
          }
        }
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
    [user, activeConversationId],
  );

  const handleNewSearch = useCallback(() => {
    setMessages([]);
    setActiveConversationId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleSelectConversation = useCallback(async (conversationId: string) => {
    setActiveConversationId(conversationId);
    try {
      const dbMessages = await getMessages(conversationId);
      setMessages(
        dbMessages.map((m) => ({
          id: m.id,
          query: m.query,
          summary: m.ai_summary,
          results: m.results,
          thinking: m.thinking,
          status: "done" as const,
        })),
      );
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  }, []);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const isLoggedIn = !!user;

  const sidebarWidth = isLoggedIn && sidebarOpen ? 260 : 0;

  return (
    <div className="min-h-screen bg-[#212121]">
      {/* Sidebar – only for logged-in users */}
      {isLoggedIn && (
        <Sidebar
          userId={user.id}
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
          onNewSearch={handleNewSearch}
          refreshKey={sidebarRefreshKey}
          onOpenChange={setSidebarOpen}
        />
      )}

      {/* Main area */}
      <div
        className="flex flex-col min-h-screen transition-[padding-left] duration-300"
        style={{ paddingLeft: sidebarWidth }}
      >
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-30 bg-[#212121] transition-[padding-left] duration-300"
          style={{ paddingLeft: sidebarWidth }}
        >
          <div className="w-full px-6 py-3 grid grid-cols-3 items-center">
            {/* Left – empty placeholder */}
            <div />
            {/* Center – logo */}
            <button
              onClick={handleNewSearch}
              className="flex items-center justify-center gap-2 text-gray-400 hover:text-purple-400 transition-colors"
            >
              <Zap size={22} className="text-purple-400" />
              <span className="text-base font-medium tracking-wide">
                Universal Search
              </span>
            </button>
            {/* Right – auth buttons */}
            <div className="flex justify-end">
              <AuthButton />
            </div>
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
        <SearchInput onSubmit={handleSearch} disabled={isSearching} isLoggedIn={isLoggedIn} sidebarWidth={sidebarWidth} />
      </div>
    </div>
  );
}
