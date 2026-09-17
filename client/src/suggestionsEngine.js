import { getMaterialLeadTime, isPouch, determineCPMIndex, getMaterialHierarchyTier, getTierName } from './constants';
import { getProjectStage, getSlippage, fmt, daysFromNow } from './utils';

/**
 * Packaging Intelligence & Stage Optimization Suggestions Engine
 * Analyzes project parameters, component lead times, PO states, and backtrack history
 * to diagnose WHERE to improve and HOW to improve.
 */
export function generateProjectSuggestions(project) {
  if (!project) return { bottlenecks: [], recommendations: [], summary: {} };

  const bottlenecks = [];
  const recommendations = [];
  const materials = project.materials || [];
  const currentStage = getProjectStage(project);
  const slippage = getSlippage(project);
  const auditTrail = project.auditTrail || [];

  const cpmIdx = determineCPMIndex(materials);
  const cpmMat = materials[cpmIdx];

  // 1. CRITICAL PATH MATERIAL & PRINT PROCESS OPTIMIZATION
  if (cpmMat) {
    const cpmLead = getMaterialLeadTime(cpmMat);
    if (cpmLead >= 21) {
      bottlenecks.push({
        severity: 'high',
        category: 'Critical Path Material (CPM)',
        component: cpmMat.name,
        stage: 'Printing',
        title: `Primary Lead Time Driver: ${cpmMat.name} (${cpmLead} days)`,
        diagnosis: `"${cpmMat.name}" (${cpmMat.type}) dictates the longest production path for the entire project with a ${cpmLead}-day printing/manufacturing lead time.`
      });

      if (isPouch(cpmMat.type) && cpmMat.printType !== 'Digital Print') {
        const potentialDaysSaved = cpmMat.printType === 'Gravure Print' ? 20 : 6;
        recommendations.push({
          priority: 'high',
          impactDays: potentialDaysSaved,
          responsibleRole: 'Packaging Engineering / Brand Management',
          category: 'Technology Optimization',
          title: `Switch ${cpmMat.name} to Digital Print`,
          action: `Change printing process from ${cpmMat.printType} (${cpmLead}d) to Digital Print (15d).`,
          benefit: `Immediately compresses project lead time by ${potentialDaysSaved} calendar days without cylinder/plate manufacturing lag.`
        });
      }
    }
  }

  // 2. PURCHASE ORDER (PO) BOTTLENECK & GATE BLOCKER
  const unraisedMats = materials.filter(m => (m.poStatus || 'RFQ in progress') !== 'Raised');
  const stageOrder = ['Brief', 'Sample', 'Trial', 'KLD', 'Artwork', 'VPDF', 'Printing', 'Dispatch', 'Connectivity', 'Launch'];
  const stageIdxVal = stageOrder.indexOf(currentStage);

  if (unraisedMats.length > 0) {
    if (stageIdxVal >= 4) { // At or past Artwork (approaching VPDF / Printing)
      bottlenecks.push({
        severity: stageIdxVal === 5 ? 'critical' : 'high',
        category: 'Commercial Gate Blocker',
        component: unraisedMats.map(m => m.name).join(', '),
        stage: 'VPDF ➔ Printing Gate',
        title: `PO Not Raised for ${unraisedMats.length} Component(s)`,
        diagnosis: `Advance to Printing is hard-gated. Component(s) [${unraisedMats.map(m => m.name).join(', ')}] still have PO Status '${unraisedMats[0].poStatus || 'RFQ in progress'}'. The commercial press run cannot commence until PO is officially 'Raised'.`
      });

      recommendations.push({
        priority: 'critical',
        impactDays: 5,
        responsibleRole: 'Project Manager (Balaji Sathishkumar)',
        category: 'Commercial Clearance',
        title: 'Accelerate ERP / SAP Purchase Order Release',
        action: `Expedite commercial approval for PO requisition: ${unraisedMats.map(m => m.name).join(', ')}.`,
        benefit: 'Prevents 5–7 days of dead stoppage at VPDF sign-off before printing lines can be booked.'
      });
    } else {
      recommendations.push({
        priority: 'medium',
        impactDays: 3,
        responsibleRole: 'Project Manager / Executive',
        category: 'Proactive Procurement',
        title: 'Initiate Supplier RFQ & Pricing Lock Ahead of Artwork',
        action: 'Lock vendor pricing quotes during Sample/Trial stage so PO can be raised simultaneously with KLD approval.',
        benefit: 'Eliminates quotation wait-time during artwork approval cycles.'
      });
    }
  }

  // 3. AUDIT TRAIL BACKTRACK: REVOCATION & REWORK ANALYSIS
  const revocations = auditTrail.filter(e => e.action === 'STAGE_REVOKE' || e.action === 'MATERIAL_REVOKE' || (e.title && e.title.includes('Revok')));
  if (revocations.length > 0) {
    const lastRevoke = revocations[0];
    bottlenecks.push({
      severity: 'medium',
      category: 'Quality Gate Rework',
      component: lastRevoke.materialName || 'Project Stage',
      stage: lastRevoke.from || currentStage,
      title: `Rework History Detected (${revocations.length} Revocation${revocations.length > 1 ? 's' : ''})`,
      diagnosis: `Project has encountered ${revocations.length} stage rollback(s). Most recent: ${lastRevoke.title} by ${lastRevoke.by} on ${lastRevoke.dateStr || 'past record'}.`
    });

    recommendations.push({
      priority: 'high',
      impactDays: 4,
      responsibleRole: 'Packaging Head (Alexsander)',
      category: 'Gate Quality Standard',
      title: 'Mandate Pre-Flight Technical Sign-Off Checklist',
      action: 'Implement joint technical alignment between brand marketing, repro house, and converter prior to formal stage sign-off.',
      benefit: 'Eliminates repetitive revocation cycles and dieline re-cutting delays.'
    });
  }

  // 4. STAGE VARIANCE & SLIPPAGE DIAGNOSTICS
  let hasOverdueStage = false;
  materials.forEach(m => {
    (m.stageHistory || []).forEach(sh => {
      if (sh.variance > 2) {
        hasOverdueStage = true;
        bottlenecks.push({
          severity: 'medium',
          category: 'Stage Velocity Slippage',
          component: m.name,
          stage: sh.stage,
          title: `Stage Overrun: ${sh.stage} on ${m.name} (+${sh.variance}d)`,
          diagnosis: `Stage "${sh.stage}" for "${m.name}" took ${sh.variance} days longer than standard lead time benchmark.`
        });
      }
    });
  });

  if (slippage > 0) {
    bottlenecks.push({
      severity: 'high',
      category: 'Milestone Variance',
      component: 'Target Launch',
      stage: currentStage,
      title: `Cumulative Timeline Slippage: +${slippage} Days`,
      diagnosis: `Projected connectivity date is delayed by ${slippage} day(s) against the initial baseline milestone schedule.`
    });

    recommendations.push({
      priority: 'high',
      impactDays: slippage,
      responsibleRole: 'Project Manager (Balaji Sathishkumar)',
      category: 'Fast-Track Recovery',
      title: 'Trigger Targeted Timeline Compression',
      action: 'Apply compressed lead times to remaining stages (Express freight dispatch, 24h VPDF proofing).',
      benefit: `Recovers up to ${Math.min(slippage, 8)} days of the accumulated slippage.`
    });
  }

  // 5. SECONDARY & TERTIARY PACKAGING SYNCHRONIZATION
  const shipperMat = materials.find(m => m.type === 'Corrugated Shipper');
  if (shipperMat && stageIdxVal <= 3) {
    recommendations.push({
      priority: 'medium',
      impactDays: 3,
      responsibleRole: 'Executive (Akshra Ojha / Manideep)',
      category: 'Design Parallelization',
      title: 'Standardize Outer Shipper Dieline & Pallet Configuration',
      action: 'Finalize shipper dimensions based on 3D CAD matrix during Trial stage instead of waiting for primary pack arrival.',
      benefit: 'Enables corrugated shipper conversion in parallel with primary pouch printing.'
    });
  }

  // 6. SPECIFICATION DATA COMPLETION
  const missingSpecs = [];
  materials.forEach(m => {
    const keys = Object.keys(m.specs || {});
    if (keys.length === 0) {
      missingSpecs.push(m.name);
    }
  });
  if (missingSpecs.length > 0) {
    bottlenecks.push({
      severity: 'low',
      category: 'Specification Data Gap',
      component: missingSpecs.join(', '),
      stage: 'Technical Specs',
      title: `Incomplete Specs for ${missingSpecs.length} Component(s)`,
      diagnosis: `Material(s) [${missingSpecs.join(', ')}] have no technical parameters recorded (dimensions, GSM, barrier grade).`
    });

    recommendations.push({
      priority: 'low',
      impactDays: 2,
      responsibleRole: 'Executive / Intern',
      category: 'Specification Governance',
      title: 'Complete Component Technical Specification Parameters',
      action: 'Fill in length, width, height, gauge, and sealing parameters under Material Specs.',
      benefit: 'Ensures supplier QA alignment and prevents factory line changeover trial failures.'
    });
  }

  return {
    bottlenecks,
    recommendations,
    cpm: cpmMat ? { name: cpmMat.name, type: cpmMat.type, leadTime: getMaterialLeadTime(cpmMat) } : null,
    totalBottlenecks: bottlenecks.length,
    totalRecommendations: recommendations.length,
    healthScore: Math.max(20, 100 - (bottlenecks.filter(b => b.severity === 'critical').length * 30) - (bottlenecks.filter(b => b.severity === 'high').length * 15) - (bottlenecks.filter(b => b.severity === 'medium').length * 8))
  };
}
