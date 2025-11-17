import type { DesignSpec, DesignComponentSpec } from '../models/DesignSpec';
import { FigmaInstructionSet, FigmaOperation } from '../models/FigmaInstructionSet';

function slugifyName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'page';
}

/**
 * Convert hex color to Figma RGB format (0-1 range)
 */
function hexToFigmaColor(hex: string): { r: number; g: number; b: number } {
  // Remove # if present
  const cleanHex = hex.replace(/^#/, '');

  // Parse hex values
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  return { r, g, b };
}

/**
 * Generate visual properties for a component variant based on its props and design tokens
 */
function generateVisualProperties(
  component: DesignComponentSpec,
  variantProps: Record<string, string | boolean>,
  spec: DesignSpec,
): any {
  const visualProps: any = {
    fills: [],
    strokes: [],
    cornerRadius: 6, // Default
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 8,
    paddingBottom: 8,
    minWidth: 100,
    minHeight: 40,
  };

  // Get the variant value (e.g., "default", "destructive", "outline")
  const variant = variantProps.variant as string | undefined;
  const size = variantProps.size as string | undefined;

  // Map variant to colors from design tokens
  const colorMap: Record<string, { bg: string; fg: string; border?: string }> = {
    default: { bg: '--primary', fg: '--primary-foreground' },
    destructive: { bg: '--destructive', fg: '#ffffff' },
    outline: { bg: '--background', fg: '--accent-foreground', border: '--border' },
    secondary: { bg: '--secondary', fg: '--secondary-foreground' },
    ghost: { bg: 'transparent', fg: '--accent-foreground' },
    link: { bg: 'transparent', fg: '--primary' },
  };

  const colors = colorMap[variant || 'default'] || colorMap.default;

  // Find color variables in spec
  const findColorVariable = (name: string) => {
    return spec.variables.variables.find(
      (v) => v.name === name && v.type === 'COLOR'
    );
  };

  // Set background fill
  if (colors.bg !== 'transparent') {
    const bgVar = findColorVariable(colors.bg);
    if (bgVar) {
      const bgColor = hexToFigmaColor(bgVar.modeValues.default as string);
      visualProps.fills.push({
        type: 'SOLID',
        color: bgColor,
      });
    }
  }

  // Set border stroke for outline variant
  if (colors.border) {
    const borderVar = findColorVariable(colors.border);
    if (borderVar) {
      const borderColor = hexToFigmaColor(borderVar.modeValues.default as string);
      visualProps.strokes.push({
        type: 'SOLID',
        color: borderColor,
      });
      visualProps.strokeWeight = 1;
    }
  }

  // Adjust size-based properties
  if (size === 'sm') {
    visualProps.paddingLeft = 12;
    visualProps.paddingRight = 12;
    visualProps.paddingTop = 6;
    visualProps.paddingBottom = 6;
    visualProps.minHeight = 32;
  } else if (size === 'lg') {
    visualProps.paddingLeft = 24;
    visualProps.paddingRight = 24;
    visualProps.paddingTop = 10;
    visualProps.paddingBottom = 10;
    visualProps.minHeight = 44;
  } else if (size === 'icon') {
    visualProps.paddingLeft = 0;
    visualProps.paddingRight = 0;
    visualProps.paddingTop = 0;
    visualProps.paddingBottom = 0;
    visualProps.minWidth = 36;
    visualProps.minHeight = 36;
  }

  // Get corner radius from design tokens
  const radiusVar = spec.variables.variables.find(
    (v) => v.name === '--radius' && v.type === 'FLOAT'
  );
  if (radiusVar) {
    // Convert rem to pixels (assuming 1rem = 16px)
    visualProps.cornerRadius = (radiusVar.modeValues.default as number) * 16;
  }

  return visualProps;
}

export function buildFigmaInstructionSet(
  spec: DesignSpec,
): FigmaInstructionSet {
  const operations: FigmaOperation[] = [];
  let opCounter = 0;
  const nextOpId = () => `op-${(opCounter += 1)}`;

  // Pages
  const pageNameToId = new Map<string, string>();
  spec.pages.forEach((page, index) => {
    const pageId = `page-${slugifyName(page.name)}-${index}`;
    pageNameToId.set(page.name, pageId);
    operations.push({
      id: nextOpId(),
      type: 'CreatePage',
      pageId,
      name: page.name,
      kind: page.kind,
      index,
    });
  });

  // Variables
  spec.variables.collections.forEach((collection) => {
    operations.push({
      id: nextOpId(),
      type: 'CreateVariableCollection',
      collectionId: collection.id,
      name: collection.name,
    });
  });

  spec.variables.variables.forEach((variable) => {
    operations.push({
      id: nextOpId(),
      type: 'CreateVariable',
      variableId: variable.id,
      collectionId: variable.collectionId,
      name: variable.name,
      variableType: variable.type,
      modeValues: variable.modeValues,
      scopes: variable.scopes ?? [],
    });
  });

  // Components
  spec.components.forEach((component) => {
    const pageId = pageNameToId.get(component.placement.page);

    // Check if component has variants
    const hasVariants = component.propsModel.variantProps.length > 0 &&
                        component.exampleVariants.length > 1;

    if (hasVariants) {
      // Create a component set with variants
      const componentIds: string[] = [];

      // Create a component for each example variant
      component.exampleVariants.forEach((exampleVariant, index) => {
        const variantComponentId = `${component.id}-variant-${index}`;
        componentIds.push(variantComponentId);

        // Build variant name using Figma's naming convention: "Property1=value, Property2=value"
        const variantNameParts: string[] = [];
        component.propsModel.variantProps.forEach((variantProp) => {
          const propValue = exampleVariant.props[variantProp.name];
          if (propValue !== undefined) {
            // Convert boolean to string
            const valueStr = typeof propValue === 'boolean'
              ? (propValue ? 'true' : 'false')
              : String(propValue);
            variantNameParts.push(`${variantProp.name}=${valueStr}`);
          }
        });
        const variantName = variantNameParts.join(', ');

        // Generate visual properties for this variant
        const visualProperties = generateVisualProperties(
          component,
          exampleVariant.props,
          spec,
        );

        operations.push({
          id: nextOpId(),
          type: 'CreateComponent',
          componentId: variantComponentId,
          designComponentId: component.id,
          pageId: pageId ?? 'page-default',
          name: `${component.name}/${variantName}`,
          visualProperties,
        });
      });

      // Create component set to combine all variants
      operations.push({
        id: nextOpId(),
        type: 'CreateComponentSet',
        componentSetId: component.id,
        componentIds,
      });
    } else {
      // Create a single component (no variants)
      // Use default props for visual properties
      const defaultProps: Record<string, string | boolean> = {};
      component.propsModel.variantProps.forEach((variantProp) => {
        if (variantProp.values && variantProp.values.length > 0) {
          defaultProps[variantProp.name] = variantProp.values[0];
        }
      });

      const visualProperties = generateVisualProperties(
        component,
        defaultProps,
        spec,
      );

      operations.push({
        id: nextOpId(),
        type: 'CreateComponent',
        componentId: component.id,
        designComponentId: component.id,
        pageId: pageId ?? 'page-default',
        name: component.name,
        visualProperties,
      });
    }
  });

  // Screens
  const screensPageEntry = spec.pages.find((p) => p.kind === 'screens');
  const screensPageId = screensPageEntry
    ? pageNameToId.get(screensPageEntry.name)
    : undefined;

  spec.screens.forEach((screen) => {
    if (!screensPageId) return;
    operations.push({
      id: nextOpId(),
      type: 'CreateScreenFrame',
      frameId: `frame-${screen.id}`,
      pageId: screensPageId,
      screenId: screen.id,
      name: screen.name,
    });
  });

  return { version: '1.0', operations };
}

