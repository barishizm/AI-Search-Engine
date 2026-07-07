import { describe, expect, it } from "vitest";
import type { ChatMessage } from "@/hooks/use-chat";
import { conversationToMarkdown } from "./export";

function doneMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: "1",
    query: "What is the capital of Turkey?",
    answer: "Ankara is the capital of Turkey.",
    thoughts: "",
    sources: [],
    supports: [],
    searchSuggestionHtml: null,
    mode: "search",
    thinking: false,
    searched: true,
    status: "done",
    ...overrides,
  };
}

describe("conversationToMarkdown", () => {
  it("renders the query and answer for each finished message", () => {
    const md = conversationToMarkdown([doneMessage()]);
    expect(md).toContain("## What is the capital of Turkey?");
    expect(md).toContain("Ankara is the capital of Turkey.");
  });

  it("lists sources when present", () => {
    const md = conversationToMarkdown([
      doneMessage({
        sources: [
          { id: 1, title: "Wikipedia", url: "https://en.wikipedia.org/x", domain: "wikipedia.org" },
        ],
      }),
    ]);
    expect(md).toContain("**Sources:**");
    expect(md).toContain("1. [Wikipedia](https://en.wikipedia.org/x)");
  });

  it("excludes streaming and errored messages", () => {
    const md = conversationToMarkdown([
      doneMessage(),
      doneMessage({
        id: "2",
        query: "still streaming",
        status: "streaming",
      }),
      doneMessage({
        id: "3",
        query: "failed one",
        answer: "",
        status: "error",
        errorMessage: "boom",
      }),
    ]);
    expect(md).not.toContain("still streaming");
    expect(md).not.toContain("failed one");
  });
});
