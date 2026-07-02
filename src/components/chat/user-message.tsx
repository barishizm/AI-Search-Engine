import { Lightbulb } from "lucide-react";

export function UserMessage({
  query,
  thinking,
}: {
  query: string;
  thinking: boolean;
}) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-secondary px-4 py-2.5 text-[15px] leading-6">
        {thinking ? (
          <span className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Lightbulb className="size-3" /> thinking
          </span>
        ) : null}
        <p className="whitespace-pre-wrap">{query}</p>
      </div>
    </div>
  );
}
