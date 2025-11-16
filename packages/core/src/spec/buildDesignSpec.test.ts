import { describe, it, expect } from 'vitest';
import { buildDesignSpec } from './buildDesignSpec';
import type { CodeModel } from '../models/CodeModel';
import type { FigmaSyncConfig } from '../config/schema';

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
    radii: [
      {
        name: '--radius-sm',
        value: 4,
        unit: 'px',
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
    spacing: [
      {
        name: '--space-md',
        value: 8,
        unit: 'px',
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
    typography: [
      {
        name: '--font-size-body',
        fontFamily: 'system-ui',
        fontSize: 16,
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

describe('buildDesignSpec', () => {
  it('builds a DesignSpec from a CodeModel and config', () => {
    const spec = buildDesignSpec(codeModel, config);

    expect(spec.version).toBe('1.0');
    expect(spec.projectMeta.name).toBe('Test Project');

    expect(spec.variables.collections[0].name).toBe('Colors');
    expect(spec.variables.variables[0]).toMatchObject({
      name: '--primary',
      type: 'COLOR',
    });

    const collectionNames = spec.variables.collections.map((c) => c.name);
    expect(collectionNames).toContain('Radii');
    expect(collectionNames).toContain('Spacing');
    expect(collectionNames).toContain('Typography');

    const findVar = (name: string) =>
      spec.variables.variables.find((v) => v.name === name);

    expect(findVar('--radius-sm')).toMatchObject({
      name: '--radius-sm',
      type: 'FLOAT',
      modeValues: { default: 4 },
    });

    expect(findVar('--space-md')).toMatchObject({
      name: '--space-md',
      type: 'FLOAT',
      modeValues: { default: 8 },
    });

    expect(findVar('--font-size-body')).toMatchObject({
      name: '--font-size-body',
      type: 'FLOAT',
      modeValues: { default: 16 },
    });

    expect(spec.components[0]).toMatchObject({
      name: 'Button',
      category: 'primitive',
      placement: { page: 'System/Primitives' },
    });

    expect(spec.screens[0]).toMatchObject({
      route: '/login',
      componentsUsed: ['Button'],
      states: ['default'],
    });

    expect(spec.pages.map((p) => p.name)).toEqual([
      'System/Primitives',
      'System/Patterns',
      'App/Screens',
    ]);

    expect(spec.mapping.codeComponentToDesignId.Button).toBeDefined();
    expect(spec.mapping.codeTokenToVariableId['--primary']).toBeDefined();
    expect(spec.mapping.codeTokenToVariableId['--radius-sm']).toBeDefined();
    expect(spec.mapping.codeTokenToVariableId['--space-md']).toBeDefined();
    expect(
      spec.mapping.codeTokenToVariableId['--font-size-body'],
    ).toBeDefined();
    expect(spec.mapping.routeToScreenId['/login']).toBeDefined();
  });
});

