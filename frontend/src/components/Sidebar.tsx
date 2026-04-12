"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal, PanelLeftClose, PanelLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { Conversation } from "@/types";
import { deleteConversation, getConversations, renameConversation } from "@/lib/api";
import AuthButton from "@/components/auth/AuthButton";

interface SidebarProps {
  userId: string;
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewSearch: () => void;
  onDeleteConversation: (id: string) => void;
  refreshKey: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function Sidebar({
  userId,
  activeConversationId,
  onSelectConversation,
  onNewSearch,
  onDeleteConversation,
  refreshKey,
  open,
  onOpenChange,
}: SidebarProps) {
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const skipBlurSubmitRef = useRef(false);
  const toggleOpen = (value: boolean) => {
    onOpenChange(value);
  };
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  useEffect(() => {
    getConversations(userId).then(setConversations).catch(console.error);
  }, [userId, refreshKey]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsideSidebar = sidebarRef.current?.contains(target);
      const clickedInsideMenu = menuRef.current?.contains(target);

      if (!clickedInsideSidebar && !clickedInsideMenu) {
        setMenuOpenId(null);
        setMenuPosition(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    const closeMenu = () => {
      setMenuOpenId(null);
      setMenuPosition(null);
    };

    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    return () => {
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, []);

  const startRename = (conversation: Conversation) => {
    skipBlurSubmitRef.current = false;
    setEditingId(conversation.id);
    setEditingTitle(conversation.title);
    setMenuOpenId(null);
    setMenuPosition(null);
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditingTitle("");
  };

  const handleRenameSubmit = async (conversationId: string) => {
    const nextTitle = editingTitle.trim();

    if (!nextTitle) {
      cancelRename();
      return;
    }

    try {
      await renameConversation(conversationId, nextTitle);
      const updatedAt = new Date().toISOString();
      setConversations((prev) => {
        const nextConversations = prev.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                title: nextTitle,
                updated_at: updatedAt,
              }
            : conversation,
        );

        return nextConversations.sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
        );
      });
      cancelRename();
    } catch (error) {
      console.error("Failed to rename conversation:", error);
    }
  };

  const handleDelete = async (conversation: Conversation) => {
    const shouldDelete = window.confirm(
      `Delete "${conversation.title}"? This cannot be undone.`,
    );

    if (!shouldDelete) {
      return;
    }

    try {
      await deleteConversation(conversation.id);
      setConversations((prev) =>
        prev.filter((item) => item.id !== conversation.id),
      );
      setMenuOpenId((current) =>
        current === conversation.id ? null : current,
      );
      setMenuPosition(null);
      if (editingId === conversation.id) {
        cancelRename();
      }
      onDeleteConversation(conversation.id);
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    }
  };

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
        ref={sidebarRef}
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
        <div className="min-h-0 flex-1 overflow-y-auto py-2">
          {conversations.length === 0 ? (
            <p className="px-3 py-4 text-xs text-gray-600 text-center">
              No conversations yet
            </p>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={`w-full text-left px-3 py-2.5 text-sm transition-colors truncate ${
                  conv.id === activeConversationId
                    ? "bg-white/10 text-white"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <div className="group flex items-start gap-2">
                  <button
                    onClick={() => {
                      setMenuOpenId(null);
                      setMenuPosition(null);
                      onSelectConversation(conv.id);
                    }}
                    className="min-w-0 flex-1 text-left"
                  >
                    {editingId === conv.id ? (
                      <input
                        value={editingTitle}
                        onChange={(event) => setEditingTitle(event.target.value)}
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void handleRenameSubmit(conv.id);
                          }
                          if (event.key === "Escape") {
                            event.preventDefault();
                            skipBlurSubmitRef.current = true;
                            cancelRename();
                          }
                        }}
                        onBlur={() => {
                          if (skipBlurSubmitRef.current) {
                            skipBlurSubmitRef.current = false;
                            return;
                          }
                          void handleRenameSubmit(conv.id);
                        }}
                        autoFocus
                        maxLength={120}
                        className="w-full rounded-md border border-white/15 bg-white/5 px-2 py-1 text-sm text-white outline-none focus:border-white/30"
                      />
                    ) : (
                      <>
                        <span className="block truncate pr-1">{conv.title}</span>
                        <span className="block text-[10px] text-gray-600 mt-0.5">
                          {new Date(conv.updated_at).toLocaleDateString()}
                        </span>
                      </>
                    )}
                  </button>

                  {editingId !== conv.id && (
                    <div className="relative flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleDelete(conv);
                        }}
                        className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-white/10 hover:text-white"
                        aria-label={`Delete ${conv.title}`}
                      >
                        <Trash2 size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          const rect = event.currentTarget.getBoundingClientRect();

                          setMenuOpenId((current) => {
                            const nextOpenId = current === conv.id ? null : conv.id;
                            setMenuPosition(
                              nextOpenId
                                ? {
                                    top: rect.bottom + 8,
                                    left: rect.right - 150,
                                  }
                                : null,
                            );
                            return nextOpenId;
                          });
                        }}
                        className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-white/10 hover:text-white"
                        aria-label={`Open options for ${conv.title}`}
                      >
                        <MoreHorizontal size={15} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="shrink-0 border-t border-white/5 p-3">
          <AuthButton variant="sidebar" />
        </div>
      </aside>
      {menuOpenId && menuPosition && typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[70] min-w-[150px] overflow-hidden rounded-xl border border-white/10 bg-[#2a2a2a] p-1 shadow-2xl"
            style={{
              top: menuPosition.top,
              left: Math.max(12, menuPosition.left),
            }}
          >
            {conversations
              .filter((conversation) => conversation.id === menuOpenId)
              .map((conversation) => (
                <div key={conversation.id}>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      startRename(conversation);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-gray-200 transition-colors hover:bg-white/10"
                  >
                    <Pencil size={14} />
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleDelete(conversation);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-400 transition-colors hover:bg-red-500/10"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              ))}
          </div>,
          document.body,
        )}
    </>
  );
}
