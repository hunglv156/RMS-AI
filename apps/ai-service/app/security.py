"""Xác thực lời gọi nội bộ từ NestJS bằng chữ ký HMAC.

Chữ ký = HMAC-SHA256(secret, "<service_id>\n<timestamp>\n<METHOD>\n<path>\n<sha256(body)>").
Gắn method/path để không replay sang endpoint khác; timestamp giới hạn cửa sổ replay.
"""

import hashlib
import hmac
import time

from fastapi import Depends, HTTPException, Request

from app.config import Settings, get_settings

ALLOWED_SERVICES = {"api"}


def sign(secret: str, service_id: str, timestamp: int, method: str, path: str, body: bytes) -> str:
    body_hash = hashlib.sha256(body).hexdigest()
    message = f"{service_id}\n{timestamp}\n{method.upper()}\n{path}\n{body_hash}"
    return hmac.new(secret.encode(), message.encode(), hashlib.sha256).hexdigest()


async def require_signature(request: Request, settings: Settings = Depends(get_settings)) -> str:
    service_id = request.headers.get("x-service-id", "")
    timestamp = request.headers.get("x-timestamp", "")
    signature = request.headers.get("x-signature", "")
    if service_id not in ALLOWED_SERVICES or not timestamp.isdigit() or not signature:
        raise HTTPException(status_code=401, detail="Missing or invalid signature headers")
    if abs(time.time() - int(timestamp)) > settings.hmac_max_skew_seconds:
        raise HTTPException(status_code=401, detail="Signature expired")
    body = await request.body()
    expected = sign(
        settings.ai_hmac_secret, service_id, int(timestamp), request.method, request.url.path, body
    )
    if not hmac.compare_digest(expected, signature):
        raise HTTPException(status_code=401, detail="Invalid signature")
    return service_id
