import { describe, it, expect } from 'vitest';
import { runGenerateSpec, type GenerateSpecDeps } from './generateSpec';
import type { FigmaSyncConfig } from 'figma-sync-core';
import { zFigmaInstructionSet } from 'figma-sync-core';
import type { CodeModel } from 'figma-sync-core';

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
    colors: [
      {
        name: '--primary',
        source: 'css-variable',
        value: { hex: '#ffffff' },
        darkModeValue: undefined,
        usageCount: 0,
        locations: [
          {
            filePath: 'src/styles/tokens.css',
            line: 1,
            column: 1,
          },
        ],
      },
    ],
    radii: [],
    spacing: [],
    typography: [],
  },
  components: [
    {
      name: 'Button',
      sourceFile: 'src/components/ui/Button.tsx',
      exportedName: 'Button',
      kind: 'primitive',
      props: [],
      usageExamples: [],
      tailwindClasses: ['px-2'],
      childrenStructure: undefined,
    },
  ],
  screens: [
    {
      route: '/login',
      componentName: 'Page',
      filePath: 'app/login/page.tsx',
      usesComponents: ['Button'],
      description: undefined,
    },
  ],
};

describe('runGenerateSpec', () => {
  it('reads CodeModel, builds DesignSpec, and writes it to artifacts', async () => {
    const files: Record<string, string> = {
      '/repo/artifacts/code-model.json': JSON.stringify(codeModel),
    };
    const written: Record<string, string> = {};

    const deps: GenerateSpecDeps = {
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
      cwd: '/repo',
    };

    await runGenerateSpec('figma-sync.config.json', deps);

    const specPath = '/repo/artifacts/design-spec.json';
    expect(written[specPath]).toBeDefined();
    const spec = JSON.parse(written[specPath]!);

    expect(spec.version).toBe('1.0');
    expect(spec.projectMeta.name).toBe('Test Project');
    expect(spec.components[0].name).toBe('Button');
    expect(spec.screens[0].route).toBe('/login');
    expect(spec.mapping.codeComponentToDesignId.Button).toBeDefined();

    const instructionsPath = '/repo/artifacts/figma-instructions.json';
    expect(written[instructionsPath]).toBeDefined();
    const instructions = JSON.parse(written[instructionsPath]!);
    const parsed = zFigmaInstructionSet.parse(instructions);
    expect(parsed.version).toBe('1.0');
  });
});

