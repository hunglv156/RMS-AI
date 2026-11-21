"""Exact BM25/cosine/RRF retrieval over the chunks of ONE resume.

English-first tokenizer: lowercase ASCII alphanumerics, keeping internal slash,
leading dot and trailing plus/hash (e.g. c++, .net, ci/cd, c#). No stemming or
stop-word removal. Keyword phrases become individual tokens; repeated query
terms count once. BM25 uses positive log(1 + (N-df+0.5)/(df+0.5)) IDF.
"""

import math
import re
from collections import Counter
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from typing import Literal

import numpy as np

from app.chunking import CHUNKER_VERSION, Chunk
from app.embeddings import ChunkEmbeddings, normalize

Mode = Literal["lexical", "dense", "hybrid"]


def tokenize(text: str) -> list[str]:
    return re.findall(r"\.?[a-z0-9]+(?:/[a-z0-9]+)*(?:\+\+|#)?", text.lower())


class BM25:
    def __init__(self, texts: Sequence[str], *, k1: float = 1.5, b: float = 0.75):
        if not math.isfinite(k1) or k1 <= 0 or not 0 <= b <= 1:
            raise ValueError("Require finite k1 > 0 and 0 <= b <= 1")
        self.k1, self.b = k1, b
        self.documents = [Counter(tokenize(text)) for text in texts]
        self.lengths = [sum(document.values()) for document in self.documents]
        self.average_length = sum(self.lengths) / len(texts) if texts else 0
        self.df = Counter(token for document in self.documents for token in document)

    def score(self, keywords: Sequence[str]) -> list[float]:
        query = set(tokenize(" ".join(keywords)))
        scores = []
        for document, length in zip(self.documents, self.lengths, strict=True):
            score = 0.0
            for token in sorted(query):
                frequency = document[token]
                if not frequency:
                    continue
                idf = math.log1p(
                    (len(self.documents) - self.df[token] + 0.5) / (self.df[token] + 0.5)
                )
                denominator = frequency + self.k1 * (
                    1 - self.b + self.b * length / self.average_length
                )
                score += idf * frequency * (self.k1 + 1) / denominator
            scores.append(score)
        return scores


def reciprocal_rank_fusion(rankings: Sequence[Sequence[int]], *, k: int = 60) -> dict[int, float]:
    if k < 1:
        raise ValueError("RRF k must be positive")
    scores: dict[int, float] = {}
    for ranking in rankings:
        if len(set(ranking)) != len(ranking):
            raise ValueError("A ranking cannot contain duplicate chunk indices")
        for rank, index in enumerate(ranking, start=1):
            scores[index] = scores.get(index, 0.0) + 1 / (k + rank)
    return scores


@dataclass(frozen=True)
class Criterion:
    code: str
    label: str
    description: str
    keywords: Sequence[str] = ()


@dataclass(frozen=True)
class Hit:
    chunk_index: int
    score: float
    lexical_score: float
    dense_score: float | None


@dataclass(frozen=True)
class RetrievalResult:
    per_criterion_hits: dict[str, list[Hit]]
    pipeline_versions_json: dict


def retrieve_for_criteria(
    chunks: Sequence[Chunk],
    embeddings: ChunkEmbeddings | None,
    criteria: Sequence[Criterion | Mapping],
    mode: Mode = "hybrid",
    k: int = 5,
    *,
    k1: float = 1.5,
    b: float = 0.75,
    rrf_k: int = 60,
) -> RetrievalResult:
    """Rank all chunks exactly, using resume order to resolve equal scores.

    Lexical rankings omit zero matches; dense rankings include every chunk.
    Supply embed_chunks(...) for dense/hybrid, None is enough for lexical.
    The caller must restrict chunks to one authorized resume before calling.
    """
    if mode not in ("lexical", "dense", "hybrid") or k < 0 or rrf_k < 1:
        raise ValueError("Invalid retrieval mode, k or rrf_k")
    if len({chunk.index for chunk in chunks}) != len(chunks):
        raise ValueError("Chunk indices must be unique")
    if any(chunk.version != CHUNKER_VERSION for chunk in chunks):
        raise ValueError("Mixed or unsupported chunker versions")
    parsed = [
        criterion
        if isinstance(criterion, Criterion)
        else Criterion(
            **{key: criterion[key] for key in ("code", "label", "description", "keywords")}
        )
        for criterion in criteria
    ]
    if len({criterion.code for criterion in parsed}) != len(parsed):
        raise ValueError("Criterion codes must be unique")
    dense_vectors = None
    if mode != "lexical" and embeddings is None:
        raise ValueError("Dense retrieval requires embeddings for these exact chunks")
    if embeddings is not None:
        if embeddings.chunks != tuple(chunks):
            raise ValueError("Embeddings must reference these exact chunks")
        embedder = embeddings.embedder
        if (embedder.model_id, embedder.version, embedder.dimension) != (
            embeddings.model_id,
            embeddings.version,
            embeddings.dimension,
        ):
            raise ValueError("Embedding model/version changed; re-embed the resume")
        if embeddings.vectors.shape != (len(chunks), embeddings.dimension):
            raise ValueError("Invalid chunk embedding shape")
        if not np.isfinite(embeddings.vectors).all():
            raise ValueError("Invalid chunk embeddings")
    if mode != "lexical":
        queries = embedder.embed([f"{item.label}\n{item.description}" for item in parsed])
        if queries.shape != (len(parsed), embeddings.dimension) or not np.isfinite(queries).all():
            raise ValueError("Invalid query embeddings")
        dense_vectors = normalize(queries) @ normalize(embeddings.vectors).T
    bm25 = BM25([chunk.text for chunk in chunks], k1=k1, b=b)
    results = {}
    for row, criterion in enumerate(parsed):
        lexical = bm25.score(criterion.keywords)
        dense = dense_vectors[row].tolist() if dense_vectors is not None else None
        indices = range(len(chunks))
        lexical_rank = sorted(
            (i for i in indices if lexical[i] > 0), key=lambda i: (-lexical[i], chunks[i].index)
        )
        dense_rank = (
            sorted(indices, key=lambda i: (-dense[i], chunks[i].index)) if dense is not None else []
        )
        if mode == "hybrid":
            scores = reciprocal_rank_fusion([lexical_rank, dense_rank], k=rrf_k)
        elif mode == "lexical":
            scores = {i: lexical[i] for i in lexical_rank}
        else:
            scores = {i: dense[i] for i in dense_rank}
        selected = sorted(scores, key=lambda i: (-scores[i], chunks[i].index))[:k]
        results[criterion.code] = [
            Hit(chunks[i].index, scores[i], lexical[i], dense[i] if dense is not None else None)
            for i in selected
        ]
    return RetrievalResult(
        results,
        {
            "chunker": CHUNKER_VERSION,
            "embedding": (
                {
                    "model_id": embeddings.model_id,
                    "version": embeddings.version,
                    "dimension": embeddings.dimension,
                }
                if embeddings
                else None
            ),
            "retrieval": {
                "version": "retrieval-v1",
                "mode": mode,
                "k": k,
                "bm25_k1": k1,
                "bm25_b": b,
                "rrf_k": rrf_k,
                "tokenizer": "english-tech-v1",
                "tie_break": "chunk-index-ascending",
            },
        },
    )


def build_context(
    chunks: Sequence[Chunk],
    per_criterion_hits: Mapping[str, Sequence[Hit]] | RetrievalResult,
    char_budget: int = 8000,
) -> str:
    """Union selected ranges in source order, removing overlap and repeated hits.

    Join disjoint spans with two newlines (counted in budget). If the final span
    exceeds the remaining budget, truncate its tail. Unknown indices are errors.
    """
    if char_budget < 0:
        raise ValueError("char_budget cannot be negative")
    if isinstance(per_criterion_hits, RetrievalResult):
        per_criterion_hits = per_criterion_hits.per_criterion_hits
    selected = {hit.chunk_index for hits in per_criterion_hits.values() for hit in hits}
    by_index = {chunk.index: chunk for chunk in chunks}
    if selected - by_index.keys():
        raise ValueError("Hits refer to unknown chunks")
    spans: list[tuple[int, int, str]] = []
    for chunk in sorted((by_index[i] for i in selected), key=lambda c: (c.start_offset, c.index)):
        if spans and chunk.start_offset <= spans[-1][1]:
            start, end, text = spans[-1]
            overlap = end - chunk.start_offset
            if chunk.end_offset > end:
                spans[-1] = (start, chunk.end_offset, text + chunk.text[overlap:])
        else:
            spans.append((chunk.start_offset, chunk.end_offset, chunk.text))
    return "\n\n".join(text for _, _, text in spans)[:char_budget]
