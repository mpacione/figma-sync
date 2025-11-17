/**
 * Tailwind to Figma mapper
 * Maps Tailwind classes to Figma visual properties
 */

import { parseSpacing, parseSizing, parseTypography, parseBorder, parseLayout } from './parser';
import type { DesignSpec } from '../models/DesignSpec';

export interface FigmaVisualProperties {
  // Layout
  layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
  primaryAxisSizingMode?: 'FIXED' | 'AUTO';
  counterAxisSizingMode?: 'FIXED' | 'AUTO';
  primaryAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
  counterAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'BASELINE';

  // Spacing
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  itemSpacing?: number;

  // Sizing
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;

  // Border
  cornerRadius?: number;
  strokeWeight?: number;

  // Typography
  fontFamily?: string;
  fontWeight?: number;
  fontSize?: number;

  // Colors (filled in by color resolver)
  fills?: any[];
  strokes?: any[];
  textColor?: any;
  textProperties?: {
    fontFamily?: string;
    fontWeight?: number;
    fontSize?: number;
    textColor?: any;
  };
}

/**
 * Map Tailwind classes to Figma visual properties
 */
export function mapTailwindToFigma(
  classes: string[],
  designSpec?: DesignSpec,
): FigmaVisualProperties {
  const props: FigmaVisualProperties = {};

  // Filter out pseudo-classes and dark mode variants for now
  const staticClasses = classes.filter(
    (c) => !c.includes(':') && !c.startsWith('dark:') && !c.startsWith('[')
  );

  for (const className of staticClasses) {
    // Parse spacing
    const spacing = parseSpacing(className);
    if (spacing) {
      if (spacing.type === 'padding') {
        if (spacing.side === 'all') {
          props.paddingLeft = spacing.value;
          props.paddingRight = spacing.value;
          props.paddingTop = spacing.value;
          props.paddingBottom = spacing.value;
        } else if (spacing.side === 'x') {
          props.paddingLeft = spacing.value;
          props.paddingRight = spacing.value;
        } else if (spacing.side === 'y') {
          props.paddingTop = spacing.value;
          props.paddingBottom = spacing.value;
        } else if (spacing.side === 'left') {
          props.paddingLeft = spacing.value;
        } else if (spacing.side === 'right') {
          props.paddingRight = spacing.value;
        } else if (spacing.side === 'top') {
          props.paddingTop = spacing.value;
        } else if (spacing.side === 'bottom') {
          props.paddingBottom = spacing.value;
        }
      } else if (spacing.type === 'gap') {
        props.itemSpacing = spacing.value;
      }
    }

    // Parse sizing
    const sizing = parseSizing(className);
    if (sizing) {
      if (sizing.type === 'width' && typeof sizing.value === 'number') {
        props.width = sizing.value;
      } else if (sizing.type === 'height' && typeof sizing.value === 'number') {
        props.height = sizing.value;
      } else if (sizing.type === 'size' && typeof sizing.value === 'number') {
        props.width = sizing.value;
        props.height = sizing.value;
      }
    }

    // Parse typography
    const typography = parseTypography(className);
    if (typography) {
      if (typography.type === 'font-size' && typeof typography.value === 'number') {
        props.fontSize = typography.value;
      } else if (typography.type === 'font-weight' && typeof typography.value === 'number') {
        props.fontWeight = typography.value;
      }
    }

    // Parse border
    const border = parseBorder(className);
    if (border) {
      if (border.type === 'border-radius') {
        props.cornerRadius = border.value;
      } else if (border.type === 'border-width') {
        props.strokeWeight = border.value;
      }
    }

    // Parse layout
    const layout = parseLayout(className);
    if (layout) {
      if (layout.type === 'display') {
        if (layout.value === 'flex' || layout.value === 'inline-flex') {
          props.layoutMode = 'HORIZONTAL'; // Default to horizontal
        }
      } else if (layout.type === 'align-items') {
        if (layout.value === 'center') {
          props.counterAxisAlignItems = 'CENTER';
        } else if (layout.value === 'start') {
          props.counterAxisAlignItems = 'MIN';
        } else if (layout.value === 'end') {
          props.counterAxisAlignItems = 'MAX';
        }
      } else if (layout.type === 'justify-content') {
        if (layout.value === 'center') {
          props.primaryAxisAlignItems = 'CENTER';
        } else if (layout.value === 'start') {
          props.primaryAxisAlignItems = 'MIN';
        } else if (layout.value === 'end') {
          props.primaryAxisAlignItems = 'MAX';
        } else if (layout.value === 'between') {
          props.primaryAxisAlignItems = 'SPACE_BETWEEN';
        }
      }
    }
  }

  // Set defaults for auto-layout if layoutMode is set
  if (props.layoutMode) {
    props.primaryAxisSizingMode = props.primaryAxisSizingMode || 'AUTO';
    props.counterAxisSizingMode = props.counterAxisSizingMode || 'AUTO';
  }

  // Set default font family
  if (props.fontSize || props.fontWeight) {
    props.fontFamily = props.fontFamily || 'Inter';
  }

  return props;
}

