import { describe, it, expect } from 'vitest';
import { buildDesignSpec } from './buildDesignSpec';
import { buildFigmaInstructionSet } from './buildFigmaInstructionSet';
import type { CodeModel } from '../models/CodeModel';
import type { FigmaSyncConfig } from '../config/schema';
import { zFigmaInstructionSet } from '../models/FigmaInstructionSet';

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

describe('buildFigmaInstructionSet', () => {
  it('creates a set of operations to materialize the DesignSpec in Figma', () => {
    const designSpec = buildDesignSpec(codeModel, config);
    const instructions = buildFigmaInstructionSet(designSpec);

    // Validate against schema
    const parsed = zFigmaInstructionSet.parse(instructions);
    expect(parsed.version).toBe('1.0');

    const createPageOps = parsed.operations.filter((op) => op.type === 'CreatePage');
    expect(createPageOps.map((op) => op.name)).toEqual([
      'System/Primitives',
      'System/Patterns',
      'App/Screens',
    ]);

    const createVarCollectionOps = parsed.operations.filter(
      (op) => op.type === 'CreateVariableCollection',
    );
    expect(createVarCollectionOps[0]?.name).toBe('Colors');

    const createVarOps = parsed.operations.filter((op) => op.type === 'CreateVariable');
    expect(createVarOps[0]?.name).toBe('--primary');

    const createComponentOps = parsed.operations.filter(
      (op) => op.type === 'CreateComponent',
    );
    expect(createComponentOps[0]?.name).toBe('Button');

    const createScreenFrameOps = parsed.operations.filter(
      (op) => op.type === 'CreateScreenFrame',
    );
    expect(createScreenFrameOps[0]?.screenId).toBe(designSpec.screens[0].id);
  });
});

