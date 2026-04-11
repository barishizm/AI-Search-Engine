import axios from "axios";
import { SearchResponse } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const client = axios.create({ baseURL: API_URL, timeout: 60_000 });

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (process.env.NODE_ENV === "development") {
      console.error("[API Error]", error.response?.status, error.message);
    }
    return Promise.reject(error);
  },
);

export async function search(
  query: string,
  thinking: boolean = false,
): Promise<SearchResponse> {
  const { data } = await client.post<SearchResponse>("/search/", {
    query,
    thinking,
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
}> {
  const { data } = await client.get("/health");
  return data;
}
