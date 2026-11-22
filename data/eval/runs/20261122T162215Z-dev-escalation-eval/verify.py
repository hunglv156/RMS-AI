"""Verify read-only inputs and run manifests against canonical data."""
import hashlib,json
from pathlib import Path
import yaml
base=Path(__file__).parent
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
provenance=json.loads((base/'input-provenance.json').read_text())
changed=[p for p,h in provenance['read_only_hashes'].items() if sha(p)!=h]
checks=[]
for suffix,eval_set in [('dev-esc-flashhigh','data/eval/set-10x2.yaml'),('dev-esc-argonmedium','data/eval/set-10x2.yaml')]:
    directory=base.parent/(base.name.removesuffix('dev-escalation-eval')+suffix)
    if not (directory/'manifest.json').exists():continue
    manifest=json.loads((directory/'manifest.json').read_text()); dataset=Path(eval_set); identity=manifest['identity']
    errors=[]
    if identity['eval_set_sha256']!=sha(dataset):errors.append('dataset hash')
    for jd,h in identity['jd_file_sha256'].items():
        if h!=sha(dataset.parent/'jds'/f'{jd}.yaml'):errors.append(f'JD hash {jd}')
    for f in (directory/'pairs').glob('*.json'):
        p=json.loads(f.read_text()); text=dataset.parent/'text'/(p['source_pdf_sha256']+'.txt')
        if p['text_content_sha256']!=sha(text):errors.append(f'text hash {f.stem}')
    if not manifest['ended_at']:errors.append('incomplete manifest')
    checks.append({'run':directory.name,'errors':errors,'invocations':len(manifest['invocations']),'identity':identity,'gateway_reported_models':manifest.get('gateway_reported_models')})
result={'changed_read_only_paths':changed,'run_checks':checks,'passed':not changed and all(not c['errors'] for c in checks)}
(base/'read-only-verification.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
assert result['passed']
