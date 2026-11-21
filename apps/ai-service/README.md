# RMS AI service

Run checks from this directory with `uv sync` followed by `uv run ruff check .`, `uv run ruff format --check .`, and `uv run pytest -q`. Start the local development server with `pnpm dev` (or the `uv run uvicorn` command in `package.json`); it listens on `http://127.0.0.1:8100`.


## Retrieval

Pass the normalized text of one authorized resume to `chunk_text`, then call
`embed_chunks(chunks, embedder)` and `retrieve_for_criteria(chunks, embeddings,
criteria, mode="hybrid", k=5)`. Criteria accept `code`, `label`, `description`, and
English-first `keywords` (extra JD fields are ignored). Use `build_context(chunks,
result, char_budget=8000)` to merge evidence in resume order and remove overlap;
the budget includes separators and may truncate the last span. Save the result's
`pipeline_versions_json` alongside the screening run. Cosine scores are retrieval
signals, not skill ratings.

Use `FakeEmbedder()` for offline runs. For real vectors, install
`uv sync --extra embeddings` and use `BgeM3Embedder(revision="<model commit>")`.
The first nonempty call downloads BAAI/bge-m3; it chooses MPS when available,
otherwise CPU. Pin a model commit for reproducible embeddings; the default
revision is `main`. Re-embed the resume when its model or version changes.
Lexical mode accepts `embeddings=None` and needs no model. BM25 lowercases ASCII
alphanumerics and preserves tokens such as `c++`, `.net`, `c#` and `ci/cd`, without
stemming or stop-word removal. Blank keyword queries return no lexical hits.

Default tests never load the real model. After installing the extra, run
`RUN_SLOW_EMBEDDINGS=1 uv run --extra embeddings pytest -m slow` to opt in.
