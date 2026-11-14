import json

from fastapi.testclient import TestClient

from tests.conftest import ORG, RESUME, FakeProvider, FakeStore, signed_post
from tests.test_text import LONG, make_text_pdf

OTHER_ORG = "99999999-9999-4999-8999-999999999999"
PARSE = "/internal/v1/documents/parse"
EXTRACT = "/internal/v1/documents/extract"


def test_parse_stores_normalized_text_under_org_prefix(
    client: TestClient, store: FakeStore
) -> None:
    key = f"org/{ORG}/resumes/{RESUME}"
    store.objects[key] = make_text_pdf(LONG)
    resp = signed_post(
        client,
        PARSE,
        {
            "organization_id": ORG,
            "resume_id": RESUME,
            "object_key": key,
            "mime_type": "application/pdf",
        },
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["extracted_text_key"] == f"org/{ORG}/extracted/{RESUME}/parse-v1.txt"
    assert body["ocr_used"] is False and body["page_count"] == 1
    assert "Python" in store.objects[body["extracted_text_key"]].decode()


def test_parse_rejects_key_of_another_org(client: TestClient, store: FakeStore) -> None:
    key = f"org/{OTHER_ORG}/resumes/{RESUME}"
    store.objects[key] = make_text_pdf(LONG)
    resp = signed_post(
        client,
        PARSE,
        {
            "organization_id": ORG,
            "resume_id": RESUME,
            "object_key": key,
            "mime_type": "application/pdf",
        },
    )
    assert resp.status_code == 403


def test_parse_corrupt_document_is_422(client: TestClient, store: FakeStore) -> None:
    key = f"org/{ORG}/resumes/{RESUME}"
    store.objects[key] = b"%PDF-1.4 garbage"
    resp = signed_post(
        client,
        PARSE,
        {
            "organization_id": ORG,
            "resume_id": RESUME,
            "object_key": key,
            "mime_type": "application/pdf",
        },
    )
    assert resp.status_code == 422


def test_extract_returns_validated_profile(
    client: TestClient, store: FakeStore, provider: FakeProvider
) -> None:
    key = f"org/{ORG}/extracted/{RESUME}/parse-v1.txt"
    store.objects[key] = b"Senior Backend Engineer, Python"
    resp = signed_post(
        client, EXTRACT, {"organization_id": ORG, "resume_id": RESUME, "extracted_text_key": key}
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["profile"]["skills"] == ["Python", "PostgreSQL"]
    assert body["prompt_version"] == "extract-slim-v1" and body["model"] == "fake-model"
    assert len(provider.calls) == 1
    system, user, schema = provider.calls[0]
    assert user.startswith("<cv_data>\nSenior Backend Engineer")
    assert "years_of_experience" in json.dumps(schema)


def test_extract_invalid_llm_json_is_502(
    client: TestClient, store: FakeStore, provider: FakeProvider
) -> None:
    provider.content = '{"headline": 1}'
    key = f"org/{ORG}/extracted/{RESUME}/parse-v1.txt"
    store.objects[key] = b"cv"
    resp = signed_post(
        client, EXTRACT, {"organization_id": ORG, "resume_id": RESUME, "extracted_text_key": key}
    )
    assert resp.status_code == 502


def test_extract_truncates_very_long_cv(
    client: TestClient, store: FakeStore, provider: FakeProvider
) -> None:
    key = f"org/{ORG}/extracted/{RESUME}/parse-v1.txt"
    store.objects[key] = ("x" * 20000).encode()
    resp = signed_post(
        client, EXTRACT, {"organization_id": ORG, "resume_id": RESUME, "extracted_text_key": key}
    )
    assert resp.json()["truncated"] is True
    assert len(provider.calls[0][1]) < 9000


def test_extract_rejects_foreign_text_key(client: TestClient) -> None:
    resp = signed_post(
        client,
        EXTRACT,
        {
            "organization_id": ORG,
            "resume_id": RESUME,
            "extracted_text_key": f"org/{OTHER_ORG}/extracted/x.txt",
        },
    )
    assert resp.status_code == 403
