import pytest

from app.config import Settings


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        ("release", False),
        ("production", False),
        ("prod", False),
        ("dev", True),
        ("development", True),
        ("debug", True),
    ],
)
def test_settings_parses_debug_aliases(monkeypatch, value: str, expected: bool):
    monkeypatch.setenv("DEBUG", value)

    settings = Settings(_env_file=None)

    assert settings.debug is expected


@pytest.mark.parametrize(
    "env_name",
    [
        "GOOGLE_AI_API_KEY",
        "GEMINI_API_KEY",
        "GOOGLE_API_KEY",
        "GOOGLE_GENERATIVE_AI_API_KEY",
    ],
)
def test_settings_accepts_google_ai_key_aliases(monkeypatch, env_name: str):
    monkeypatch.delenv("GOOGLE_AI_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    monkeypatch.delenv("GOOGLE_GENERATIVE_AI_API_KEY", raising=False)
    monkeypatch.setenv(env_name, "test-key")

    settings = Settings(_env_file=None)

    assert settings.google_ai_api_key == "test-key"
    assert settings.ai_configured is True
