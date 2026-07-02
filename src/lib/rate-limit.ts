import type { SupabaseClient } from "@supabase/supabase-js";
import type { SearchMode } from "@/types";

const LIMITS: Record<
  SearchMode,
  { action: string; max: number; windowSeconds: number }[]
> = {
  search: [
    { action: "search:min", max: 10, windowSeconds: 60 },
    { action: "search:day", max: 150, windowSeconds: 86_400 },
  ],
  chat: [
    { action: "chat:min", max: 20, windowSeconds: 60 },
    { action: "chat:day", max: 500, windowSeconds: 86_400 },
  ],
};

export async function consumeRateLimit(
  supabase: SupabaseClient,
  mode: SearchMode,
): Promise<{ allowed: boolean; retryAfterSec: number }> {
  for (const limit of LIMITS[mode]) {
    const { data, error } = await supabase.rpc("consume_rate_limit", {
      p_action: limit.action,
      p_max: limit.max,
      p_window_seconds: limit.windowSeconds,
    });
    // Fail open on infra errors — the Gemini quota is the hard backstop.
    if (error) continue;
    const result = data as { allowed: boolean; retry_after_sec: number };
    if (result && result.allowed === false) {
      return { allowed: false, retryAfterSec: result.retry_after_sec ?? 60 };
    }
  }
  return { allowed: true, retryAfterSec: 0 };
}
