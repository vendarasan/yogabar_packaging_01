'use strict';

const BaseAiProvider = require('./BaseAiProvider');
const DeterministicAiProvider = require('./DeterministicAiProvider');

/**
 * GeminiAiProvider.js — Gemini LLM Provider with Strict Grounding & Fallback
 *
 * Calls Google's Gemini API with system instructions enforcing zero-hallucination
 * and strict evidence citation. If no GEMINI_API_KEY is configured or any network
 * or API error occurs, it falls back seamlessly to DeterministicAiProvider.
 */
class GeminiAiProvider extends BaseAiProvider {
  constructor() {
    super();
    this.apiKey = process.env.GEMINI_API_KEY || null;
    this.modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    this.fallbackProvider = new DeterministicAiProvider();
  }

  getName() {
    return 'GeminiAiProvider';
  }

  isAvailable() {
    return Boolean(this.apiKey);
  }

  /**
   * Helper to call Gemini REST API
   */
  async _callGemini(systemPrompt, userPrompt) {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`;
    const payload = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: `${systemPrompt}\n\nUser Request: ${userPrompt}` }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1, // Low temperature for high factual precision
        maxOutputTokens: 1024
      }
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8-second timeout

    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Gemini API error (${resp.status}): ${errText}`);
      }

      const data = await resp.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error('Empty response from Gemini API');
      }
      return text.trim();
    } finally {
      clearTimeout(timeout);
    }
  }

  async generateResponse(prompt, context = {}, options = {}) {
    if (!this.isAvailable()) {
      return this.fallbackProvider.generateResponse(prompt, context, options);
    }

    const systemPrompt = `You are the Yogabar Enterprise Packaging AI Assistant.
CRITICAL RULES:
1. You must answer ONLY using the grounded JSON data provided below.
2. DO NOT hallucinate. Never invent dates, PM codes, project names, or risk statuses.
3. If the data to answer the query is not in the context, explicitly state: "I don't have enough project data to answer that."
4. Always list the evidence sources used to formulate your answer.
5. Format your response cleanly in Markdown.

Grounded Context:
${JSON.stringify(context, null, 2)}`;

    try {
      const rawAnswer = await this._callGemini(systemPrompt, prompt);
      return {
        answer: rawAnswer,
        evidenceSources: ['Grounded Context', 'Gemini Reasoning Engine', 'Authorized Domain Store'],
        structuredData: null
      };
    } catch (err) {
      console.warn(`[GeminiAiProvider] Gemini API call failed (${err.message}). Falling back to Deterministic Provider.`);
      return this.fallbackProvider.generateResponse(prompt, context, options);
    }
  }

  async summarizeProject(project, options = {}) {
    if (!this.isAvailable()) {
      return this.fallbackProvider.summarizeProject(project, options);
    }

    const systemPrompt = `You are the Yogabar Enterprise Packaging AI Assistant.
Summarize the following project strictly using the provided JSON. Include Stage, Health, Target Launch Date, CPM Status, and Key Risks.
Do not invent any details.
Project Data:
${JSON.stringify(project, null, 2)}`;

    try {
      const summary = await this._callGemini(systemPrompt, 'Summarize this project.');
      return {
        summary,
        keyMetrics: {
          id: project.id,
          name: project.name,
          stage: project.currentStage,
          health: project.health,
          targetLaunch: project.targetLaunchDate
        },
        evidenceSources: ['Project Master (Grounded)', 'Gemini Model']
      };
    } catch (err) {
      console.warn(`[GeminiAiProvider] Summarize fallback: ${err.message}`);
      return this.fallbackProvider.summarizeProject(project, options);
    }
  }

  async analyzeDelay(project, options = {}) {
    return this.fallbackProvider.analyzeDelay(project, options);
  }

  async summarizeRisks(risks, project, options = {}) {
    return this.fallbackProvider.summarizeRisks(risks, project, options);
  }

  async compareProjects(projA, projB, options = {}) {
    return this.fallbackProvider.compareProjects(projA, projB, options);
  }

  async generateDailyBrief(portfolioData, options = {}) {
    return this.fallbackProvider.generateDailyBrief(portfolioData, options);
  }

  async suggestNextAction(project, options = {}) {
    return this.fallbackProvider.suggestNextAction(project, options);
  }

  async analyzeArtwork(artworkData, options = {}) {
    return this.fallbackProvider.analyzeArtwork(artworkData, options);
  }

  async diffSpecifications(specA, specB, options = {}) {
    return this.fallbackProvider.diffSpecifications(specA, specB, options);
  }
}

module.exports = GeminiAiProvider;
