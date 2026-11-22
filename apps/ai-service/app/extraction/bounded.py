"""Killable PDF extraction; private pipes carry bytes and exact source metadata."""

import asyncio
import json
import os
import signal
import sys
from dataclasses import asdict

from app.extraction.document import (
    DocumentLimitError,
    EncryptedPDFError,
    ExtractedDocument,
    ExtractedPage,
    ExtractionLimits,
    InvalidPDFError,
    OCRError,
    extract_document,
)


class ExtractionTimeoutError(TimeoutError):
    """The extraction process exceeded its budget."""


async def extract_bounded(data: bytes, *, limits: ExtractionLimits, timeout_s: float):
    # The session includes Tesseract descendants: kill the whole process group.
    process = await asyncio.create_subprocess_exec(
        sys.executable,
        "-m",
        "app.extraction.bounded",
        json.dumps(asdict(limits)),
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.DEVNULL,
        start_new_session=True,
    )
    try:
        try:
            async with asyncio.timeout(timeout_s):
                output, _ = await process.communicate(data)
        except TimeoutError:
            raise ExtractionTimeoutError("Extraction deadline exceeded") from None
        if process.returncode:
            raise InvalidPDFError("Extraction process failed")
        try:
            result = json.loads(output)
        except (ValueError, UnicodeError):
            raise InvalidPDFError("Extraction process returned invalid output") from None
        if "error" in result:
            errors = {
                e.__name__: e
                for e in (DocumentLimitError, EncryptedPDFError, InvalidPDFError, OCRError)
            }
            raise errors.get(result["error"], InvalidPDFError)("PDF extraction failed")
        result["pages"] = tuple(ExtractedPage(**page) for page in result["pages"])
        result["flags"] = tuple(result["flags"])
        return ExtractedDocument(**result)
    finally:
        try:
            os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        await process.wait()


def main():
    try:
        document = extract_document(
            sys.stdin.buffer.read(), limits=ExtractionLimits(**json.loads(sys.argv[1]))
        )
        result = asdict(document)
    except (DocumentLimitError, EncryptedPDFError, InvalidPDFError, OCRError) as exc:
        result = {"error": type(exc).__name__}
    sys.stdout.write(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
