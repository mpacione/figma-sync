import { describe, it, expect } from 'vitest';
import { extractCssColorTokens, extractCssDesignTokens } from './cssTokens';

describe('extractCssColorTokens', () => {
  it('extracts CSS variable color tokens with positions', () => {
    const css = `:root {\n  --primary: #ffffff;\n  --radius-sm: 4px;\n}`;

    const tokens = extractCssColorTokens({
      filePath: 'src/styles/tokens.css',
      content: css,
    });

    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toMatchObject({
      name: '--primary',
      source: 'css-variable',
      value: { hex: '#ffffff' },
      usageCount: 0,
      locations: [
        {
          filePath: 'src/styles/tokens.css',
          line: 2,
        },
      ],
    });
  });

  it('skips non-color CSS variables', () => {
    const css = `:root {\n  --radius-sm: 4px;\n}`;

    const tokens = extractCssColorTokens({
      filePath: 'src/styles/tokens.css',
      content: css,
    });

    expect(tokens).toHaveLength(0);
  });
});

describe('extractCssDesignTokens', () => {
  it('classifies numeric CSS variables into radii, spacing, and typography buckets', () => {
    const css = `:root {\n  --radius-sm: 4px;\n  --space-md: 8px;\n  --font-size-body: 16px;\n  --primary: #ffffff;\n}`;

    const tokens = extractCssDesignTokens({
      filePath: 'src/styles/tokens.css',
      content: css,
    });

    expect(tokens.radii).toHaveLength(1);
    expect(tokens.radii[0]).toMatchObject({
      name: '--radius-sm',
      value: 4,
      unit: 'px',
    });

    expect(tokens.spacing).toHaveLength(1);
    expect(tokens.spacing[0]).toMatchObject({
      name: '--space-md',
      value: 8,
      unit: 'px',
    });

    expect(tokens.typography).toHaveLength(1);
    expect(tokens.typography[0]).toMatchObject({
      name: '--font-size-body',
      fontFamily: 'system-ui',
      fontSize: 16,
    });
  });

  it('defaults numeric unit to px when no explicit unit is given', () => {
    const css = `:root {\n  --radius-md: 10;\n}`;

    const tokens = extractCssDesignTokens({
      filePath: 'src/styles/tokens.css',
      content: css,
    });

    expect(tokens.radii).toHaveLength(1);
    expect(tokens.radii[0]).toMatchObject({
      name: '--radius-md',
      value: 10,
      unit: 'px',
    });
  });

  it('ignores numeric variables that do not match radius, spacing or font-size patterns', () => {
    const css = `:root {\n  --other-size: 12px;\n}`;

    const tokens = extractCssDesignTokens({
      filePath: 'src/styles/tokens.css',
      content: css,
    });

    expect(tokens.radii).toHaveLength(0);
    expect(tokens.spacing).toHaveLength(0);
    expect(tokens.typography).toHaveLength(0);
  });
});

