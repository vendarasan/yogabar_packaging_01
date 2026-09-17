import { STAGE_ORDER, STAGE_COLORS, STAGE_PCT, PRINT_LEAD, getMaterialLeadTime } from './constants';
export * from './constants';

export function today() { return new Date().toISOString().split('T')[0]; }
export function addDays(ds, n) { const d = new Date(ds); d.setDate(d.getDate()+n); return d.toISOString().split('T')[0]; }
export function fmt(ds) {
  if (!ds) return '—';
  try {
    if (typeof ds === 'number' || ds instanceof Date) {
      const d = new Date(ds);
      if (isNaN(d.getTime())) return '—';
      const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return `${String(d.getDate()).padStart(2, '0')}-${M[d.getMonth()]}-${String(d.getFullYear()).slice(2)}`;
    }
    const str = String(ds).split('T')[0];
    if (str.includes('-')) {
      const parts = str.split('-');
      if (parts.length >= 3) {
        const [y, m, d] = parts;
        const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const mIdx = parseInt(m, 10) - 1;
        const monthStr = (mIdx >= 0 && mIdx < 12) ? M[mIdx] : m;
        return `${String(d).padStart(2, '0')}-${monthStr}-${String(y || '').slice(2)}`;
      }
    }
    const d = new Date(ds);
    if (!isNaN(d.getTime())) {
      const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return `${String(d.getDate()).padStart(2, '0')}-${M[d.getMonth()]}-${String(d.getFullYear()).slice(2)}`;
    }
    return String(ds);
  } catch (e) {
    return '—';
  }
}
export function daysFromNow(ds) { if(!ds) return null; return Math.round((new Date(ds)-new Date(today()))/86400000); }
export function stageIdx(s) { return STAGE_ORDER.indexOf(s); }
export function getPrintDays(mats) { const m=Math.max(...(mats||[]).map(m=>getMaterialLeadTime(m))); return m>0?m:15; }
export function printCls(pt) { return({'Digital Print':'print-dig','Flexo Print':'print-flex','Gravure Print':'print-grav','Not Applicable':'print-na'})[pt]||'print-na'; }
export function getProjectStage(p) { if(!p.materials||!p.materials.length) return p.stage||'Brief'; const minIdx=Math.min(...p.materials.map(m=>stageIdx(m.stage||'Brief'))); return STAGE_ORDER[minIdx]; }
export function getProjectProgress(p) { if(p.status==='Launched') return 100; if(!p.materials||!p.materials.length) return STAGE_PCT[p.stage]||0; const total=p.materials.reduce((s,m)=>s+(STAGE_PCT[m.stage||'Brief']||0),0); return Math.round(total/p.materials.length); }
export function getLTStatus(p) { if(p.status==='Launched') return 'ok'; const stage=getProjectStage(p); const ms=p.milestones&&p.milestones[stage]; if(!ms) return 'ok'; const dl=Math.round((new Date(today())-new Date(ms))/86400000); if(dl<=0) return 'ok'; if(dl<=2) return 'warn'; return 'late'; }
export function getDaysLeft(p) { if(p.status==='Launched') return null; const stage=getProjectStage(p); const ms=p.milestones&&p.milestones[stage]; if(!ms) return null; return daysFromNow(ms); }
export function getSlippage(p) { if(!p.originalMilestones||!p.milestones) return 0; const o=p.originalMilestones.Connectivity,c=p.milestones.Connectivity; if(!o||!c) return 0; return Math.round((new Date(c)-new Date(o))/86400000); }
export function isRecentlyAdvanced(p) { return p.advancedAt&&(Date.now()-p.advancedAt)<86400000; }
export function canLaunchProject(p) { if(!p.materials||!p.materials.length) return false; return p.materials.every(m=>(m.stage||'Brief')==='Connectivity'); }
export function timeAgo(ts) { const d=Math.round((Date.now()-ts)/60000); if(d<1) return 'just now'; if(d<60) return `${d}m ago`; const h=Math.round(d/60); if(h<24) return `${h}h ago`; return `${Math.round(h/24)}d ago`; }
export function calcMatMilestones(briefDate, matOrPrintType, optMatType) {
  let printType = 'Not Applicable';
  let matType = '';
  let customLeadTime = null;
  if (typeof matOrPrintType === 'object' && matOrPrintType !== null) {
    printType = matOrPrintType.printType || 'Not Applicable';
    matType = matOrPrintType.type || matOrPrintType.name || '';
    customLeadTime = matOrPrintType.customLeadTime;
  } else {
    printType = matOrPrintType || 'Not Applicable';
    matType = optMatType || '';
  }
  const pd = getMaterialLeadTime({ type: matType, printType, customLeadTime });
  const sample = addDays(briefDate, 5);
  const trial = addDays(sample, 7);
  const kld = addDays(trial, 3);
  const art = addDays(kld, 5);
  const vpdf = addDays(art, 2);
  const print = addDays(vpdf, pd);
  const disp = addDays(print, 4);
  const conn = addDays(disp, 4);
  return { Brief: briefDate, Sample: sample, Trial: trial, KLD: kld, Artwork: art, VPDF: vpdf, Printing: print, Dispatch: disp, Connectivity: conn };
}
export function calcProjectMilestones(briefDate, mats) {
  const matMs = (mats || []).map(m => m.milestones || calcMatMilestones(m.briefDate || briefDate, m));
  const print = [...matMs.map(m => m.Printing)].filter(Boolean).sort().reverse()[0] || addDays(briefDate, 30);
  const disp = [...matMs.map(m => m.Dispatch)].filter(Boolean).sort().reverse()[0] || addDays(print, 4);
  const conn = [...matMs.map(m => m.Connectivity)].filter(Boolean).sort().reverse()[0] || addDays(disp, 4);
  const sample = [...matMs.map(m => m.Sample)].filter(Boolean).sort().reverse()[0] || addDays(briefDate, 5);
  const trial = [...matMs.map(m => m.Trial)].filter(Boolean).sort().reverse()[0] || addDays(sample, 7);
  const kld = [...matMs.map(m => m.KLD)].filter(Boolean).sort().reverse()[0] || addDays(trial, 3);
  const art = [...matMs.map(m => m.Artwork)].filter(Boolean).sort().reverse()[0] || addDays(kld, 5);
  const vpdf = [...matMs.map(m => m.VPDF)].filter(Boolean).sort().reverse()[0] || addDays(art, 2);
  return { Brief: briefDate, Sample: sample, Trial: trial, KLD: kld, Artwork: art, VPDF: vpdf, Printing: print, Dispatch: disp, Connectivity: conn, Launch: null };
}

// Convert PM-xxxxxx to AW-xxxxxx basis user specification rule
export function getArtworkCode(pmCode) {
  if (!pmCode || !String(pmCode).trim()) return 'AW-00000';
  const str = String(pmCode).trim();
  if (/^PM[-_]/i.test(str)) {
    return str.replace(/^PM[-_]/i, 'AW-');
  }
  if (/^PM\//i.test(str)) {
    return str.replace(/^PM\//i, 'AW/');
  }
  if (/^PM/i.test(str)) {
    return str.replace(/^PM/i, 'AW-');
  }
  return `AW-${str}`;
}

export function hasArtwork(material) {
  if (!material) return false;
  if (Array.isArray(material.artworkFiles) && material.artworkFiles.length > 0) return true;
  if (Array.isArray(material.specSheet?.artworkFiles) && material.specSheet.artworkFiles.length > 0) return true;
  return false;
}

export function getArtworkFiles(material) {
  if (!material) return [];
  if (Array.isArray(material.artworkFiles) && material.artworkFiles.length > 0) return material.artworkFiles;
  if (Array.isArray(material.specSheet?.artworkFiles) && material.specSheet.artworkFiles.length > 0) return material.specSheet.artworkFiles;
  return [];
}

export const STATUS_CONFIG = {
  APPROVED: {
    label: 'Approved',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.45)',
    icon: '✓',
    dot: '#10b981'
  },
  CHECKED_PENDING_APPROVAL: {
    label: 'Checked — Awaiting Approval',
    color: '#c084fc',
    bg: 'rgba(168, 85, 247, 0.12)',
    border: 'rgba(168, 85, 247, 0.45)',
    icon: '🛡',
    dot: '#a855f7'
  },
  PENDING_CHECK: {
    label: 'Submitted — Awaiting PM Check',
    color: '#fbbf24',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.45)',
    icon: '⏳',
    dot: '#f59e0b'
  },
  REVISION_REQUESTED: {
    label: 'Revision Requested',
    color: '#f87171',
    bg: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.45)',
    icon: '⚠',
    dot: '#ef4444'
  },
  DRAFT: {
    label: 'Draft',
    color: '#94a3b8',
    bg: 'rgba(148, 163, 184, 0.12)',
    border: 'rgba(148, 163, 184, 0.35)',
    icon: '📝',
    dot: '#94a3b8'
  },
  NO_SPEC: {
    label: 'No Spec Sheet Yet',
    color: '#64748b',
    bg: 'rgba(100, 116, 139, 0.08)',
    border: 'rgba(100, 116, 139, 0.25)',
    icon: '—',
    dot: '#475569'
  }
};

export function getSpecStatus(material) {
  if (!material || typeof material !== 'object') return 'NO_SPEC';
  if (!material.specSheet || typeof material.specSheet !== 'object' || !material.specSheet.docHeader) return 'NO_SPEC';
  return material.specSheet.governance?.status || 'DRAFT';
}

