import { describe, it, expect } from 'vitest';
import { runScan, type ScanDeps } from './scan';
import type { FigmaSyncConfig } from 'figma-sync-core';

describe('runScan', () => {
  it('builds and writes a CodeModel artifact based on config and sources', async () => {
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

    const files: Record<string, string> = {
      '/repo/src/styles/tokens.css': ':root { --primary: #ffffff; }',
      '/repo/src/components/ui/Button.tsx':
        'export function Button() { return <button className="px-2" />; }',
      '/repo/app/login/page.tsx':
        'export default function Page() { return <Button><Icon /></Button>; }',
    };

    const written: Record<string, string> = {};

    const deps: ScanDeps = {
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
      ensureDir: async () => {
        // no-op for tests
      },
      glob: async (pattern, cwd) => {
        expect(cwd).toBe('/repo');
        if (pattern === 'src/components/ui/**/*') {
          return ['/repo/src/components/ui/Button.tsx'];
        }
        if (pattern === 'app/**/page.tsx') {
          return ['/repo/app/login/page.tsx'];
        }
        return [];
      },
      cwd: '/repo',
    };

    await runScan('figma-sync.config.json', deps);

    const outPath = '/repo/artifacts/code-model.json';
    expect(written[outPath]).toBeDefined();
    const model = JSON.parse(written[outPath]!);

    expect(model.version).toBe('1.0');
    expect(model.projectMeta.name).toBe('Test Project');
    expect(model.components.map((c: any) => c.name)).toEqual(['Button']);
    expect(model.screens[0].route).toBe('/login');
  });
});

  it('skips missing CSS variables files (ENOENT) but still builds a CodeModel', async () => {
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

    const files: Record<string, string> = {
      '/repo/src/components/ui/Button.tsx':
        'export function Button() { return <button className="px-2" />; }',
      '/repo/app/login/page.tsx':
        'export default function Page() { return <Button><Icon /></Button>; }',
    };

    const written: Record<string, string> = {};

    const deps: ScanDeps = {
      loadConfigFromFile: async () => config,
      readFile: async (filePath) => {
        const content = files[filePath];
        if (!content) {
          const err = new Error(
            `ENOENT: no such file or directory, open '${filePath}'`,
          ) as NodeJS.ErrnoException;
          err.code = 'ENOENT';
          throw err;
        }
        return content;
      },
      writeFile: async (filePath, content) => {
        written[filePath] = content;
      },
      ensureDir: async () => {
        // no-op
      },
      glob: async (pattern, cwd) => {
        expect(cwd).toBe('/repo');
        if (pattern === 'src/components/ui/**/*') {
          return ['/repo/src/components/ui/Button.tsx'];
        }
        if (pattern === 'app/**/page.tsx') {
          return ['/repo/app/login/page.tsx'];
        }
        return [];
      },
      cwd: '/repo',
    };

    await runScan('figma-sync.config.json', deps);

    const outPath = '/repo/artifacts/code-model.json';
    expect(written[outPath]).toBeDefined();
    const model = JSON.parse(written[outPath]!);
    expect(model.components.map((c: any) => c.name)).toEqual(['Button']);
  });


