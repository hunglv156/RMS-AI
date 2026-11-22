"""Verify immutable input hashes, run identity, and pair text provenance."""
import hashlib
import json
import sys
from datetime import datetime
from pathlib import Path

base = Path(__file__).resolve().parent
root = base.parents[3]
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
provenance = json.loads((base/'input-provenance.json').read_text())
changed = [p for p,h in provenance['read_only_hashes'].items() if sha(root/p) != h]
errors = []
checks = []
for name in ['20261122T182040Z-dev-esc-nr-argonmedium', *sys.argv[1:]]:
    run = base.parent/name
    manifest = json.loads((run/'manifest.json').read_text())
    identity = manifest['identity']
    dataset = root/'data/eval/set-10x2.yaml' if 'dev-' in name else root/'data/eval/runs/20261122T122041Z-heldout-eval/inputs/set-heldout-10.yaml'
    if identity['eval_set_sha256'] != sha(dataset): errors.append(name+': dataset hash')
    for jd,h in identity['jd_file_sha256'].items():
        if h != sha(dataset.parent/'jds'/f'{jd}.yaml'): errors.append(name+': JD hash')
    pairs = [json.loads(p.read_text()) for p in (run/'pairs').glob('*.json')]
    if len(pairs) != 20: errors.append(name+': pair count')
    for p in pairs:
        if p['text_content_sha256'] != sha(dataset.parent/'text'/(p['source_pdf_sha256']+'.txt')): errors.append(name+': text hash')
    if not manifest['ended_at']: errors.append(name+': incomplete manifest')
    if identity['escalation'] != {'model':'ag/gemini-4-argon-medium','coverage_band':[0.7,0.9],'triggers':['needs_review']}: errors.append(name+': escalation identity')
    if identity['hedge_after_s'] != 20: errors.append(name+': hedge config')
    if 'heldout-' in name:
        if len(manifest['invocations']) > 2: errors.append(name+': too many resumes')
        if (base/'selection.json').stat().st_mtime > datetime.fromisoformat(manifest['started_at']).timestamp(): errors.append(name+': gate not frozen before calls')
        if not json.loads((base/'selection.json').read_text())['heldout_required']: errors.append(name+': gate failed')
    checks.append({'run':name,'pairs':len(pairs),'succeeded':sum(p['status']=='succeeded' for p in pairs),'invocations':len(manifest['invocations']),'identity':identity,'gateway_reported_models':manifest.get('gateway_reported_models')})
result = {'passed':not errors and not changed,'errors':errors,'changed_read_only_paths':changed,'run_checks':checks}
output = base/'read-only-verification.json' if not sys.argv[1:] else base.parent/(sys.argv[1].split('-heldout-final-')[0]+'-heldout-esc-nr-eval')/'heldout-verification.json'
output.write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
assert result['passed']
