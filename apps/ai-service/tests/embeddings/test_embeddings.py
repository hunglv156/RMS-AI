import os
import sys
from types import SimpleNamespace

import numpy as np
import pytest

from app.chunking import chunk_text
from app.embeddings import BgeM3Embedder, FakeEmbedder, embed_chunks


def test_fake_deterministic_normalized():
    model = FakeEmbedder()
    vectors = model.embed(["Python developer", "", "Python developer"])
    assert vectors.shape == (3, model.dimension)
    np.testing.assert_array_equal(
        vectors, FakeEmbedder().embed(["Python developer", "", "Python developer"])
    )
    np.testing.assert_allclose(np.linalg.norm(vectors, axis=1), [1, 0, 1], atol=1e-6)
    assert model.embed([]).shape == (0, model.dimension)


def test_chunk_snapshot():
    chunks = chunk_text("Python backend")
    index = embed_chunks(chunks, FakeEmbedder())
    assert index.chunks == tuple(chunks)
    assert index.model_id == "fake-sha256"
    assert index.version == "fake-v1"
    assert not index.vectors.flags.writeable


@pytest.mark.parametrize("mps,expected", [(False, "cpu"), (True, "mps")])
def test_bge_lazy_auto_device(monkeypatch, mps, expected):
    calls = []

    class Model:
        def __init__(self, model_id, **kwargs):
            calls.append((model_id, kwargs))

        def encode(self, texts, **kwargs):
            return np.ones((len(texts), 1024))

    monkeypatch.setitem(
        sys.modules,
        "torch",
        SimpleNamespace(backends=SimpleNamespace(mps=SimpleNamespace(is_available=lambda: mps))),
    )
    monkeypatch.setitem(
        sys.modules, "sentence_transformers", SimpleNamespace(SentenceTransformer=Model)
    )
    embedder = BgeM3Embedder(revision="commit-sha")
    assert calls == []
    assert embedder.embed([]).shape == (0, 1024)
    assert calls == []
    vectors = embedder.embed(["Python"])
    embedder.embed(["SQL"])
    assert calls == [("BAAI/bge-m3", {"revision": "commit-sha", "device": expected})]
    np.testing.assert_allclose(np.linalg.norm(vectors, axis=1), [1])


@pytest.mark.slow
@pytest.mark.skipif(os.getenv("RUN_SLOW_EMBEDDINGS") != "1", reason="Opt in to real model download")
def test_real_bge_m3():
    model = BgeM3Embedder()
    vectors = model.embed(["Python backend", "HR recruitment"])
    assert vectors.shape == (2, 1024)
    assert np.isfinite(vectors).all()
    np.testing.assert_allclose(np.linalg.norm(vectors, axis=1), [1, 1], atol=1e-5)
