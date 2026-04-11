import httpx

TMDB_SEARCH_URL = "https://api.themoviedb.org/3/search/movie"


class TMDBSource:
    def __init__(self, api_key: str, max_results: int) -> None:
        self.api_key = api_key
        self.max_results = max_results

    async def fetch(self, query: str) -> list[dict]:
        params = {
            "api_key": self.api_key,
            "query": query,
            "language": "en-US",
            "page": 1,
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(TMDB_SEARCH_URL, params=params)
            response.raise_for_status()

        movies = response.json().get("results", [])

        results = []
        for movie in movies[: self.max_results]:
            overview = movie.get("overview", "")
            if not overview:
                continue

            title = movie.get("title", "Untitled")
            tmdb_id = movie.get("id", 0)

            metadata = {
                "title": title,
                "release_date": movie.get("release_date", ""),
                "vote_average": movie.get("vote_average", 0.0),
                "poster_path": movie.get("poster_path", ""),
                "tmdb_id": tmdb_id,
            }
            metadata = {k: v for k, v in metadata.items() if v is not None}

            results.append(
                {
                    "id": f"tmdb-{tmdb_id}",
                    "text": f"{title}. {overview}",
                    "source": "film",
                    "metadata": metadata,
                }
            )

        return results
