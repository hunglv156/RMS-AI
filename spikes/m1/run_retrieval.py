"""Đo bge-m3 qua Ollama và bge-reranker-v2-m3 trên các đoạn CV thật."""
import json
import re

import httpx
import psutil
import torch
from sentence_transformers import CrossEncoder

from common import OLLAMA, OUT, now, select_samples

QUERIES = [
    "kinh nghiệm phát triển backend và xây dựng API",
    "kinh nghiệm với cơ sở dữ liệu SQL",
    "chứng chỉ tiếng Anh",
]


def chunks(text: str, size: int = 500) -> list[str]:
    parts = [p.strip() for p in re.split(r"\n+", text) if p.strip()]
    out, current = [], ""
    for part in parts:
        if current and len(current) + len(part) > size:
            out.append(current)
            current = ""
        current = f"{current}\n{part}".strip()
    return out + ([current] if current else [])


def main() -> None:
    samples = select_samples()
    all_chunks = [(s["id"], c) for s in samples for c in chunks(s["text"])]
    texts = [c for _, c in all_chunks]
    with httpx.Client(timeout=300) as client:
        start = now()
        doc = client.post(f"{OLLAMA}/api/embed", json={"model": "bge-m3", "input": texts}).json()["embeddings"]
        embed_seconds = now() - start
        query = client.post(f"{OLLAMA}/api/embed", json={"model": "bge-m3", "input": QUERIES}).json()["embeddings"]

    device = "mps" if torch.backends.mps.is_available() else "cpu"
    process = psutil.Process()
    start = now()
    reranker = CrossEncoder("BAAI/bge-reranker-v2-m3", device=device, max_length=512)
    load_seconds = now() - start

    doc_t = torch.nn.functional.normalize(torch.tensor(doc), dim=1)
    query_t = torch.nn.functional.normalize(torch.tensor(query), dim=1)
    rerank_seconds = []
    ranks = []
    for i, q in enumerate(QUERIES):
        top = (query_t[i] @ doc_t.T).topk(30).indices.tolist()
        start = now()
        scores = reranker.predict([(q, texts[j]) for j in top], batch_size=8)
        rerank_seconds.append(round(now() - start, 2))
        best = sorted(zip(scores.tolist(), top), reverse=True)[:3]
        ranks.append({"query": q, "top": [{"score": round(s, 3), "cv": all_chunks[j][0], "text": texts[j][:200]} for s, j in best]})

    summary = {
        "chunks": len(texts),
        "embedding_dim": len(doc[0]),
        "embed_chunks_per_second": round(len(texts) / embed_seconds, 1),
        "reranker_device": device,
        "reranker_load_seconds": round(load_seconds, 1),
        "rerank_30_pairs_seconds": rerank_seconds,
        "python_rss_gb": round(process.memory_info().rss / 1024**3, 2),
    }
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "retrieval.summary.json").write_text(json.dumps({**summary, "results": ranks}, ensure_ascii=False, indent=2))
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
