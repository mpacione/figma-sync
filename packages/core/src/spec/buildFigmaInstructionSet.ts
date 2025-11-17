import type { DesignSpec, DesignComponentSpec } from '../models/DesignSpec';
import type { CodeModel } from '../models/CodeModel';
import { FigmaInstructionSet, FigmaOperation } from '../models/FigmaInstructionSet';
import { mapTailwindToFigma } from '../tailwind/mapper';

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
  codeModel: CodeModel,
): any {
  // Find the corresponding CodeComponent to get Tailwind classes
  const codeComponent = codeModel.components.find(
    (c) => c.name === component.sourceComponentName
  );

  // Combine Tailwind classes: base + variant-specific + size-specific
  const tailwindClasses: string[] = [];

  if (codeComponent?.tailwindClassesStructured) {
    const structured = codeComponent.tailwindClassesStructured;

    // Add base classes
    tailwindClasses.push(...structured.base);

    // Add variant-specific classes
    Object.entries(variantProps).forEach(([propName, propValue]) => {
      const variantClasses = structured.variants[propName]?.[String(propValue)];
      if (variantClasses) {
        tailwindClasses.push(...variantClasses);
      }
    });
  }

  // Map Tailwind classes to Figma properties
  const visualProps = mapTailwindToFigma(tailwindClasses, spec);

  // Initialize arrays for fills and strokes
  visualProps.fills = visualProps.fills || [];
  visualProps.strokes = visualProps.strokes || [];

  // Initialize text properties
  visualProps.textProperties = {
    fontFamily: visualProps.fontFamily || 'Inter',
    fontWeight: visualProps.fontWeight || 500,
    fontSize: visualProps.fontSize || 14,
  };

  // Map variant to colors from design tokens
  // This handles color mapping for components that use semantic color names
  const variant = variantProps.variant as string | undefined;
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

  // Set background fill and determine text color
  if (colors.bg !== 'transparent') {
    const bgVar = findColorVariable(colors.bg);
    if (bgVar) {
      const bgColor = hexToFigmaColor(bgVar.modeValues.default as string);
      visualProps.fills.push({
        type: 'SOLID',
        color: bgColor,
      });

      // Determine text color based on background brightness
      const brightness = (bgColor.r + bgColor.g + bgColor.b) / 3;
      visualProps.textProperties.textColor = brightness > 0.5
        ? { r: 0, g: 0, b: 0 } // Black text on light background
        : { r: 1, g: 1, b: 1 }; // White text on dark background
    }
  } else {
    // For transparent backgrounds, use foreground color
    const fgVar = findColorVariable(colors.fg);
    if (fgVar) {
      const fgColor = hexToFigmaColor(fgVar.modeValues.default as string);
      visualProps.textProperties.textColor = fgColor;
    }
  }

  // Set border stroke for outline variant (if not already set by Tailwind)
  if (colors.border && visualProps.strokes.length === 0) {
    const borderVar = findColorVariable(colors.border);
    if (borderVar) {
      const borderColor = hexToFigmaColor(borderVar.modeValues.default as string);
      visualProps.strokes.push({
        type: 'SOLID',
        color: borderColor,
      });
      if (!visualProps.strokeWeight) {
        visualProps.strokeWeight = 1;
      }
    }
  }

  // Get corner radius from design tokens if not set by Tailwind
  if (!visualProps.cornerRadius) {
    const radiusVar = spec.variables.variables.find(
      (v) => v.name === '--radius' && v.type === 'FLOAT'
    );
    if (radiusVar) {
      // Convert rem to pixels (assuming 1rem = 16px)
      visualProps.cornerRadius = (radiusVar.modeValues.default as number) * 16;
    }
  }

  return visualProps;
}

/**
 * Calculate grid positions for components to avoid overlaps
 * Groups component sets together and arranges them in a grid
 */
function calculateGridPositions(components: any[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();

  const GRID_SPACING = 100; // Space between components
  const COMPONENT_WIDTH = 300; // Estimated component width
  const COMPONENT_HEIGHT = 200; // Estimated component height
  const COLUMNS = 4; // Number of columns in grid

  let currentRow = 0;
  let currentCol = 0;

  components.forEach((component) => {
    const x = currentCol * (COMPONENT_WIDTH + GRID_SPACING);
    const y = currentRow * (COMPONENT_HEIGHT + GRID_SPACING);

    positions.set(component.id, { x, y });

    // Move to next position
    currentCol++;
    if (currentCol >= COLUMNS) {
      currentCol = 0;
      currentRow++;
    }
  });

  return positions;
}

export function buildFigmaInstructionSet(
  spec: DesignSpec,
  codeModel: CodeModel,
): FigmaInstructionSet {
  const operations: FigmaOperation[] = [];
  let opCounter = 0;
  const nextOpId = () => `op-${(opCounter += 1)}`;

  // Calculate grid positions for all components
  const componentPositions = calculateGridPositions(spec.components);

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
    const position = componentPositions.get(component.id) || { x: 0, y: 0 };

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
          codeModel,
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

      // Create component set to combine all variants with position
      operations.push({
        id: nextOpId(),
        type: 'CreateComponentSet',
        componentSetId: component.id,
        componentIds,
        x: position.x,
        y: position.y,
      });
    } else {
      // Create a single component (no variants) with position
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
        codeModel,
      );

      operations.push({
        id: nextOpId(),
        type: 'CreateComponent',
        componentId: component.id,
        designComponentId: component.id,
        pageId: pageId ?? 'page-default',
        name: component.name,
        visualProperties,
        x: position.x,
        y: position.y,
      });
    }
  });

  // Screens
  const screensPageEntry = spec.pages.find((p) => p.kind === 'screens');
  const screensPageId = screensPageEntry
    ? pageNameToId.get(screensPageEntry.name)
    : undefined;

  const SCREEN_WIDTH = 1440;
  const SCREEN_HEIGHT = 900;
  const SCREEN_SPACING = 200;
  const SCREENS_PER_ROW = 3;

  spec.screens.forEach((screen, index) => {
    if (!screensPageId) return;

    // Calculate grid position for screens
    const col = index % SCREENS_PER_ROW;
    const row = Math.floor(index / SCREENS_PER_ROW);
    const x = col * (SCREEN_WIDTH + SCREEN_SPACING);
    const y = row * (SCREEN_HEIGHT + SCREEN_SPACING);

    // Find the corresponding CodeScreen to get component count
    const codeScreen = codeModel.screens.find(
      (cs) => cs.route === screen.route
    );

    operations.push({
      id: nextOpId(),
      type: 'CreateScreenFrame',
      frameId: `frame-${screen.id}`,
      pageId: screensPageId,
      screenId: screen.id,
      name: screen.name,
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
      x,
      y,
      description: codeScreen?.description,
      componentCount: codeScreen?.usesComponents.length || 0,
    });
  });

  return { version: '1.0', operations };
}

