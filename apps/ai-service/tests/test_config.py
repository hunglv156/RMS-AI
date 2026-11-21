from app.config import Settings


def test_settings_defaults() -> None:
    settings = Settings(_env_file=None)

    assert settings.gemini_model == "gemini-3.8-flash-high"
    assert settings.ai_service_host == "127.0.0.1"
    assert settings.ai_service_port == 8100
    assert settings.gemini_api_key is None


def test_gemini_api_key_is_not_exposed_by_repr() -> None:
    settings = Settings(_env_file=None, GEMINI_API_KEY="top-secret")

    assert "top-secret" not in repr(settings)
