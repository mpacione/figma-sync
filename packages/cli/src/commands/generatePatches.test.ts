import { describe, it, expect } from 'vitest';
import { runGeneratePatches, type GeneratePatchesDeps } from './generatePatches';
import type { FigmaSyncConfig } from 'figma-sync-core';
import type { CodeModel } from 'figma-sync-core';
import type { DesignSpec } from 'figma-sync-core';
import { zCodePatchSet } from 'figma-sync-core';

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

describe('runGeneratePatches', () => {
  it('reads artifacts and change set from stdin and writes a patch set', async () => {
    const files: Record<string, string> = {
      '/repo/artifacts/code-model.json': JSON.stringify(codeModel),
      '/repo/artifacts/design-spec.json': JSON.stringify(designSpec),
    };
    const written: Record<string, string> = {};

    const changesJson = JSON.stringify({
      version: '1.0',
      changes: [],
    });

    const deps: GeneratePatchesDeps = {
      loadConfigFromFile: async (configPath) => {
        expect(configPath).toBe('figma-sync.config.json');
        return config;
      },
      readFile: async (filePath) => {
        const content = files[filePath];
        if (!content) throw new Error(`Missing file: ${filePath}`);
        return content;
      },
      writeFile: async (filePath, content) => {
        written[filePath] = content;
      },
      readStdin: async () => changesJson,
      cwd: '/repo',
    };

    await runGeneratePatches('figma-sync.config.json', deps);

    const patchesPath = '/repo/artifacts/code-patches.json';
    expect(written[patchesPath]).toBeDefined();
    const patchSet = zCodePatchSet.parse(JSON.parse(written[patchesPath]!));
    expect(patchSet.version).toBe('1.0');
    expect(patchSet.patches).toEqual([]);
  });
});

