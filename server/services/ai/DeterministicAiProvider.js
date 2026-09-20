'use strict';

const BaseAiProvider = require('./BaseAiProvider');

/**
 * DeterministicAiProvider.js — Rule-Based Packaging Intelligence Engine
 *
 * Provides 100% grounded, deterministic, zero-latency, zero-cost packaging
 * intelligence using authoritative application data. Never hallucinates,
 * operates offline, and ensures complete platform utility without external AI.
 */
class DeterministicAiProvider extends BaseAiProvider {
  getName() {
    return 'DeterministicRuleAiProvider';
  }

  isAvailable() {
    return true;
  }

  /**
   * Natural language query handler ("Ask Packaging")
   */
  async generateResponse(prompt, context = {}, options = {}) {
    const q = (prompt || '').toLowerCase().trim();
    const projects = context.projects || [];
    const tasks = context.tasks || [];
    const approvals = context.approvals || [];
    const risks = context.risks || [];
    const logs = context.logs || [];

    // 1. "What projects are at risk?"
    if (q.includes('at risk') || q.includes('critical project') || q.includes('projects at risk')) {
      const atRiskProjs = projects.filter(p => {
        const isCriticalHealth = (p.health || '').toLowerCase() === 'critical' || (p.health || '').toLowerCase() === 'at_risk';
        const hasCriticalRisk = (p.risks || []).some(r => (r.severity || '').toLowerCase() === 'critical' || (r.severity || '').toLowerCase() === 'high');
        const hasBlockedTask = tasks.some(t => t.projectId === p.id && t.status === 'BLOCKED');
        return isCriticalHealth || hasCriticalRisk || hasBlockedTask;
      });

      if (atRiskProjs.length === 0) {
        return {
          answer: 'All projects in your authorized scope are currently progressing within acceptable risk thresholds. No projects are flagged as critical or blocked.',
          evidenceSources: ['Project Health', 'Risk Register', 'Task Register'],
          structuredData: { count: 0, projects: [] }
        };
      }

      const items = atRiskProjs.map(p => {
        const pRisks = (p.risks || []).filter(r => ['high', 'critical'].includes((r.severity || '').toLowerCase()));
        const pBlocked = tasks.filter(t => t.projectId === p.id && t.status === 'BLOCKED');
        const riskNotes = [];
        if (pRisks.length > 0) riskNotes.push(`${pRisks.length} high/critical risk(s)`);
        if (pBlocked.length > 0) riskNotes.push(`${pBlocked.length} blocked task(s)`);
        if (riskNotes.length === 0) riskNotes.push(`Health flagged as ${p.health || 'at risk'}`);
        return `• **${p.name || p.id}** (${p.currentStage || 'Stage N/A'}): ${riskNotes.join(', ')}`;
      });

      return {
        answer: `There are **${atRiskProjs.length} project(s) at risk** in your authorized portfolio:\n\n${items.join('\n')}\n\n*Review the Project Control Center or individual project risk registers to view mitigation plans.*`,
        evidenceSources: ['Project Health Indicators', 'Risk Register', 'Task Register'],
        structuredData: { count: atRiskProjs.length, projects: atRiskProjs.map(p => ({ id: p.id, name: p.name, stage: p.currentStage, health: p.health })) }
      };
    }

    // 2. "Which materials launch this month?" / "launches"
    if (q.includes('launch this month') || q.includes('launching this month') || q.includes('upcoming launch') || q.includes('launch horizon')) {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const launchingMats = [];
      projects.forEach(p => {
        (p.materials || []).forEach(m => {
          const lDateStr = m.targetLaunchDate || m.launchDate || p.targetLaunchDate || p.launchDate;
          if (!lDateStr) return;
          const lDate = new Date(lDateStr);
          if (isNaN(lDate.getTime())) return;

          const isThisMonth = lDate.getFullYear() === currentYear && lDate.getMonth() === currentMonth;
          const isNext30Days = lDate >= now && lDate <= thirtyDaysOut;

          if (isThisMonth || isNext30Days) {
            const diffDays = Math.ceil((lDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            launchingMats.push({
              project: p.name || p.id,
              projectId: p.id,
              material: m.name || m.type || 'Primary Material',
              pmCode: m.pmCode || m.code || 'PM-TBD',
              stage: m.currentStage || p.currentStage || 'Unknown',
              launchDate: lDateStr,
              diffDays
            });
          }
        });
      });

      if (launchingMats.length === 0) {
        return {
          answer: 'No materials are scheduled for commercial launch within the current month or the next 30 days based on active project timelines.',
          evidenceSources: ['Material Master', 'Project Launch Dates'],
          structuredData: { count: 0, materials: [] }
        };
      }

      const list = launchingMats.map(m =>
        `• **${m.material}** (${m.pmCode}) in *${m.project}*: Target Date **${m.launchDate}** (${m.diffDays >= 0 ? `${m.diffDays} day(s) remaining` : `${Math.abs(m.diffDays)} day(s) overdue`}) — Current Stage: **${m.stage}**`
      );

      return {
        answer: `Found **${launchingMats.length} material(s)** scheduled for launch within the 30-day window:\n\n${list.join('\n')}`,
        evidenceSources: ['Material Master', 'Project Timelines'],
        structuredData: { count: launchingMats.length, materials: launchingMats }
      };
    }

    // 3. "Show artwork awaiting approval" / "artwork approval"
    if (q.includes('artwork awaiting approval') || q.includes('artwork approval') || q.includes('pending artwork') || q.includes('awaiting approval')) {
      const pendingArtworks = approvals.filter(a =>
        a.entityType === 'ARTWORK' && (a.status === 'PENDING' || a.decision === 'PENDING')
      );

      // Also check materials in Artwork stage without approved artwork
      const unapprovedMaterials = [];
      projects.forEach(p => {
        (p.materials || []).forEach(m => {
          const isArtworkStage = (m.currentStage || '').toLowerCase().includes('artwork');
          const isApproved = m.artworkApproved || (m.artwork && m.artwork.approved);
          if (isArtworkStage && !isApproved) {
            unapprovedMaterials.push({
              project: p.name || p.id,
              projectId: p.id,
              material: m.name || m.type || 'Material',
              stage: m.currentStage
            });
          }
        });
      });

      if (pendingArtworks.length === 0 && unapprovedMaterials.length === 0) {
        return {
          answer: 'There are currently no artwork proofs awaiting formal approval in your authorized scope. All active artwork stages are approved or in preparation.',
          evidenceSources: ['Universal Approval Framework', 'Material Stage Gates'],
          structuredData: { pendingApprovals: [], unapprovedMaterials: [] }
        };
      }

      const rows = [];
      pendingArtworks.forEach(a => {
        rows.push(`• **${a.title}** (Project: ${a.projectId || 'N/A'}) — Requested by: ${a.requestedBy || 'Team'} — Status: **Pending Review**`);
      });
      unapprovedMaterials.forEach(m => {
        rows.push(`• **${m.material}** in *${m.project}* — Currently in **${m.stage}** without formal sign-off`);
      });

      return {
        answer: `There are **${pendingArtworks.length + unapprovedMaterials.length} artwork item(s)** awaiting sign-off:\n\n${rows.join('\n')}\n\n*Artwork approval is an authoritative gate before VPDF and commercial printing.*`,
        evidenceSources: ['Universal Approval Framework', 'Material Stage Gates'],
        structuredData: { pendingApprovals: pendingArtworks, unapprovedMaterials }
      };
    }

    // 4. "Which CPM materials are delayed?" / "cpm delayed"
    if (q.includes('cpm') || q.includes('critical path')) {
      const cpmDelayed = [];
      projects.forEach(p => {
        (p.materials || []).forEach(m => {
          const isCpm = m.isCpm || m.cpm || false;
          const isDelayed = m.isDelayed || (m.status || '').toLowerCase() === 'delayed' || (p.health || '').toLowerCase() === 'critical';
          if (isCpm && isDelayed) {
            cpmDelayed.push({
              project: p.name || p.id,
              projectId: p.id,
              material: m.name || m.type || 'CPM Material',
              pmCode: m.pmCode || 'PM-TBD',
              stage: m.currentStage || p.currentStage || 'Unknown'
            });
          }
        });
      });

      if (cpmDelayed.length === 0) {
        return {
          answer: 'All Critical Path (CPM) materials are currently progressing on schedule across authorized projects. No CPM materials are flagged as delayed.',
          evidenceSources: ['Critical Path Method (CPM)', 'Material Stage Tracker'],
          structuredData: { cpmDelayed: [] }
        };
      }

      const rows = cpmDelayed.map(c => `• **${c.material}** (${c.pmCode}) in *${c.project}* — Stage: **${c.stage}**`);
      return {
        answer: `Found **${cpmDelayed.length} Critical Path (CPM) material(s)** experiencing delays:\n\n${rows.join('\n')}\n\n*CPM delays directly threaten project launch dates and require immediate intervention.*`,
        evidenceSources: ['Critical Path Method (CPM)', 'Material Stage Tracker'],
        structuredData: { cpmDelayed }
      };
    }

    // 5. "What is blocking [Project]?" / "Why is [Project] delayed?"
    const matchProject = projects.find(p => {
      const name = (p.name || '').toLowerCase();
      const id = (p.id || '').toLowerCase();
      return q.includes(name) || (id && q.includes(id));
    });

    if (matchProject) {
      if (q.includes('block') || q.includes('delay') || q.includes('why')) {
        const delayResult = await this.analyzeDelay(matchProject, options);
        return {
          answer: `### Delay & Blocker Analysis for ${matchProject.name || matchProject.id}\n\n**Status:** ${delayResult.delayStatus}\n\n**Contributing Factors:**\n${delayResult.contributingFactors.map(f => `• **${f.factor}** (${f.severity}): ${f.detail}`).join('\n')}`,
          evidenceSources: delayResult.evidenceSources,
          structuredData: delayResult
        };
      }

      if (q.includes('summarize') || q.includes('summary') || q.includes('tell me about')) {
        const summaryResult = await this.summarizeProject(matchProject, options);
        return {
          answer: summaryResult.summary,
          evidenceSources: summaryResult.evidenceSources,
          structuredData: summaryResult.keyMetrics
        };
      }
    }

    // 6. "Show recent changes" / "audit trail"
    if (q.includes('recent change') || q.includes('audit') || q.includes('recent activity') || q.includes('what changed')) {
      const recentLogs = (logs || []).slice(0, 8);
      if (recentLogs.length === 0) {
        return {
          answer: 'No recent change records found in the audit trail for your authorized scope.',
          evidenceSources: ['Audit Trail'],
          structuredData: { logs: [] }
        };
      }

      const rows = recentLogs.map(l => {
        const d = l.timestamp ? new Date(l.timestamp).toLocaleString() : 'Recent';
        return `• **${d}** — *${l.user || 'System'}*: ${l.action || 'Updated'} (${l.projectName || l.projectId || 'Project'})`;
      });

      return {
        answer: `### Recent Portfolio Changes & Audit Activity\n\n${rows.join('\n')}`,
        evidenceSources: ['Audit Trail', 'Project Activity Logs'],
        structuredData: { logs: recentLogs }
      };
    }

    // Default Fallback: Grounded response stating limitations
    return {
      answer: `I don't have enough project data to answer that specific query. \n\nYou can ask about:\n• *"What projects are at risk?"*\n• *"Which materials launch this month?"*\n• *"Show artwork awaiting approval"*\n• *"Which CPM materials are delayed?"*\n• *"Summarize [Project Name]"*\n• *"Why is [Project Name] delayed?"*\n• *"Show recent changes"*\n\nAll answers are strictly grounded in your authorized application data.`,
      evidenceSources: ['Application Schema', 'Authorized Domain Store'],
      structuredData: null
    };
  }

  /**
   * Grounded project summary
   */
  async summarizeProject(project, options = {}) {
    if (!project) {
      return {
        summary: 'No project data provided.',
        keyMetrics: {},
        evidenceSources: []
      };
    }

    const name = project.name || project.id;
    const stage = project.currentStage || 'Brief & Concept';
    const health = (project.health || 'healthy').toUpperCase();
    const targetLaunch = project.targetLaunchDate || project.launchDate || 'TBD';
    const materials = project.materials || [];
    const risks = project.risks || [];
    const openRisks = risks.filter(r => (r.status || '').toLowerCase() !== 'closed');
    const criticalRisks = openRisks.filter(r => ['high', 'critical'].includes((r.severity || '').toLowerCase()));
    const cpmMaterials = materials.filter(m => m.isCpm || m.cpm);

    let launchCountdown = 'N/A';
    if (targetLaunch !== 'TBD') {
      const lDate = new Date(targetLaunch);
      if (!isNaN(lDate.getTime())) {
        const diff = Math.ceil((lDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        launchCountdown = diff >= 0 ? `${diff} days remaining` : `${Math.abs(diff)} days overdue`;
      }
    }

    const summary = [
      `### Executive Project Brief: ${name}`,
      `• **Current Stage:** ${stage}`,
      `• **Overall Health:** ${health}`,
      `• **Target Launch Date:** ${targetLaunch} (${launchCountdown})`,
      `• **Materials Pipeline:** ${materials.length} component(s) total (${cpmMaterials.length} on Critical Path)`,
      `• **Risk Posture:** ${openRisks.length} active risk(s) registered (${criticalRisks.length} Critical/High)`,
      `• **Key Ownership:** Lead: ${project.ownership?.projectOwner || 'Unassigned'} | Packaging: ${project.ownership?.packagingOwner || 'Unassigned'} | QA: ${project.ownership?.qaOwner || 'Unassigned'}`
    ].join('\n');

    return {
      summary,
      keyMetrics: {
        id: project.id,
        name,
        stage,
        health,
        targetLaunch,
        launchCountdown,
        totalMaterials: materials.length,
        cpmMaterialsCount: cpmMaterials.length,
        openRisksCount: openRisks.length,
        criticalRisksCount: criticalRisks.length
      },
      evidenceSources: ['Project Master', 'Stage Progress', 'Critical Path (CPM)', 'Risk Register', 'Ownership Matrix']
    };
  }

  /**
   * Contributing factor delay analysis
   */
  async analyzeDelay(project, options = {}) {
    if (!project) {
      return {
        delayStatus: 'No project data available',
        contributingFactors: [],
        evidenceSources: []
      };
    }

    const factors = [];
    const materials = project.materials || [];
    const risks = project.risks || [];

    // Factor 1: Stage progression and overdue dates
    const targetLaunch = project.targetLaunchDate || project.launchDate;
    if (targetLaunch) {
      const lDate = new Date(targetLaunch);
      if (!isNaN(lDate.getTime())) {
        const diff = Math.ceil((lDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (diff < 0) {
          factors.push({
            factor: 'Launch Target Overdue',
            severity: 'CRITICAL',
            detail: `Project target launch date was ${targetLaunch}, which is ${Math.abs(diff)} day(s) in the past while project is still in ${project.currentStage}.`
          });
        } else if (diff <= 14 && project.currentStage !== 'Commercial Production' && project.currentStage !== 'Market Launch') {
          factors.push({
            factor: 'Tight Launch Compression',
            severity: 'HIGH',
            detail: `Only ${diff} day(s) remain until launch date (${targetLaunch}), but project is currently in early/mid stage (${project.currentStage}).`
          });
        }
      }
    }

    // Factor 2: Artwork gates
    materials.forEach(m => {
      const isArtwork = (m.currentStage || '').toLowerCase().includes('artwork');
      if (isArtwork && !m.artworkApproved) {
        factors.push({
          factor: `Artwork Gate Pending for ${m.name || m.type || 'Material'}`,
          severity: 'HIGH',
          detail: `Material is held in Artwork stage awaiting formal sign-off, blocking VPDF generation and cylinder engraving/commercial printing.`
        });
      }
    });

    // Factor 3: Critical open risks
    const criticalRisks = risks.filter(r => ['high', 'critical'].includes((r.severity || '').toLowerCase()) && (r.status || '').toLowerCase() !== 'closed');
    criticalRisks.forEach(r => {
      factors.push({
        factor: `Open Risk: ${r.category || 'Packaging Risk'}`,
        severity: (r.severity || 'HIGH').toUpperCase(),
        detail: `${r.description || 'Unmitigated risk'} — Action: ${r.mitigation || 'Mitigation pending'}`
      });
    });

    // Factor 4: CPM component status
    const cpmMats = materials.filter(m => (m.isCpm || m.cpm) && ((m.status || '').toLowerCase() === 'delayed' || (project.health || '').toLowerCase() === 'critical'));
    if (cpmMats.length > 0) {
      factors.push({
        factor: 'Critical Path Compression',
        severity: 'CRITICAL',
        detail: `${cpmMats.length} material(s) on the critical path are experiencing operational bottlenecks.`
      });
    }

    const delayStatus = factors.length > 0
      ? (factors.some(f => f.severity === 'CRITICAL') ? 'Critical Delay Risk' : 'Moderate Bottlenecks Detected')
      : 'On Track — No Significant Delays Detected';

    return {
      delayStatus,
      contributingFactors: factors.length > 0 ? factors : [{ factor: 'Stage Cadence', severity: 'LOW', detail: 'Project is progressing within normal stage velocity parameters.' }],
      evidenceSources: ['Stage Progression History', 'Target Launch Timeline', 'Risk Register', 'Critical Path Method (CPM)']
    };
  }

  /**
   * Risk summary separating facts from interpretation
   */
  async summarizeRisks(risks = [], project = null, options = {}) {
    const registeredFacts = (risks || []).map(r => ({
      id: r.id || 'RSK-TBD',
      category: r.category || 'General',
      severity: (r.severity || 'Medium').toUpperCase(),
      description: r.description || 'No description',
      mitigation: r.mitigation || 'No mitigation defined',
      owner: r.owner || 'Unassigned',
      status: r.status || 'OPEN',
      materialId: r.materialId || 'Project-Level',
      stage: r.stage || 'All Stages'
    }));

    const criticalCount = registeredFacts.filter(r => r.severity === 'CRITICAL').length;
    const highCount = registeredFacts.filter(r => r.severity === 'HIGH').length;

    let aiInterpretation = '';
    if (criticalCount > 0) {
      aiInterpretation = `The project has ${criticalCount} critical risk(s) that immediately threaten commercial launch readiness. Unresolved items must be escalated to the Project Owner for mitigation sign-off.`;
    } else if (highCount > 0) {
      aiInterpretation = `The project maintains ${highCount} high-priority risk(s). While not currently blocking immediate stage advancement, they represent potential bottlenecks if supplier lead times fluctuate.`;
    } else if (registeredFacts.length > 0) {
      aiInterpretation = `All active risks are categorized as low/medium and appear well-managed under existing mitigation protocols.`;
    } else {
      aiInterpretation = `No active risks are currently registered for this project.`;
    }

    return {
      riskOverview: aiInterpretation,
      registeredFacts,
      evidenceSources: ['Risk Register', 'Project Ownership', 'Stage Alignment']
    };
  }

  /**
   * Factual side-by-side comparison between two projects
   */
  async compareProjects(projA, projB, options = {}) {
    if (!projA || !projB) {
      return {
        comparisonSummary: 'Two valid projects are required for comparison.',
        comparisonMatrix: [],
        evidenceSources: []
      };
    }

    const matrix = [
      { metric: 'Project Name', projA: projA.name || projA.id, projB: projB.name || projB.id },
      { metric: 'Current Stage', projA: projA.currentStage || 'N/A', projB: projB.currentStage || 'N/A' },
      { metric: 'Health Status', projA: (projA.health || 'healthy').toUpperCase(), projB: (projB.health || 'healthy').toUpperCase() },
      { metric: 'Target Launch', projA: projA.targetLaunchDate || projA.launchDate || 'TBD', projB: projB.targetLaunchDate || projB.launchDate || 'TBD' },
      { metric: 'Total Materials', projA: (projA.materials || []).length, projB: (projB.materials || []).length },
      { metric: 'Critical Path (CPM) Items', projA: (projA.materials || []).filter(m => m.isCpm || m.cpm).length, projB: (projB.materials || []).filter(m => m.isCpm || m.cpm).length },
      { metric: 'Open Risks', projA: (projA.risks || []).filter(r => (r.status || '').toLowerCase() !== 'closed').length, projB: (projB.risks || []).filter(r => (r.status || '').toLowerCase() !== 'closed').length }
    ];

    const comparisonSummary = `Comparison between **${projA.name || projA.id}** and **${projB.name || projB.id}**:\n` +
      `• Stage: ${projA.name || projA.id} is in **${projA.currentStage}** vs. ${projB.name || projB.id} in **${projB.currentStage}**\n` +
      `• Target Launches: ${projA.targetLaunchDate || 'TBD'} vs. ${projB.targetLaunchDate || 'TBD'}\n` +
      `• CPM Complexity: ${matrix[5].projA} critical path item(s) vs. ${matrix[5].projB} critical path item(s)`;

    return {
      comparisonSummary,
      comparisonMatrix: matrix,
      evidenceSources: ['Project Master Comparison', 'Material Matrix', 'Risk Register']
    };
  }

  /**
   * Portfolio-wide Daily Packaging Brief
   */
  async generateDailyBrief(portfolioData = {}, options = {}) {
    const projects = portfolioData.projects || [];
    const tasks = portfolioData.tasks || [];
    const approvals = portfolioData.approvals || [];
    const risks = portfolioData.risks || [];

    // Attention items
    const attentionProjects = projects.filter(p =>
      (p.health || '').toLowerCase() === 'critical' ||
      (p.health || '').toLowerCase() === 'at_risk' ||
      tasks.some(t => t.projectId === p.id && t.status === 'BLOCKED')
    );

    // Upcoming launches in 30 days
    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const upcomingLaunches = projects.filter(p => {
      const l = p.targetLaunchDate || p.launchDate;
      if (!l) return false;
      const d = new Date(l);
      return d >= now && d <= thirtyDays;
    });

    // Pending approvals
    const pendingApprovals = approvals.filter(a => a.status === 'PENDING' || a.decision === 'PENDING');

    // Critical risks
    const criticalRisks = risks.filter(r =>
      ['high', 'critical'].includes((r.severity || '').toLowerCase()) &&
      (r.status || '').toLowerCase() !== 'closed'
    );

    const briefSummary = `### Daily Packaging Executive Brief (${new Date().toLocaleDateString()})\n\n` +
      `• **Portfolio Status:** ${projects.length} active project(s) tracked. **${attentionProjects.length}** project(s) require operational attention.\n` +
      `• **30-Day Launch Horizon:** **${upcomingLaunches.length}** project(s) scheduled for commercial launch.\n` +
      `• **Pending Approvals:** **${pendingApprovals.length}** formal approval request(s) awaiting sign-off.\n` +
      `• **Active Escalations:** **${criticalRisks.length}** high/critical risk(s) and **${tasks.filter(t => t.status === 'BLOCKED').length}** blocked task(s).`;

    return {
      briefSummary,
      attentionItems: attentionProjects.map(p => ({ id: p.id, name: p.name, stage: p.currentStage, health: p.health })),
      upcomingLaunches: upcomingLaunches.map(p => ({ id: p.id, name: p.name, launchDate: p.targetLaunchDate || p.launchDate })),
      pendingApprovals: pendingApprovals.map(a => ({ id: a.id, title: a.title, requestedBy: a.requestedBy })),
      evidenceSources: ['Portfolio Health', 'Launch Horizon Calendar', 'Approval Queue', 'Risk Register']
    };
  }

  /**
   * Rule-based next action suggester
   */
  async suggestNextAction(project, options = {}) {
    if (!project) {
      return {
        suggestedAction: 'Select an active project to view recommended next actions.',
        rationale: 'No project context provided.',
        actionType: 'NONE',
        evidenceSources: []
      };
    }

    const stage = (project.currentStage || '').toLowerCase();
    const materials = project.materials || [];
    const risks = project.risks || [];

    // Rule 1: Check blocked tasks
    const blockedTask = (options.tasks || []).find(t => t.projectId === project.id && t.status === 'BLOCKED');
    if (blockedTask) {
      return {
        suggestedAction: `Resolve Blocked Task: "${blockedTask.title}"`,
        rationale: `Task is currently marked as BLOCKED and is preventing dependent downstream activities.`,
        actionType: 'TASK_RESOLUTION',
        evidenceSources: ['Task Register', 'Dependency Graph']
      };
    }

    // Rule 2: Artwork approval gate
    const pendingArtworkMat = materials.find(m => (m.currentStage || '').toLowerCase().includes('artwork') && !m.artworkApproved);
    if (pendingArtworkMat) {
      return {
        suggestedAction: `Execute Artwork Approval for ${pendingArtworkMat.name || pendingArtworkMat.type || 'Primary Material'}`,
        rationale: `Artwork sign-off is mandatory before advancing past Artwork stage to unblock VPDF and commercial printing.`,
        actionType: 'APPROVAL_EXECUTION',
        evidenceSources: ['Stage Gate SOP', 'Artwork Approval Engine']
      };
    }

    // Rule 3: Spec sign-off gate
    const unsignedSpecMat = materials.find(m => (m.currentStage || '').toLowerCase().includes('spec') && !m.specSignoff);
    if (unsignedSpecMat) {
      return {
        suggestedAction: `Complete Technical Spec Sign-off for ${unsignedSpecMat.name || unsignedSpecMat.type || 'Material'}`,
        rationale: `Technical specifications must be signed off by Packaging Engineering prior to pilot/commercial production.`,
        actionType: 'SPEC_SIGNOFF',
        evidenceSources: ['Specification SOP', 'Technical Sign-off Gate']
      };
    }

    // Rule 4: Critical risk mitigation
    const criticalRisk = risks.find(r => (r.severity || '').toLowerCase() === 'critical' && (r.status || '').toLowerCase() !== 'closed');
    if (criticalRisk) {
      return {
        suggestedAction: `Execute Mitigation Plan for Risk: "${criticalRisk.description || criticalRisk.category}"`,
        rationale: `Critical severity risk is currently unmitigated and directly threatens project timeline.`,
        actionType: 'RISK_MITIGATION',
        evidenceSources: ['Risk Register', 'Project Health Model']
      };
    }

    // Rule 5: Stage advancement
    return {
      suggestedAction: `Review Readiness to Advance Project from "${project.currentStage}" to Next Stage`,
      rationale: `All mandatory gates and deliverables for the current stage appear satisfied.`,
      actionType: 'STAGE_ADVANCEMENT',
      evidenceSources: ['Stage Quality Gates', 'Material Readiness Matrix']
    };
  }

  /**
   * Artwork checklist & version intelligence
   */
  async analyzeArtwork(artworkData = {}, options = {}) {
    const standardChecklist = [
      { item: 'FSSAI License & Logo', required: true, verified: Boolean(artworkData.fssaiVerified) },
      { item: 'Net Quantity Declaration', required: true, verified: Boolean(artworkData.netQtyVerified) },
      { item: 'Nutritional Information Table', required: true, verified: Boolean(artworkData.nutritionalVerified) },
      { item: 'Ingredients List & Allergen Warning', required: true, verified: Boolean(artworkData.ingredientsVerified) },
      { item: 'Barcode / EAN-13 & Verification Grade', required: true, verified: Boolean(artworkData.barcodeVerified) },
      { item: 'Manufacturing & Expiry / Best Before Formatting', required: true, verified: Boolean(artworkData.datesVerified) },
      { item: 'MRP (Inclusive of All Taxes)', required: true, verified: Boolean(artworkData.mrpVerified) },
      { item: 'Consumer Care Details & Registered Address', required: true, verified: Boolean(artworkData.addressVerified) },
      { item: 'Veg / Non-Veg Green/Brown Symbol', required: true, verified: Boolean(artworkData.vegSymbolVerified) }
    ];

    const missing = standardChecklist.filter(c => c.required && !c.verified);
    const analysis = missing.length === 0
      ? 'All mandatory regulatory and packaging checklist items are verified in the digital proof.'
      : `Digital proof is missing or pending verification on **${missing.length} mandatory element(s)**: ${missing.map(m => m.item).join(', ')}. Human review and sign-off remain authoritative.`;

    return {
      analysis,
      checklist: standardChecklist,
      evidenceSources: ['FSSAI Packaging Regulations', 'Legal Metrology Standards', 'Brand Packaging SOP']
    };
  }

  /**
   * Specification version difference analyzer
   */
  async diffSpecifications(specA = {}, specB = {}, options = {}) {
    const fieldDifferences = [];
    const fields = ['materialType', 'category', 'itemCode', 'specData'];

    // Check basic fields
    ['specName', 'itemCode', 'category', 'materialType', 'revision'].forEach(f => {
      if ((specA[f] || '') !== (specB[f] || '')) {
        fieldDifferences.push({
          field: f,
          oldValue: specA[f] || 'N/A',
          newValue: specB[f] || 'N/A'
        });
      }
    });

    // Check technical specData differences
    const dataA = specA.specData || {};
    const dataB = specB.specData || {};
    const allKeys = Array.from(new Set([...Object.keys(dataA), ...Object.keys(dataB)]));

    allKeys.forEach(k => {
      const vA = JSON.stringify(dataA[k] || '');
      const vB = JSON.stringify(dataB[k] || '');
      if (vA !== vB) {
        fieldDifferences.push({
          field: `specData.${k}`,
          oldValue: dataA[k] !== undefined ? dataA[k] : 'N/A',
          newValue: dataB[k] !== undefined ? dataB[k] : 'N/A'
        });
      }
    });

    const diffSummary = fieldDifferences.length === 0
      ? 'No technical or metadata differences detected between the two specification versions.'
      : `Detected **${fieldDifferences.length} difference(s)** between Revision ${specA.revision || '1.0'} and Revision ${specB.revision || '2.0'}.`;

    return {
      diffSummary,
      fieldDifferences,
      evidenceSources: ['Spec Library Repository', 'Version Comparison Engine']
    };
  }
}

module.exports = DeterministicAiProvider;
