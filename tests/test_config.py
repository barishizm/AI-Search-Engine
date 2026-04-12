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
