"""Offset-preserving section-aware chunking of one normalized resume."""

import re
from dataclasses import dataclass

CHUNKER_VERSION = "chunk-v1"
_SECTION_NAMES = {
    "summary",
    "profile",
    "experience",
    "work experience",
    "professional experience",
    "work history",
    "employment history",
    "projects",
    "education",
    "skills",
    "technical skills",
    "certifications",
    "languages",
    "achievements",
    "references",
}


@dataclass(frozen=True)
class Chunk:
    index: int
    start_offset: int
    end_offset: int
    text: str
    version: str = CHUNKER_VERSION


def _boundaries(text: str) -> list[int]:
    boundaries = {match.end() for match in re.finditer(r"\n\s*\n", text)}
    offset = 0
    for line in text.splitlines(keepends=True):
        title = line.strip()
        if (
            title
            and len(title) <= 80
            and (
                title.endswith(":")
                or title.isupper()
                or title.startswith("#")
                or title.lower() in _SECTION_NAMES
            )
        ):
            boundaries.add(offset)
        offset += len(line)
    return sorted(boundaries)


def chunk_text(
    text: str, *, min_chars: int = 400, max_chars: int = 800, overlap: int = 100
) -> list[Chunk]:
    """Prefer blank lines/headings within the size range; otherwise split at a word.

    Small final chunks are allowed. Input is never normalized or stripped: offsets
    address the caller's exact string. Overlap is measured in characters.
    """
    if not 0 <= overlap < min_chars <= max_chars:
        raise ValueError("Require 0 <= overlap < min_chars <= max_chars")
    if not text.strip():
        return []
    boundaries = _boundaries(text)
    chunks = []
    start = 0
    while start < len(text):
        limit = min(start + max_chars, len(text))
        end = limit
        if limit < len(text):
            candidates = [point for point in boundaries if start + min_chars <= point <= limit]
            if candidates:
                end = candidates[-1]
            else:
                spaces = list(re.finditer(r"\s+", text[start + min_chars : limit]))
                if spaces:
                    end = start + min_chars + spaces[-1].end()
        chunks.append(Chunk(len(chunks), start, end, text[start:end]))
        if end == len(text):
            break
        start = end - overlap
    return chunks
