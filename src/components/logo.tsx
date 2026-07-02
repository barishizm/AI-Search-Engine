import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  iconClassName,
}: {
  className?: string;
  iconClassName?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-semibold tracking-tight",
        className,
      )}
    >
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground",
          iconClassName,
        )}
      >
        <Search className="size-3.5" strokeWidth={2.75} />
      </span>
      Limited Search
    </span>
  );
}
