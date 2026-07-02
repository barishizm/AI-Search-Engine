"use client";

import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Source } from "@/types";

export function sourceElementId(messageId: string, sourceId: number) {
  return `msg-${messageId}-src-${sourceId}`;
}

export function SourcesRow({
  messageId,
  sources,
  searchSuggestionHtml,
  highlightedId,
}: {
  messageId: string;
  sources: Source[];
  searchSuggestionHtml: string | null;
  highlightedId: number | null;
}) {
  const linkable = sources.filter((s) => s.url);
  if (linkable.length === 0 && !searchSuggestionHtml) return null;

  return (
    <div className="space-y-3">
      {linkable.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Sources
          </p>
          <ol className="flex flex-wrap gap-1.5">
            {linkable.map((source) => (
              <li key={source.id} id={sourceElementId(messageId, source.id)}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "flex max-w-64 items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs transition-colors hover:bg-accent",
                    highlightedId === source.id &&
                      "border-primary ring-2 ring-primary/30",
                  )}
                >
                  <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                    {source.id}
                  </span>
                  <span className="truncate">
                    {source.title || source.domain || source.url}
                  </span>
                  <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
                </a>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
      {searchSuggestionHtml ? (
        // Google Search grounding display requirement: render the returned
        // search-suggestion widget unmodified.
        <div
          className="max-w-full overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: searchSuggestionHtml }}
        />
      ) : null}
    </div>
  );
}
