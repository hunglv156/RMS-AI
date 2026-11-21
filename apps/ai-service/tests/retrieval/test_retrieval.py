import json
import math
from dataclasses import replace

import numpy as np
import pytest

from app.chunking import Chunk, chunk_text
from app.embeddings import FakeEmbedder, embed_chunks
from app.retrieval import (
    BM25,
    Criterion,
    Hit,
    build_context,
    reciprocal_rank_fusion,
    retrieve_for_criteria,
    tokenize,
)


def test_tech_tokenizer():
    assert tokenize("C++ .NET CI/CD c# Python-3") == ["c++", ".net", "ci/cd", "c#", "python", "3"]


def test_bm25_hand_computed():
    # N=2, df(cat)=1, average length=2, tf(cat)=2, document length=3.
    expected = math.log(2) * (2 * 2.5) / (2 + 1.5 * (0.25 + 0.75 * 3 / 2))
    scores = BM25(["cat cat dog", "dog"]).score(["cat"])
    assert scores == pytest.approx([expected, 0])
    assert BM25(["cat cat dog", "dog"]).score(["cat", "cat"]) == scores
    assert BM25(["", ""]).score(["cat"]) == [0, 0]
    assert BM25([]).score(["cat"]) == []


def test_rrf_ordering():
    scores = reciprocal_rank_fusion([[0, 1, 2], [2, 1]])
    assert scores[1] == pytest.approx(2 / 62)
    assert sorted(scores, key=lambda i: -scores[i]) == [2, 1, 0]


def data():
    chunks = [Chunk(10, 0, 6, "python"), Chunk(20, 8, 10, "hr"), Chunk(30, 12, 15, "sql")]
    criterion = Criterion("python", "Python", "Python", ["python"])
    return chunks, criterion


@pytest.mark.parametrize("mode", ["lexical", "dense", "hybrid"])
def test_modes_and_determinism(mode):
    chunks, criterion = data()
    embeddings = embed_chunks(chunks, FakeEmbedder())
    result = retrieve_for_criteria(chunks, embeddings, [criterion], mode, 2)
    assert result == retrieve_for_criteria(chunks, embeddings, [criterion], mode, 2)
    hits = result.per_criterion_hits["python"]
    assert hits[0].chunk_index == 10
    assert len(hits) == (1 if mode == "lexical" else 2)
    assert result.pipeline_versions_json["embedding"]["version"] == "fake-v1"
    assert result.pipeline_versions_json["retrieval"]["rrf_k"] == 60
    json.dumps(result.pipeline_versions_json)


def test_keyword_and_dense_queries_are_distinct():
    chunks, _ = data()
    criterion = {
        "code": "test",
        "label": "HR",
        "description": "HR",
        "keywords": ["sql"],
        "weight": 10,
    }
    embeddings = embed_chunks(chunks, FakeEmbedder())
    assert (
        retrieve_for_criteria(chunks, None, [criterion], "lexical", 1)
        .per_criterion_hits["test"][0]
        .chunk_index
        == 30
    )
    assert (
        retrieve_for_criteria(chunks, embeddings, [criterion], "dense", 1)
        .per_criterion_hits["test"][0]
        .chunk_index
        == 20
    )


def test_empty_and_zero_k():
    chunks, criterion = data()
    assert retrieve_for_criteria(
        [], embed_chunks([], FakeEmbedder()), [criterion]
    ).per_criterion_hits == {"python": []}
    assert retrieve_for_criteria(chunks, None, [criterion], "lexical", 0).per_criterion_hits == {
        "python": []
    }
    assert retrieve_for_criteria(chunks, None, [], "lexical").per_criterion_hits == {}
    assert retrieve_for_criteria(
        chunks, None, [replace(criterion, keywords=[])], "lexical"
    ).per_criterion_hits == {"python": []}


def test_ties_follow_chunk_index():
    chunks = [Chunk(5, 0, 1, "a"), Chunk(2, 2, 3, "a")]
    result = retrieve_for_criteria(chunks, None, [Criterion("a", "a", "a", ["a"])], "lexical")
    assert [hit.chunk_index for hit in result.per_criterion_hits["a"]] == [2, 5]


def test_context_unions_overlap_and_orders():
    text = "0123456789abcdef"
    chunks = [Chunk(0, 0, 8, text[:8]), Chunk(1, 5, 12, text[5:12]), Chunk(2, 14, 16, text[14:16])]
    hits = {
        "a": [Hit(2, 1, 1, None), Hit(1, 1, 1, None)],
        "b": [Hit(0, 1, 1, None), Hit(1, 1, 1, None)],
    }
    assert build_context(chunks, hits) == "0123456789ab\n\nef"
    for budget in range(20):
        assert build_context(chunks, hits, budget) == "0123456789ab\n\nef"[:budget]
    assert build_context(chunks, {}) == ""
    with pytest.raises(ValueError):
        build_context(chunks, {"a": [Hit(99, 0, 0, None)]})


def test_context_from_result():
    chunks = chunk_text("Python " * 500)
    result = retrieve_for_criteria(
        chunks, None, [Criterion("a", "", "", ["Python"])], "lexical", 100
    )
    assert build_context(chunks, result) == "Python " * 500


def test_mismatched_embeddings_rejected():
    chunks, criterion = data()
    embeddings = embed_chunks(chunks, FakeEmbedder())
    with pytest.raises(ValueError, match="exact chunks"):
        retrieve_for_criteria(chunks[::-1], embeddings, [criterion])
    embeddings.embedder.version = "changed"
    with pytest.raises(ValueError, match="version changed"):
        retrieve_for_criteria(chunks, embeddings, [criterion])


def test_invalid_vectors_rejected():
    class Broken(FakeEmbedder):
        def embed(self, texts):
            return np.full((len(texts), self.dimension), np.nan)

    with pytest.raises(ValueError, match="invalid vectors"):
        embed_chunks(chunk_text("Python"), Broken())


@pytest.mark.parametrize("kwargs", [{"mode": "bad"}, {"k": -1}, {"rrf_k": 0}, {"k1": 0}, {"b": 2}])
def test_invalid_params(kwargs):
    with pytest.raises(ValueError):
        retrieve_for_criteria([], None, [], **({"mode": "lexical"} | kwargs))


def test_dense_uses_cosine_not_magnitude():
    class KnownVectors:
        model_id = "known"
        version = "v1"
        dimension = 2

        def embed(self, texts):
            vectors = {"python": [10, 0], "hr": [0, 4], "sql": [1, 1], "Python\nPython": [2, 0]}
            return np.array([vectors[text] for text in texts], dtype=np.float32).reshape(-1, 2)

    chunks, criterion = data()
    embeddings = embed_chunks(chunks, KnownVectors())
    result = retrieve_for_criteria(chunks, embeddings, [criterion], "dense", 3)
    hits = result.per_criterion_hits["python"]
    assert [hit.chunk_index for hit in hits] == [10, 30, 20]
    assert [hit.score for hit in hits] == pytest.approx([1, 1 / math.sqrt(2), 0])


def test_lexical_rejects_unrelated_embedding_metadata():
    chunks, criterion = data()
    with pytest.raises(ValueError, match="exact chunks"):
        retrieve_for_criteria(
            chunks, embed_chunks(chunks[::-1], FakeEmbedder()), [criterion], "lexical"
        )
