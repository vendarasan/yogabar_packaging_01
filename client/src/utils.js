import { STAGE_ORDER, STAGE_COLORS, STAGE_PCT, PRINT_LEAD } from './constants';
export * from './constants';

export function today() { return new Date().toISOString().split('T')[0]; }
export function addDays(ds, n) { const d = new Date(ds); d.setDate(d.getDate()+n); return d.toISOString().split('T')[0]; }
export function fmt(ds) { if(!ds) return '—'; const [y,m,d]=ds.split('-'); const M=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return `${d}-${M[parseInt(m)-1]}-${y.slice(2)}`; }
export function daysFromNow(ds) { if(!ds) return null; return Math.round((new Date(ds)-new Date(today()))/86400000); }
export function stageIdx(s) { return STAGE_ORDER.indexOf(s); }
export function getPrintDays(mats) { const m=Math.max(...(mats||[]).map(m=>PRINT_LEAD[m.printType]||0)); return m>0?m:5; }
export function printCls(pt) { return({'Digital Print':'print-dig','Flexo Print':'print-flex','Gravure Print':'print-grav','Not Applicable':'print-na'})[pt]||'print-na'; }
export function getProjectStage(p) { if(!p.materials||!p.materials.length) return p.stage||'Brief'; const minIdx=Math.min(...p.materials.map(m=>stageIdx(m.stage||'Brief'))); return STAGE_ORDER[minIdx]; }
export function getProjectProgress(p) { if(p.status==='Launched') return 100; if(!p.materials||!p.materials.length) return STAGE_PCT[p.stage]||0; const total=p.materials.reduce((s,m)=>s+(STAGE_PCT[m.stage||'Brief']||0),0); return Math.round(total/p.materials.length); }
export function getLTStatus(p) { if(p.status==='Launched') return 'ok'; const stage=getProjectStage(p); const ms=p.milestones&&p.milestones[stage]; if(!ms) return 'ok'; const dl=Math.round((new Date(today())-new Date(ms))/86400000); if(dl<=0) return 'ok'; if(dl<=2) return 'warn'; return 'late'; }
export function getDaysLeft(p) { if(p.status==='Launched') return null; const stage=getProjectStage(p); const ms=p.milestones&&p.milestones[stage]; if(!ms) return null; return daysFromNow(ms); }
export function getSlippage(p) { if(!p.originalMilestones||!p.milestones) return 0; const o=p.originalMilestones.Connectivity,c=p.milestones.Connectivity; if(!o||!c) return 0; return Math.round((new Date(c)-new Date(o))/86400000); }
export function isRecentlyAdvanced(p) { return p.advancedAt&&(Date.now()-p.advancedAt)<86400000; }
export function canLaunchProject(p) { if(!p.materials||!p.materials.length) return false; return p.materials.every(m=>(m.stage||'Brief')==='Connectivity'); }
export function timeAgo(ts) { const d=Math.round((Date.now()-ts)/60000); if(d<1) return 'just now'; if(d<60) return `${d}m ago`; const h=Math.round(d/60); if(h<24) return `${h}h ago`; return `${Math.round(h/24)}d ago`; }
export function calcMatMilestones(briefDate, printType) {
  const pd=Math.max(PRINT_LEAD[printType]||0,5);
  const sample=addDays(briefDate,5),trial=addDays(sample,7),kld=addDays(trial,3);
  const art=addDays(kld,5),vpdf=addDays(art,2),print=addDays(vpdf,pd);
  const disp=addDays(print,4),conn=addDays(disp,4);
  return{Brief:briefDate,Sample:sample,Trial:trial,KLD:kld,Artwork:art,VPDF:vpdf,Printing:print,Dispatch:disp,Connectivity:conn};
}
export function calcProjectMilestones(briefDate, mats) {
  const matMs=mats.map(m=>calcMatMilestones(briefDate,m.printType||'Not Applicable'));
  const print=[...matMs.map(m=>m.Printing)].sort().reverse()[0];
  const disp=addDays(print,4),conn=addDays(disp,4);
  const sample=addDays(briefDate,5),trial=addDays(sample,7),kld=addDays(trial,3),art=addDays(kld,5),vpdf=addDays(art,2);
  return{Brief:briefDate,Sample:sample,Trial:trial,KLD:kld,Artwork:art,VPDF:vpdf,Printing:print,Dispatch:disp,Connectivity:conn,Launch:null};
}
