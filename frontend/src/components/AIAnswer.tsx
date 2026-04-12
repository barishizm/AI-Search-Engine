"use client";

import { useEffect, useState, useRef } from "react";
import { SearchResult } from "@/types";
import ResultCard from "./ResultCard";

interface AIAnswerProps {
  summary: string | null;
  results: SearchResult[];
  status: "loading" | "done";
  searched: boolean;
}

/**
 * Parse the AI summary to extract inline source references and the clean text.
 * Looks for a trailing "Sources: 1, 2, 4" line and converts it into superscript
 * citation numbers embedded after the last sentence of the answer text.
 */
function parseSources(text: string): {
  cleanText: string;
  sourceNumbers: number[];
} {
  // Match patterns like "Sources: 1, 2, 4" or "Sources: 1,2,4" at the end
  const sourcesMatch = text.match(/\n?\s*Sources?:\s*([\d,\s]+)\s*$/i);
  if (!sourcesMatch) {
    return { cleanText: text, sourceNumbers: [] };
  }

  const cleanText = text.slice(0, sourcesMatch.index).trimEnd();
  const sourceNumbers = sourcesMatch[1]
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n));

  return { cleanText, sourceNumbers };
}

export default function AIAnswer({ summary, results, status, searched }: AIAnswerProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [typingDone, setTypingDone] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const fullText = summary || "";
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  useEffect(() => {
    setDisplayedText("");
    setTypingDone(false);
    setSourcesOpen(false);

    if (!fullText || status === "loading") return;

    let index = 0;
    intervalRef.current = setInterval(() => {
      index += 3;
      if (index >= fullText.length) {
        setDisplayedText(fullText);
        setTypingDone(true);
        if (intervalRef.current) clearInterval(intervalRef.current);
      } else {
        setDisplayedText(fullText.slice(0, index));
      }
    }, 20);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fullText, status]);

  const { cleanText, sourceNumbers } = typingDone
    ? parseSources(displayedText)
    : { cleanText: displayedText, sourceNumbers: [] };

  const handleCitationClick = (num: number) => {
    // Open the sources panel if closed
    if (!sourcesOpen) setSourcesOpen(true);

    // Scroll to and highlight the card
    setTimeout(() => {
      const el = cardRefs.current.get(num);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
        el.classList.add("ring-2", "ring-purple-400/60");
        setTimeout(() => {
          el.classList.remove("ring-2", "ring-purple-400/60");
        }, 1500);
      }
    }, sourcesOpen ? 0 : 350); // wait for expand animation
  };

  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] sm:max-w-[80%]">
        {/* Loading state */}
        {status === "loading" && (
          <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
            <span className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
            </span>
          </div>
        )}

        {/* AI Summary with typewriter + inline citations */}
        {status === "done" && fullText && (
          <div className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
            {cleanText}
            {/* Inline citation superscripts */}
            {typingDone && sourceNumbers.length > 0 && (
              <span className="inline-flex gap-1 ml-1.5 align-baseline">
                {sourceNumbers.map((num) => (
                  <button
                    key={num}
                    onClick={() => handleCitationClick(num)}
                    className="inline-flex items-center justify-center text-[10px] font-medium text-purple-300 hover:text-purple-200 bg-purple-500/15 hover:bg-purple-500/25 rounded px-1 py-0.5 min-w-[18px] transition-colors cursor-pointer leading-none"
                    title={`Source ${num}`}
                  >
                    {num}
                  </button>
                ))}
              </span>
            )}
            {!typingDone && (
              <span className="inline-block w-0.5 h-4 bg-purple-400 ml-0.5 align-middle animate-blink" />
            )}
          </div>
        )}

        {/* Searched the web badge */}
        {status === "done" && searched && (
          <div className="mt-2 text-xs text-gray-500">
            🌐 Searched the web
          </div>
        )}

        {/* No summary fallback */}
        {status === "done" && !fullText && results.length > 0 && (
          <p className="text-sm text-gray-400">Here are the results I found:</p>
        )}

        {status === "done" && !fullText && results.length === 0 && searched && (
          <p className="text-sm text-gray-400">No results found. Try a different query.</p>
        )}

        {status === "done" && !fullText && results.length === 0 && !searched && (
          <p className="text-sm text-gray-400">I couldn't generate a response right now. Please try again.</p>
        )}

        {/* Collapsible result cards */}
        {status === "done" && results.length > 0 && (
          <div className="mt-3">
            {/* Toggle button */}
            <button
              onClick={() => setSourcesOpen((prev) => !prev)}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors cursor-pointer py-1"
            >
              {sourcesOpen
                ? `Hide sources ▲`
                : `Show ${results.length} source${results.length !== 1 ? "s" : ""} ▼`}
            </button>

            {/* Expandable cards container */}
            <div
              className="overflow-hidden transition-all duration-300 ease-in-out"
              style={{
                maxHeight: sourcesOpen ? `${results.length * 320}px` : "0px",
                opacity: sourcesOpen ? 1 : 0,
              }}
            >
              <div className="flex gap-3 overflow-x-auto scrollbar-hide px-1 pb-2 pt-2 -mx-1">
                {results.map((result, index) => (
                  <div
                    key={result.id}
                    ref={(el) => {
                      if (el) cardRefs.current.set(index + 1, el);
                    }}
                    className="transition-all duration-300 rounded-xl"
                  >
                    <ResultCard result={result} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
