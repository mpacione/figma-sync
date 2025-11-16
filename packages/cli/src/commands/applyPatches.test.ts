import { describe, it, expect } from 'vitest';
import { runApplyPatches, type ApplyPatchesDeps } from './applyPatches';
import type { FigmaSyncConfig } from 'figma-sync-core';
import type { CodePatchSet } from 'figma-sync-core';

describe('runApplyPatches', () => {
  it('applies code patches to files', async () => {
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
});

