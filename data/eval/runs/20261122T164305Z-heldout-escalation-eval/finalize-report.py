"""Append the one held-out result to the dev selection report."""
import json
from pathlib import Path
base=Path(__file__).parent
dev=base.parent/'20261122T162215Z-dev-escalation-eval'
report=base/'RESULTS.md'
lines=report.read_text().splitlines()
assert json.loads((dev/'selection.json').read_text())['heldout_required']
def ci(v,b,d=4):return f"{v:.{d}f} [{b['low']:.{d}f}, {b['high']:.{d}f}]"
def table(headers,rows):return ['| '+' | '.join(headers)+' |','| '+' | '.join(['---']*len(headers))+' |',*['| '+' | '.join(map(str,row))+' |' for row in rows]]
metrics={v:json.loads((base/v/'metrics.json').read_text())['runs'][0] for v in ('primary','strict')}
supp={v:next(iter(json.loads((base/v/'supplementary-metrics.json').read_text())['runs'].values())) for v in ('primary','strict')}
o=supp['primary']['operational']; run=Path(metrics['primary']['path']); manifest=json.loads((run/'manifest.json').read_text())
assert o['succeeded']==20
insert=['## One held-out run','','The selected configuration was run exactly once on the approved staged 10 held-out CVs × two JDs. '+('No runner resume was needed.' if len(manifest['invocations'])==1 else 'One runner resume was used only for failed pairs; successful records were preserved.')+' Selection was frozen in the dev `selection.json` before this run began; held-out outputs were not used to change the model or band. The new outputs were evaluated offline under primary and strict labels.','','Historical no-escalation values below are transcribed from the selected Flash low/v2/hedge20 rows of `data/eval/runs/20261122T122041Z-heldout-eval/RESULTS.md`. Its Flash high/v1 baseline is a different configuration and is not the comparison here. Historical values retain that report’s rounding; new results are reported to four decimals.','','### Held-out operational comparison','','The operational values are identical under primary and strict labels.','']
reasons='; '.join(f"{k}: {v['count']} [{v['ci']['low']:.0f}, {v['ci']['high']:.0f}]" for k,v in o['reasons'].items())
new=['Argon medium escalation',f"{o['succeeded']}/20 [{o['success_95_ci']['low']:.3f}, {o['success_95_ci']['high']:.3f}]",*[ci(o[k],o[k+'_95_ci'],3) for k in ('p50','p95','max')],f"{o['within_40_s']}/20 [{o['within_40_s_95_ci']['low']:.0f}, {o['within_40_s_95_ci']['high']:.0f}]",f"{o['escalations']} [{o['escalations_95_ci']['low']:.0f}, {o['escalations_95_ci']['high']:.0f}]",reasons,str(len(o['escalation_errors']))]
insert+=table(['Run','Success [95% CI]','p50 s [CI]','p95 s [CI]','Max s [CI]','≤40 s [count CI]','Escalations [count CI]','Reasons [count CIs]','Escalation errors'],[['Historical no escalation','20/20 [0.839, 1.000]','8.190 [6.899, 24.064]','33.637 [25.178, 41.069]','41.069 [29.093, 41.069]','19/20 [17, 20]','0 [0, 0]','none','0'],new])+['']
old={'primary':['0.587 [0.457, 0.710]','0.698 [0.559, 0.822]','0.848 [0.757, 0.924]','1.000 [1.000, 1.000]','20/21 = 0.952 [0.842, 1.000]'],'strict':['0.657 [0.546, 0.763]','0.748 [0.641, 0.847]','0.862 [0.773, 0.932]','1.000 [1.000, 1.000]','28/33 = 0.848 [0.769, 0.947]']}
for variant in ('primary','strict'):
    r=metrics[variant]; m=r['scopes']['all']; b=m['bootstrap_95_ci']; a=supp[variant]['absent_recall']
    row=['Argon medium escalation',ci(m['exact']['kappa']['value'],b['kappa']),ci(m['collapsed']['kappa']['value'],b['collapsed_kappa']),ci(m['evidence']['f1']['value'],b['evidence_f1']),ci(m['fit']['accuracy']['value'],b['fit_accuracy']),f"{a['correct']}/{a['support']} = "+ci(a['value'],a['ci'])]
    insert+=['### '+variant.capitalize()+' labels','','Each row contains 140 criterion labels and 20 rule-5 fits.','']+table(['Run','Exact κ [95% CI]','Collapsed κ [CI]','Evidence F1 [CI]','Fit accuracy [CI]','Absent recall [CI]'],[['Historical no escalation',*old[variant]],row])+['']
    previous=json.loads((base.parent/'20261122T122041Z-heldout-eval'/variant/'metrics.json').read_text())['runs'][0]['scopes']['all']
    insert+=[f"New minus historical no escalation (unrounded stored metrics): exact κ {m['exact']['kappa']['value']-previous['exact']['kappa']['value']:+.6f}; collapsed κ {m['collapsed']['kappa']['value']-previous['collapsed']['kappa']['value']:+.6f}; evidence F1 {m['evidence']['f1']['value']-previous['evidence']['f1']['value']:+.6f}; fit accuracy {m['fit']['accuracy']['value']-previous['fit']['accuracy']['value']:+.6f}. No additional held-out model selection follows from these differences.",'']
insert+=['### Per-pair held-out latency and escalation flags','','']
rows=[]
for p in o['per_pair']:
    e=p['escalation'];rows.append([p['pair'],p['status'],f"{p['latency_s']:.6f}",'yes' if e.get('triggered') else 'no',', '.join(e.get('reasons',[])) or '—',f"{e['primary_latency_s']:.6f}",f"{e['escalation_latency_s']:.6f}",'yes' if e.get('error') else 'no'])
insert+=table(['Pair','Status','Latency s','Escalated','Reasons','Primary s','Escalation s','Escalation failed'],rows)+['']
insert+=['### Execution provenance','',f"Run: `{run.name}`. Manifest invocations: {len(manifest['invocations'])}; gateway-reported models: {manifest.get('gateway_reported_models')}. Requested primary/escalation selectors remain recorded in the manifest. Successful-output per-call attempts and hedge metadata are retained in pair JSON, including primary summaries for escalated pairs. Shared gateway noise and primary-output variation mean this is a comparison of complete runs, not a causal estimate of escalation alone.",'']
needle='Held-out results must be appended before completion.'
idx=lines.index(needle); lines[idx:idx+1]=insert
idx=lines.index('## Artifacts')
lines[idx:]=['## Artifacts','',f"- Dev selection and tables: `data/eval/runs/{dev.name}/` (`accuracy/`, `selection.json`, `supplementary-metrics.json`, `input-provenance.json`, `read-only-verification.json`).",'- Held-out `primary/` and `strict/`: unmodified evaluator `metrics.json`/`report.md`, plus supplemental operational/absent-recall intervals.',f"- Held-out raw output: `data/eval/runs/{run.name}/` (manifest, 20 pair JSONs, summaries, runner log).",'- `heldout-verification.json`: staged/canonical inputs, completed manifest, pair-text and read-only checks.','- Offline helper scripts are new reproducibility artifacts under run directories; application/evaluation source is unchanged.']
headline=(f"Dev selected `ag/gemini-4-argon-medium` mechanically: A failed the latency gate (16/20 ≤40 s); B passed (18/20) and improved both collapsed κ and evidence F1. The one held-out run succeeded 20/20 without resume, but only {o['within_40_s']}/20 pairs met 40 s (p95 {o['p95']:.2f} s versus historical 33.637 s). On primary labels, collapsed κ decreased while evidence F1 increased; on strict labels both increased, and fit accuracy fell from 1.00 to 0.95 under both variants.")
lines[2:2]=[headline,'']
report.write_text('\n'.join(lines)+'\n')
print(report)
