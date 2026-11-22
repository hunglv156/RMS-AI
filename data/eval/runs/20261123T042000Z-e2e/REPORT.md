# T7.3 End-to-End Test Report: Web Demo + Screening API with Real Gateway

**Date / Timestamp:** 2026-11-23 04:52 UTC+7 (Run ID: `20261123T042000Z-e2e`)  
**Workspace:** `/Users/hung/orca/workspaces/RMS-AI/m6-e2e`  
**Author:** Worker Agent (`task_e2ed207e3a6d` / `ctx_84f7acda3ab2`)  
**Overall Status:** **ALL PASS (6/6 Test Cases Passed)**

---

## 1. Environment & Setup

- **Operating System:** macOS (Darwin arm64)
- **Node & Package Manager:** Node.js v26.1.0, pnpm v9.15.4
- **Python & Environment:** Python 3.13.18, uv v0.6.14
- **AI Service Configuration:**
  - Started via `uv run uvicorn app.main:app --port 8100` with loaded production environment (zero secret leaks)
  - Model: `ag/gemini-3.8-flash-low`
  - Prompt Version: `screening-v2`
  - Context & Retrieval: `retrieved` · `lexical` · `k=5`
  - Hedging: 20.0s threshold
  - Escalation: Enabled with `ag/gemini-4-argon-medium` triggered on `needs_review`
  - Minimum Coverage: 0.8 (80%)
- **Web App:**
  - Vite dev server started via `pnpm --filter @rms-ai/web dev` on port 5173
  - Backend integration mode (`VITE_USE_MOCK` unset), proxying `/api/ai/*` to `http://127.0.0.1:8100/*`
- **CV Test Data:**
  - Resolved directly from `data/eval/set-10x2.yaml`:
    - `python_dev-01` (`18d279...`) -> `data/Python Developer/20.pdf` (827 KB)
    - `hr-01` (`21367b...`) -> `data/Human Resources/62.pdf` (342 KB)
    - `designer-01` (`37e62d...`) -> `data/Designer/26.pdf` (135 KB)

---

## 2. Test Case Execution & Results

### Case 1: Health & Configuration
- **Objective:** Verify `/api/ai/internal/v1/screening-config` through web proxy returns D36 configuration and exposes no secrets.
- **Result:** **PASS**
- **Evidence:**
  - Response JSON: [`case1-screening-config.json`](responses/case1-screening-config.json)
  - Screenshot: [`case1-config-popover.png`](screenshots/case1-config-popover.png)
- **Details:**
  - Proxied GET request returned identical configuration to backend service.
  - Verified fields: `model: ag/gemini-3.8-flash-low`, `prompt_version: screening-v2`, `retrieval_mode: lexical`, `retrieval_k: 5`, `hedge_after_s: 20.0`, `escalation.model: ag/gemini-4-argon-medium`, `min_coverage: 0.8`.
  - Audited payload: No API keys, credentials, or host secrets present in response. UI popover accurately reflects all parameters in Vietnamese.

---

### Case 2: Happy Path Real Screenings (×3)
- **Objective:** Run 3 real screenings through UI and verify levels, quotes, coverage, fit, latency, and review banner behavior.
- **Result:** **PASS**

#### Case 2(a): Python Developer CV × Backend Python JD
- **Input:** `data/Python Developer/20.pdf` × `jd-py-real` (7 criteria, total weight 100)
- **Latencies:** UI elapsed: ~30s | API `latency_s`: **30.10s** (Primary LLM: 9.81s, Escalation LLM: 11.63s, PDF extraction: 12,069 chars)
- **Result:**
  - Observed Score: **55** / 100 (Bounds: [49.5, 59.5], Coverage: 90%)
  - Fit Verdict: **Phù hợp một phần** (Partial Match)
  - Escalation: **Triggered** (`needs_review` on 2 criteria in primary flash model -> escalated to `ag/gemini-4-argon-medium`)
  - Banner: Banner **Cần người xem lại** ("Đã sàng lọc lại bằng ag/gemini-4-argon-medium. Vui lòng kiểm tra bằng chứng trước khi quyết định.") properly displayed.
  - Criteria & Quotes: All 7 criteria rendered with quote verification badges.
- **Evidence:**
  - Response JSON: [`case2a-python-backend.json`](responses/case2a-python-backend.json)
  - Screenshot: [`case2a-python-backend.png`](screenshots/case2a-python-backend.png)

#### Case 2(b): HR CV × HR Generalist JD
- **Input:** `data/Human Resources/62.pdf` × `jd-hr-real` (7 criteria, total weight 100)
- **Latencies:** UI elapsed: 11.6s | API `latency_s`: **11.62s**
- **Result:**
  - Observed Score: **63** / 100 (Bounds: [63, 63], Coverage: 100%)
  - Fit Verdict: **Phù hợp một phần**
  - Escalation: **Not triggered** (Clean primary run, no `needs_review`)
  - Banner: Banner **NOT shown** (as expected when `escalated=false` and no `needs_review`)
  - Criteria & Quotes: All 7 criteria verified (6 adequate, 1 absent [Education in HR/Business]).
- **Evidence:**
  - Response JSON: [`case2b-hr.json`](responses/case2b-hr.json)
  - Screenshot: [`case2b-hr.png`](screenshots/case2b-hr.png)

#### Case 2(c): Designer CV × Backend Python JD (Expected Poor Fit)
- **Input:** `data/Designer/26.pdf` × `jd-py-real` (7 criteria)
- **Latencies:** UI elapsed: 7.9s | API `latency_s`: **7.94s**
- **Result:**
  - Observed Score: **None** (UI displays `— / 100 điểm`)
  - Coverage: **20%** (Below 80% publication threshold; Bounds: [0, 80])
  - Fit Verdict: **Chưa đủ căn cứ đánh giá** (Insufficient Evidence / Poor Fit)
  - Banner: **Cần người xem lại** displayed due to `requires_manual_review: true`.
  - Criteria: 5 criteria unknown/insufficient info, 2 absent with evidence (graphic design background).
- **Evidence:**
  - Response JSON: [`case2c-designer-backend.json`](responses/case2c-designer-backend.json)
  - Screenshot: [`case2c-designer-backend.png`](screenshots/case2c-designer-backend.png)

---

### Case 3: Edited JD in Form
- **Objective:** Edit a criterion weight (25 -> 35) and add a keyword (`FastAPI`), submit screening with Python CV, and verify the request and result used the edited JD.
- **Result:** **PASS**
- **Latencies:** UI elapsed: 26.8s | API `latency_s`: **26.83s**
- **Verification:**
  - UI Form: First criterion weight edited to `35`, keywords updated to `Python,Django,Flask,FastAPI`.
  - API Request & Response Criteria: Criterion `python_frameworks` weight evaluated at **35**, total JD weight evaluated at **110**.
  - Dynamic Score: Score adjusted from 55 to **56.5** / 100 based on the higher weight for Python frameworks (which candidate met).
- **Evidence:**
  - Response JSON: [`case3-edited-jd.json`](responses/case3-edited-jd.json)
  - Screenshot: [`case3-edited-jd.png`](screenshots/case3-edited-jd.png)

---

### Case 4: Error Handling & Resilience
- **Objective:** Test error boundaries: non-PDF upload, corrupted PDF, invalid JSON, API service disconnect, and mid-screening cancellation.
- **Result:** **PASS**

| Subcase | Test Action | Expected Behavior | Actual Behavior | Result | Screenshot |
|---|---|---|---|---|---|
| **4(a)** Non-PDF upload | Uploaded `.txt` file | Friendly 415 alert, disabled submit | Displayed *"Định dạng chưa được hỗ trợ. Vui lòng chọn tệp PDF."* | **PASS** | [`case4a-non-pdf.png`](screenshots/case4a-non-pdf.png) |
| **4(b)** Corrupted PDF | Uploaded malformed PDF bytes | 400 `invalid_pdf` friendly error | Displayed *"Không đọc được tệp PDF này. Hãy xuất lại PDF và thử lại."* | **PASS** | [`case4b-corrupted-pdf.png`](screenshots/case4b-corrupted-pdf.png) |
| **4(c)** Invalid JD JSON | Typed malformed JSON in JSON tab | Client validation error, disabled submit | Displayed *"JSON chưa hợp lệ. Kiểm tra dấu ngoặc và dấu phẩy."* | **PASS** | [`case4c-invalid-jd-json.png`](screenshots/case4c-invalid-jd-json.png) |
| **4(d)** Network Error | Submitted while API server killed | Friendly network error banner | Displayed *"Không kết nối được dịch vụ. Hãy kiểm tra kết nối và thử lại."* | **PASS** | [`case4d-network-error.png`](screenshots/case4d-network-error.png) |
| **4(e)** Cancel screening | Clicked "Dừng chờ kết quả" during request | Aborts request, restores clean idle state | Notice *"Đã dừng chờ kết quả. Bạn có thể chỉnh sửa và thử lại."*, submit re-enabled | **PASS** | [`case4e-cancel-screening.png`](screenshots/case4e-cancel-screening.png) |

---

### Case 5: UX & Accessibility
- **Objective:** Validate Dark Mode, 375px mobile responsiveness, keyboard accessibility, JSON export structure, and print layout.
- **Result:** **PASS**

1. **Dark Mode:**
   - Clicked theme toggle button (`button "Bật giao diện tối"`).
   - Document element cleanly transitioned to `.dark` class with inverted contrast and dark surface tokens.
   - Screenshot: [`case5a-dark-mode.png`](screenshots/case5a-dark-mode.png)
2. **Mobile Viewport (375px Width):**
   - Resized viewport to 375px × 812px.
   - Tested result page rendering: No horizontal scrollbars, criteria badges, score cards, and quotes reflowed cleanly.
   - Screenshot: [`case5b-mobile-375px.png`](screenshots/case5b-mobile-375px.png)
3. **Keyboard-Only Flow:**
   - Navigated exclusively via keyboard (`Tab` / `Shift+Tab`).
   - `.skip-link` (*"Đến nội dung chính"*) verified visually hidden by default, expanding to fixed visible header banner (`top: 12px`, `left: 20px`) only on `:focus-visible`.
   - All interactive controls (tabs, selects, inputs, file picker, and action buttons) accessible via keyboard.
   - Screenshot: [`case5c-keyboard-flow.png`](screenshots/case5c-keyboard-flow.png)
4. **JSON Export Integrity:**
   - Validated exported JSON payload structure matches complete `ScreeningEnvelope`: contains `screening`, `extraction`, `latency_s`, and `config`.
   - Output File: [`case5d-export.json`](responses/case5d-export.json)
5. **Print Preview & Styles:**
   - Verified `@media print` rules: hides navigation header, hero banner, workflow steps, upload zone, buttons (`.no-print`), and footer.
   - Rendered print preview PDF and PNG cleanly displaying only candidate scoring, fit badges, and verified criteria evidence.
   - Evidence: [`case5e-print.png`](screenshots/case5e-print.png) & [`case5e-print.pdf`](screenshots/case5e-print.pdf)

---

### Case 6: UI & API Response Consistency
- **Objective:** Verify score and fit classifications in the UI match the API response values exactly.
- **Result:** **PASS**

| Test Case | API `observed_score` | UI Displayed Score | API `coverage` | UI Displayed Fit | UI Escalation Banner | Match? |
|---|---|---|---|---|---|---|
| **2(a) Python × Backend** | `55` (bounds `[49.5, 59.5]`) | `55 / 100 điểm` | `90%` | *Phù hợp một phần* | Shown (Escalated) | **EXACT** |
| **2(b) HR × HR** | `63` (bounds `[63, 63]`) | `63 / 100 điểm` | `100%` | *Phù hợp một phần* | Not shown | **EXACT** |
| **2(c) Designer × Backend** | `null` (bounds `[0, 80]`) | `— / 100 điểm` | `20%` | *Chưa đủ căn cứ đánh giá* | Shown (Manual Review) | **EXACT** |
| **3 Edited JD (weight 35)**| `56.5` (bounds `[51.36, 60.45]`) | `56,5 / 100 điểm` | `91%` | *Phù hợp một phần* | Shown (Escalated) | **EXACT** |

---

## 3. Discovered Issues & Severity

No blocker or major bugs were discovered during end-to-end execution.

- **Observation 1 (Minor / Cosmetic):**
  - **Description:** Decimal point localization: In Vietnamese locale, the observed score `56.5` renders with comma separator (`56,5`), whereas the score range in the subtitle renders with a period (`51.36–60.45`).
  - **Reproduction:** Set any criterion weight causing a fractional score (e.g. weight 35 on Case 3). Observe `56,5` in large score display vs `51.36–60.45` in range subtitle.
  - **Impact:** Strictly cosmetic; numbers remain clearly legible.

---

## 4. Teardown & Clean State Verification

- API service process on port 8100 terminated: **Verified free**
- Web service dev process on port 5173 terminated: **Verified free**
- Browser session tabs closed: **Verified clean**
- Git worktree status: **Zero tracked files modified**; write scope strictly confined to `data/eval/runs/20261123T042000Z-e2e/`.
