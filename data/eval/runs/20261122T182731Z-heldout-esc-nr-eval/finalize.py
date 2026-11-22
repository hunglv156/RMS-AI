"""Render the existing T5.9 report and attach interrupted-run resume provenance."""
import hashlib
import json
import runpy
import sys
from datetime import datetime, timezone
from pathlib import Path

final = Path(__file__).resolve().parent
base = final.parent / '20261122T182040Z-dev-esc-nr-eval'
run = final.parent / '20261122T182731Z-heldout-final-flashlow-v2-hedge20-esc-nr-argonmedium'
provenance = json.loads((final / 'resume-provenance.json').read_text())
manifest = json.loads((run / 'manifest.json').read_text())
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
prior = provenance['prior_pair_hashes']
assert len(manifest['invocations']) == 2
assert all(sha(run / 'pairs' / name) == digest for name, digest in prior.items())
new = sorted(p.name for p in (run / 'pairs').glob('*.json') if p.name not in prior)
assert len(prior) == 17 and len(new) == 3
assert all(json.loads(p.read_text())['status'] == 'succeeded' for p in (run/'pairs').glob('*.json'))
assert manifest['invocations'][0]['ended_at'] is None
assert manifest['invocations'][1]['ended_at'] is not None
provenance.update(completed_at=datetime.now(timezone.utc).isoformat(), resumed_session_pairs=3,
                  resumed_pair_files=new, successful_prior_files_preserved=True,
                  total_succeeded=20, total_invocations=2)
(final / 'resume-provenance.json').write_text(json.dumps(provenance, indent=2) + '\n')
sys.argv = [str(base/'report.py'), str(final)]
runpy.run_path(str(base/'report.py'), run_name='__main__')
path = final / 'RESULTS.md'
report = path.read_text()
report = report.replace('One resume retried only failed pairs; successful records were preserved.',
    'The original session was interrupted after completing 17 successful pairs; its invocation remains open in the manifest as evidence of interruption. The single allowed resume completed the 3 missing pairs (no failed pair files were present), preserving all 17 successful pair files byte-for-byte. Thus 17 pairs ran in the original session and 3 in the resumed session; no new held-out run directory was created. See `resume-provenance.json`.')
report = report.replace('see `code-validation.json`.',
    'see the dev `code-validation.json` and this directory’s `resume-provenance.json` for the repeated checks before resuming.')
report = report.replace('held-out verification, and RESULTS.md.',
    'held-out verification, `resume-provenance.json`, reproducible `finalize.py`, and RESULTS.md. Evaluation reuses `../20261122T182040Z-dev-esc-nr-eval/evaluate-heldout.py` with the raw held-out run directory and this evaluation directory as arguments.')
report = report.replace('## Per-pair dev latency and escalation flags',
    '## Held-out observations\n\nNR-only reduced observed escalations from 8/20 to 1/20 and p95 from 93.994 s to 44.840 s versus T5.8 band+NR, with 16/20 rather than 11/20 pairs within 40 s. Historical no escalation still had lower observed p95 (33.637 s) and 19/20 within 40 s. All four NR-only pairs above 40 s were non-escalated.\n\nOn primary labels, NR-only collapsed κ (0.6559) was below both historical no escalation (0.698) and T5.8 (0.6782); evidence F1 (0.8571) was above historical no escalation (0.848) and below T5.8 (0.8819). Strict collapsed κ was 0.7476 and evidence F1 0.8710; fit accuracy was 1.0000 under both variants. These comparisons are descriptive, with no further selection or rerun. The interruption separates the 17 original and 3 resumed pairs in time and adds another gateway-timing confounder.\n\n## Per-pair dev latency and escalation flags')
assert 'Pending' not in report and 'pending' not in report
path.write_text(report)
print('Verified 17 preserved + 3 resumed successful pairs and finalized report.')
