import { GoogleGenAI, type GroundingMetadata } from "@google/genai";
import { buildConfig, buildContents, modelFor } from "@/lib/gemini";
import { mapSources, mapSupports } from "@/lib/grounding";
import { consumeRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import type {
  HistoryTurn,
  SearchRequestBody,
  StreamErrorCode,
} from "@/types";

export const runtime = "nodejs";
// Hobby fluid compute allows up to 300s; 120s bounds runaway quota burn.
export const maxDuration = 120;

const MAX_QUERY_CHARS = 4_000;

function parseBody(raw: unknown): SearchRequestBody | null {
  if (typeof raw !== "object" || raw === null) return null;
  const body = raw as Record<string, unknown>;

  if (typeof body.query !== "string") return null;
  const query = body.query.trim();
  if (query.length === 0 || query.length > MAX_QUERY_CHARS) return null;

  const mode = body.mode === "search" ? "search" : body.mode === "chat" ? "chat" : null;
  if (!mode) return null;

  const thinking = body.thinking === true;

  const history: HistoryTurn[] = [];
  if (Array.isArray(body.history)) {
    for (const turn of body.history.slice(-6)) {
      if (
        typeof turn === "object" &&
        turn !== null &&
        ((turn as HistoryTurn).role === "user" ||
          (turn as HistoryTurn).role === "model") &&
        typeof (turn as HistoryTurn).text === "string"
      ) {
        history.push({
          role: (turn as HistoryTurn).role,
          text: (turn as HistoryTurn).text,
        });
      }
    }
  }

  return { query, mode, thinking, history };
}

function classifyError(e: unknown): {
  code: StreamErrorCode;
  message: string;
} {
  const err = e as { name?: string; message?: string; status?: number };
  const message = err?.message ?? "";

  if (err?.name === "AbortError" || err?.name === "TimeoutError") {
    return { code: "timeout", message: "The answer took too long and was cut off." };
  }
  if (err?.status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(message)) {
    return {
      code: "quota_exhausted",
      message:
        "The free AI quota is exhausted for now. Try chat mode, or come back later.",
    };
  }
  if (/SAFETY|PROHIBITED|blocked/i.test(message)) {
    return {
      code: "blocked",
      message: "The response was blocked by the model's safety filters.",
    };
  }
  return { code: "internal", message: "Something went wrong while answering." };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) {
    return Response.json(
      { code: "unauthorized", message: "Sign in to search." },
      { status: 401 },
    );
  }

  let body: SearchRequestBody | null = null;
  try {
    body = parseBody(await request.json());
  } catch {
    body = null;
  }
  if (!body) {
    return Response.json(
      { code: "invalid_request", message: "Invalid request body." },
      { status: 400 },
    );
  }

  const rate = await consumeRateLimit(supabase, body.mode);
  if (!rate.allowed) {
    return Response.json(
      {
        code: "rate_limited",
        message: "You're going a bit fast — try again shortly.",
        retryAfterSec: rate.retryAfterSec,
      },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } },
    );
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  const encoder = new TextEncoder();
  const { query, mode, thinking, history } = body;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          // Stream already closed (client disconnected) — drop the event.
        }
      };

      const abort = AbortSignal.any([
        request.signal,
        AbortSignal.timeout((maxDuration - 10) * 1_000),
      ]);

      let answer = "";
      let grounding: GroundingMetadata | undefined;
      let sourcesSent = false;
      let finishReason = "STOP";

      try {
        const model = modelFor(mode);
        const responses = await ai.models.generateContentStream({
          model,
          contents: buildContents(history, query),
          config: buildConfig(model, mode, thinking, abort),
        });

        for await (const chunk of responses) {
          if (chunk.promptFeedback?.blockReason) {
            send("error", {
              code: "blocked",
              message: "The request was blocked by the model's safety filters.",
            });
            controller.close();
            return;
          }

          const candidate = chunk.candidates?.[0];
          for (const part of candidate?.content?.parts ?? []) {
            if (!part.text) continue;
            if (part.thought) {
              send("thought", { t: part.text });
            } else {
              answer += part.text;
              send("delta", { t: part.text });
            }
          }

          // Grounding metadata accumulates across chunks; last one wins.
          if (candidate?.groundingMetadata) {
            grounding = candidate.groundingMetadata;
            if (!sourcesSent && grounding.groundingChunks?.length) {
              send("sources", mapSources(grounding));
              sourcesSent = true;
            }
          }

          if (candidate?.finishReason) {
            finishReason = candidate.finishReason;
          }
        }

        if (
          finishReason === "SAFETY" ||
          finishReason === "PROHIBITED_CONTENT"
        ) {
          send("error", {
            code: "blocked",
            message: "The response was blocked by the model's safety filters.",
          });
          controller.close();
          return;
        }

        const searched = Boolean(grounding?.groundingChunks?.length);
        if (grounding && searched) {
          // Final, complete version of the sources plus citation offsets.
          send("sources", mapSources(grounding));
          send("citations", { supports: mapSupports(grounding, answer) });
        }
        send("done", { finishReason, searched });
      } catch (e) {
        send("error", classifyError(e));
      } finally {
        try {
          controller.close();
        } catch {
          // Already closed.
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
