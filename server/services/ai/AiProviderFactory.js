'use strict';

const DeterministicAiProvider = require('./DeterministicAiProvider');
const GeminiAiProvider = require('./GeminiAiProvider');

/**
 * AiProviderFactory.js — Provider Factory
 *
 * Instantiates the appropriate AI provider based on environment configuration.
 * Defaults to Gemini if configured, with automatic deterministic fallback.
 */
class AiProviderFactory {
  static _instance = null;

  static getProvider() {
    if (!AiProviderFactory._instance) {
      const providerType = (process.env.AI_PROVIDER || 'gemini').toLowerCase();

      if (providerType === 'deterministic') {
        AiProviderFactory._instance = new DeterministicAiProvider();
      } else {
        AiProviderFactory._instance = new GeminiAiProvider();
      }
    }
    return AiProviderFactory._instance;
  }

  /**
   * Reset provider (useful for testing)
   */
  static reset() {
    AiProviderFactory._instance = null;
  }
}

module.exports = AiProviderFactory;
