# RMS AI service

Use Python 3.13 for this service (`.python-version` pins it; supported versions are `>=3.13,<3.15`). Run checks from this directory with `uv sync` followed by `uv run ruff check .`, `uv run ruff format --check .`, and `uv run pytest -q`. Start the local development server with `pnpm dev` (or the `uv run uvicorn` command in `package.json`); it listens on `http://127.0.0.1:8100`.


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

## Text extraction

Call `app.extraction.extract_document(pdf_bytes)` to extract a PDF locally. Install Tesseract with `eng` data on your PATH for scanned or empty pages; text-layer pages work without it. Defaults are English at 200 DPI. A page uses its text layer when it contains an alphanumeric character, otherwise OCR. Hidden text is retained and flagged using font size, colour and rendering heuristics, which can miss image backgrounds or covered text.

The result includes normalized text, one-based pages with half-open Unicode character offsets, methods, OCR word-mean confidence (0–100), flags and tool versions. `norm-v1` unifies line endings, trims trailing whitespace and outer blank lines, and collapses blank-line runs without changing words or internal spacing. Nonempty pages have one blank line between them; empty pages have zero-width offsets and add no separators. OCR can misread words or reading order; page confidence below 60 adds `low_ocr_confidence`.

Pass `limits=ExtractionLimits(...)` to change the 25 MiB, 100-page, 25-million-pixel-per-page and 60-second-per-page OCR limits. Invalid, encrypted or oversized PDFs raise typed `ExtractionError` subclasses; failed or unavailable OCR raises `OCRError`. Isolate parsing of untrusted uploads in a worker; this library does not provide a sandbox.

Run `uv run python -m app.extraction.compare_eval --data-root /path/to/data` for the opt-in evaluation comparison. It matches source PDFs by SHA-256, reports unmatched hashes, and never writes into the dataset. The generated-fixture extraction tests skip OCR integration cases when Tesseract is missing.

## LLM provider

Set `GEMINI_API_KEY` to use Gemini. `GEMINI_MODEL` defaults to `gemini-3.8-flash-high`; `LLM_TIMEOUT_S` (default 30 seconds) and `LLM_MAX_RETRIES` (default 2) control each attempt and retries. Pass trusted instructions and untrusted input separately to `generate_structured`, along with a Pydantic response model. Schema failures are not retried.

Offline tests run with `uv run pytest -q`. To run the live, non-PII smoke test, set `GEMINI_API_KEY` and run `uv run pytest -q -m live` (or pass `--run-live`).

## Run the API

From `apps/ai-service`, run `uv sync`, then:

```sh
uv run uvicorn app.main:app --host 127.0.0.1 --port 8100
```

Set `LLM_BASE_URL` and `LLM_API_KEY` in the repository-root `.env` for your gateway.
The app loads that file itself. Install Tesseract with English language data for
scanned CVs. `/health`, `/internal/v1/screening-config`, and
`/internal/v1/sample-jds` work without an LLM key; screening returns 503 until a
provider is configured.

To screen a PDF (maximum 25 MiB and 100 pages), get a sample JD, then submit it as
JSON in the `jd` form field with your PDF in `cv`:

```sh
curl -s http://127.0.0.1:8100/internal/v1/sample-jds \
  | python -c 'import json,sys; print(json.dumps(json.load(sys.stdin)["items"][0]["jd"]))' \
  > /tmp/rms-sample-jd.json
curl -s http://127.0.0.1:8100/internal/v1/screenings \
  -F 'cv=@/path/to/cv.pdf;type=application/pdf' \
  --form-string "jd=$(cat /tmp/rms-sample-jd.json)"
```

The response contains the pipeline `screening` result, extraction counts, total
`latency_s`, and the active public `config`. Errors use
`{"error":{"code":"…","message":"…"}}`: fix the input for 400/413/415;
retry a 502/504 provider failure. Encrypted PDFs must be decrypted before upload.

Defaults are `ag/gemini-3.8-flash-low`, `screening-v2`, retrieved lexical context
with five hits, a 20-second hedge, and escalation to `ag/gemini-4-argon-medium`
only on `needs_review`, with minimum coverage 0.8. Override these with
`SCREENING_MODEL`, `SCREENING_PROMPT_VERSION`, `SCREENING_CONTEXT_MODE`,
`SCREENING_RETRIEVAL_MODE`, `SCREENING_RETRIEVAL_K`, `SCREENING_HEDGE_AFTER_S`,
`SCREENING_ESCALATE_MODEL`, `SCREENING_ESCALATE_ON`, and `SCREENING_MIN_COVERAGE`.
Use a JSON array for triggers, such as `SCREENING_ESCALATE_ON='["needs_review"]'`;
`[]` disables escalation. Set `SCREENING_SAMPLE_JDS_DIR` to change the directory
containing `jd-py-real.yaml` and `jd-hr-real.yaml`. Experiment-runner defaults
remain separate from these API settings.
