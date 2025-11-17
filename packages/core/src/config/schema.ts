import { z } from 'zod';

/**
 * Per-task LLM settings override
 */
const zLLMTaskSettings = z.object({
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().optional(),
  promptTemplate: z.string().optional(),
});

/**
 * LLM configuration with optional per-task overrides
 */
const zLLMConfig = z.object({
  provider: z.string(),
  model: z.string(),
  temperature: z.number().min(0).max(2).default(0.2),
  maxTokens: z.number().int().positive().default(1024),
  tasks: z
    .object({
      componentEnrichment: zLLMTaskSettings.optional(),
      screenLayout: zLLMTaskSettings.optional(),
      tokenMapping: zLLMTaskSettings.optional(),
    })
    .optional(),
});

export const zFigmaSyncConfig = z.object({
  projectName: z.string(),
  paths: z.object({
    uiComponentsGlob: z.string(),
    screenComponentsGlob: z.string(),
    cssVariablesFiles: z.array(z.string()).nonempty(),
    tailwindConfig: z.string(),
  }),
  figma: z.object({
    fileKey: z.string(),
    pages: z.object({
      primitives: z.string(),
      patterns: z.string(),
      screens: z.string(),
    }),
  }),
  llm: zLLMConfig.optional(),
  heuristics: z.object({
    primitiveComponentPatterns: z.array(z.string()),
    excludeComponents: z.array(z.string()),
  }),
});

export type FigmaSyncConfig = z.infer<typeof zFigmaSyncConfig>;
export type LLMConfig = z.infer<typeof zLLMConfig>;
export type LLMTaskSettings = z.infer<typeof zLLMTaskSettings>;

