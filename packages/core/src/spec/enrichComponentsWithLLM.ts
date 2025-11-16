import { z } from 'zod';
import type { CodeModel } from '../models/CodeModel';
import {
  DesignComponentSpec,
  zDesignComponentPropsModel,
} from '../models/DesignSpec';
import type { LLMClient } from '../llm/types';

const zLlmExampleVariant = z.object({
  name: z.string(),
  props: z.record(z.union([z.string(), z.boolean()])),
});

const zLlmComponentEnrichment = z.object({
  name: z.string(),
  propsModel: zDesignComponentPropsModel,
  exampleVariants: z.array(zLlmExampleVariant),
});

const zLlmComponentsEnrichmentResponse = z.object({
  components: z.array(zLlmComponentEnrichment),
});

export type LlmComponentsEnrichmentResponse = z.infer<
  typeof zLlmComponentsEnrichmentResponse
>;

function buildComponentEnrichmentPrompt(codeModel: CodeModel): string {
  const summary = {
    project: codeModel.projectMeta,
    components: codeModel.components.map((c) => ({
      name: c.name,
      kind: c.kind,
      tailwindClasses: c.tailwindClasses,
    })),
  };

  return [
    'You are helping map React UI components to Figma components.',
    'For each component, infer useful design-level variant props, slot props,',
    'and a small set of example variants for documentation.',
    '',
    'Respond ONLY with JSON matching this TypeScript type:',
    '  {',
    '    "components": [',
    '      {',
    '        "name": string,',
    '        "propsModel": {',
    '          "variantProps": { name: string; type: "boolean" | "enum"; values?: string[] }[],',
    '          "slotProps": { name: string; description?: string }[]',
    '        },',
    '        "exampleVariants": { name: string; props: Record<string, string | boolean> }[]',
    '      }',
    '    ]',
    '  }',
    '',
    'Components to analyse:',
    JSON.stringify(summary, null, 2),
  ].join('\n');
}

export async function enrichDesignComponentsWithLLM(
  codeModel: CodeModel,
  baseComponents: DesignComponentSpec[],
  llm: LLMClient,
): Promise<DesignComponentSpec[]> {
  if (baseComponents.length === 0) return baseComponents;

  const prompt = buildComponentEnrichmentPrompt(codeModel);
  const response = await llm.generateJSON(prompt, zLlmComponentsEnrichmentResponse);

  const byName = new Map<string, z.infer<typeof zLlmComponentEnrichment>>();
  for (const entry of response.components) {
    byName.set(entry.name, entry);
  }

  return baseComponents.map((component) => {
    const enrichment = byName.get(component.name);
    if (!enrichment) return component;

    return {
      ...component,
      propsModel: enrichment.propsModel,
      exampleVariants: enrichment.exampleVariants.map((ex, index) => ({
        id: `${component.id}-ex-${index}`,
        name: ex.name,
        props: ex.props,
      })),
    };
  });
}

