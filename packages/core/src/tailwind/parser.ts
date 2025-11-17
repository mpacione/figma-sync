/**
 * Tailwind utility parser
 * Parses individual Tailwind classes and extracts their properties
 */

import { DEFAULT_SPACING, DEFAULT_BORDER_RADIUS, DEFAULT_FONT_SIZE, DEFAULT_FONT_WEIGHT } from './config';

export interface ParsedSpacing {
  type: 'padding' | 'margin' | 'gap' | 'space';
  side?: 'left' | 'right' | 'top' | 'bottom' | 'x' | 'y' | 'all';
  value: number;
}

export interface ParsedSizing {
  type: 'width' | 'height' | 'size' | 'min-width' | 'max-width' | 'min-height' | 'max-height';
  value: number | 'auto' | 'full';
}

export interface ParsedTypography {
  type: 'font-size' | 'font-weight' | 'line-height' | 'letter-spacing';
  value: number | string;
}

export interface ParsedBorder {
  type: 'border-radius' | 'border-width';
  side?: 'left' | 'right' | 'top' | 'bottom' | 'all';
  value: number;
}

export interface ParsedLayout {
  type: 'display' | 'flex-direction' | 'align-items' | 'justify-content' | 'align-self';
  value: string;
}

/**
 * Parse spacing utilities: p-*, px-*, py-*, pt-*, pr-*, pb-*, pl-*, m-*, gap-*, space-*
 */
export function parseSpacing(className: string): ParsedSpacing | null {
  // Padding
  const paddingMatch = className.match(/^p([xytbrl]?)-(.+)$/);
  if (paddingMatch) {
    const [, side, value] = paddingMatch;
    const sideMap: Record<string, ParsedSpacing['side']> = {
      '': 'all',
      'x': 'x',
      'y': 'y',
      't': 'top',
      'b': 'bottom',
      'l': 'left',
      'r': 'right',
    };
    const numValue = DEFAULT_SPACING[value];
    if (numValue !== undefined) {
      return { type: 'padding', side: sideMap[side], value: numValue };
    }
  }

  // Gap
  const gapMatch = className.match(/^gap-(.+)$/);
  if (gapMatch) {
    const value = DEFAULT_SPACING[gapMatch[1]];
    if (value !== undefined) {
      return { type: 'gap', value };
    }
  }

  return null;
}

/**
 * Parse sizing utilities: w-*, h-*, size-*, min-w-*, max-w-*, min-h-*, max-h-*
 */
export function parseSizing(className: string): ParsedSizing | null {
  // Width
  const widthMatch = className.match(/^w-(.+)$/);
  if (widthMatch) {
    const value = widthMatch[1];
    if (value === 'full') return { type: 'width', value: 'full' };
    if (value === 'auto') return { type: 'width', value: 'auto' };
    const numValue = DEFAULT_SPACING[value];
    if (numValue !== undefined) return { type: 'width', value: numValue };
  }

  // Height
  const heightMatch = className.match(/^h-(.+)$/);
  if (heightMatch) {
    const value = heightMatch[1];
    if (value === 'full') return { type: 'height', value: 'full' };
    if (value === 'auto') return { type: 'height', value: 'auto' };
    const numValue = DEFAULT_SPACING[value];
    if (numValue !== undefined) return { type: 'height', value: numValue };
  }

  // Size (width and height)
  const sizeMatch = className.match(/^size-(.+)$/);
  if (sizeMatch) {
    const numValue = DEFAULT_SPACING[sizeMatch[1]];
    if (numValue !== undefined) return { type: 'size', value: numValue };
  }

  return null;
}

/**
 * Parse typography utilities: text-*, font-*, leading-*, tracking-*
 */
export function parseTypography(className: string): ParsedTypography | null {
  // Font size
  const fontSizeMatch = className.match(/^text-(.+)$/);
  if (fontSizeMatch) {
    const value = DEFAULT_FONT_SIZE[fontSizeMatch[1]];
    if (value !== undefined) return { type: 'font-size', value };
  }

  // Font weight
  const fontWeightMatch = className.match(/^font-(.+)$/);
  if (fontWeightMatch) {
    const value = DEFAULT_FONT_WEIGHT[fontWeightMatch[1]];
    if (value !== undefined) return { type: 'font-weight', value };
  }

  return null;
}

/**
 * Parse border utilities: rounded-*, border-*
 */
export function parseBorder(className: string): ParsedBorder | null {
  // Border radius
  const roundedMatch = className.match(/^rounded(-(.+))?$/);
  if (roundedMatch) {
    const value = roundedMatch[2] || 'DEFAULT';
    const numValue = DEFAULT_BORDER_RADIUS[value];
    if (numValue !== undefined) {
      return { type: 'border-radius', side: 'all', value: numValue };
    }
  }

  // Border width
  if (className === 'border') {
    return { type: 'border-width', side: 'all', value: 1 };
  }

  return null;
}

/**
 * Parse layout utilities: flex, inline-flex, grid, items-*, justify-*, self-*
 */
export function parseLayout(className: string): ParsedLayout | null {
  // Display
  if (className === 'flex') return { type: 'display', value: 'flex' };
  if (className === 'inline-flex') return { type: 'display', value: 'inline-flex' };
  if (className === 'grid') return { type: 'display', value: 'grid' };

  // Align items
  const alignItemsMatch = className.match(/^items-(.+)$/);
  if (alignItemsMatch) {
    return { type: 'align-items', value: alignItemsMatch[1] };
  }

  // Justify content
  const justifyMatch = className.match(/^justify-(.+)$/);
  if (justifyMatch) {
    return { type: 'justify-content', value: justifyMatch[1] };
  }

  return null;
}

