import { z } from 'zod';
import type { CodeModel } from '../models/CodeModel';
import {
  DesignComponentSpec,
  zDesignComponentPropsModel,
} from '../models/DesignSpec';
import type { LLMClient } from '../llm/types';
import { COMPONENT_ENRICHMENT_PROMPT, formatPrompt, type ComponentEnrichmentContext } from '../prompts';

const zLlmExampleVariant = z.object({
  name: z.string(),
  // Accept any JSON value for props, then we'll coerce to string/boolean
  props: z.record(z.any()).transform((props) => {
    // Coerce all values to string or boolean
    const coerced: Record<string, string | boolean> = {};
    for (const [key, value] of Object.entries(props)) {
      if (typeof value === 'boolean') {
        coerced[key] = value;
      } else if (typeof value === 'string') {
        coerced[key] = value;
      } else if (typeof value === 'number') {
        coerced[key] = String(value);
      } else if (value === null || value === undefined) {
        // Skip null/undefined values
        continue;
      } else {
        // For objects/arrays, stringify them
        coerced[key] = JSON.stringify(value);
      }
    }
    return coerced;
  }),
});

const zFigmaMetadata = z.object({
  shouldCreateVariants: z.boolean().optional(),
  recommendedLayout: z.enum(['grid', 'horizontal', 'vertical']).optional(),
  notes: z.string().optional(),
}).optional();

const zLlmComponentEnrichment = z.object({
  propsModel: z.object({
    variantProps: z.array(
      z.object({
        name: z.string(),
        // Accept any array and coerce to string array
        values: z.array(z.any()).transform((values) =>
          values.map((v) => typeof v === 'string' ? v : String(v))
        ),
        defaultValue: z.string().optional(),
      }),
    ),
    slotProps: z.array(
      z.object({
        name: z.string(),
        description: z.string().optional(),
      }),
    ),
  }),
  exampleVariants: z.array(zLlmExampleVariant),
  figmaMetadata: zFigmaMetadata,
});

export type LlmComponentEnrichment = z.infer<typeof zLlmComponentEnrichment>;

/**
 * Enrich a single component with LLM analysis
 */
async function enrichSingleComponent(
  component: DesignComponentSpec,
  codeModel: CodeModel,
  llm: LLMClient,
  readFile?: (filePath: string) => Promise<string>,
): Promise<DesignComponentSpec> {
  // Find the component in the code model
  const codeComponent = codeModel.components.find((c) => c.name === component.name);
  if (!codeComponent) {
    // Component not found in code model, return as-is
    return component;
  }

  // Try to read the source file if readFile is provided
  let sourceCode: string;
  if (readFile) {
    try {
      sourceCode = await readFile(codeComponent.sourceFile);
    } catch (error) {
      // If we can't read the file, use a simplified context
      sourceCode = `// Component: ${component.name}\n// File: ${codeComponent.sourceFile}\n// Props: ${codeComponent.props.map((p) => `${p.name}: ${p.type}`).join(', ')}\n// Tailwind classes: ${codeComponent.tailwindClasses.join(' ')}`;
    }
  } else {
    // No readFile function provided, use simplified context
    sourceCode = `// Component: ${component.name}\n// File: ${codeComponent.sourceFile}\n// Props: ${codeComponent.props.map((p) => `${p.name}: ${p.type}`).join(', ')}\n// Tailwind classes: ${codeComponent.tailwindClasses.join(' ')}`;
  }

  // Build enhanced context with component skeleton, code data, and design system context
  const context: ComponentEnrichmentContext = {
    component: {
      id: component.id,
      name: component.name,
      category: component.category,
    },
    codeData: {
      props: codeComponent.props,
      tailwindClasses: codeComponent.tailwindClasses,
      usageExamples: codeComponent.usageExamples,
    },
    sourceCode,
    designSystemContext: {
      availableTokens: {
        colors: codeModel.tokens.colors.map((t) => t.name),
        spacing: codeModel.tokens.spacing.map((t) => t.name),
        radii: codeModel.tokens.radii.map((t) => t.name),
      },
      otherComponents: codeModel.components
        .filter((c) => c.name !== component.name)
        .map((c) => c.name),
    },
  };

  // Format the prompt using the centralized template
  const { system, user } = formatPrompt(COMPONENT_ENRICHMENT_PROMPT, context);

  try {
    // Generate enrichment with LLM
    const enrichment = await llm.generateJSON(user, zLlmComponentEnrichment, {
      systemPrompt: system,
    });

    // Convert enrichment to propsModel format
    const propsModel = {
      variantProps: enrichment.propsModel.variantProps.map((vp) => ({
        name: vp.name,
        type: 'enum' as const,
        values: vp.values,
      })),
      slotProps: enrichment.propsModel.slotProps,
    };

    // Build enriched component
    const enrichedComponent: DesignComponentSpec = {
      ...component,
      propsModel,
      exampleVariants: enrichment.exampleVariants.map((ex, index) => ({
        id: `${component.id}-ex-${index}`,
        name: ex.name,
        props: ex.props,
      })),
    };

    // Log figma metadata if provided (for debugging/future use)
    if (enrichment.figmaMetadata) {
      // Could store this in the component or use it for layout decisions
      // For now, just log it
      if (enrichment.figmaMetadata.notes) {
        console.log(`[${component.name}] Figma notes: ${enrichment.figmaMetadata.notes}`);
      }
    }

    return enrichedComponent;
  } catch (error) {
    // If LLM fails, return component as-is
    console.error(`Failed to enrich component ${component.name}:`, error);
    return component;
  }
}

/**
 * Enrich multiple components with LLM analysis
 * Processes components one at a time to provide better context
 */
export async function enrichDesignComponentsWithLLM(
  codeModel: CodeModel,
  baseComponents: DesignComponentSpec[],
  llm: LLMClient,
  readFile?: (filePath: string) => Promise<string>,
): Promise<DesignComponentSpec[]> {
  if (baseComponents.length === 0) return baseComponents;

  // Process components sequentially to avoid rate limits and provide better context
  const enrichedComponents: DesignComponentSpec[] = [];

  for (const component of baseComponents) {
    const enriched = await enrichSingleComponent(component, codeModel, llm, readFile);
    enrichedComponents.push(enriched);
  }

  return enrichedComponents;
}

