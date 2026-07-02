"use client";

import { useEffect, useState } from "react";
import { Menu, PanelLeft } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { Composer } from "@/components/chat/composer";
import { MessageList } from "@/components/chat/message-list";
import { useChat } from "@/hooks/use-chat";
import type { SearchMode } from "@/types";

const SIDEBAR_STORAGE_KEY = "limited-search:sidebar-open";

export function ChatApp({
  user,
}: {
  user: { id: string; email: string | null };
}) {
  const chat = useChat(user.id);
  const [mode, setMode] = useState<SearchMode>("search");
  const [thinking, setThinking] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSidebarOpen(localStorage.getItem(SIDEBAR_STORAGE_KEY) !== "false");
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarOpen));
    }
  }, [sidebarOpen, hydrated]);

  const empty = chat.messages.length === 0;

  const composer = (
    <Composer
      onSubmit={(query) => chat.submit(query, mode, thinking)}
      disabled={chat.isStreaming}
      autoFocus
      mode={mode}
      onModeChange={setMode}
      thinking={thinking}
      onThinkingChange={setThinking}
    />
  );

  return (
    <div className="flex h-svh overflow-hidden bg-background">
      <AppSidebar
        userId={user.id}
        email={user.email}
        activeConversationId={chat.activeConversationId}
        conversationsVersion={chat.conversationsVersion}
        onSelect={(id) => {
          void chat.loadConversation(id);
          setMobileOpen(false);
        }}
        onNewChat={() => {
          chat.newChat();
          setMobileOpen(false);
        }}
        onDeleted={chat.onConversationDeleted}
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        mobileOpen={mobileOpen}
        onMobileOpenChange={setMobileOpen}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-1 px-2">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-4" />
          </Button>
          {!sidebarOpen ? (
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:inline-flex"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <PanelLeft className="size-4" />
            </Button>
          ) : null}
          {!sidebarOpen ? (
            <button onClick={chat.newChat} aria-label="New search">
              <Logo className="text-sm" />
            </button>
          ) : (
            <button
              onClick={chat.newChat}
              aria-label="New search"
              className="md:hidden"
            >
              <Logo className="text-sm" />
            </button>
          )}
          <div className="flex-1" />
          {!sidebarOpen ? <ThemeToggle /> : <span className="md:hidden"><ThemeToggle /></span>}
        </header>

        {empty ? (
          <main className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 pb-24">
            <div className="w-full max-w-2xl space-y-6">
              <h1 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
                What do you want to know?
              </h1>
              {composer}
              <p className="text-center text-xs text-muted-foreground">
                Search mode finds live, cited answers from the web. Chat mode
                just talks.
              </p>
            </div>
          </main>
        ) : (
          <>
            <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <MessageList messages={chat.messages} />
            </main>
            <div className="shrink-0 px-4 pb-4">
              <div className="mx-auto w-full max-w-3xl">{composer}</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
