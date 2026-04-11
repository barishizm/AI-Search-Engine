import time

import httpx

TOKEN_URL = "https://accounts.spotify.com/api/token"
SEARCH_URL = "https://api.spotify.com/v1/search"


class SpotifySource:
    def __init__(self, client_id: str, client_secret: str, max_results: int) -> None:
        self.client_id = client_id
        self.client_secret = client_secret
        self.max_results = max_results
        self._token: str | None = None
        self._token_expires_at: float = 0.0

    async def _get_token(self) -> str:
        if self._token and time.time() < self._token_expires_at:
            return self._token

        async with httpx.AsyncClient() as client:
            response = await client.post(
                TOKEN_URL,
                data={"grant_type": "client_credentials"},
                auth=(self.client_id, self.client_secret),
            )
            response.raise_for_status()

        data = response.json()
        self._token = data["access_token"]
        self._token_expires_at = time.time() + data.get("expires_in", 3600)
        return self._token

    async def fetch(self, query: str) -> list[dict]:
        token = await self._get_token()
        params = {"q": query, "type": "track", "limit": min(self.max_results, 10)}
        headers = {"Authorization": f"Bearer {token}"}

        async with httpx.AsyncClient() as client:
            response = await client.get(
                SEARCH_URL, params=params, headers=headers
            )
            response.raise_for_status()

        tracks = response.json().get("tracks", {}).get("items", [])

        results = []
        for track in tracks:
            track_id = track.get("id", "")
            track_name = track.get("name", "")
            artists = track.get("artists", [])
            artist_name = artists[0]["name"] if artists else "Unknown"
            album = track.get("album", {})
            album_name = album.get("name", "")

            metadata = {
                "track_name": track_name,
                "artist_name": artist_name,
                "album_name": album_name,
                "release_date": album.get("release_date", ""),
                "spotify_url": track.get("external_urls", {}).get(
                    "spotify", ""
                ),
                "preview_url": track.get("preview_url"),
            }
            metadata = {k: v for k, v in metadata.items() if v is not None}

            results.append(
                {
                    "id": f"spotify-{track_id}",
                    "text": f"{track_name} by {artist_name}. Album: {album_name}",
                    "source": "music",
                    "metadata": metadata,
                }
            )

        return results
