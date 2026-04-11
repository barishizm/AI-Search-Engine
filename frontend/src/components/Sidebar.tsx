"use client";

import { useState, useEffect } from "react";
import { PanelLeftClose, PanelLeft, Plus } from "lucide-react";
import { Conversation } from "@/types";
import { getConversations } from "@/lib/api";

interface SidebarProps {
  userId: string;
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewSearch: () => void;
  refreshKey: number;
  onOpenChange?: (open: boolean) => void;
}

export default function Sidebar({
  userId,
  activeConversationId,
  onSelectConversation,
  onNewSearch,
  refreshKey,
  onOpenChange,
}: SidebarProps) {
  const [open, setOpen] = useState(true);

  const toggleOpen = (value: boolean) => {
    setOpen(value);
    onOpenChange?.(value);
  };
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    getConversations(userId).then(setConversations).catch(console.error);
  }, [userId, refreshKey]);

  return (
    <>
      {/* Toggle button when closed */}
      {!open && (
        <button
          onClick={() => toggleOpen(true)}
          className="fixed top-3 left-3 z-50 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <PanelLeft size={20} />
        </button>
      )}

      {/* Sidebar panel */}
      <aside
        className="fixed top-0 left-0 h-full z-40 bg-[#171717] border-r border-white/5 flex flex-col transition-[width] duration-300 overflow-hidden"
        style={{ width: open ? 260 : 0 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-3 border-b border-white/5 shrink-0">
          <button
            onClick={onNewSearch}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
          >
            <Plus size={16} />
            New Search
          </button>
          <button
            onClick={() => toggleOpen(false)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto py-2">
          {conversations.length === 0 ? (
            <p className="px-3 py-4 text-xs text-gray-600 text-center">
              No conversations yet
            </p>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`w-full text-left px-3 py-2.5 text-sm transition-colors truncate ${
                  conv.id === activeConversationId
                    ? "bg-white/10 text-white"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <span className="block truncate">{conv.title}</span>
                <span className="block text-[10px] text-gray-600 mt-0.5">
                  {new Date(conv.updated_at).toLocaleDateString()}
                </span>
              </button>
            ))
          )}
        </div>
      </aside>
    </>
  );
}
