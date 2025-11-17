import { describe, it, expect } from 'vitest';
import { runApplyPatches, type ApplyPatchesDeps } from './applyPatches';
import type { FigmaSyncConfig } from 'figma-sync-core';
import type { CodePatchSet } from 'figma-sync-core';

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
    model: 'gpt-4',
    temperature: 0.2,
    maxTokens: 1024,
  },
  heuristics: {
    primitiveComponentPatterns: ['Button'],
    excludeComponents: [],
  },
};

describe('runApplyPatches', () => {
  it('applies code patches to files', async () => {
    const config = baseConfig;

    const patchSet: CodePatchSet = {
      version: '1.0',
      patches: [
        {
          id: 'patch-1',
          description: 'Rename Button to PrimaryButton',
          hunks: [
            {
              filePath: 'src/components/ui/Button.tsx',
              before: 'Button',
              after: 'PrimaryButton',
            },
          ],
        },
      ],
    };

    const files: Record<string, string> = {
      '/repo/artifacts/code-patches.json': JSON.stringify(patchSet),
      '/repo/src/components/ui/Button.tsx':
        'export const Button = () => <Button />;\n',
    };

    const written: Record<string, string> = {};
    const logs: string[] = [];

    const deps: ApplyPatchesDeps = {
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
      fileExists: async (filePath) => !!files[filePath],
      log: (message) => {
        logs.push(message);
      },
      cwd: '/repo',
    };

    await runApplyPatches('figma-sync.config.json', deps);

    const updatedPath = '/repo/src/components/ui/Button.tsx';
    expect(written[updatedPath]).toBeDefined();
    expect(written[updatedPath]).toContain('PrimaryButton = () => <PrimaryButton />');
    expect(logs.some((l) => l.includes('Applied patches to src/components/ui/Button.tsx'))).toBe(
      true,
    );
  });

  it('throws when code-patches.json is missing', async () => {
    const deps: ApplyPatchesDeps = {
      loadConfigFromFile: async (configPath) => {
        expect(configPath).toBe('figma-sync.config.json');
        return baseConfig;
      },
      readFile: async () => {
        throw new Error('should not be called');
      },
      writeFile: async () => {
        throw new Error('should not be called');
      },
      fileExists: async () => false,
      cwd: '/repo',
    };

    await expect(runApplyPatches('figma-sync.config.json', deps)).rejects.toThrow(
      /code-patches\.json not found/,
    );
  });

  it('logs and returns when there are no changes to apply', async () => {
    const config = baseConfig;

    const patchSet: CodePatchSet = {
      version: '1.0',
      patches: [
        {
          id: 'patch-no-op',
          description: 'No-op patch',
          hunks: [
            {
              filePath: 'src/components/ui/Button.tsx',
              before: 'Button',
              after: 'Button',
            },
          ],
        },
      ],
    };

    const files: Record<string, string> = {
      '/repo/artifacts/code-patches.json': JSON.stringify(patchSet),
      '/repo/src/components/ui/Button.tsx':
        'export const Button = () => <Button />;\n',
    };

    const logs: string[] = [];

    const deps: ApplyPatchesDeps = {
      loadConfigFromFile: async () => config,
      readFile: async (filePath) => {
        const content = files[filePath];
        if (!content) throw new Error(`Missing file: ${filePath}`);
        return content;
      },
      writeFile: async () => {
        throw new Error('should not write any files');
      },
      fileExists: async (filePath) => !!files[filePath],
      log: (message) => {
        logs.push(message);
      },
      cwd: '/repo',
    };

    await runApplyPatches('figma-sync.config.json', deps);

    expect(logs.some((l) => l.includes('No changes to apply from code-patches.json'))).toBe(
      true,
    );
  });

});

