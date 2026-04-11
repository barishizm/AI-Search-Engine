"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Lightbulb } from "lucide-react";

interface SearchInputProps {
  onSubmit: (query: string, thinking: boolean) => void;
  disabled?: boolean;
  isLoggedIn?: boolean;
  sidebarWidth?: number;
}

export default function SearchInput({ onSubmit, disabled, isLoggedIn = false, sidebarWidth = 0 }: SearchInputProps) {
  const [query, setQuery] = useState("");
  const [thinking, setThinking] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  const handleSubmit = useCallback(() => {
    if (!isLoggedIn) {
      router.push("/auth/login");
      return;
    }
    const trimmed = query.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed, thinking);
    setQuery("");
    if (inputRef.current) {
      inputRef.current.style.height = "24px";
    }
  }, [query, thinking, disabled, onSubmit, isLoggedIn, router]);

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

  const handleInputClick = () => {
    if (!isLoggedIn) {
      router.push("/auth/login");
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 pb-6 bg-gradient-to-t from-[#212121] via-[#212121] to-transparent pt-10 transition-[padding-left] duration-300"
      style={{ paddingLeft: sidebarWidth + 16 }}>
      <div className="max-w-3xl mx-auto relative">
        {!isLoggedIn && (
          <p className="text-center text-gray-400 text-sm mb-2">
            Sign in to start searching
          </p>
        )}
        <div className="flex items-end gap-2 bg-[#2f2f2f] rounded-2xl px-4 py-3 border border-[#3f3f3f]/50">
          {/* Text input */}
          <textarea
            ref={inputRef}
            value={query}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onClick={handleInputClick}
            placeholder={isLoggedIn ? "Ask anything..." : "Sign in to search..."}
            readOnly={!isLoggedIn}
            rows={1}
            className={`flex-1 bg-transparent text-white placeholder-gray-500 outline-none resize-none text-sm leading-6 max-h-[150px] ${
              !isLoggedIn ? "cursor-pointer" : ""
            }`}
            style={{ height: "24px" }}
          />

          {/* Thinking toggle */}
          <button
            onClick={() => isLoggedIn && setThinking(!thinking)}
            disabled={!isLoggedIn}
            className={`p-1.5 rounded-lg transition-colors shrink-0 ${
              !isLoggedIn
                ? "text-gray-600 cursor-not-allowed"
                : thinking
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
            disabled={isLoggedIn ? (!query.trim() || disabled) : false}
            className={`p-1.5 rounded-lg transition-colors shrink-0 ${
              !isLoggedIn
                ? "bg-[#3f3f3f] text-gray-600 cursor-pointer"
                : query.trim() && !disabled
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
