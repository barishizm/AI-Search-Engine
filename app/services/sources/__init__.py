from app.config import Settings
from app.services.sources.brave_search import BraveSearchSource
from app.services.sources.spotify import SpotifySource
from app.services.sources.tmdb import TMDBSource


def get_source(name: str, settings: Settings):
    if name == "web":
        return BraveSearchSource(settings.brave_search_api_key, settings.max_results_per_source)
    elif name == "film":
        return TMDBSource(settings.tmdb_api_key, settings.max_results_per_source)
    elif name == "music":
        return SpotifySource(settings.spotify_client_id, settings.spotify_client_secret, settings.max_results_per_source)
    else:
        raise ValueError(f"Unknown source: {name}")
