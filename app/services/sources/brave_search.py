import asyncio
import hashlib
import logging

import httpx

logger = logging.getLogger(__name__)

BRAVE_SEARCH_URL = "https://api.search.brave.com/res/v1/web/search"
MAX_RETRIES = 3
RETRY_DELAY = 1.0


class BraveSearchSource:
    def __init__(self, api_key: str, max_results: int) -> None:
        self.api_key = api_key
        self.max_results = max_results

    async def fetch(self, query: str) -> list[dict]:
        headers = {
            "Accept": "application/json",
            "X-Subscription-Token": self.api_key,
        }
        params = {
            "q": query,
            "count": self.max_results,
            "search_lang": "en",
        }

        async with httpx.AsyncClient() as client:
            response = await self._request_with_retry(client, headers, params)

        data = response.json()
        results = data.get("web", {}).get("results", [])

        if results:
            first = results[0]
            logger.info("Brave raw first result keys=%s title=%r url=%r",
                        list(first.keys()), first.get("title"), first.get("url"))

        return [
            {
                "id": hashlib.sha256(r["url"].encode()).hexdigest()[:16],
                "text": r.get("description", ""),
                "source": "web",
                "metadata": {
                    "url": r["url"],
                    "title": r.get("title", ""),
                    "description": r.get("description", ""),
                    "published": r.get("page_age", ""),
                },
            }
            for r in results
        ]

    async def _request_with_retry(
        self,
        client: httpx.AsyncClient,
        headers: dict,
        params: dict,
    ) -> httpx.Response:
        for attempt in range(MAX_RETRIES):
            try:
                response = await client.get(
                    BRAVE_SEARCH_URL, headers=headers, params=params
                )
                response.raise_for_status()
                return response
            except httpx.HTTPStatusError as exc:
                if exc.response.status_code in {429, *range(500, 600)}:
                    if attempt < MAX_RETRIES - 1:
                        await asyncio.sleep(RETRY_DELAY)
                        continue
                raise
