import { STAGE_ORDER, getMaterialLeadTime } from './constants';
import { addDays, today } from './utils';

// Technical minimum duration per stage (cannot compress beyond this without dropping mandatory gates)
export const STAGE_MIN_DAYS = {
  Sample: 2,       // Standard 5d -> Min 2d (Max 3d crunch)
  Trial: 3,        // Standard 7d -> Min 3d (Max 4d crunch)
  KLD: 1,          // Standard 3d -> Min 1d (Max 2d crunch)
  Artwork: 2,      // Standard 5d -> Min 2d (Max 3d crunch)
  VPDF: 1,         // Standard 2d -> Min 1d (Max 1d crunch)
  Dispatch: 1,     // Standard 4d -> Min 1d (Max 3d crunch)
  Connectivity: 1  // Standard 4d -> Min 1d (Max 3d crunch)
};

// Standard durations
export const STAGE_STANDARD_DAYS = {
  Sample: 5,
  Trial: 7,
  KLD: 3,
  Artwork: 5,
  VPDF: 2,
  Dispatch: 4,
  Connectivity: 4
};

// Packaging and operational risk factors for each stage when crunched
export const STAGE_RISK_FACTORS = {
  Sample: {
    title: 'Prototype & Tooling Risk',
    risk: 'Rapid sample tooling may cause dimensional tolerance deviations, cavity balance issues, or incorrect material grade testing.',
    mitigation: 'Mandate digital 3D CMM inspection report from supplier within 24h of moulding.'
  },
  Trial: {
    title: 'Factory Runnability & Sealing Risk',
    risk: 'Abbreviated line trial increases risk of seal integrity failure, pouch burst, or machine jamming at commercial line speeds.',
    mitigation: 'Conduct high-speed burst and vacuum leak test on first 500 test units with QA present.'
  },
  KLD: {
    title: 'Dieline & Sensor Mark Lock Risk',
    risk: 'Rushing KLD sign-off risks die-line misalignments, eye-mark sensor read errors, and barcode placement clipping.',
    mitigation: 'Joint sign-off with repro-house and packaging technical engineer before artwork release.'
  },
  Artwork: {
    title: 'Regulatory & Claim Compliance Risk',
    risk: 'CRITICAL: Compressed artwork rounds risk regulatory non-compliance, ingredient list typos, or omission of mandatory statutory declarations.',
    mitigation: 'Implement dual-layer expedited sign-off: Brand Lead + Regulatory Head simultaneous approval.'
  },
  VPDF: {
    title: 'Color Fidelity & Proofing Risk',
    risk: 'Virtual PDF bypasses physical press proofs, risking color shift (ΔE > 2) and illegible legal micro-text.',
    mitigation: 'Supplier spectrophotometer color-match report calibrated against Pantone digital standards.'
  },
  Printing: {
    title: 'Commercial Press Overtime & Curing Risk',
    risk: 'Accelerating bulk printing requires emergency press overtime; risk of ink smearing, poor lamination curing, and higher scrap.',
    mitigation: 'Authorize 24/7 priority line reservation; supplier must retain retain-samples every 1000m.'
  },
  Dispatch: {
    title: 'Express Logistics & Transit Damage Risk',
    risk: 'Shortened transit requires dedicated express freight; risk of pallet destabilization and corner crush without standard resting.',
    mitigation: 'Enforce reinforced pallet stretch-wrap with rigid top caps and GPS-tracked direct road freight.'
  },
  Connectivity: {
    title: 'SAP Master Data & System Setup Risk',
    risk: 'Fast-tracking SAP BOM / DRP activation risks distribution misrouting and inventory block in warehouse management system.',
    mitigation: 'Pre-create draft SAP master records at VPDF stage for immediate activation upon GRN.'
  }
};

export function getProjectPrintDays(mats) {
  if (!mats || !mats.length) return 21;
  const days = mats.map(m => getMaterialLeadTime(m));
  return Math.max(...days, 15);
}

export function calculateCrunchedTimeline(project, targetLaunchDate) {
  if (!project || !targetLaunchDate) return null;

  const briefDate = project.briefDate || today();
  const materials = project.materials || [];
  const currentStage = project.stage || 'Brief';
  const currentStageIdx = STAGE_ORDER.indexOf(currentStage);

  const stdPrintDays = getProjectPrintDays(materials);
  const minPrintDays = Math.max(7, Math.round(stdPrintDays * 0.65));

  const standardDaysMap = {
    ...STAGE_STANDARD_DAYS,
    Printing: stdPrintDays
  };

  const minDaysMap = {
    ...STAGE_MIN_DAYS,
    Printing: minPrintDays
  };

  const activeStages = ['Sample', 'Trial', 'KLD', 'Artwork', 'VPDF', 'Printing', 'Dispatch', 'Connectivity'];
  const remainingStages = activeStages.filter(s => STAGE_ORDER.indexOf(s) >= currentStageIdx);

  const standardRemainingDays = remainingStages.reduce((acc, s) => acc + standardDaysMap[s], 0);
  const minRemainingDays = remainingStages.reduce((acc, s) => acc + minDaysMap[s], 0);

  const startDate = currentStage === 'Brief' ? briefDate : today();
  const availableDays = Math.round((new Date(targetLaunchDate) - new Date(startDate)) / 86400000);

  if (availableDays >= standardRemainingDays) {
    return {
      isCrunched: false,
      daysSaved: 0,
      standardRemainingDays,
      availableDays,
      targetLaunchDate,
      message: 'Launch timeline is on or after standard Est. Ready date. No crunch required.'
    };
  }

  const daysToCrunch = standardRemainingDays - availableDays;
  const maxPossibleCrunch = standardRemainingDays - minRemainingDays;

  const isExcessive = daysToCrunch > maxPossibleCrunch;
  const effectiveDaysToCrunch = Math.min(daysToCrunch, maxPossibleCrunch);

  const crunchablePerStage = {};
  remainingStages.forEach(s => {
    crunchablePerStage[s] = Math.max(0, standardDaysMap[s] - minDaysMap[s]);
  });

  const totalCrunchable = Object.values(crunchablePerStage).reduce((a, b) => a + b, 0);
  const crunchedDaysMap = { ...standardDaysMap };
  let distributed = 0;

  if (totalCrunchable > 0) {
    const revStages = [...remainingStages].reverse();
    let remainingToDistribute = effectiveDaysToCrunch;

    for (const s of revStages) {
      if (remainingToDistribute <= 0) break;
      const maxCanCrunch = crunchablePerStage[s];
      const share = Math.min(maxCanCrunch, Math.round((maxCanCrunch / totalCrunchable) * effectiveDaysToCrunch));
      const actualDeduct = Math.min(share, remainingToDistribute);
      crunchedDaysMap[s] = standardDaysMap[s] - actualDeduct;
      remainingToDistribute -= actualDeduct;
      distributed += actualDeduct;
    }

    if (remainingToDistribute > 0) {
      for (const s of revStages) {
        if (remainingToDistribute <= 0) break;
        const canTakeMore = crunchedDaysMap[s] - minDaysMap[s];
        if (canTakeMore > 0) {
          const take = Math.min(canTakeMore, remainingToDistribute);
          crunchedDaysMap[s] -= take;
          remainingToDistribute -= take;
          distributed += take;
        }
      }
    }
  }

  const crunchedMilestones = { Brief: briefDate };
  let cursor = startDate;

  STAGE_ORDER.forEach(s => {
    if (STAGE_ORDER.indexOf(s) < currentStageIdx && project.milestones && project.milestones[s]) {
      crunchedMilestones[s] = project.milestones[s];
    }
  });

  const stageBreakdown = [];
  let totalRiskScore = 0;

  remainingStages.forEach(s => {
    const stdDays = standardDaysMap[s];
    const crunDays = crunchedDaysMap[s];
    const saved = stdDays - crunDays;
    const prevCursor = cursor;
    cursor = addDays(cursor, crunDays);
    crunchedMilestones[s] = cursor;

    const riskInfo = STAGE_RISK_FACTORS[s] || {
      title: `${s} Expedited Risk`,
      risk: 'Expedited processing reduces validation buffer.',
      mitigation: 'Maintain elevated supervisor oversight.'
    };

    let stageRiskLevel = 'Normal';
    if (saved >= 3 || (s === 'Printing' && saved >= 5) || (s === 'Artwork' && saved >= 2)) {
      stageRiskLevel = 'Critical';
      totalRiskScore += 3;
    } else if (saved > 0) {
      stageRiskLevel = 'High';
      totalRiskScore += 2;
    }

    stageBreakdown.push({
      stage: s,
      standardDays: stdDays,
      crunchedDays: crunDays,
      daysSaved: saved,
      startDate: prevCursor,
      milestoneDate: cursor,
      originalDate: project.milestones ? project.milestones[s] : null,
      riskLevel: stageRiskLevel,
      riskTitle: riskInfo.title,
      riskDescription: riskInfo.risk,
      mitigation: riskInfo.mitigation
    });
  });

  let overallRisk = 'Low';
  if (isExcessive || totalRiskScore >= 8 || distributed >= 14) {
    overallRisk = 'Critical';
  } else if (totalRiskScore >= 4 || distributed >= 7) {
    overallRisk = 'High';
  } else if (distributed > 0) {
    overallRisk = 'Medium';
  }

  return {
    isCrunched: true,
    isExcessive,
    daysToCrunch,
    daysSaved: distributed,
    standardRemainingDays,
    availableDays,
    targetLaunchDate,
    originalEstReady: project.milestones?.Connectivity || null,
    crunchedEstReady: crunchedMilestones.Connectivity,
    riskLevel: overallRisk,
    riskScore: totalRiskScore,
    stages: stageBreakdown,
    milestones: crunchedMilestones
  };
}
