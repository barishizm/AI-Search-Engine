export interface SearchResultMetadata {
  url?: string;
  title?: string;
  description?: string;
  published?: string;
  poster_path?: string;
  vote_average?: number;
  release_date?: string;
  track_name?: string;
  artist_name?: string;
  album_name?: string;
  spotify_url?: string;
  preview_url?: string;
}

export interface SearchResult {
  id: string;
  content: string;
  source: "web" | "film" | "music";
  score: number;
  metadata: SearchResultMetadata;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  total_found: number;
  ai_summary: string | null;
  searched: boolean;
}

export interface IngestRequest {
  query: string;
  sources: string[];
}

export interface Conversation {
  id: string;
  title: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  query: string;
  ai_summary: string | null;
  results: SearchResult[];
  thinking: boolean;
  created_at: string;
}
