"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Globe, Lightbulb, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { SearchMode } from "@/types";

export function Composer({
  onSubmit,
  disabled,
  autoFocus,
  mode,
  onModeChange,
  thinking,
  onThinkingChange,
}: {
  onSubmit: (query: string) => void;
  disabled: boolean;
  autoFocus?: boolean;
  mode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
  thinking: boolean;
  onThinkingChange: (thinking: boolean) => void;
}) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  function submit() {
    const query = value.trim();
    if (!query || disabled) return;
    setValue("");
    onSubmit(query);
  }

  return (
    <div className="rounded-lg border bg-card transition-colors focus-within:border-ring">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={
          mode === "search" ? "Search the web…" : "Ask anything…"
        }
        rows={1}
        autoFocus={autoFocus}
        className="w-full resize-none bg-transparent px-4 pt-3.5 text-[15px] leading-6 outline-none placeholder:text-muted-foreground"
        aria-label="Message"
      />
      <div className="flex items-center gap-1.5 px-2.5 pb-2.5 pt-1">
        <div className="flex items-center rounded-full border p-0.5">
          <button
            type="button"
            onClick={() => onModeChange("chat")}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
              mode === "chat"
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            aria-pressed={mode === "chat"}
          >
            <MessageCircle className="size-3.5" />
            Chat
          </button>
          <button
            type="button"
            onClick={() => onModeChange("search")}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
              mode === "search"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
            aria-pressed={mode === "search"}
          >
            <Globe className="size-3.5" />
            Search
          </button>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => onThinkingChange(!thinking)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                thinking
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-pressed={thinking}
            >
              <Lightbulb className="size-3.5" />
              Think
            </button>
          </TooltipTrigger>
          <TooltipContent>
            Reason more deeply before answering (slower)
          </TooltipContent>
        </Tooltip>

        <div className="flex-1" />

        <Button
          type="button"
          size="icon"
          className="size-8 rounded-full"
          onClick={submit}
          disabled={disabled || value.trim().length === 0}
          aria-label="Send"
        >
          <ArrowUp className="size-4" />
        </Button>
      </div>
    </div>
  );
}
