import type { ZodSchema } from 'zod';
import { LLMClient, LLMGenerateOptions, RawLLMClient } from './types';

function extractFirstJson(text: string): string | null {
  const start = text.search(/[\[{]/);
  if (start === -1) return null;
  const open = text[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === open) depth += 1;
    else if (ch === close) depth -= 1;
    if (depth === 0) {
      return text.slice(start, i + 1);
    }
  }
  return null;
}

export class JsonLLMClient implements LLMClient {
  constructor(private readonly raw: RawLLMClient) {}

  generate(prompt: string, options?: LLMGenerateOptions): Promise<string> {
    return this.raw.generate(prompt, options);
  }

  async generateJSON<T>(
    prompt: string,
    schema: ZodSchema<T>,
    options?: LLMGenerateOptions,
  ): Promise<T> {
    const text = await this.generate(prompt, options);
    const jsonSegment = extractFirstJson(text);
    if (!jsonSegment) {
      throw new Error('LLM response did not contain JSON block');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonSegment);
    } catch (err) {
      throw new Error(`Failed to parse JSON from LLM response: ${(err as Error).message}`);
    }

    return schema.parse(parsed);
  }
}

export { extractFirstJson };

