/**
 * Centralized prompt management for LLM tasks
 */

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  userPromptTemplate: (context: any) => string;
  version: string;
}

export interface ComponentEnrichmentContext {
  component: {
    id: string;
    name: string;
    category: 'primitive' | 'pattern';
  };
  codeData: {
    props: Array<{ name: string; type: string; optional: boolean; defaultValue?: string }>;
    tailwindClasses: string[];
    usageExamples: Array<{ filePath: string; snippet: string }>;
  };
  sourceCode: string;
  designSystemContext: {
    availableTokens: {
      colors: string[];
      spacing: string[];
      radii: string[];
    };
    otherComponents: string[];
  };
}

/**
 * Component enrichment prompt template
 * Analyzes component source code to infer variants, slots, and states
 */
export const COMPONENT_ENRICHMENT_PROMPT: PromptTemplate = {
  id: 'component-enrichment',
  name: 'Component Enrichment',
  description: 'Analyzes React components to infer variants, slots, and example states for Figma import',
  version: '2.0.0',
  systemPrompt: `You are an expert at analyzing React component code and preparing components for Figma design system import.

Your task is to analyze a React component and extract design properties that Figma needs:

1. VARIANT PROPS - Props that change visual appearance/style
   - Look for class-variance-authority (cva) variant definitions
   - Look for conditional className logic based on props
   - Look for TypeScript union types that represent visual variants
   - Common patterns: variant, size, color, disabled, loading, state
   - These will become Figma component variants

2. SLOT PROPS - Props that accept React nodes/components
   - Look for props typed as ReactNode, ReactElement, JSX.Element, or similar
   - Look for props that render children or sub-components
   - Common patterns: icon, leftSection, rightSection, children, prefix, suffix
   - These will become Figma component slots

3. EXAMPLE VARIANTS - Representative combinations to showcase in Figma
   - Create 3-5 realistic examples that demonstrate the component's flexibility
   - Cover common use cases and important variant combinations
   - Include edge cases (disabled, loading, error states) if applicable
   - Use descriptive names that explain what the example shows

Focus on extracting information that helps designers understand and use the component in Figma.

Return valid JSON only, no markdown formatting.`,

  userPromptTemplate: (context: ComponentEnrichmentContext) => {
    const { component, codeData, sourceCode, designSystemContext } = context;

    let prompt = `Analyze this React component for Figma design system import:

COMPONENT INFORMATION:
- Name: ${component.name}
- Category: ${component.category}
- ID: ${component.id}

SOURCE CODE:
\`\`\`typescript
${sourceCode}
\`\`\`

STATIC ANALYSIS DATA:`;

    if (codeData.props.length > 0) {
      prompt += `
- Props Found: ${codeData.props.map(p => `${p.name}${p.optional ? '?' : ''}: ${p.type}${p.defaultValue ? ` = ${p.defaultValue}` : ''}`).join(', ')}`;
    }

    if (codeData.tailwindClasses.length > 0) {
      prompt += `
- Tailwind Classes: ${codeData.tailwindClasses.slice(0, 20).join(', ')}${codeData.tailwindClasses.length > 20 ? '...' : ''}`;
    }

    if (codeData.usageExamples.length > 0) {
      prompt += `
- Usage Examples Found: ${codeData.usageExamples.length} example(s) in codebase`;
    }

    prompt += `

DESIGN SYSTEM CONTEXT:`;

    if (designSystemContext.availableTokens.colors.length > 0) {
      prompt += `
- Available Color Tokens: ${designSystemContext.availableTokens.colors.slice(0, 10).join(', ')}${designSystemContext.availableTokens.colors.length > 10 ? '...' : ''}`;
    }

    if (designSystemContext.availableTokens.spacing.length > 0) {
      prompt += `
- Available Spacing Tokens: ${designSystemContext.availableTokens.spacing.slice(0, 10).join(', ')}${designSystemContext.availableTokens.spacing.length > 10 ? '...' : ''}`;
    }

    if (designSystemContext.otherComponents.length > 0) {
      prompt += `
- Other Components in System: ${designSystemContext.otherComponents.slice(0, 15).join(', ')}${designSystemContext.otherComponents.length > 15 ? '...' : ''}`;
    }

    prompt += `

TASK:
Extract the design properties needed for Figma import.

Return a JSON object with this structure:
{
  "propsModel": {
    "variantProps": [
      {
        "name": "variant",
        "values": ["default", "destructive", "outline"],
        "defaultValue": "default"
      },
      {
        "name": "size",
        "values": ["sm", "md", "lg"],
        "defaultValue": "md"
      }
    ],
    "slotProps": [
      {
        "name": "icon",
        "description": "Optional icon element displayed before the text"
      },
      {
        "name": "children",
        "description": "Main content of the component"
      }
    ]
  },
  "exampleVariants": [
    {
      "name": "Default button",
      "props": { "variant": "default", "size": "md" }
    },
    {
      "name": "Small destructive button",
      "props": { "variant": "destructive", "size": "sm" }
    },
    {
      "name": "Large outline button",
      "props": { "variant": "outline", "size": "lg" }
    }
  ],
  "figmaMetadata": {
    "shouldCreateVariants": true,
    "recommendedLayout": "grid",
    "notes": "Optional notes about the component for designers"
  }
}

IMPORTANT RULES:
1. Only include props that actually exist in the component source code
2. For variantProps:
   - Extract values from cva() variant definitions (most reliable)
   - Look for TypeScript union types (e.g., variant: "default" | "destructive")
   - Look for conditional className logic
   - Values array must contain only strings
   - Include defaultValue if one is specified in the code
3. For slotProps:
   - Only include props that accept React nodes (ReactNode, ReactElement, JSX.Element)
   - Provide clear descriptions of what each slot is for
   - Common slot props: children, icon, leftSection, rightSection, prefix, suffix
4. For exampleVariants:
   - Create 3-5 realistic examples
   - Cover different variant combinations
   - Include edge cases if relevant (disabled, loading, error states)
   - All prop values MUST be strings or booleans (e.g., "md", "true", not objects or arrays)
   - Use descriptive names that explain what the example demonstrates
5. For figmaMetadata:
   - Set shouldCreateVariants to true if the component has multiple visual variants
   - Suggest "grid" layout for components with many variants, "horizontal" for simple ones
   - Add notes if there are important design considerations

Return ONLY valid JSON, no markdown formatting or code blocks.`;

    return prompt;
  },
};

/**
 * Prompt registry
 */
export const PROMPTS: Record<string, PromptTemplate> = {
  'component-enrichment': COMPONENT_ENRICHMENT_PROMPT,
};

/**
 * Get a prompt template by ID
 */
export function getPromptTemplate(id: string): PromptTemplate | undefined {
  return PROMPTS[id];
}

/**
 * Load a custom prompt template from a file path
 * (For future implementation - allows users to override prompts)
 */
export async function loadCustomPrompt(
  filePath: string,
): Promise<PromptTemplate | null> {
  // TODO: Implement custom prompt loading
  // For now, return null
  return null;
}

/**
 * Format a prompt with context
 */
export function formatPrompt(
  template: PromptTemplate,
  context: any,
): { system: string; user: string } {
  return {
    system: template.systemPrompt,
    user: template.userPromptTemplate(context),
  };
}

