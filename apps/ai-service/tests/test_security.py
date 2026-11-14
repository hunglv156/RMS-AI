import json
import time

from fastapi.testclient import TestClient

from tests.conftest import ORG, RESUME, signed_headers, signed_post

PATH = "/internal/v1/documents/parse"
PAYLOAD = {
    "organization_id": ORG,
    "resume_id": RESUME,
    "object_key": f"org/{ORG}/x",
    "mime_type": "application/pdf",
}


def test_missing_signature_is_401(client: TestClient) -> None:
    assert client.post(PATH, json=PAYLOAD).status_code == 401


def test_wrong_secret_is_401(client: TestClient) -> None:
    assert signed_post(client, PATH, PAYLOAD, secret="x" * 40).status_code == 401


def test_unknown_service_is_401(client: TestClient) -> None:
    assert signed_post(client, PATH, PAYLOAD, service_id="intruder").status_code == 401


def test_expired_timestamp_is_401(client: TestClient) -> None:
    resp = signed_post(client, PATH, PAYLOAD, timestamp=int(time.time()) - 3600)
    assert resp.status_code == 401


def test_tampered_body_is_401(client: TestClient) -> None:
    body = json.dumps(PAYLOAD).encode()
    headers = signed_headers("POST", PATH, body)
    tampered = json.dumps(
        {**PAYLOAD, "organization_id": "33333333-3333-4333-8333-333333333333"}
    ).encode()
    assert client.post(PATH, content=tampered, headers=headers).status_code == 401


def test_signature_cannot_be_replayed_on_another_endpoint(client: TestClient) -> None:
    body = json.dumps(PAYLOAD).encode()
    headers = signed_headers("POST", PATH, body)
    other = "/internal/v1/documents/extract"
    assert client.post(other, content=body, headers=headers).status_code == 401


def test_health_needs_no_signature(client: TestClient) -> None:
    assert client.get("/health").status_code == 200
