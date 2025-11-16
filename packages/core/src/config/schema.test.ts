import { describe, it, expect } from 'vitest';
import { zFigmaSyncConfig } from './schema';

describe('zFigmaSyncConfig', () => {
  it('accepts a valid config', () => {
    const config = {
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
        temperature: 0.5,
        maxTokens: 1024,
      },
      heuristics: {
        primitiveComponentPatterns: ['Button'],
        excludeComponents: [],
      },
    };

    const parsed = zFigmaSyncConfig.parse(config);
    expect(parsed).toEqual(config);
  });

  it('rejects config with missing required fields', () => {
    const invalid: unknown = { projectName: 'Missing fields' };
    expect(() => zFigmaSyncConfig.parse(invalid)).toThrow();
  });
});

