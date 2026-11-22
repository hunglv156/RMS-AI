# T7.2 verification

Verified on Node v26.12.0 / pnpm 9.15.4, using Orca's embedded browser and `VITE_USE_MOCK=1`.

## Automated checks

- Root `pnpm check`: passed. Web lint, TypeScript, 33 Vitest/Testing Library tests, and production build passed; existing backend checks passed with 253 tests passed / 3 skipped.
- After the JD JSON recovery change: web `check` passed again, including a test that returns safely to the last valid form after malformed JSON.
- Both ordinary and `VITE_USE_MOCK=1` production builds passed. Mock fixtures are separate lazy chunks; the ordinary build omits them.
- After the final print CSS correction and control-boundary contrast adjustment: production build passed again.
- Test coverage includes all six criterion levels; escalation model / needs_review / manual review; unpublished score; verified and unverified quotes; all nine API error codes; safe unknown errors; exact multipart names and proxy path; both real JD fixtures; positive finite weights, unique criterion codes, nonempty criteria; JSON editing; cancellation; upload rejection; retryable service failures.
- Source result fixtures were copied without modification from the two contracted evaluation pair JSONs. The mock response's `screening` object is their original `result` object.

## Browser checks

Used a PDF from the repository to exercise the actual file input. No uploaded CV was sent to a backend in mock mode. Drove the controls with the browser's select, upload, focus and Enter commands, including the theme toggle and configuration popover.

- `empty.png`: sample JD selected, no CV/result, designed upload and empty-result states. `empty-manual.png` captures the initial form before a sample is chosen.
- `loading.png`: active screening, elapsed seconds, friendly progress steps, cancel control, disabled editing.
- `result-escalated.png`, `result-escalated-detail.png`: real Python fixture, score 47.5, coverage 80%, published at the 80% threshold, escalation banner naming `ag/gemini-4-argon-medium`, highlighted verified quotations.
- `result-not-escalated.png`: real designer fixture, 30% coverage, unpublished score shown as a dash, no claim that escalation ran. The manual-review flag still correctly prompts human review.
- `error.png`: simulated `llm_timeout`, friendly Vietnamese message and retry control.
- `config.png`: active model, prompt, retrieval, hedge, escalation and coverage information.
- `mobile.png`, `mobile-top.png`: 375 × 812 CSS-pixel viewport. Measured `innerWidth === document.documentElement.scrollWidth === 375`; no horizontal overflow. Fixed badge wrapping so long criterion names retain room.
- `dark.png`, `mobile-dark.png`: dark desktop and 375-pixel result layouts, inspected for legibility.
- Google font faces reported loaded in the browser. Keyboard activation and visible focus styling were exercised.
- JSON export was exercised through the actual button; it produces `ket-qua-sang-loc.json`.

## Print checks

Exported the escalated result with `orca pdf`. The final `print-preview.pdf` has four pages; rendered and visually inspected all four as `print-page-1.png` through `print-page-4.png`. The PDF shows all seven criteria and their supplementary missing information, keeps cards intact, preserves Vietnamese glyphs and evidence, and excludes navigation, upload/JD controls and export buttons. Fixed the stray skip link and expanded closed supplementary information in print CSS. Poppler was unavailable, so rendering and text checks used the existing PyMuPDF dependency from the backend environment without changing backend source.

## Integration boundary

The real T7.1 backend endpoints were being developed in parallel and were not exercised end to end in this worker's checkout. HTTP request construction is tested; the Vite proxy and typed response shapes follow the supplied contract. Connect the live service at `127.0.0.1:8100` and run the README's non-mock command for integration acceptance.

The mock's extraction page/character counts and active config are explicitly illustrative, and the UI explains that CV uploads/JD changes do not affect fixed sample results. Verdict thresholds (40/70) are UI illustration values documented in the README, not calibrated hiring thresholds. Cancellation aborts the browser request; a server job that already started may continue. No commits were made; edits are limited to `apps/web/**` and the root lockfile.

The mock dev server was left running at `http://127.0.0.1:5173` in Orca terminal `term_ba30b372-43db-4831-ba00-652919d5b3ea` for review.
