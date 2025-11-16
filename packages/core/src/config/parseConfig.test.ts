import { describe, it, expect } from 'vitest';
import { parseConfig } from './parseConfig';
import { FigmaSyncConfig } from './schema';

describe('parseConfig', () => {
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
      primitiveComponentPatterns: ['Button', 'Input'],
      excludeComponents: ['DebugPanel'],
    },
  };

  it('parses a valid config object', () => {
    const parsed = parseConfig(validConfig);
    expect(parsed).toEqual(validConfig);
  });

  it('throws on invalid config', () => {
    const invalid: unknown = { projectName: 'Missing fields' };
    expect(() => parseConfig(invalid)).toThrow(/Invalid figma-sync config/);
  });
});

