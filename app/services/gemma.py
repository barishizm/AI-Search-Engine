import asyncio
import json
import logging

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

API_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

# Default fast model for intent classification calls
FAST_MODEL = "gemini-3.1-flash-lite-preview"

SYSTEM_PROMPT = (
    "You are a helpful AI assistant. Answer the user's question directly and "
    "concisely based on the search results provided. Always mention specific "
    "facts, dates, and numbers when available. End with sources used."
)

LOCAL_CHAT_RESPONSES = {
    "merhaba": "Merhaba! Sana nasil yardimci olabilirim?",
    "merhabalar": "Merhaba! Sana nasil yardimci olabilirim?",
    "selam": "Selam! Sana nasil yardimci olabilirim?",
    "gunaydin": "Gunaydin! Sana nasil yardimci olabilirim?",
    "iyi gunler": "Iyi gunler! Sana nasil yardimci olabilirim?",
    "iyi aksamlar": "Iyi aksamlar! Sana nasil yardimci olabilirim?",
    "nasilsin": "Iyiyim, tesekkurler! Sana nasil yardimci olabilirim?",
    "tesekkurler": "Rica ederim! Baska bir sey olursa buradayim.",
    "sag ol": "Rica ederim! Baska bir sey olursa buradayim.",
    "hosca kal": "Gorusuruz! Yardim gerekirse yine yaz.",
    "hello": "Hello! How can I help you?",
    "hi": "Hi! How can I help you?",
    "hey": "Hey! How can I help you?",
    "thanks": "You're welcome! Let me know if you'd like help with anything else.",
    "thank you": "You're welcome! Let me know if you'd like help with anything else.",
    "bye": "See you later! I'm here if you need anything else.",
}

TURKISH_HINTS = {
    "merhaba", "selam", "nasilsin", "tesekkurler", "sag ol",
    "gunaydin", "iyi", "hosca", "nasil", "yardim",
}


def format_results(results: list[dict]) -> str:
    lines: list[str] = []
    for i, r in enumerate(results[:5], 1):
        source = r.get("source", "unknown")
        meta = r.get("metadata") or {}
        title = meta.get("title") or r.get("title") or "No title"
        content = r.get("content", r.get("description", ""))[:300]
        lines.append(f"{i}. [{source}] {title}\n   {content}")
    return "\n\n".join(lines)


def normalize_text(text: str) -> str:
    translation = str.maketrans(
        {
            "ç": "c",
            "ğ": "g",
            "ı": "i",
            "ö": "o",
            "ş": "s",
            "ü": "u",
            "Ç": "c",
            "Ğ": "g",
            "İ": "i",
            "I": "i",
            "Ö": "o",
            "Ş": "s",
            "Ü": "u",
        }
    )
    normalized = text.strip().lower().translate(translation)
    return " ".join(normalized.rstrip("!?.").split())


class GemmaService:
    def __init__(self, api_key: str, model: str) -> None:
        self.api_key = api_key
        self.model = model

    def fallback_chat_response(self, query: str) -> str:
        normalized = normalize_text(query)
        direct = LOCAL_CHAT_RESPONSES.get(normalized)
        if direct:
            return direct

        if any(token in normalized.split() for token in TURKISH_HINTS):
            return "Su anda AI servisine ulasamiyorum. Istersen aramayi acip tekrar deneyebilirsin."

        return "I can't reach the AI service right now. You can try again or turn on search for web results."

    async def needs_search(self, query: str) -> bool:
        if not self.api_key:
            return True

        # Fast local check: common greetings and casual chat never need search
        _no_search = {
            "merhaba", "selam", "nasilsin", "tesekkurler", "iyi gunler",
            "hello", "hi", "hey", "thanks", "thank you", "bye", "gunaydin",
            "iyi aksamlar", "hosca kal", "sag ol", "merhabalar",
        }
        if normalize_text(query) in _no_search:
            logger.info("needs_search for '%s': NO (local shortcut)", query)
            return False

        prompt = (
            f'Is this a search query or casual conversation?\n'
            f'<user_query>{query}</user_query>\n'
            f'Reply YES if it needs internet search, NO if it\'s casual chat.\n'
            f'Answer:'
        )

        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": prompt}],
                }
            ],
            "generationConfig": {
                "maxOutputTokens": 3,
                "temperature": 0,
            },
        }

        # Use the fast lightweight model for classification
        url = API_URL.format(model=FAST_MODEL)

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await asyncio.wait_for(
                    client.post(
                        url,
                        params={"key": self.api_key},
                        headers={"Content-Type": "application/json"},
                        json=payload,
                    ),
                    timeout=5.0,
                )
                resp.raise_for_status()
                data = resp.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"].strip().upper()
                result = "YES" in text
                logger.info("needs_search for '%s': %s (raw=%s)", query, result, text)
                return result
        except (asyncio.TimeoutError, Exception) as exc:
            logger.warning("Intent detection timed out or failed: %s — skipping search", exc)
            return False

    async def select_sources(self, query: str) -> list[str]:
        """Use Gemma to decide which sources to search for a given query."""
        if not self.api_key:
            return ["web"]

        prompt = f"""Given this search query, decide which sources to search.
Available sources: web, film, music

Rules:
- "web": general questions, news, people, facts, current events
- "film": movies, series, directors, actors, cinema
- "music": songs, albums, artists, bands, concerts
- Always include "web" unless it's pure casual conversation
- Return ONLY a JSON array, nothing else. Example: ["web", "film"]

Query: <user_query>{query}</user_query>
Answer:"""

        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": prompt}],
                }
            ],
            "generationConfig": {
                "maxOutputTokens": 20,
            },
        }

        url = API_URL.format(model=self.model)

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    url,
                    params={"key": self.api_key},
                    headers={"Content-Type": "application/json"},
                    json=payload,
                )
                resp.raise_for_status()
                data = resp.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                sources = json.loads(text)
                if not isinstance(sources, list) or not sources:
                    raise ValueError(f"Invalid sources response: {text}")
                valid = {"web", "film", "music"}
                sources = [s for s in sources if s in valid]
                logger.info("select_sources for '%s': %s", query, sources)
                return sources if sources else ["web"]
        except httpx.HTTPStatusError as exc:
            logger.error(
                "Source selection failed: status=%s body=%s — defaulting to web",
                exc.response.status_code,
                exc.response.text[:500],
            )
            return ["web"]
        except Exception as exc:
            logger.error("Source selection failed: %r — defaulting to web", exc)
            return ["web"]

    async def summarize(
        self, query: str, results: list[dict], *, thinking: bool = False, search_performed: bool = True,
    ) -> str | None:
        if not self.api_key:
            logger.warning("Google AI API key not configured, skipping summary")
            return None

        thinking_prefix = "Think step by step carefully before answering.\n\n" if thinking else ""

        language_instruction = (
            f'CRITICAL INSTRUCTION: You MUST detect the language of this query: <user_query>{query}</user_query>\n'
            "Then you MUST respond ENTIRELY in that exact same language.\n"
            "This rule applies to ALL languages without exception - Turkish, German, French, Spanish, "
            "Arabic, Japanese, Chinese, Korean, Russian, Portuguese, Italian, Dutch, Polish, or any other language.\n"
            "Do NOT translate. Do NOT switch to English. Match the query language exactly."
        )

        if not search_performed:
            user_prompt = (
                f"{language_instruction}\n\n"
                f"{thinking_prefix}"
                f'Answer this conversationally without search results: <user_query>{query}</user_query>\n'
                "Be friendly, direct, and concise (2-3 sentences max).\n"
                "Do not show your reasoning. Do not use bullet points.\n\n"
                f"{language_instruction}"
            )
        else:
            user_prompt = (
                f"{language_instruction}\n\n"
                f'{thinking_prefix}Search results for: <user_query>{query}</user_query>\n\n'
                f"{format_results(results)}\n\n"
                f'Based only on the search results above, answer the question <user_query>{query}</user_query> in 2-3 sentences maximum.\n'
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
            logger.error(
                "Gemma API error: status=%s body=%s",
                exc.response.status_code,
                exc.response.text[:500],
            )
            return None
        except (httpx.RequestError, KeyError, IndexError) as exc:
            logger.error("Gemma API request failed: %r", exc)
            return None


_service: GemmaService | None = None


def get_gemma_service() -> GemmaService:
    global _service
    if _service is None:
        settings = get_settings()
        _service = GemmaService(
            api_key=settings.google_ai_api_key,
            model=settings.ai_model,
        )
    return _service
