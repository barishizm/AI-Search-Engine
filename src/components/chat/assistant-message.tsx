"use client";

import { useMemo, useState } from "react";
import { Streamdown } from "streamdown";
import type { ComponentProps } from "react";
import { Globe, RotateCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CITATION_HREF_PREFIX, injectCitations } from "@/lib/citations";
import type { ChatMessage } from "@/hooks/use-chat";
import { SourcesRow, sourceElementId } from "@/components/chat/sources-row";
import { ThinkingBlock } from "@/components/chat/thinking-block";

function CitationChip({
  id,
  onActivate,
}: {
  id: number;
  onActivate: (id: number) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onActivate(id)}
      className="mx-0.5 inline-flex size-4 -translate-y-0.5 items-center justify-center rounded-full bg-primary/10 align-middle text-[10px] font-semibold text-primary transition-colors hover:bg-primary/20"
      aria-label={`Source ${id}`}
    >
      {id}
    </button>
  );
}

export function AssistantMessage({
  message,
  onRetry,
  retryDisabled,
}: {
  message: ChatMessage;
  onRetry?: (id: string) => void;
  retryDisabled?: boolean;
}) {
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const streaming = message.status === "streaming";

  const markdown = useMemo(() => {
    if (message.status === "done" && message.supports.length > 0) {
      return injectCitations(message.answer, message.supports);
    }
    return message.answer;
  }, [message.answer, message.supports, message.status]);

  function activateSource(id: number) {
    setHighlightedId(id);
    document
      .getElementById(sourceElementId(message.id, id))
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => setHighlightedId(null), 1_600);
  }

  const components: ComponentProps<typeof Streamdown>["components"] = {
    a: (props) => {
      const href = props.href ?? "";
      if (href.startsWith(CITATION_HREF_PREFIX)) {
        const id = Number.parseInt(href.slice(CITATION_HREF_PREFIX.length), 10);
        if (Number.isFinite(id)) {
          return <CitationChip id={id} onActivate={activateSource} />;
        }
      }
      return (
        <a {...props} target="_blank" rel="noopener noreferrer">
          {props.children}
        </a>
      );
    },
  };

  if (message.status === "error") {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" />
        <div className="flex-1 space-y-2">
          <p>{message.errorMessage ?? "Something went wrong."}</p>
          {onRetry ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={retryDisabled}
              onClick={() => onRetry(message.id)}
            >
              <RotateCw className="size-3.5" />
              Retry
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {message.thinking && (message.thoughts || streaming) ? (
        <ThinkingBlock
          thoughts={message.thoughts}
          streaming={streaming && !message.answer}
        />
      ) : null}

      {message.searched ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Globe className="size-3.5" />
          Searched the web
        </p>
      ) : null}

      {message.answer ? (
        <Streamdown
          className="max-w-none [&_a]:text-primary [&_a]:underline-offset-4"
          parseIncompleteMarkdown
          components={components}
        >
          {markdown}
        </Streamdown>
      ) : streaming && !message.thoughts ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : null}

      {message.status === "done" && !message.answer && !message.searched ? (
        <p className="text-sm text-muted-foreground">
          No answer was produced. Try rephrasing your question.
        </p>
      ) : null}

      {message.sources.length > 0 || message.searchSuggestionHtml ? (
        <SourcesRow
          messageId={message.id}
          sources={message.sources}
          searchSuggestionHtml={message.searchSuggestionHtml}
          highlightedId={highlightedId}
        />
      ) : null}
    </div>
  );
}
