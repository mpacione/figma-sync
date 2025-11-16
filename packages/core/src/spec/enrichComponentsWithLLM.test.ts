import { describe, it, expect } from 'vitest';
import { enrichDesignComponentsWithLLM } from './enrichComponentsWithLLM';
import { buildDesignSpec } from './buildDesignSpec';
import type { CodeModel } from '../models/CodeModel';
import type { FigmaSyncConfig } from '../config/schema';
import type { LLMClient, LLMGenerateOptions } from '../llm/types';

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
  screens: [],
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

function createFakeLLM(result: unknown): LLMClient {
  return {
    async generate(_prompt: string, _options?: LLMGenerateOptions): Promise<string> {
      return JSON.stringify(result);
    },
    async generateJSON<T>(_prompt: string, _schema: any): Promise<T> {
      return result as T;
    },
  };
}

describe('enrichDesignComponentsWithLLM', () => {
  it('merges LLM-provided props and example variants into components', async () => {
    const baseSpec = buildDesignSpec(codeModel, config);

    const llmResult = {
      components: [
        {
          name: 'Button',
          propsModel: {
            variantProps: [
              { name: 'variant', type: 'enum', values: ['primary', 'secondary'] },
              { name: 'disabled', type: 'boolean' },
            ],
            slotProps: [{ name: 'icon' }],
          },
          exampleVariants: [
            {
              name: 'Primary',
              props: { variant: 'primary', disabled: false },
            },
          ],
        },
      ],
    };

    const llm = createFakeLLM(llmResult);

    const enriched = await enrichDesignComponentsWithLLM(
      codeModel,
      baseSpec.components,
      llm,
    );

    expect(enriched).toHaveLength(1);
    const button = enriched[0];

    expect(button.propsModel.variantProps).toEqual(llmResult.components[0].propsModel.variantProps);
    expect(button.exampleVariants[0].name).toBe('Primary');
    expect(button.exampleVariants[0].props).toEqual(
      llmResult.components[0].exampleVariants[0].props,
    );
    expect(button.exampleVariants[0].id).toMatch(/^component-0-ex-0$/);
  });

  it('returns base components when LLM provides no matching entries', async () => {
    const baseSpec = buildDesignSpec(codeModel, config);
    const llm = createFakeLLM({ components: [] });

    const enriched = await enrichDesignComponentsWithLLM(
      codeModel,
      baseSpec.components,
      llm,
    );

    expect(enriched).toEqual(baseSpec.components);
  });
});

