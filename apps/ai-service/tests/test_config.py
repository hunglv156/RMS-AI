import json

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


def test_settings_load_values_from_env_file(tmp_path) -> None:
    env_file = tmp_path / ".env"
    env_file.write_text(
        "GEMINI_MODEL=gemini-test\nAI_SERVICE_PORT=8123\nGEMINI_API_KEY=file-secret\n",
        encoding="utf-8",
    )

    settings = Settings(_env_file=env_file)

    assert settings.gemini_model == "gemini-test"
    assert settings.ai_service_port == 8123
    assert settings.gemini_api_key is not None
    assert settings.gemini_api_key.get_secret_value() == "file-secret"


def test_secret_fields_are_masked_and_json_dump_does_not_reveal_values() -> None:
    secrets = {
        "DATABASE_URL": "db-secret",
        "S3_ACCESS_KEY": "access-secret",
        "S3_SECRET_KEY": "s3-secret",
        "GEMINI_API_KEY": "gemini-secret",
    }
    settings = Settings(_env_file=None, **secrets)

    assert all(secret not in repr(settings) for secret in secrets.values())
    assert all(secret not in str(settings) for secret in secrets.values())
    dumped = json.dumps(settings.model_dump(mode="json"))
    assert all(secret not in dumped for secret in secrets.values())
    assert settings.database_url is not None
    assert settings.database_url.get_secret_value() == secrets["DATABASE_URL"]
    assert settings.s3_access_key is not None
    assert settings.s3_access_key.get_secret_value() == secrets["S3_ACCESS_KEY"]
    assert settings.s3_secret_key is not None
    assert settings.s3_secret_key.get_secret_value() == secrets["S3_SECRET_KEY"]
    assert settings.gemini_api_key is not None
    assert settings.gemini_api_key.get_secret_value() == secrets["GEMINI_API_KEY"]
