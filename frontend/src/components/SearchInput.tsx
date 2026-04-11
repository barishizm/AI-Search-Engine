"use client";

import { useState, useRef, useCallback } from "react";
import { ArrowUp, Lightbulb } from "lucide-react";

interface SearchInputProps {
  onSubmit: (query: string, thinking: boolean) => void;
  disabled?: boolean;
}

export default function SearchInput({ onSubmit, disabled }: SearchInputProps) {
  const [query, setQuery] = useState("");
  const [thinking, setThinking] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed, thinking);
    setQuery("");
    if (inputRef.current) {
      inputRef.current.style.height = "24px";
    }
  }, [query, thinking, disabled, onSubmit]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuery(e.target.value);
    const el = e.target;
    el.style.height = "24px";
    el.style.height = Math.min(el.scrollHeight, 150) + "px";
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 pb-6 bg-gradient-to-t from-[#212121] via-[#212121] to-transparent pt-10">
      <div className="max-w-3xl mx-auto relative">
        <div className="flex items-end gap-2 bg-[#2f2f2f] rounded-2xl px-4 py-3 border border-[#3f3f3f]/50">
          {/* Text input */}
          <textarea
            ref={inputRef}
            value={query}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            rows={1}
            className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none resize-none text-sm leading-6 max-h-[150px]"
            style={{ height: "24px" }}
          />

          {/* Thinking toggle */}
          <button
            onClick={() => setThinking(!thinking)}
            className={`p-1.5 rounded-lg transition-colors shrink-0 ${
              thinking
                ? "text-amber-400 hover:text-amber-300"
                : "text-gray-500 hover:text-gray-400"
            }`}
            title={thinking ? "Thinking: ON" : "Thinking: OFF"}
          >
            <Lightbulb size={20} />
          </button>

          {/* Send button */}
          <button
            onClick={handleSubmit}
            disabled={!query.trim() || disabled}
            className={`p-1.5 rounded-lg transition-colors shrink-0 ${
              query.trim() && !disabled
                ? "bg-purple-500 text-white hover:bg-purple-400"
                : "bg-[#3f3f3f] text-gray-600"
            }`}
          >
            <ArrowUp size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
