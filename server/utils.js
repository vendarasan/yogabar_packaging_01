const { STAGE_ORDER, PRINT_LEAD } = require('./constants');

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
function calcMatMilestones(briefDate, printType) {
  const pd = Math.max(PRINT_LEAD[printType] || 0, 5);
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
  const matMs = mats.map(m => calcMatMilestones(briefDate, m.printType || 'Not Applicable'));
  const print = [...matMs.map(m => m.Printing)].sort().reverse()[0];
  const disp = addDays(print, 4);
  const conn = addDays(disp, 4);
  const sample = addDays(briefDate, 5);
  const trial = addDays(sample, 7);
  const kld = addDays(trial, 3);
  const art = addDays(kld, 5);
  const vpdf = addDays(art, 2);
  return { Brief: briefDate, Sample: sample, Trial: trial, KLD: kld, Artwork: art, VPDF: vpdf, Printing: print, Dispatch: disp, Connectivity: conn, Launch: null };
}

function recalcMatMilestones(m, briefDate, fromDate) {
  const pd = Math.max(PRINT_LEAD[m.printType] || 0, 5);
  const LEAD = { Sample: 5, Trial: 7, KLD: 3, Artwork: 5, VPDF: 2, Printing: pd, Dispatch: 4, Connectivity: 4 };
  const ms = m.milestones ? { ...m.milestones } : calcMatMilestones(briefDate, m.printType || 'Not Applicable');
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

module.exports = {
  today, addDays, hashPass, genTempPass,
  calcMatMilestones, calcProjectMilestones, recalcMatMilestones,
  stageIdx, syncProjectStage
};
