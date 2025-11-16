import { z } from 'zod';

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
  llm: z.object({
    provider: z.string(),
    model: z.string(),
    temperature: z.number().min(0).max(2),
    maxTokens: z.number().int().positive(),
  }),
  heuristics: z.object({
    primitiveComponentPatterns: z.array(z.string()),
    excludeComponents: z.array(z.string()),
  }),
});

export type FigmaSyncConfig = z.infer<typeof zFigmaSyncConfig>;

