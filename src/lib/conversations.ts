import { createClient } from "@/lib/supabase/client";
import type {
  Conversation,
  SearchMode,
  Source,
  StoredMessage,
} from "@/types";

export async function saveConversation(
  title: string,
  userId: string,
): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("conversations")
    .insert({ title, user_id: userId })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function saveMessage(params: {
  conversationId: string;
  query: string;
  answer: string | null;
  sources: Source[];
  thinking: boolean;
  mode: SearchMode;
}): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: params.conversationId,
      query: params.query,
      ai_summary: params.answer,
      results: params.sources,
      thinking: params.thinking,
      mode: params.mode,
    })
    .select("id")
    .single();
  if (error) throw error;
  // conversations.updated_at is touched by a DB trigger on message insert.
  return data.id;
}

export async function getConversations(
  userId: string,
): Promise<Conversation[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Conversation[];
}

export async function renameConversation(
  conversationId: string,
  title: string,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("conversations")
    .update({ title })
    .eq("id", conversationId);
  if (error) throw error;
}

export async function deleteConversation(
  conversationId: string,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("conversations")
    .delete()
    .eq("id", conversationId);
  if (error) throw error;
}

export async function getMessages(
  conversationId: string,
): Promise<StoredMessage[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as StoredMessage[];
}
