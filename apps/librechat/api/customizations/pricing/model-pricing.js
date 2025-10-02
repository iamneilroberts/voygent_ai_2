/**
 * Token Pricing Utility
 * Feature: 002-librechat-interface-modifications
 *
 * Provides model pricing lookup and cost calculation for AI token usage.
 * Pricing data sourced from research.md section 6 (2025-01 rates).
 */

/**
 * @typedef {Object} ModelPricing
 * @property {string} modelId - Model identifier
 * @property {string} modelName - Human-readable model name
 * @property {number} inputPricePer1M - USD per 1 million input tokens
 * @property {number} outputPricePer1M - USD per 1 million output tokens
 */

/**
 * Model pricing lookup table
 * Prices are per 1 million tokens in USD
 * Last updated: 2025-01
 * @type {Record<string, ModelPricing>}
 */
export const MODEL_PRICING = {
  'claude-3-5-sonnet-20241022': {
    modelId: 'claude-3-5-sonnet-20241022',
    modelName: 'Claude 3.5 Sonnet',
    inputPricePer1M: 3.00,
    outputPricePer1M: 15.00,
  },
  'claude-3-5-haiku-20241022': {
    modelId: 'claude-3-5-haiku-20241022',
    modelName: 'Claude 3.5 Haiku',
    inputPricePer1M: 0.80,
    outputPricePer1M: 4.00,
  },
  'gpt-4o': {
    modelId: 'gpt-4o',
    modelName: 'GPT-4o',
    inputPricePer1M: 5.00,
    outputPricePer1M: 15.00,
  },
  'gpt-4o-mini': {
    modelId: 'gpt-4o-mini',
    modelName: 'GPT-4o Mini',
    inputPricePer1M: 0.15,
    outputPricePer1M: 0.60,
  },
};

/**
 * Calculate cost for token usage
 *
 * @param {number} inputTokens - Number of input tokens consumed
 * @param {number} outputTokens - Number of output tokens generated
 * @param {string} modelId - Model identifier (e.g., 'claude-3-5-sonnet-20241022')
 * @returns {number} Cost in USD, rounded to 6 decimal places
 *
 * @example
 * calculateCost(5000, 1500, 'claude-3-5-sonnet-20241022')
 * // Returns: 0.0375
 * // Calculation: (5000/1M * $3) + (1500/1M * $15) = $0.015 + $0.0225 = $0.0375
 */
export function calculateCost(inputTokens, outputTokens, modelId) {
  const pricing = MODEL_PRICING[modelId];

  if (!pricing) {
    console.warn(`Pricing not found for model: ${modelId}. Returning $0.00`);
    return 0;
  }

  const inputCost = (inputTokens / 1_000_000) * pricing.inputPricePer1M;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPricePer1M;

  return parseFloat((inputCost + outputCost).toFixed(6));
}

/**
 * Get human-readable model name from model ID
 *
 * @param {string} modelId - Model identifier
 * @returns {string} Human-readable model name or original ID if not found
 */
export function getModelName(modelId) {
  return MODEL_PRICING[modelId]?.modelName || modelId;
}

/**
 * Check if pricing exists for a given model
 *
 * @param {string} modelId - Model identifier
 * @returns {boolean} true if pricing data exists
 */
export function hasPricing(modelId) {
  return modelId in MODEL_PRICING;
}
