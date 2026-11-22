"""Offline evaluation only: evaluate the single held-out run under both label variants."""
import json
import sys
from pathlib import Path
from app.experiments.evaluate import evaluate
from supplement import operational, absent

base = Path(__file__).resolve().parent
root = base.parents[3]
selection = json.loads((base/'selection.json').read_text())
assert selection['heldout_required'], 'Dev gate failed'
run = Path(sys.argv[1]).resolve()
output = Path(sys.argv[2]).resolve()
for variant, labels in [
    ('primary', root/'data/eval/heldout/labels-silver/final'),
    ('strict', root/'data/eval/runs/20261122T122041Z-heldout-eval/labels-strict'),
]:
    evaluate(labels, [run], output/variant, seed=20261122, resamples=2000)
    supplementary = {'seed': 20261122, 'resamples': 2000, 'runs': {run.name: {'operational': operational(run), 'absent_recall': absent(run, labels)}}}
    (output/variant/'supplementary-metrics.json').write_text(json.dumps(supplementary,indent=2)+'\n')
print(output)
