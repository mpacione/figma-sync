/**
 * Model validation and suggestions for LLM configuration
 */

export interface ModelValidationResult {
  isValid: boolean;
  provider: string;
  model: string;
  suggestion?: string;
  warning?: string;
}

/**
 * Known valid OpenAI models
 */
const VALID_OPENAI_MODELS = [
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4-turbo',
  'gpt-4-turbo-preview',
  'gpt-4',
  'gpt-3.5-turbo',
  'gpt-3.5-turbo-16k',
];

/**
 * Common model name typos and their corrections
 */
const OPENAI_MODEL_CORRECTIONS: Record<string, string> = {
  'gpt-4.1-mini': 'gpt-4o-mini',
  'gpt-4-mini': 'gpt-4o-mini',
  'gpt4-mini': 'gpt-4o-mini',
  'gpt4o-mini': 'gpt-4o-mini',
  'gpt-4.1': 'gpt-4o',
  'gpt4': 'gpt-4',
  'gpt-4-turbo-mini': 'gpt-4o-mini',
  'gpt-3.5': 'gpt-3.5-turbo',
  'gpt3.5': 'gpt-3.5-turbo',
};

/**
 * Validate an LLM model name and provide suggestions if invalid
 */
export function validateModel(
  provider: string,
  model: string,
): ModelValidationResult {
  const lowerProvider = provider.toLowerCase();

  if (lowerProvider === 'openai') {
    return validateOpenAIModel(model);
  }

  // For other providers, assume valid but warn
  return {
    isValid: true,
    provider,
    model,
    warning: `Provider "${provider}" is not validated. Ensure the model name is correct.`,
  };
}

/**
 * Validate an OpenAI model name
 */
function validateOpenAIModel(model: string): ModelValidationResult {
  const lowerModel = model.toLowerCase();

  // Check if it's a valid model
  if (VALID_OPENAI_MODELS.includes(lowerModel)) {
    return {
      isValid: true,
      provider: 'openai',
      model: lowerModel,
    };
  }

  // Check if there's a known correction
  if (OPENAI_MODEL_CORRECTIONS[lowerModel]) {
    const suggestion = OPENAI_MODEL_CORRECTIONS[lowerModel];
    return {
      isValid: false,
      provider: 'openai',
      model: lowerModel,
      suggestion,
      warning: `Model "${model}" is not a valid OpenAI model. Did you mean "${suggestion}"?`,
    };
  }

  // Unknown model
  return {
    isValid: false,
    provider: 'openai',
    model: lowerModel,
    warning: `Model "${model}" is not a recognized OpenAI model. Valid models: ${VALID_OPENAI_MODELS.join(', ')}`,
  };
}

/**
 * Get the effective LLM settings for a specific task
 * Merges base config with task-specific overrides
 */
export function getEffectiveLLMSettings(
  baseConfig: {
    provider: string;
    model: string;
    temperature: number;
    maxTokens: number;
  },
  taskOverride?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    promptTemplate?: string;
  },
): {
  provider: string;
  model: string;
  temperature: number;
  maxTokens: number;
  promptTemplate?: string;
} {
  return {
    provider: baseConfig.provider,
    model: taskOverride?.model ?? baseConfig.model,
    temperature: taskOverride?.temperature ?? baseConfig.temperature,
    maxTokens: taskOverride?.maxTokens ?? baseConfig.maxTokens,
    promptTemplate: taskOverride?.promptTemplate,
  };
}

