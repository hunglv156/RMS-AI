"""Render the T5.9 report from evaluator outputs and immutable historical reports."""
import json
import sys
from pathlib import Path

base = Path(__file__).resolve().parent
runs = base.parent
final = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else base
selection = json.loads((base / 'selection.json').read_text())
metrics = json.loads((base / 'accuracy/metrics.json').read_text())
supp = json.loads((base / 'supplementary-metrics.json').read_text())['runs']
names = ['Reference — no escalation', 'T5.8 — band + NR', 'T5.9 — NR only']

def table(headers, rows):
    return ['| ' + ' | '.join(headers) + ' |', '| ' + ' | '.join(['---'] * len(headers)) + ' |', *['| ' + ' | '.join(map(str, row)) + ' |' for row in rows]]

def ci(value, bounds, digits=4):
    return f"{value:.{digits}f} [{bounds['low']:.{digits}f}, {bounds['high']:.{digits}f}]"

def op_row(name, op):
    reasons = '; '.join(f"{k}: {v['count']} [{v['ci']['low']:.0f}, {v['ci']['high']:.0f}]" for k, v in op['reasons'].items())
    return [name, f"{op['succeeded']}/{op['pairs']} [{op['success_95_ci']['low']:.3f}, {op['success_95_ci']['high']:.3f}]", *[ci(op[k], op[k+'_95_ci'], 3) for k in ['p50', 'p95', 'max']], f"{op['within_40_s']}/20 [{op['within_40_s_95_ci']['low']:.0f}, {op['within_40_s_95_ci']['high']:.0f}]", f"{op['escalations']} [{op['escalations_95_ci']['low']:.0f}, {op['escalations_95_ci']['high']:.0f}]", reasons, len(op['escalation_errors'])]

def acc_row(name, run, supplementary):
    m = run['scopes']['all']; b = m['bootstrap_95_ci']; a = supplementary['absent_recall']
    return [name, ci(m['exact']['kappa']['value'], b['kappa']), ci(m['collapsed']['kappa']['value'], b['collapsed_kappa']), ci(m['evidence']['f1']['value'], b['evidence_f1']), ci(m['fit']['accuracy']['value'], b['fit_accuracy']), f"{a['correct']}/{a['support']} = " + ci(a['value'], a['ci'])]

op_headers = ['Run', 'Success [95% CI]', 'p50 s [CI]', 'p95 s [CI]', 'Max s [CI]', '≤40 s [count CI]', 'Escalations [count CI]', 'Reasons [count CIs]', 'Escalation errors']
acc_headers = ['Run', 'Exact κ [95% CI]', 'Collapsed κ [CI]', 'Evidence F1 [CI]', 'Fit accuracy [CI]', 'Absent recall [CI]']
newop = supp[metrics['runs'][-1]['run']]['operational']
passed = selection['heldout_required']
lines = ['# T5.9 — Escalation on needs_review only', '', f"The fixed NR-only Argon medium configuration {'passed' if passed else 'failed'} the dev gate: {newop['succeeded']}/20 success and {newop['within_40_s']}/20 pairs ≤40 s. Collapsed κ delta versus reference is {selection['deltas']['collapsed_kappa']:+.8f}; evidence F1 delta is {selection['deltas']['evidence_f1']:+.8f}.", '', '## Procedure', '', 'Added `EscalationRule.triggers` and runner `--escalate-on`, preserving both triggers by default and preserving existing default manifests and screening serialization. Non-default trigger subsets are recorded canonically in manifest identity and distinguish resumes. All existing tests were left unchanged; new tests cover NR-only with in-band coverage, NR escalation, coverage-only, invalid subsets, CLI parsing, manifest identity, and resume behavior. Validation before provider calls: `uv run pytest` (253 passed, 3 skipped), `uv run ruff check .`, `uv run ruff format --check .` all passed in `apps/ai-service`; see `code-validation.json`.', '', 'The model was fixed at `ag/gemini-4-argon-medium`; no model selection was performed. Dev common flags: `--model ag/gemini-3.8-flash-low --prompt-version screening-v2 --context-mode retrieved --retrieval-mode lexical --retrieval-k 5 --concurrency 1 --hedge-after-s 20 --escalate-model ag/gemini-4-argon-medium --escalate-on needs_review`. The coverage band remains a stored default but is inactive. Environment was loaded from the specified file without printing or copying secrets. Runs were strictly sequential; no label or environment files were changed and no commit was made.', '', 'The three dev runs were evaluated offline together against `data/eval/labels-silver/final/`: `20261122T083536Z-v2-lexical-gemini-3-8-flash-low-c1`, `20261122T162215Z-dev-esc-argonmedium`, and `20261122T182040Z-dev-esc-nr-argonmedium`. The historical reference has no hedge, so differences combine escalation, hedging, primary-output variation, and gateway timing.', '', '## Intervals and definitions', '', 'Accuracy uses unmodified `app.experiments.evaluate`: nominal six-class exact κ; collapsed κ merges strong/adequate/partial into evidence, retains absent, and merges unknown/needs_review; evidence F1 is binary evidence detection, not quote overlap; fit accuracy applies guideline rule 5. Accuracy and absent-recall CIs use 2,000 pair-cluster percentile bootstrap draws, NumPy seed 20261122; zero-support absent draws are omitted. Operational percentile/count intervals use the same seed and 2,000 draws; success uses a Wilson 95% interval. Pair latency includes preparation, provider retries, hedging, and escalation, excluding queue and persistence. Percentiles use linear interpolation at (n−1)q. Observed max/p95 CIs do not bound future tails. Reason counts may overlap; escalation failure preserves primary output.', '', '## Dev results', '']
lines += table(op_headers, [op_row(n, supp[r['run']]['operational']) for n, r in zip(names, metrics['runs'])]) + ['']
lines += table(acc_headers, [acc_row(n, r, supp[r['run']]) for n, r in zip(names, metrics['runs'])]) + ['', '## Mechanical gate', '', selection['rule'] + '.', '']
for key, value in selection['checks'].items():
    lines.append(f"- `{key}`: {'PASS' if value else 'FAIL'}.")
ref = selection['reference']; new = selection['new']
lines += ['', f"Full precision: collapsed κ {new['collapsed_kappa']:.10f} ≥ {ref['collapsed_kappa']:.10f} − 0.01 = {ref['collapsed_kappa']-0.01:.10f}; evidence F1 {new['evidence_f1']:.10f} ≥ {ref['evidence_f1']:.10f} − 0.01 = {ref['evidence_f1']-0.01:.10f}. Each comparison is applied independently with logical AND.", '', f"**Decision: {'PASS — one held-out run authorized by the gate' if passed else 'FAIL — stop; no held-out run made'}.**", '']
# Historical held-out values are transcribed from the requested RESULTS.md files.
old = {
    'primary': ['0.587 [0.457, 0.710]', '0.698 [0.559, 0.822]', '0.848 [0.757, 0.924]', '1.000 [1.000, 1.000]', '20/21 = 0.952 [0.842, 1.000]'],
    'strict': ['0.657 [0.546, 0.763]', '0.748 [0.641, 0.847]', '0.862 [0.773, 0.932]', '1.000 [1.000, 1.000]', '28/33 = 0.848 [0.769, 0.947]'],
}
band = {
    'primary': ['0.5595 [0.4611, 0.6533]', '0.6782 [0.5529, 0.8007]', '0.8819 [0.7907, 0.9429]', '0.9500 [0.8500, 1.0000]', '20/21 = 0.9524 [0.8421, 1.0000]'],
    'strict': ['0.6725 [0.5755, 0.7578]', '0.7911 [0.6813, 0.8881]', '0.8960 [0.8036, 0.9561]', '0.9500 [0.8500, 1.0000]', '31/33 = 0.9394 [0.8709, 1.0000]'],
}
heldout = passed and (final/'primary/metrics.json').exists() and (final/'strict/metrics.json').exists()
lines += ['## Held-out comparison', '', 'Historical no-escalation values are transcribed from the selected Flash low/v2/hedge20 rows of `20261122T122041Z-heldout-eval/RESULTS.md`; T5.8 band+NR values are transcribed from `20261122T164305Z-heldout-escalation-eval/RESULTS.md`. Historical rounding is retained. These historical results are context and did not enter the mechanical dev gate.', '']
if heldout:
    hs = {v: next(iter(json.loads((final/v/'supplementary-metrics.json').read_text())['runs'].values())) for v in ['primary','strict']}
    hm = {v: json.loads((final/v/'metrics.json').read_text())['runs'][0] for v in ['primary','strict']}
    ho = hs['primary']['operational']; run = Path(hm['primary']['path']); manifest = json.loads((run/'manifest.json').read_text())
    lines += [f"The staged held-out YAML SHA-256 was verified before calls as `ce42cfbff2bd031b7d984d272fd3680a483855290917f47e5271edfa20e97a6f`. One held-out run was made after the gate was frozen; manifest invocations: {len(manifest['invocations'])}. " + ('No resume was needed.' if len(manifest['invocations']) == 1 else 'One resume retried only failed pairs; successful records were preserved.'), '']
    lines[2] += f" The single held-out run achieved {ho['succeeded']}/20 success and {ho['within_40_s']}/20 pairs ≤40 s; p95 {ho['p95']:.3f} s."
else:
    lines += ['No held-out provider calls were made because the dev gate failed.' if not passed else 'Held-out evaluation pending.', '']
oldop = ['Historical no escalation', '20/20 [0.839, 1.000]', '8.190 [6.899, 24.064]', '33.637 [25.178, 41.069]', '41.069 [29.093, 41.069]', '19/20 [17, 20]', '0 [0, 0]', 'none', '0']
bandop = ['T5.8 — band + NR', '20/20 [0.839, 1.000]', '21.447 [17.112, 75.079]', '93.994 [83.358, 107.473]', '107.473 [84.891, 107.473]', '11/20 [7, 15]', '8 [4, 12]', 'needs_review: 2 [0, 5]; coverage_band: 6 [2, 10]', '0']
lines += ['### Operations (same for both label variants)', ''] + table(op_headers, [oldop, bandop, op_row('T5.9 — NR only', ho) if heldout else ['T5.9 — NR only', 'Skipped' if not passed else 'Pending', *['—']*7]]) + ['']
for v in ['primary','strict']:
    lines += ['### ' + v.capitalize() + ' labels', '', 'Each evaluated row uses 140 criteria and 20 rule-5 fits.', ''] + table(acc_headers, [['Historical no escalation', *old[v]], ['T5.8 — band + NR', *band[v]], acc_row('T5.9 — NR only', hm[v], hs[v]) if heldout else ['T5.9 — NR only (skipped)' if not passed else 'T5.9 — NR only (pending)', *['—']*5]]) + ['']

def pair_section(title, data):
    result = ['## ' + title, '']
    rows = []
    for name, op in data:
        noise = sum(p['latency_s'] > 40 and not p['escalation'].get('triggered') for p in op['per_pair'])
        result += [f"{name}: {noise} non-escalated pairs exceeded 40 s. These delays are consistent with gateway noise; the artifacts cannot isolate gateway load from other primary-pass variation.", '']
        for p in op['per_pair']:
            e = p['escalation']
            rows.append([name, p['pair'], p['status'], f"{p['latency_s']:.6f}", 'yes' if e.get('triggered') else 'no', ', '.join(e.get('reasons', [])) or '—', f"{e['primary_latency_s']:.6f}" if e else '—', f"{e['escalation_latency_s']:.6f}" if e else '—', 'yes' if e.get('error') else 'no'])
    return result + table(['Run', 'Pair', 'Status', 'Latency s', 'Escalated', 'Reasons', 'Primary s', 'Escalation s', 'Escalation failed'], rows) + ['']
lines += pair_section('Per-pair dev latency and escalation flags', [(n,supp[r['run']]['operational']) for n,r in zip(names,metrics['runs'])])
if heldout:
    lines += pair_section('Per-pair held-out latency and escalation flags', [('T5.9 — NR only',ho)])
    lines += ['## Held-out execution provenance', '', f"Run: `{run.name}`; manifest invocations: {len(manifest['invocations'])}; gateway-reported models: {manifest.get('gateway_reported_models')}. Requested selectors are retained in manifest identity. Primary and escalation split latencies and per-call hedge/attempt metadata are retained in pair JSON. The trigger and model were not retuned after this run.", '']
lines += ['## Limitations', '', '- Small n: 10 CVs × 2 JDs per dataset; 20 dependent pairs and 140 criteria. Pair bootstrap preserves within-pair criteria but not the same CV’s cross-JD dependence; these are descriptive intervals, not significance claims. Success intervals assume independent pairs.', '- Silver labels are LLM annotations, not human ground truth. Adjudicator/model-family overlap and dev-convention harmonisation can bias agreement; primary and strict labels reflect different conventions.', '- Gateway noise, retries, hedging, nondeterminism, and sequential order confound latency comparisons. The dev reference has no hedge; NR-only uses hedge20. Successful pair status can include escalation fallback, reported separately.', '- The needs_review-only trigger was chosen after seeing T5.8 held-out results, so held-out is no longer fully untouched for this choice. The dev gate and one subsequent held-out run do not restore confirmatory independence.', '- Fit is a deterministic rubric proxy rather than a hiring recommendation. Weights/scores are uncalibrated, and expected_group is sampling metadata rather than ground truth.', '- Bootstrap CIs for extrema cannot guarantee future tails; gateway response aliases alone do not independently establish the requested selector’s execution policy.', '', '## Artifacts', '', f"- Dev: `data/eval/runs/{base.name}/` — `accuracy/`, `selection.json`, `supplementary-metrics.json`, `code-validation.json`, input provenance and read-only verification, reproducible offline scripts.", '- Raw NR-only dev output: `data/eval/runs/20261122T182040Z-dev-esc-nr-argonmedium/` — manifest, summary, 20 pair JSONs, runner log.']
if heldout:
    lines += [f"- Raw held-out output: `data/eval/runs/{run.name}/`.", '- This directory: `primary/`, `strict/`, supplementary intervals, held-out verification, and RESULTS.md.']
final.mkdir(parents=True, exist_ok=True)
(final/'RESULTS.md').write_text('\n'.join(lines) + '\n')
print(final/'RESULTS.md')
