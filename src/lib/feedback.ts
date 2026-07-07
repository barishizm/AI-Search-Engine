import { createClient } from "@/lib/supabase/client";

/** A DB-persisted row id is a real uuid; a not-yet-saved message keeps its local- id. */
export function isPersistedId(id: string): boolean {
  return !id.startsWith("local-");
}

export async function submitFeedback(params: {
  userId: string;
  conversationId: string | null;
  messageId: string | null;
  note: string;
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("feedback").insert({
    user_id: params.userId,
    conversation_id: params.conversationId,
    message_id: params.messageId,
    note: params.note.trim() || null,
  });
  if (error) throw error;
}
