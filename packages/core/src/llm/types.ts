/* c8 ignore file */

import type { ZodSchema } from 'zod';

export interface LLMGenerateOptions {
  temperature?: number;
  maxTokens?: number;
}

export interface RawLLMClient {
  generate(prompt: string, options?: LLMGenerateOptions): Promise<string>;
}

export interface LLMClient extends RawLLMClient {
  generateJSON<T>(
    prompt: string,
    schema: ZodSchema<T>,
    options?: LLMGenerateOptions,
  ): Promise<T>;
}

