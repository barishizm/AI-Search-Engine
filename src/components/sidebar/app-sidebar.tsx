"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, PanelLeft, Plus } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ConversationItem } from "@/components/sidebar/conversation-item";
import {
  deleteConversation,
  getConversations,
  renameConversation,
} from "@/lib/conversations";
import { createClient } from "@/lib/supabase/client";
import type { Conversation } from "@/types";

function UserMenu({ email }: { email: string | null }) {
  const router = useRouter();
  const initial = (email?.[0] ?? "?").toUpperCase();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex w-full items-center gap-2 rounded-lg p-2 text-left transition-colors hover:bg-sidebar-accent"
          aria-label="Account menu"
        >
          <Avatar className="size-7">
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
              {initial}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1 truncate text-sm">{email}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
          {email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} variant="destructive">
          <LogOut className="size-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SidebarBody({
  userId,
  email,
  activeConversationId,
  conversationsVersion,
  onSelect,
  onNewChat,
  onDeleted,
}: {
  userId: string;
  email: string | null;
  activeConversationId: string | null;
  conversationsVersion: number;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDeleted: (id: string) => void;
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    getConversations(userId)
      .then(setConversations)
      .catch(() => toast.error("Couldn't load your history."));
  }, [userId, conversationsVersion]);

  async function handleRename(id: string, title: string) {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title } : c)),
    );
    try {
      await renameConversation(id, title);
    } catch {
      toast.error("Rename failed.");
    }
  }

  async function handleDelete(id: string) {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    try {
      await deleteConversation(id);
      onDeleted(id);
    } catch {
      toast.error("Delete failed.");
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={onNewChat}
        >
          <Plus className="size-4" /> New search
        </Button>
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {conversations.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            Your searches will appear here.
          </p>
        ) : (
          <ul className="space-y-0.5">
            {conversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                active={conversation.id === activeConversationId}
                onSelect={() => onSelect(conversation.id)}
                onRename={(title) => handleRename(conversation.id, title)}
                onDelete={() => handleDelete(conversation.id)}
              />
            ))}
          </ul>
        )}
      </nav>
      <div className="border-t p-2">
        <UserMenu email={email} />
      </div>
    </div>
  );
}

export function AppSidebar(props: {
  userId: string;
  email: string | null;
  activeConversationId: string | null;
  conversationsVersion: number;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDeleted: (id: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden shrink-0 overflow-hidden border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:block ${
          props.open ? "w-64" : "w-0"
        }`}
      >
        <div className="flex h-svh w-64 flex-col">
          <div className="flex items-center justify-between px-3 pt-3">
            <Logo className="px-1 text-sm" />
            <div className="flex items-center">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => props.onOpenChange(false)}
                aria-label="Collapse sidebar"
              >
                <PanelLeft className="size-4" />
              </Button>
            </div>
          </div>
          <SidebarBody {...props} />
        </div>
      </aside>

      {/* Mobile sheet */}
      <Sheet open={props.mobileOpen} onOpenChange={props.onMobileOpenChange}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">History</SheetTitle>
          <div className="flex items-center px-3 pt-3">
            <Logo className="px-1 text-sm" />
          </div>
          <SidebarBody {...props} />
        </SheetContent>
      </Sheet>
    </>
  );
}
