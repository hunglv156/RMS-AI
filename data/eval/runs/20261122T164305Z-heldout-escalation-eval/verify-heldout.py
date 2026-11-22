"""Read-only held-out artifact verification."""
import hashlib,json
from datetime import datetime
from pathlib import Path
import yaml
base=Path(__file__).parent
run=base.parent/'20261122T164305Z-heldout-final-flashlow-v2-hedge20-esc-argonmedium'
dev=base.parent/'20261122T162215Z-dev-escalation-eval'
canonical=Path('data/eval/heldout/set-heldout-10.yaml')
staged=base.parent/'20261122T122041Z-heldout-eval/inputs/set-heldout-10.yaml'
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
errors=[]
manifest=json.loads((run/'manifest.json').read_text()); identity=manifest['identity']
if canonical.read_bytes()!=staged.read_bytes():errors.append('canonical/staged YAML differs')
if identity['eval_set_sha256']!=sha(canonical):errors.append('manifest dataset hash differs')
for jd,h in identity['jd_file_sha256'].items():
    if h!=sha(staged.parent/'jds'/f'{jd}.yaml') or h!=sha(Path('data/eval/jds')/f'{jd}.yaml'):errors.append('JD hash '+jd)
records=[json.loads(p.read_text()) for p in sorted((run/'pairs').glob('*.json'))]
source=yaml.safe_load(canonical.read_text())
expected={cv['sheet_id']+'__'+jd for cv in source['cvs'] for jd in ['jd-py-real','jd-hr-real']}
if {r['sheet_id']+'__'+r['jd_id'] for r in records}!=expected:errors.append('pair set')
for p in records:
    if p['text_content_sha256']!=sha(staged.parent/'text'/(p['source_pdf_sha256']+'.txt')) or p['text_content_sha256']!=sha(Path('data/eval/text')/(p['source_pdf_sha256']+'.txt')):errors.append('pair text '+p['sheet_id'])
    if p['status']!='succeeded':errors.append('failed pair '+p['sheet_id']+'__'+p['jd_id'])
if not manifest['ended_at']:errors.append('incomplete manifest')
if len(manifest['invocations'])>2:errors.append('more than one resume')
if identity['escalation']!={'model':'ag/gemini-4-argon-medium','coverage_band':[0.7,0.9]}:errors.append('escalation config')
if identity['hedge_after_s']!=20:errors.append('hedge config')
selection=json.loads((dev/'selection.json').read_text())
if not selection['heldout_required'] or not selection['decision'].endswith('dev-esc-argonmedium'):errors.append('dev selection')
# File mtime records selection being frozen before held-out manifest start, in addition to task log.
selection_before_run=(dev/'selection.json').stat().st_mtime<=datetime.fromisoformat(manifest['started_at']).timestamp()
if not selection_before_run:errors.append('selection file modified after held-out start')
provenance=json.loads((dev/'input-provenance.json').read_text())
changed=[p for p,h in provenance['read_only_hashes'].items() if sha(p)!=h]
if changed:errors.append('read-only paths changed')
result={'passed':not errors,'errors':errors,'canonical_heldout_sha256':sha(canonical),'staged_heldout_sha256':sha(staged),'pair_count':len(records),'invocations':len(manifest['invocations']),'manifest_identity':identity,'changed_read_only_paths':changed,'selection':selection['decision'],'selection_created_before_heldout_started':selection_before_run}
(base/'heldout-verification.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2));assert not errors
