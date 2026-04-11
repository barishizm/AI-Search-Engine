import logging

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

API_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

SYSTEM_PROMPT = (
    "You are a helpful AI assistant. Answer the user's question directly and "
    "concisely based on the search results provided. Always mention specific "
    "facts, dates, and numbers when available. End with sources used."
)


def format_results(results: list[dict]) -> str:
    lines: list[str] = []
    for i, r in enumerate(results[:5], 1):
        source = r.get("source", "unknown")
        title = r.get("title", "No title")
        content = r.get("content", r.get("description", ""))[:300]
        lines.append(f"{i}. [{source}] {title}\n   {content}")
    return "\n\n".join(lines)


class GemmaService:
    def __init__(self, api_key: str, model: str) -> None:
        self.api_key = api_key
        self.model = model

    async def summarize(self, query: str, results: list[dict], *, thinking: bool = False) -> str | None:
        if not self.api_key:
            logger.warning("Google AI API key not configured, skipping summary")
            return None

        thinking_prefix = "Think step by step carefully before answering.\n\n" if thinking else ""

        language_instruction = (
            f'CRITICAL INSTRUCTION: You MUST detect the language of this query: "{query}"\n'
            "Then you MUST respond ENTIRELY in that exact same language.\n"
            "This rule applies to ALL languages without exception - Turkish, German, French, Spanish, "
            "Arabic, Japanese, Chinese, Korean, Russian, Portuguese, Italian, Dutch, Polish, or any other language.\n"
            "Do NOT translate. Do NOT switch to English. Match the query language exactly."
        )

        user_prompt = (
            f"{language_instruction}\n\n"
            f'{thinking_prefix}Search results for: "{query}"\n\n'
            f"{format_results(results)}\n\n"
            f'Based only on the search results above, answer the question "{query}" in 2-3 sentences maximum.\n'
            "Be direct. Do not show your reasoning. Do not use bullet points. Do not repeat the question.\n"
            'If results are not relevant, say: "No relevant results found for this query."\n\n'
            f"{language_instruction}"
        )

        settings = get_settings()
        max_tokens = 1000 if thinking else settings.summary_max_tokens
        payload = {
            "systemInstruction": {
                "parts": [{"text": SYSTEM_PROMPT}],
            },
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": user_prompt}],
                }
            ],
            "generationConfig": {
                "maxOutputTokens": max_tokens,
            },
        }

        url = API_URL.format(model=self.model)

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(
                    url,
                    params={"key": self.api_key},
                    headers={"Content-Type": "application/json"},
                    json=payload,
                )
                resp.raise_for_status()
                data = resp.json()
                parts = data["candidates"][0]["content"]["parts"]
                # Filter out thinking/reasoning parts (thought: true)
                answer_parts = [p["text"] for p in parts if not p.get("thought")]
                return answer_parts[-1] if answer_parts else parts[-1]["text"]
        except httpx.HTTPStatusError as exc:
            logger.error("Gemma API HTTP error %s: %s", exc.response.status_code, exc.response.text)
            return None
        except (httpx.RequestError, KeyError, IndexError) as exc:
            logger.error("Gemma API request failed: %s", exc)
            return None


_service: GemmaService | None = None


def get_gemma_service() -> GemmaService:
    global _service
    if _service is None:
        settings = get_settings()
        _service = GemmaService(
            api_key=settings.google_ai_api_key,
            model=settings.gemma_model,
        )
    return _service
