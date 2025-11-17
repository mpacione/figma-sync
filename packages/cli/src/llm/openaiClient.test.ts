import { describe, it, expect, vi, afterEach } from 'vitest';
import type { FigmaSyncConfig } from 'figma-sync-core';
import { createOpenAiLLMClientFromEnv } from './openaiClient';

const baseConfig: FigmaSyncConfig = {
  projectName: 'Test Project',
  paths: {
    uiComponentsGlob: 'src/components/ui/**/*',
    screenComponentsGlob: 'app/**/page.tsx',
    cssVariablesFiles: ['src/styles/tokens.css'],
    tailwindConfig: 'tailwind.config.ts',
  },
  figma: {
    fileKey: 'FILE_KEY',
    pages: {
      primitives: 'System/Primitives',
      patterns: 'System/Patterns',
      screens: 'App/Screens',
    },
  },
  llm: {
    provider: 'openai',
    model: 'gpt-4.1-mini',
    temperature: 0.2,
    maxTokens: 512,
  },
  heuristics: {
    primitiveComponentPatterns: ['Button'],
    excludeComponents: [],
  },
};

const originalApiKey = process.env.FIGMA_SYNC_OPENAI_API_KEY;
const originalFetch = (globalThis as any).fetch;

afterEach(() => {
  process.env.FIGMA_SYNC_OPENAI_API_KEY = originalApiKey;
  (globalThis as any).fetch = originalFetch;
});

describe('createOpenAiLLMClientFromEnv', () => {
  it('returns null when provider is not openai', () => {
    const config: FigmaSyncConfig = {
      ...baseConfig,
      llm: { ...baseConfig.llm, provider: 'none' as any },
    };

    delete process.env.FIGMA_SYNC_OPENAI_API_KEY;

    const client = createOpenAiLLMClientFromEnv(config);
    expect(client).toBeNull();
  });

  it('returns null when API key env is missing', () => {
    const config = baseConfig;
    delete process.env.FIGMA_SYNC_OPENAI_API_KEY;

    const client = createOpenAiLLMClientFromEnv(config);
    expect(client).toBeNull();
  });

  it('throws when global fetch is not available', () => {
    const config = baseConfig;
    process.env.FIGMA_SYNC_OPENAI_API_KEY = 'test-key';
    (globalThis as any).fetch = undefined;

    expect(() => createOpenAiLLMClientFromEnv(config)).toThrow(
      /Global fetch is not available/,
    );
  });

  it('creates a client and performs a successful request', async () => {
    const config = baseConfig;
    process.env.FIGMA_SYNC_OPENAI_API_KEY = 'test-key';

    const fetchMock = vi.fn(async (_url: string, init: any) => {
      const body = JSON.parse(init.body);
      expect(body.model).toBe(config.llm.model);
      expect(body.temperature).toBe(0.5);
      expect(body.max_tokens).toBe(256);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: 'hello from openai' } }],
        }),
      } as any;
    });

    ;(globalThis as any).fetch = fetchMock;

    const client = createOpenAiLLMClientFromEnv(config);
    expect(client).not.toBeNull();

    const text = await client!.generate('Hi', { temperature: 0.5, maxTokens: 256 });

    expect(text).toBe('hello from openai');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws a descriptive error when the API response is not ok', async () => {
    const config = baseConfig;
    process.env.FIGMA_SYNC_OPENAI_API_KEY = 'test-key';

    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 500,
      text: async () => 'internal error',
    }));

    ;(globalThis as any).fetch = fetchMock;

    const client = createOpenAiLLMClientFromEnv(config)!;

    await expect(client.generate('Hi')).rejects.toThrow(
      /OpenAI API error: 500 internal error/,
    );
  });

  it('handles nullish responses from fetch', async () => {
    const config = baseConfig;
    process.env.FIGMA_SYNC_OPENAI_API_KEY = 'test-key';

    const fetchMock = vi.fn(async () => null as any);

    ;(globalThis as any).fetch = fetchMock;

    const client = createOpenAiLLMClientFromEnv(config)!;

    await expect(client.generate('Hi')).rejects.toThrow(
      /OpenAI API error: unknown/,
    );
  });

  it('throws when the response has no message content', async () => {
    const config = baseConfig;
    process.env.FIGMA_SYNC_OPENAI_API_KEY = 'test-key';

    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: {} }] }),
    }));

    ;(globalThis as any).fetch = fetchMock;

    const client = createOpenAiLLMClientFromEnv(config)!;

    await expect(client.generate('Hi')).rejects.toThrow(
      /OpenAI API returned no message content/,
    );
  });
});

