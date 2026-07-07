import type { ChatMessage } from "@/hooks/use-chat";

/** Renders a finished conversation as a standalone Markdown document. */
export function conversationToMarkdown(messages: ChatMessage[]): string {
  const header = `# Limited Search conversation\n\n_Exported ${new Date().toISOString()}_`;

  const blocks = messages
    .filter((m) => m.status === "done")
    .map((m) => {
      const parts = [`## ${m.query}`];
      if (m.answer) parts.push(m.answer);
      if (m.sources.length > 0) {
        const list = m.sources
          .map((s) => `${s.id}. [${s.title || s.domain}](${s.url})`)
          .join("\n");
        parts.push(`**Sources:**\n${list}`);
      }
      return parts.join("\n\n");
    });

  return [header, ...blocks].join("\n\n---\n\n");
}

export function downloadMarkdown(markdown: string, filename: string): void {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
