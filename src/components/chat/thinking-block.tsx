"use client";

import { useState } from "react";
import { Brain, ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export function ThinkingBlock({
  thoughts,
  streaming,
}: {
  thoughts: string;
  streaming: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open || streaming} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
        <Brain className={cn("size-3.5", streaming && "animate-pulse")} />
        {streaming ? "Thinking…" : "Thought process"}
        <ChevronDown
          className={cn(
            "size-3 transition-transform",
            (open || streaming) && "rotate-180",
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 border-l-2 border-border pl-3 text-sm leading-6 text-muted-foreground">
          <p className="whitespace-pre-wrap">{thoughts}</p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
