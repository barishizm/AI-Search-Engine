"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/types";

export function ConversationItem({
  conversation,
  active,
  onSelect,
  onRename,
  onDelete,
}: {
  conversation: Conversation;
  active: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(conversation.title);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function commitRename() {
    const title = draft.trim();
    setRenaming(false);
    if (title && title !== conversation.title) {
      onRename(title);
    } else {
      setDraft(conversation.title);
    }
  }

  if (renaming) {
    return (
      <li>
        <Input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") {
              setDraft(conversation.title);
              setRenaming(false);
            }
          }}
          className="h-8 text-sm"
        />
      </li>
    );
  }

  return (
    <li
      className={cn(
        "group flex items-center rounded-lg transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "hover:bg-sidebar-accent/60",
      )}
    >
      <button
        onClick={onSelect}
        className="min-w-0 flex-1 truncate px-2.5 py-2 text-left text-sm"
        title={conversation.title}
      >
        {conversation.title}
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="mr-1 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
            aria-label="Conversation actions"
          >
            <MoreHorizontal className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem
            onClick={() => {
              setDraft(conversation.title);
              setRenaming(true);
            }}
          >
            <Pencil className="size-4" /> Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setConfirmingDelete(true)}
          >
            <Trash2 className="size-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              “{conversation.title}” and its messages will be permanently
              removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}
