import axios from "axios";
import { SearchResponse, Conversation, ConversationMessage, MessageHistory } from "@/types";
import { supabase } from "@/lib/supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const client = axios.create({ baseURL: API_URL, timeout: 60_000 });

client.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (process.env.NODE_ENV === "development" && error.response?.status !== 401) {
      console.error("[API Error]", error.response?.status, error.message);
    }
    return Promise.reject(error);
  },
);

export async function search(
  query: string,
  thinking: boolean = false,
  performSearch: boolean = false,
  history?: MessageHistory[],
): Promise<SearchResponse> {
  const { data } = await client.post<SearchResponse>("/search/", {
    query,
    thinking,
    search: performSearch,
    history: history || [],
  });
  return data;
}

export async function ingest(
  query: string,
  sources: string[],
): Promise<void> {
  await client.post("/ingest/", { query, sources });
}

export async function checkHealth(): Promise<{
  status: string;
  chroma_connected: boolean;
  doc_count: number;
  ai_configured: boolean;
  ai_model: string;
}> {
  const { data } = await client.get("/health");
  return data;
}

// ── Supabase conversation persistence ──

export async function saveConversation(
  title: string,
  userId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("conversations")
    .insert({ title, user_id: userId })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function saveMessage(
  conversationId: string,
  query: string,
  aiSummary: string | null,
  results: unknown[],
  thinking: boolean,
): Promise<string> {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      query,
      ai_summary: aiSummary,
      results,
      thinking,
    })
    .select("id")
    .single();

  if (error) throw error;

  // touch the conversation's updated_at
  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  return data.id;
}

export async function getConversations(
  userId: string,
): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data as Conversation[];
}

export async function getMessages(
  conversationId: string,
): Promise<ConversationMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data as ConversationMessage[];
}
