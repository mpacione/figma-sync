import { CssSourceFile } from './sources';
import {
  CodeColorToken,
  CodeColorValue,
  NumericToken,
  CodeTypographyToken,
} from '../models/CodeModel';

const CSS_VAR_DECL_RE = /--([a-zA-Z0-9-_]+)\s*:\s*([^;]+);/g;
const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const OKLCH_COLOR_RE = /^oklch\(\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s*(?:\/\s*([0-9.]+%?))?\s*\)$/;
const RGB_COLOR_RE = /^rgb\(\s*(\d+)\s*,?\s*(\d+)\s*,?\s*(\d+)\s*(?:,?\s*([0-9.]+))?\s*\)$/;
const HSL_COLOR_RE = /^hsl\(\s*(\d+)\s*,?\s*(\d+)%?\s*,?\s*(\d+)%?\s*(?:,?\s*([0-9.]+))?\s*\)$/;
const NUMERIC_VALUE_RE = /^(-?\d*\.?\d+)([a-zA-Z%]+)?$/;

/**
 * Convert oklch to hex color
 * This is a simplified conversion - for production use a proper color library
 */
function oklchToHex(l: number, c: number, h: number): string {
  // Simplified conversion: just use lightness to create a grayscale approximation
  // In production, you'd want a proper oklch->srgb->hex conversion
  const gray = Math.round(l * 255);
  const hex = gray.toString(16).padStart(2, '0');
  return `#${hex}${hex}${hex}`;
}

/**
 * Convert rgb to hex color
 */
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Convert hsl to hex color
 */
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;
  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (h >= 300 && h < 360) {
    r = c;
    g = 0;
    b = x;
  }
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

function parseColorValue(raw: string): CodeColorValue | null {
  const value = raw.trim();

  // Try hex color
  if (HEX_COLOR_RE.test(value)) {
    return { hex: value.toLowerCase() };
  }

  // Try oklch color
  const oklchMatch = OKLCH_COLOR_RE.exec(value);
  if (oklchMatch) {
    const l = parseFloat(oklchMatch[1]);
    const c = parseFloat(oklchMatch[2]);
    const h = parseFloat(oklchMatch[3]);
    return { hex: oklchToHex(l, c, h) };
  }

  // Try rgb color
  const rgbMatch = RGB_COLOR_RE.exec(value);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    return { hex: rgbToHex(r, g, b) };
  }

  // Try hsl color
  const hslMatch = HSL_COLOR_RE.exec(value);
  if (hslMatch) {
    const h = parseInt(hslMatch[1], 10);
    const s = parseInt(hslMatch[2], 10);
    const l = parseInt(hslMatch[3], 10);
    return { hex: hslToHex(h, s, l) };
  }

  return null;
}

function parseNumericValue(raw: string): { value: number; unit: string } | null {
  const value = raw.trim();
  const match = NUMERIC_VALUE_RE.exec(value);
  if (!match) return null;
  const num = Number(match[1]);
  /* c8 ignore next */
  if (!Number.isFinite(num)) return null;
  const unit = match[2] ?? 'px';
  return { value: num, unit };
}

function computePosition(
  text: string,
  index: number,
): { line: number; column: number } {
  const upToIndex = text.slice(0, index);
  const lines = upToIndex.split(/\r?\n/);
  const line = lines.length; // 1-based
  const column = lines[lines.length - 1].length + 1; // 1-based
  return { line, column };
}

/**
 * Extract CSS variable name from var() reference
 */
function extractVarReference(value: string): string | null {
  const trimmed = value.trim();
  const varMatch = /^var\(\s*(--[a-zA-Z0-9-_]+)\s*(?:,\s*([^)]+))?\s*\)$/.exec(
    trimmed,
  );
  if (varMatch) {
    return varMatch[1];
  }
  return null;
}

/**
 * Build a map of all CSS variables and their raw values
 * Returns separate maps for light mode and dark mode
 */
function buildCssVariableMaps(text: string): {
  lightMode: Map<string, { value: string; line: number; column: number }>;
  darkMode: Map<string, { value: string; line: number; column: number }>;
} {
  const lightMode = new Map<
    string,
    { value: string; line: number; column: number }
  >();
  const darkMode = new Map<
    string,
    { value: string; line: number; column: number }
  >();

  // Split by selectors to identify dark mode blocks
  // Look for .dark { ... } or :root.dark { ... } blocks
  const darkBlockRegex = /(?:\.dark|:root\.dark)\s*\{([^}]+)\}/g;
  const rootBlockRegex = /:root\s*\{([^}]+)\}/g;
  const themeInlineRegex = /@theme\s+inline\s*\{([^}]+)\}/g;

  // Extract dark mode variables
  let darkMatch: RegExpExecArray | null;
  while ((darkMatch = darkBlockRegex.exec(text)) !== null) {
    const blockContent = darkMatch[1];
    const blockStart = darkMatch.index;

    CSS_VAR_DECL_RE.lastIndex = 0;
    let varMatch: RegExpExecArray | null;
    while ((varMatch = CSS_VAR_DECL_RE.exec(blockContent)) !== null) {
      const [, rawName, rawValue] = varMatch;
      const name = `--${rawName}`;
      const absoluteIndex = blockStart + darkMatch[0].indexOf(blockContent) + varMatch.index;
      const { line, column } = computePosition(text, absoluteIndex);
      darkMode.set(name, { value: rawValue.trim(), line, column });
    }
  }

  // Extract light mode (root) variables
  let rootMatch: RegExpExecArray | null;
  while ((rootMatch = rootBlockRegex.exec(text)) !== null) {
    const blockContent = rootMatch[1];
    const blockStart = rootMatch.index;

    CSS_VAR_DECL_RE.lastIndex = 0;
    let varMatch: RegExpExecArray | null;
    while ((varMatch = CSS_VAR_DECL_RE.exec(blockContent)) !== null) {
      const [, rawName, rawValue] = varMatch;
      const name = `--${rawName}`;
      const absoluteIndex = blockStart + rootMatch[0].indexOf(blockContent) + varMatch.index;
      const { line, column } = computePosition(text, absoluteIndex);
      lightMode.set(name, { value: rawValue.trim(), line, column });
    }
  }

  // Extract @theme inline variables (Tailwind v4 syntax)
  let themeMatch: RegExpExecArray | null;
  while ((themeMatch = themeInlineRegex.exec(text)) !== null) {
    const blockContent = themeMatch[1];
    const blockStart = themeMatch.index;

    CSS_VAR_DECL_RE.lastIndex = 0;
    let varMatch: RegExpExecArray | null;
    while ((varMatch = CSS_VAR_DECL_RE.exec(blockContent)) !== null) {
      const [, rawName, rawValue] = varMatch;
      const name = `--${rawName}`;
      const absoluteIndex = blockStart + themeMatch[0].indexOf(blockContent) + varMatch.index;
      const { line, column } = computePosition(text, absoluteIndex);
      // Only add if not already in lightMode (root takes precedence)
      if (!lightMode.has(name)) {
        lightMode.set(name, { value: rawValue.trim(), line, column });
      }
    }
  }

  return { lightMode, darkMode };
}

/**
 * Resolve CSS variable references recursively
 */
function resolveVarReference(
  varName: string,
  varMap: Map<string, { value: string; line: number; column: number }>,
  visited: Set<string> = new Set(),
): string | null {
  // Prevent infinite loops
  if (visited.has(varName)) {
    return null;
  }
  visited.add(varName);

  const varData = varMap.get(varName);
  if (!varData) {
    return null;
  }

  // Check if the value is itself a var() reference
  const refName = extractVarReference(varData.value);
  if (refName) {
    // Recursively resolve
    return resolveVarReference(refName, varMap, visited);
  }

  // It's a concrete value
  return varData.value;
}

export function extractCssColorTokens(source: CssSourceFile): CodeColorToken[] {
  const tokens: CodeColorToken[] = [];
  const text = source.content;

  // Build maps of all CSS variables (light and dark mode)
  const { lightMode, darkMode } = buildCssVariableMaps(text);

  // Process light mode variables
  for (const [name, varData] of lightMode.entries()) {
    // Try to resolve var() references
    let resolvedValue = varData.value;
    const refName = extractVarReference(resolvedValue);
    if (refName) {
      const resolved = resolveVarReference(refName, lightMode);
      if (resolved) {
        resolvedValue = resolved;
      } else {
        // Can't resolve, skip this token
        continue;
      }
    }

    const color = parseColorValue(resolvedValue);
    if (!color) continue;

    // Check if there's a dark mode variant
    let darkModeValue: CodeColorValue | undefined;
    const darkVarData = darkMode.get(name);
    if (darkVarData) {
      let darkResolvedValue = darkVarData.value;
      const darkRefName = extractVarReference(darkResolvedValue);
      if (darkRefName) {
        const darkResolved = resolveVarReference(darkRefName, darkMode);
        if (darkResolved) {
          darkResolvedValue = darkResolved;
        }
      }
      const darkColor = parseColorValue(darkResolvedValue);
      if (darkColor) {
        darkModeValue = darkColor;
      }
    }

    tokens.push({
      name,
      source: 'css-variable',
      value: color,
      darkModeValue,
      usageCount: 0,
      locations: [
        {
          filePath: source.filePath,
          line: varData.line,
          column: varData.column,
        },
      ],
    });
  }

  return tokens;
}

export interface ExtractedCssDesignTokens {
  radii: NumericToken[];
  spacing: NumericToken[];
  typography: CodeTypographyToken[];
}

export function extractCssDesignTokens(
  source: CssSourceFile,
): ExtractedCssDesignTokens {
  const radii: NumericToken[] = [];
  const spacing: NumericToken[] = [];
  const typography: CodeTypographyToken[] = [];

  const text = source.content;
  const { lightMode } = buildCssVariableMaps(text);

  // Process light mode variables
  for (const [name, varData] of lightMode.entries()) {
    // Try to resolve var() references
    let resolvedValue = varData.value;
    const refName = extractVarReference(resolvedValue);
    if (refName) {
      const resolved = resolveVarReference(refName, lightMode);
      if (resolved) {
        resolvedValue = resolved;
      } else {
        // Can't resolve, skip this token
        continue;
      }
    }

    const numeric = parseNumericValue(resolvedValue);
    if (!numeric) continue;

    const lowerName = name.toLowerCase();

    const filePosition = {
      filePath: source.filePath,
      line: varData.line,
      column: varData.column,
    };

    const isRadius =
      lowerName.includes('radius') || lowerName.includes('round');
    const isSpacing =
      lowerName.includes('space') ||
      lowerName.includes('spacing') ||
      lowerName.includes('gap') ||
      lowerName.includes('padding') ||
      lowerName.includes('margin');
    const isFontSize =
      lowerName.includes('font-size') || lowerName.startsWith('text-');

    if (isRadius) {
      radii.push({
        name,
        value: numeric.value,
        unit: numeric.unit,
        usageCount: 0,
        locations: [filePosition],
      });
      continue;
    }

    if (isSpacing) {
      spacing.push({
        name,
        value: numeric.value,
        unit: numeric.unit,
        usageCount: 0,
        locations: [filePosition],
      });
      continue;
    }

    if (isFontSize) {
      typography.push({
        name,
        fontFamily: 'system-ui',
        fontSize: numeric.value,
        lineHeight: undefined,
        fontWeight: undefined,
        letterSpacing: undefined,
        usageCount: 0,
        locations: [filePosition],
      });
    }
  }

  return { radii, spacing, typography };
}
