import { describe, it, expect, vi } from 'vitest';
import { runValidate, type ValidateDeps } from './validate';
import type { FigmaSyncConfig } from 'figma-sync-core';
import type { CodeModel } from 'figma-sync-core';
import type { DesignSpec } from 'figma-sync-core';
import type { FigmaInstructionSet } from 'figma-sync-core';
import type { CodePatchSet } from 'figma-sync-core';

const config: FigmaSyncConfig = {
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

const codeModel: CodeModel = {
  version: '1.0',
  projectMeta: {
    name: 'Test Project',
    framework: 'nextjs',
    tailwindEnabled: true,
  },
  tokens: {
    colors: [],
    radii: [],
    spacing: [],
    typography: [],
  },
  components: [],
  screens: [],
};

const designSpec: DesignSpec = {
  version: '1.0',
  projectMeta: codeModel.projectMeta,
  variables: { collections: [], variables: [] },
  styles: { styles: [] },
  components: [],
  screens: [],
  pages: [],
  mapping: {
    codeComponentToDesignId: {},
    codeTokenToVariableId: {},
    routeToScreenId: {},
  },
};

const instructionSet: FigmaInstructionSet = {
  version: '1.0',
  operations: [],
};

const patchSet: CodePatchSet = {
  version: '1.0',
  patches: [],
};

describe('runValidate', () => {
  it('validates existing artifacts and skips missing ones', async () => {
    const files: Record<string, string> = {
      '/repo/artifacts/code-model.json': JSON.stringify(codeModel),
      '/repo/artifacts/design-spec.json': JSON.stringify(designSpec),
      '/repo/artifacts/figma-instructions.json': JSON.stringify(instructionSet),
      '/repo/artifacts/code-patches.json': JSON.stringify(patchSet),
    };

    const logs: string[] = [];

    const deps: ValidateDeps = {
      loadConfigFromFile: async (configPath) => {
        expect(configPath).toBe('figma-sync.config.json');
        return config;
      },
      readFile: async (filePath) => {
        const content = files[filePath];
        if (!content) throw new Error(`Missing file: ${filePath}`);
        return content;
      },
      fileExists: async (filePath) => !!files[filePath],
      log: (message) => {
        logs.push(message);
      },
      cwd: '/repo',
    };

    await runValidate('figma-sync.config.json', deps);

    expect(logs.some((l) => l.includes('CodeModel'))).toBe(true);
    expect(logs.some((l) => l.includes('DesignSpec'))).toBe(true);
    expect(logs.some((l) => l.includes('FigmaInstructionSet'))).toBe(true);
    expect(logs.some((l) => l.includes('CodePatchSet'))).toBe(true);
  });
});

