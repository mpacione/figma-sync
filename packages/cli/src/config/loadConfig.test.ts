import { describe, it, expect, vi } from 'vitest';
import { loadConfigFromFile } from './loadConfig';
import type { FigmaSyncConfig } from 'figma-sync-core';

const validConfig: FigmaSyncConfig = {
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
    model: 'gpt-4',
    temperature: 0.2,
    maxTokens: 1024,
  },
  heuristics: {
    primitiveComponentPatterns: ['Button'],
    excludeComponents: [],
  },
};

describe('loadConfigFromFile', () => {
  it('loads and parses a JSON config', async () => {
    const readFile = vi
      .fn<Parameters<NonNullable<Parameters<typeof loadConfigFromFile>[1]>['readFile']>, Promise<string>>()
      .mockResolvedValue(JSON.stringify(validConfig));
    const loadModule = vi.fn();

    const result = await loadConfigFromFile('/path/to/figma-sync.config.json', {
      readFile,
      loadModule,
    });

    expect(result).toEqual(validConfig);
    expect(readFile).toHaveBeenCalledTimes(1);
    expect(loadModule).not.toHaveBeenCalled();
  });

  it('loads and parses a JS config via module loader', async () => {
    const readFile = vi.fn();
    const loadModule = vi.fn().mockResolvedValue({ default: validConfig });

    const result = await loadConfigFromFile('/path/to/figma-sync.config.js', {
      readFile,
      loadModule,
    });

    expect(result).toEqual(validConfig);
    expect(loadModule).toHaveBeenCalledTimes(1);
  });

  it('throws on unsupported extension', async () => {
    const readFile = vi.fn();
    const loadModule = vi.fn();

    await expect(
      loadConfigFromFile('/path/to/figma-sync.config.txt', {
        readFile,
        loadModule,
      }),
    ).rejects.toThrow(/Unsupported config file extension/);
  });
});

