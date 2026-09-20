const { STAGE_ORDER, PRINT_LEAD, getMaterialLeadTime, determineCPMIndex } = require('./constants');

// ── Date Helpers ─────────────────────────────────────────────────
function today() {
  return new Date().toISOString().split('T')[0];
}

function addDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

// ── Hashing ───────────────────────────────────────────────────────
const crypto = require('crypto');

function hashPass(pw) {
  return crypto.createHash('sha256').update('pkg_salt_2024_' + pw).digest('hex');
}

function genTempPass() {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return 'TMP-' + Array.from({ length: 6 }, () => c[Math.floor(Math.random() * c.length)]).join('');
}

// ── Milestone Calculation ────────────────────────────────────────
function calcMatMilestones(briefDate, matOrPrintType, optMatType) {
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

function calcProjectMilestones(briefDate, mats) {
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

function recalcMatMilestones(m, briefDate, fromDate) {
  const pd = getMaterialLeadTime(m);
  const LEAD = { Sample: 5, Trial: 7, KLD: 3, Artwork: 5, VPDF: 2, Printing: pd, Dispatch: 4, Connectivity: 4 };
  const ms = m.milestones ? { ...m.milestones } : calcMatMilestones(briefDate, m);
  let cursor = fromDate;
  const startIdx = STAGE_ORDER.indexOf(m.stage);
  for (let i = startIdx; i <= 8; i++) {
    const s = STAGE_ORDER[i];
    cursor = addDays(cursor, LEAD[s] || 0);
    ms[s] = cursor;
  }
  return ms;
}

function stageIdx(s) {
  return STAGE_ORDER.indexOf(s);
}

function syncProjectStage(p) {
  if (!p.materials || !p.materials.length) return;
  const minIdx = Math.min(...p.materials.map(m => stageIdx(m.stage || 'Brief')));
  p.stage = STAGE_ORDER[minIdx];
}

function getProjectStage(p) {
  if (!p) return 'Brief';
  if (p.stage) return p.stage;
  if (!p.materials || !p.materials.length) return 'Brief';
  const minIdx = Math.min(...p.materials.map(m => stageIdx(m.stage || 'Brief')));
  return STAGE_ORDER[minIdx >= 0 ? minIdx : 0] || 'Brief';
}

function getDaysLeft(p) {
  if (!p || !p.targetLaunchDate) return null;
  const targetMs = new Date(p.targetLaunchDate).getTime();
  const todayMs = new Date(today()).getTime();
  return Math.round((targetMs - todayMs) / (1000 * 60 * 60 * 24));
}

function getLTStatus(p) {
  const days = getDaysLeft(p);
  if (days === null) return 'N/A';
  if (days < 0) return 'Late';
  if (days <= 15) return 'Critical';
  if (days <= 30) return 'Approaching';
  return 'On Schedule';
}

function getArtworkCode(pmCode) {
  if (!pmCode || !String(pmCode).trim()) return 'AW-00000';
  const str = String(pmCode).trim();
  if (/^PM[-_]/i.test(str)) return str.replace(/^PM[-_]/i, 'AW-');
  if (/^PM\//i.test(str)) return str.replace(/^PM\//i, 'AW/');
  if (/^PM/i.test(str)) return str.replace(/^PM/i, 'AW-');
  return `AW-${str}`;
}

const PM_CODE_PREFIXES = {
  'PET Bottle': 'PM/PR/PJR/',
  'HDPE Bottle': 'PM/PR/PJR/',
  'Glass Bottle': 'PM/PR/GJR/',
  'Flexible Pouch': 'PM/PR/POU/',
  'Stand-up Pouch': 'PM/PR/POU/',
  'Sachet / Stick Pack': 'PM/PR/POU/',
  'Monocarton': 'PM/SE/MON/',
  'Eflute': 'PM/SE/EFL/',
  'Rigid Carton Box': 'PM/SE/KAP/',
  'Corrugated Shipper': 'PM/SE/OCA/',
  'Paper Label': 'PM/SE/LBL/',
  'PP Label': 'PM/SE/LBL/',
  'Shrink Sleeve': 'PM/SE/SHR/',
  'In-Mould Label': 'PM/SE/IML/',
  'Cap / Closure': 'PM/PR/CAP/',
  'Pump Dispenser': 'PM/PR/PUM/',
  'Liner / Foil Seal': 'PM/PR/FOI/',
  'Laminated Tube': 'PM/PR/TUB/',
  'Aluminium/Tin Can': 'PM/PR/TIN/',
  'Aerosol Can': 'PM/PR/AER/',
  'Thermoform Tray': 'PM/PR/TRA/',
  'Blister Pack': 'PM/PR/BLI/',
  'Insert / Leaflet': 'PM/PR/LEA/',
  'Other': 'PM/PR/GEN/'
};

function getPMPrefix(materialType = '') {
  if (!materialType) return 'PM/PR/GEN/';
  const trimmed = String(materialType).trim();
  if (PM_CODE_PREFIXES[trimmed]) {
    return PM_CODE_PREFIXES[trimmed];
  }
  const type = trimmed.toLowerCase();
  if (type.includes('corrugated') || type.includes('shipper') || type.includes('cbb') || type.includes('oca')) return 'PM/SE/OCA/';
  if (type.includes('shrink') || type.includes('sleeve')) return 'PM/SE/SHR/';
  if (type.includes('in-mould') || type.includes('in mould') || type.includes('iml')) return 'PM/SE/IML/';
  if (type.includes('label') || type.includes('sticker')) return 'PM/SE/LBL/';
  if (type.includes('glass')) return 'PM/PR/GJR/';
  if (type.includes('bottle') || type.includes('jar')) return 'PM/PR/PJR/';
  if (type.includes('monocarton')) return 'PM/SE/MON/';
  if (type.includes('eflute')) return 'PM/SE/EFL/';
  if (type.includes('rigid') || type.includes('kap')) return 'PM/SE/KAP/';
  if (type.includes('carton') || type.includes('box')) return 'PM/SE/MON/';
  if (type.includes('pouch') || type.includes('sachet') || type.includes('stick pack')) return 'PM/PR/POU/';
  if (type.includes('cap') || type.includes('closure')) return 'PM/PR/CAP/';
  if (type.includes('pump') || type.includes('dispenser')) return 'PM/PR/PUM/';
  if (type.includes('liner') || type.includes('foil') || type.includes('wad') || type.includes('seal')) return 'PM/PR/FOI/';
  if (type.includes('tube')) return 'PM/PR/TUB/';
  if (type.includes('tin') || (type.includes('can') && !type.includes('aerosol'))) return 'PM/PR/TIN/';
  if (type.includes('aerosol')) return 'PM/PR/AER/';
  if (type.includes('thermoform') || type.includes('tray')) return 'PM/PR/TRA/';
  if (type.includes('blister')) return 'PM/PR/BLI/';
  if (type.includes('insert') || type.includes('leaflet')) return 'PM/PR/LEA/';
  if (type.includes('film')) return 'PM/PR/FLM/';
  return 'PM/PR/GEN/';
}

function generateDefaultPMCode(materialType = '', idx = 0) {
  const pad = String(50560 + idx);
  const prefix = getPMPrefix(materialType);
  return `${prefix}${pad}`;
}

module.exports = {
  today, addDays, hashPass, genTempPass,
  calcMatMilestones, calcProjectMilestones, recalcMatMilestones,
  stageIdx, syncProjectStage, getProjectStage, getDaysLeft, getLTStatus, getArtworkCode,
  determineCPMIndex, STAGE_ORDER,
  PM_CODE_PREFIXES, getPMPrefix, generateDefaultPMCode
};

