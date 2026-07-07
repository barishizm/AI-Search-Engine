"use client";

import { useEffect, useRef } from "react";
import { AssistantMessage } from "@/components/chat/assistant-message";
import { UserMessage } from "@/components/chat/user-message";
import type { ChatMessage } from "@/hooks/use-chat";

export function MessageList({
  messages,
  onRetry,
  retryDisabled,
  userId,
  conversationId,
}: {
  messages: ChatMessage[];
  onRetry?: (id: string) => void;
  retryDisabled?: boolean;
  userId: string;
  conversationId: string | null;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastMessage = messages[messages.length - 1];

  useEffect(() => {
    // Follow new exchanges; while streaming, stay pinned near the bottom.
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages.length, lastMessage?.status]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-6">
      {messages.map((message) => (
        <div key={message.id} className="flex flex-col gap-4">
          <UserMessage query={message.query} thinking={message.thinking} />
          <AssistantMessage
            message={message}
            onRetry={onRetry}
            retryDisabled={retryDisabled}
            userId={userId}
            conversationId={conversationId}
          />
        </div>
      ))}
      <div ref={bottomRef} className="h-px" />
    </div>
  );
}
