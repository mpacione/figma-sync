import { describe, it, expect } from 'vitest';
import { buildCodeModel } from './buildCodeModel';
import type { FigmaSyncConfig } from '../config/schema';

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

describe('buildCodeModel', () => {
  it('builds a CodeModel from provided sources', () => {
    const codeModel = buildCodeModel({
      projectMeta: {
        name: 'Test Project',
        framework: 'nextjs',
        tailwindEnabled: true,
      },
      config,
      cssFiles: [
        {
          filePath: 'src/styles/tokens.css',
          content:
            ':root { --primary: #ffffff; --radius-sm: 4px; --space-md: 8px; --font-size-body: 16px; }',
        },
      ],
      componentFiles: [
        {
          filePath: 'src/components/ui/Button.tsx',
          content: 'export function Button() { return <button className="px-2" />; }',
        },
      ],
      screenFiles: [
        {
          filePath: 'app/login/page.tsx',
          content:
            'export default function Page() { return <Button><Icon /></Button>; }',
        },
      ],
    });

    expect(codeModel.version).toBe('1.0');
    expect(codeModel.tokens.radii[0]?.name).toBe('--radius-sm');
    expect(codeModel.tokens.spacing[0]?.name).toBe('--space-md');
    expect(codeModel.tokens.typography[0]?.name).toBe('--font-size-body');

    expect(codeModel.tokens.colors[0].name).toBe('--primary');
    expect(codeModel.components.map((c) => c.name)).toEqual(['Button']);
    expect(codeModel.screens[0].route).toBe('/login');
  });
});

