import { CssSourceFile } from './sources';
import {
  CodeColorToken,
  CodeColorValue,
  NumericToken,
  CodeTypographyToken,
} from '../models/CodeModel';

const CSS_VAR_DECL_RE = /--([a-zA-Z0-9-_]+)\s*:\s*([^;]+);/g;
const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const NUMERIC_VALUE_RE = /^(-?\d*\.?\d+)([a-zA-Z%]+)?$/;

function parseColorValue(raw: string): CodeColorValue | null {
  const value = raw.trim();
  if (!HEX_COLOR_RE.test(value)) return null;
  return { hex: value.toLowerCase() };
}

function parseNumericValue(raw: string): { value: number; unit: string } | null {
  const value = raw.trim();
  const match = NUMERIC_VALUE_RE.exec(value);
  if (!match) return null;
  const num = Number(match[1]);
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

export function extractCssColorTokens(source: CssSourceFile): CodeColorToken[] {
  const tokens: CodeColorToken[] = [];
  const text = source.content;

  CSS_VAR_DECL_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = CSS_VAR_DECL_RE.exec(text)) !== null) {
    const [, rawName, rawValue] = match;
    const color = parseColorValue(rawValue);
    if (!color) continue;

    const { line, column } = computePosition(text, match.index);

    tokens.push({
      name: `--${rawName}`,
      source: 'css-variable',
      value: color,
      darkModeValue: undefined,
      usageCount: 0,
      locations: [
        {
          filePath: source.filePath,
          line,
          column,
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
  CSS_VAR_DECL_RE.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = CSS_VAR_DECL_RE.exec(text)) !== null) {
    const [, rawName, rawValue] = match;
    const numeric = parseNumericValue(rawValue);
    if (!numeric) continue;

    const name = `--${rawName}`;
    const lowerName = rawName.toLowerCase();
    const { line, column } = computePosition(text, match.index);

    const filePosition = {
      filePath: source.filePath,
      line,
      column,
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
