"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase";
import { search, saveConversation, saveMessage, getMessages, checkHealth } from "@/lib/api";
import { SearchResult } from "@/types";
import SearchInput from "@/components/SearchInput";
import MessageBubble from "@/components/MessageBubble";
import AIAnswer from "@/components/AIAnswer";
import AuthButton from "@/components/auth/AuthButton";
import Sidebar from "@/components/Sidebar";
import Logo from "@/components/Logo";

const Dither = dynamic(() => import("@/components/Dither/Dither"), {
  ssr: false,
});

interface Message {
  id: string;
  query: string;
  summary: string | null;
  results: SearchResult[];
  thinking: boolean;
  searched: boolean;
  status: "loading" | "done";
}

interface HealthState {
  status: string;
  chroma_connected: boolean;
  doc_count: number;
  ai_configured: boolean;
  ai_model: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [health, setHealth] = useState<HealthState | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isSearching = messages.some((m) => m.status === "loading");

  // Listen for auth state
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setAuthLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
      if (!session?.user) {
        setMessages([]);
        setActiveConversationId(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setHealth(null);
      return;
    }

    checkHealth()
      .then(setHealth)
      .catch((error) => {
        console.error("Failed to load health:", error);
        setHealth(null);
      });
  }, [user]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const ensureConversation = useCallback(async (query: string) => {
    if (!user) return null;

    let convId = activeConversationId;
    if (!convId) {
      convId = await saveConversation(query.slice(0, 50), user.id);
      setActiveConversationId(convId);
      setSidebarRefreshKey((k) => k + 1);
    }

    return convId;
  }, [user, activeConversationId]);

  const handleSearch = useCallback(
    async (query: string, thinking: boolean, performSearch: boolean) => {
      const id = Date.now().toString();

      const newMessage: Message = {
        id,
        query,
        summary: null,
        results: [],
        thinking,
        searched: false,
        status: "loading",
      };

      setMessages((prev) => [...prev, newMessage]);

      const history = messages
        .filter((m) => m.status === "done" && m.summary)
        .slice(-3)
        .map((m) => ({ query: m.query, summary: m.summary || "" }));

      try {
        let response;
        try {
          response = await search(query, thinking, performSearch, history);
        } catch (firstError) {
          console.warn("Search failed, retrying in 2s:", firstError);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === id ? { ...m, summary: "Retrying..." } : m,
            ),
          );
          await new Promise((resolve) => setTimeout(resolve, 2000));
          response = await search(query, thinking, performSearch, history);
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === id
              ? {
                  ...m,
                  summary: response.ai_summary,
                  results: response.results || [],
                  searched: response.searched,
                  status: "done" as const,
                }
              : m,
          ),
        );

        // Persist to Supabase if logged in
        if (user) {
          try {
            const convId = await ensureConversation(query);
            if (!convId) return;
            const savedId = await saveMessage(
              convId,
              query,
              response.ai_summary,
              response.results || [],
              thinking,
            );
            setMessages((prev) =>
              prev.map((m) => (m.id === id ? { ...m, id: savedId } : m)),
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
    [user, ensureConversation, messages],
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
          searched: m.results.length > 0,
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

  // Show nothing while checking auth
  if (authLoading) {
    return <div className="min-h-screen bg-[#212121]" />;
  }

  // Landing page for unauthenticated users
  if (!isLoggedIn) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-black">
        {/* Dither background */}
        <div className="absolute inset-0 z-0">
          <Dither
            waveSpeed={0.04}
            waveAmplitude={0.44}
            waveFrequency={4.3}
            colorNum={14.3}
            pixelSize={2}
            waveColor={[0.4, 0.2, 0.7]}
            enableMouseInteraction={true}
            mouseRadius={1}
          />
        </div>

        {/* Top navigation */}
        <nav className="relative z-10 flex items-center justify-between px-6 py-4">
          <Logo size={32} />
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="px-4 py-1.5 text-sm text-white/70 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/auth/register"
              className="px-4 py-1.5 text-sm rounded-lg bg-white/10 text-white/90 hover:bg-white/20 transition-colors"
            >
              Register
            </Link>
          </div>
        </nav>

        {/* Center content */}
        <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-140px)]">
          <div className="flex flex-col items-center gap-6 px-6 py-12 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 max-w-lg w-full mx-4">
            <Logo size={72} />
            <p className="text-white/60 text-center text-base sm:text-lg max-w-md">
              Search across the web, films, and music — powered by AI
            </p>
            <div className="flex items-center gap-4 mt-2">
              <Link
                href="/auth/register"
                className="px-6 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors"
              >
                Get Started
              </Link>
              <Link
                href="/auth/login"
                className="px-6 py-2.5 rounded-lg border border-white/30 text-white hover:bg-white/10 font-medium transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom text */}
        <div className="relative z-10 pb-6 text-center">
          <p className="text-xs text-white/30">
            Powered by Gemini · Brave Search · TMDB · Spotify
          </p>
        </div>
      </div>
    );
  }

  // Authenticated chat interface
  return (
    <div className="min-h-screen bg-[#212121]">
      {/* Sidebar – only for logged-in users */}
      <Sidebar
        userId={user.id}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewSearch={handleNewSearch}
        refreshKey={sidebarRefreshKey}
        onOpenChange={setSidebarOpen}
      />

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
            {/* Left – health badge */}
            <div className="flex justify-start">
              {health && (
                <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-gray-300">
                  <span className={`h-2 w-2 rounded-full ${health.ai_configured ? "bg-emerald-400" : "bg-amber-400"}`} />
                  <span className="uppercase tracking-[0.16em]">{health.ai_configured ? "AI Ready" : "AI Fallback"}</span>
                  <span className="text-gray-500">/</span>
                  <span className="truncate text-gray-400">{health.ai_model}</span>
                </div>
              )}
            </div>
            {/* Center – logo */}
            <button
              onClick={handleNewSearch}
              className="flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            >
              <Logo size={32} />
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
                <Logo size={64} />
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
                      searched={message.searched}
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
