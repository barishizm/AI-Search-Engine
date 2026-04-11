"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Lightbulb, Plus, Search, X } from "lucide-react";

interface SearchInputProps {
  onSubmit: (query: string, thinking: boolean, performSearch: boolean) => void;
  disabled?: boolean;
  isLoggedIn?: boolean;
  sidebarWidth?: number;
}

export default function SearchInput({ onSubmit, disabled, isLoggedIn = false, sidebarWidth = 0 }: SearchInputProps) {
  const [query, setQuery] = useState("");
  const [thinking, setThinking] = useState(false);
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!isLoggedIn) {
      router.push("/auth/login");
      return;
    }
    const trimmed = query.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed, thinking, searchEnabled);
    setQuery("");
    if (inputRef.current) {
      inputRef.current.style.height = "24px";
    }
  }, [query, thinking, disabled, onSubmit, isLoggedIn, router, searchEnabled]);

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

  const toggleSearchMode = () => {
    if (!isLoggedIn) {
      router.push("/auth/login");
      return;
    }
    setSearchEnabled((prev) => !prev);
    setMenuOpen(false);
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
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => {
                if (!isLoggedIn) {
                  router.push("/auth/login");
                  return;
                }
                setMenuOpen((prev) => !prev);
              }}
              className={`p-1.5 rounded-lg transition-colors ${
                searchEnabled
                  ? "bg-white/10 text-white"
                  : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
              }`}
              title="Tools"
            >
              <Plus size={20} />
            </button>

            {menuOpen && (
              <div className="absolute bottom-full left-0 mb-2 min-w-[160px] rounded-xl border border-white/10 bg-[#262626] p-2 shadow-2xl">
                <button
                  type="button"
                  onClick={toggleSearchMode}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-gray-200 transition-colors hover:bg-white/5"
                >
                  <span className="inline-flex items-center gap-2">
                    <Search size={15} />
                    Search
                  </span>
                  {searchEnabled && <X size={14} className="text-gray-400" />}
                </button>
              </div>
            )}
          </div>

          {searchEnabled && (
            <button
              type="button"
              onClick={toggleSearchMode}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-gray-200 shrink-0"
            >
              <Search size={12} />
              Search
            </button>
          )}

          {/* Text input */}
          <textarea
            ref={inputRef}
            value={query}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onClick={handleInputClick}
            placeholder={
              isLoggedIn
                ? searchEnabled
                  ? "Search the web, films, and music..."
                  : "Ask anything..."
                : "Sign in to search..."
            }
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
