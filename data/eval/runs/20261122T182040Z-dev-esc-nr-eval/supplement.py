"""Supplemental descriptive intervals; reads run/evaluator artifacts only."""
import json, math
from pathlib import Path
import numpy as np
from app.experiments import evaluate as ev
SEED=20261122
DRAWS=2000

def operational(directory):
    records=[json.loads(p.read_text()) for p in sorted((directory/'pairs').glob('*.json'))]
    successful=[p for p in records if p['status']=='succeeded']
    n=len(records); s=len(successful); z=1.959963984540054
    center=(s/n+z*z/(2*n))/(1+z*z/n)
    margin=z*math.sqrt(s/n*(1-s/n)/n+z*z/(4*n*n))/(1+z*z/n)
    latency=np.array([p['latency_s'] for p in successful]); rng=np.random.default_rng(SEED)
    draws=rng.integers(0,len(latency),size=(DRAWS,len(latency)))
    samples=latency[draws]
    def interval(a): return {'low':float(np.percentile(a,2.5)),'high':float(np.percentile(a,97.5))}
    result={'pairs':n,'succeeded':s,'success_95_ci':{'low':max(0,center-margin),'high':min(1,center+margin)},'p50':float(np.percentile(latency,50)),'p95':float(np.percentile(latency,95)),'max':float(max(latency)),'within_40_s':int(sum(latency<=40)), 'p50_95_ci':interval(np.percentile(samples,50,axis=1)),'p95_95_ci':interval(np.percentile(samples,95,axis=1)),'max_95_ci':interval(samples.max(axis=1)),'within_40_s_95_ci':interval((samples<=40).sum(axis=1))}
    esc=np.array([bool(p['result'].get('escalation',{}).get('triggered',False)) for p in successful])
    result['escalations']=int(sum(esc)); result['escalations_95_ci']=interval(esc[draws].sum(axis=1))
    result['reasons']={}
    for reason in ('needs_review','coverage_band'):
        a=np.array([reason in p['result'].get('escalation',{}).get('reasons',[]) for p in successful])
        result['reasons'][reason]={'count':int(sum(a)),'ci':interval(a[draws].sum(axis=1))}
    result['escalation_errors']=[p['sheet_id']+'__'+p['jd_id'] for p in successful if p['result'].get('escalation',{}).get('error')]
    result['per_pair']=[{'pair':p['sheet_id']+'__'+p['jd_id'],'status':p['status'],'latency_s':p['latency_s'],'escalation':p.get('result',{}).get('escalation',{})} for p in records]
    return result

def absent(directory, labels_dir):
    labels=ev.load_labels(labels_dir); jds=ev.load_jds(labels_dir,labels)
    pairs,_=ev.load_run(directory,labels,jds)
    a=np.array([[sum(x=='absent' and y=='absent' for x,y in zip(p.truth,p.predicted)),sum(x=='absent' for x in p.truth)] for p in pairs])
    rng=np.random.default_rng(SEED); sums=a[rng.integers(0,len(pairs),size=(DRAWS,len(pairs)))].sum(axis=1)
    valid=sums[:,1]>0; scores=sums[valid,0]/sums[valid,1]
    return {'correct':int(a[:,0].sum()),'support':int(a[:,1].sum()),'value':float(a[:,0].sum()/a[:,1].sum()),'ci':{'low':float(np.percentile(scores,2.5)),'high':float(np.percentile(scores,97.5))},'defined_resamples':int(sum(valid))}

if __name__=='__main__':
    import sys
    metrics=json.loads(Path(sys.argv[1]).read_text()); labels=Path(metrics['labels'])
    output={r['run']:{'operational':operational(Path(r['path'])),'absent_recall':absent(Path(r['path']),labels)} for r in metrics['runs']}
    Path(sys.argv[2]).write_text(json.dumps({'seed':SEED,'resamples':DRAWS,'runs':output},indent=2)+'\n')
