"""Lazy production embeddings and an offline deterministic test substitute."""

import hashlib
import re
from collections.abc import Sequence
from dataclasses import dataclass
from typing import Protocol

import numpy as np

from app.chunking import Chunk


class Embedder(Protocol):
    model_id: str
    dimension: int
    version: str

    def embed(self, texts: Sequence[str]) -> np.ndarray: ...


def normalize(vectors: np.ndarray) -> np.ndarray:
    vectors = np.asarray(vectors, dtype=np.float32)
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    return vectors / np.where(norms == 0, 1, norms)


class FakeEmbedder:
    """Hash English word counts into a fixed vector; never uses process hash()."""

    model_id = "fake-sha256"
    version = "fake-v1"

    def __init__(self, dimension: int = 64):
        if dimension < 1:
            raise ValueError("dimension must be positive")
        self.dimension = dimension

    def embed(self, texts: Sequence[str]) -> np.ndarray:
        vectors = np.zeros((len(texts), self.dimension), dtype=np.float32)
        for row, text in enumerate(texts):
            for token in re.findall(r"[a-z0-9]+", text.lower()):
                digest = hashlib.sha256(token.encode()).digest()
                vectors[row, int.from_bytes(digest[:8], "big") % self.dimension] += 1
        return normalize(vectors)


class BgeM3Embedder:
    """BAAI/bge-m3 dense vectors, loaded only on the first nonempty embed call.

    Install the embeddings extra to use this class. Pin revision to a model commit
    for replayable production runs; version records the requested revision.
    """

    model_id = "BAAI/bge-m3"
    dimension = 1024

    def __init__(self, *, revision: str = "main", device: str | None = None):
        self.revision = revision
        self.version = f"bge-m3-dense-v1:{revision}"
        self.device = device
        self._model = None

    def embed(self, texts: Sequence[str]) -> np.ndarray:
        if not texts:
            return np.empty((0, self.dimension), dtype=np.float32)
        if self._model is None:
            import torch
            from sentence_transformers import SentenceTransformer

            device = self.device or ("mps" if torch.backends.mps.is_available() else "cpu")
            self._model = SentenceTransformer(self.model_id, revision=self.revision, device=device)
        return normalize(
            self._model.encode(list(texts), normalize_embeddings=True, convert_to_numpy=True)
        )


@dataclass(frozen=True)
class ChunkEmbeddings:
    """Vectors and their exact chunk snapshot, with one embedder for query encoding."""

    chunks: tuple[Chunk, ...]
    vectors: np.ndarray
    embedder: Embedder
    model_id: str
    version: str
    dimension: int


def embed_chunks(chunks: Sequence[Chunk], embedder: Embedder) -> ChunkEmbeddings:
    snapshot = tuple(chunks)
    vectors = np.asarray(embedder.embed([chunk.text for chunk in snapshot]), dtype=np.float32)
    if vectors.shape != (len(snapshot), embedder.dimension) or not np.isfinite(vectors).all():
        raise ValueError("Embedder returned invalid vectors")
    vectors = normalize(vectors)
    vectors.setflags(write=False)
    return ChunkEmbeddings(
        snapshot, vectors, embedder, embedder.model_id, embedder.version, embedder.dimension
    )
