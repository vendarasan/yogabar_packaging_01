'use strict';

/**
 * BaseAiProvider.js — Abstract Interface for AI Providers
 *
 * Implements the Provider Adapter pattern ensuring application logic
 * is never tightly coupled to a specific external model or provider.
 */
class BaseAiProvider {
  /**
   * Return the identifier name of this provider.
   * @returns {string}
   */
  getName() {
    throw new Error('getName() must be implemented by provider subclass');
  }

  /**
   * Check if this provider is currently available and configured.
   * @returns {Promise<boolean>|boolean}
   */
  isAvailable() {
    return true;
  }

  /**
   * General natural language query processing ("Ask Packaging").
   * @param {string} prompt - User query
   * @param {object} context - Grounded, permission-filtered application data
   * @param {object} options - Generation options
   * @returns {Promise<{ answer: string, evidenceSources: string[], structuredData?: any }>}
   */
  async generateResponse(prompt, context, options = {}) {
    throw new Error('generateResponse() must be implemented by provider subclass');
  }

  /**
   * Summarize a project's identity, health, stage, CPM, risks, and actions.
   * @param {object} project - Grounded project data
   * @param {object} options
   * @returns {Promise<{ summary: string, keyMetrics: object, evidenceSources: string[] }>}
   */
  async summarizeProject(project, options = {}) {
    throw new Error('summarizeProject() must be implemented by provider subclass');
  }

  /**
   * Perform delay factor analysis for a project.
   * @param {object} project - Grounded project data with audit logs & stage history
   * @param {object} options
   * @returns {Promise<{ delayStatus: string, contributingFactors: object[], evidenceSources: string[] }>}
   */
  async analyzeDelay(project, options = {}) {
    throw new Error('analyzeDelay() must be implemented by provider subclass');
  }

  /**
   * Summarize project risks distinguishing registered facts from AI interpretations.
   * @param {Array} risks - Grounded risks array
   * @param {object} project - Associated project
   * @param {object} options
   * @returns {Promise<{ riskOverview: string, categorizedRisks: object[], evidenceSources: string[] }>}
   */
  async summarizeRisks(risks, project, options = {}) {
    throw new Error('summarizeRisks() must be implemented by provider subclass');
  }

  /**
   * Factual side-by-side comparison between two projects.
   * @param {object} projA
   * @param {object} projB
   * @param {object} options
   * @returns {Promise<{ comparisonSummary: string, comparisonMatrix: object[], evidenceSources: string[] }>}
   */
  async compareProjects(projA, projB, options = {}) {
    throw new Error('compareProjects() must be implemented by provider subclass');
  }

  /**
   * Generate portfolio-wide Daily Packaging Brief.
   * @param {object} portfolioData - Grounded portfolio state (projects, tasks, approvals, risks)
   * @param {object} options
   * @returns {Promise<{ briefSummary: string, attentionItems: object[], upcomingLaunches: object[], pendingApprovals: object[], evidenceSources: string[] }>}
   */
  async generateDailyBrief(portfolioData, options = {}) {
    throw new Error('generateDailyBrief() must be implemented by provider subclass');
  }

  /**
   * Suggest immediate rule-based next operational action.
   * @param {object} project - Grounded project data
   * @param {object} options
   * @returns {Promise<{ suggestedAction: string, rationale: string, actionType: string, evidenceSources: string[] }>}
   */
  async suggestNextAction(project, options = {}) {
    throw new Error('suggestNextAction() must be implemented by provider subclass');
  }

  /**
   * Analyze artwork checklist & version differences.
   * @param {object} artworkData
   * @param {object} options
   * @returns {Promise<{ analysis: string, checklist: object[], evidenceSources: string[] }>}
   */
  async analyzeArtwork(artworkData, options = {}) {
    throw new Error('analyzeArtwork() must be implemented by provider subclass');
  }

  /**
   * Analyze specification version differences.
   * @param {object} specA
   * @param {object} specB
   * @param {object} options
   * @returns {Promise<{ diffSummary: string, fieldDifferences: object[], evidenceSources: string[] }>}
   */
  async diffSpecifications(specA, specB, options = {}) {
    throw new Error('diffSpecifications() must be implemented by provider subclass');
  }
}

module.exports = BaseAiProvider;
