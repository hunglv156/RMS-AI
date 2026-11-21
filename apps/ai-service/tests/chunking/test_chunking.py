from itertools import pairwise
from pathlib import Path

import pytest

from app.chunking import chunk_text


def assert_invariants(text, **kwargs):
    chunks = chunk_text(text, **kwargs)
    assert chunks == chunk_text(text, **kwargs)
    covered = set()
    for index, chunk in enumerate(chunks):
        assert chunk.index == index
        assert chunk.version == "chunk-v1"
        assert 0 <= chunk.start_offset < chunk.end_offset <= len(text)
        assert chunk.text == text[chunk.start_offset : chunk.end_offset]
        assert len(chunk.text) <= kwargs.get("max_chars", 800)
        covered.update(range(chunk.start_offset, chunk.end_offset))
    assert all(i in covered for i, char in enumerate(text) if not char.isspace())
    return chunks


@pytest.mark.parametrize("text", ["", " \n\t", "A", "x" * 2001, "résumé\n\n" * 500])
def test_offsets_and_coverage(text):
    assert_invariants(text)


def test_sections_and_overlap():
    text = "a" * 450 + "\n\nSKILLS\n" + "b" * 700
    chunks = assert_invariants(text)
    assert chunks[0].end_offset == 452
    assert chunks[1].start_offset == 352


def test_configurable_sizes():
    chunks = assert_invariants("word " * 100, min_chars=40, max_chars=80, overlap=10)
    assert all(40 <= len(chunk.text) <= 80 for chunk in chunks[:-1])
    assert all(a.end_offset - b.start_offset == 10 for a, b in pairwise(chunks))


@pytest.mark.parametrize("kwargs", [{"overlap": 400}, {"min_chars": 0}, {"max_chars": 100}])
def test_invalid_sizes(kwargs):
    with pytest.raises(ValueError):
        chunk_text("resume", **kwargs)


def test_real_eval_texts():
    paths = sorted(Path("/Users/hung/Study/RMS-AI/data/eval/text").glob("*.txt"))
    if not paths:
        pytest.skip("External read-only eval texts are absent")
    for path in paths:
        assert_invariants(path.read_text())


def test_title_case_heading_and_crlf():
    text = "x" * 450 + "\r\nWork Experience\r\n" + "project work " * 90
    chunks = assert_invariants(text)
    assert chunks[0].end_offset == 452
