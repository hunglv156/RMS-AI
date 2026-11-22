"""Apply Dylan's predeclared dev rule, without consulting held-out outputs."""
import json
from pathlib import Path
base=Path(__file__).parent
metrics=json.loads((base/'accuracy/metrics.json').read_text())
rows=[]
for r in metrics['runs']:
    summary=json.loads((Path(r['path'])/'summary.json').read_text())
    rows.append({'run':r['run'],'path':r['path'],'success':summary['succeeded'],'within_40_s':summary['latency_s']['within_40_s'],'p95':summary['latency_s']['p95'],'collapsed_kappa':r['scopes']['all']['collapsed']['kappa']['value'],'evidence_f1':r['scopes']['all']['evidence']['f1']['value']})
reference=rows[0]
eligible=[r for r in rows[1:] if r['success']==20 and r['within_40_s']>=17]
chosen=None
if eligible:
    best_k=max(r['collapsed_kappa'] for r in eligible)
    ties=[r for r in eligible if best_k-r['collapsed_kappa']<=0.01]
    chosen=sorted(ties,key=lambda r:(-r['evidence_f1'],r['p95']))[0]
improves=chosen is not None and (chosen['collapsed_kappa']>reference['collapsed_kappa'] or chosen['evidence_f1']>reference['evidence_f1'])
result={'rule':'Candidates A and B must have 20/20 success, then at least 17/20 pairs <=40 s. Pick higher collapsed kappa; values within 0.01 tie, then higher evidence F1, then lower p95. Use escalation only if the picked candidate strictly improves reference collapsed kappa OR evidence F1. Otherwise no escalation and skip held-out.','rows':rows,'eligible':[r['run'] for r in eligible],'picked_before_reference_gate':chosen,'decision':chosen['run'] if improves else 'no escalation','heldout_required':improves}
(base/'selection.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
