"use client";

interface MessageBubbleProps {
  query: string;
  thinking: boolean;
}

export default function MessageBubble({ query, thinking }: MessageBubbleProps) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] sm:max-w-[70%]">
        <div className="bg-purple-500/20 text-white rounded-2xl rounded-br-md px-4 py-2.5 text-sm">
          {query}
        </div>
        {thinking && (
          <div className="flex items-center justify-end gap-2 mt-1 text-xs text-gray-500">
            <span className="text-amber-400/70">💡 thinking</span>
          </div>
        )}
      </div>
    </div>
  );
}
