"""Offline dev evaluation and the fixed T5.9 gate; no provider calls."""
import json
from pathlib import Path
from datetime import UTC, datetime
from app.experiments.evaluate import evaluate
from supplement import operational, absent

base = Path(__file__).resolve().parent
root = base.parents[3]
runs = base.parent
names = ['20261122T083536Z-v2-lexical-gemini-3-8-flash-low-c1', '20261122T162215Z-dev-esc-argonmedium', '20261122T182040Z-dev-esc-nr-argonmedium']
labels = root / 'data/eval/labels-silver/final'
metrics = evaluate(labels, [runs / name for name in names], base / 'accuracy', seed=20261122, resamples=2000)
supp = {name: {'operational': operational(runs / name), 'absent_recall': absent(runs / name, labels)} for name in names}
(base / 'supplementary-metrics.json').write_text(json.dumps({'seed': 20261122, 'resamples': 2000, 'runs': supp}, indent=2) + '\n')
ref, _, new = [r['scopes']['all'] for r in metrics['runs']]
o = supp[names[-1]]['operational']
k = new['collapsed']['kappa']['value']; f = new['evidence']['f1']['value']
rk = ref['collapsed']['kappa']['value']; rf = ref['evidence']['f1']['value']
checks = {'success_20_of_20': o['succeeded'] == o['pairs'] == 20, 'at_least_17_within_40_s': o['within_40_s'] >= 17, 'collapsed_kappa_within_0_01_of_reference': k >= rk - 0.01, 'evidence_f1_within_0_01_of_reference': f >= rf - 0.01}
selection = {'created_at': datetime.now(UTC).isoformat(), 'rule': '20/20 success AND at least 17/20 pairs <=40 s AND collapsed kappa >= reference - 0.01 AND evidence F1 >= reference - 0.01', 'model': 'ag/gemini-4-argon-medium', 'triggers': ['needs_review'], 'checks': checks, 'heldout_required': all(checks.values()), 'new': {'success': o['succeeded'], 'within_40_s': o['within_40_s'], 'collapsed_kappa': k, 'evidence_f1': f}, 'reference': {'collapsed_kappa': rk, 'evidence_f1': rf}, 'deltas': {'collapsed_kappa': k-rk, 'evidence_f1': f-rf}}
(base / 'selection.json').write_text(json.dumps(selection, indent=2) + '\n')
print(json.dumps(selection, indent=2))
