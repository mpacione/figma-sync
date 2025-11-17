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

  it('extracts oklch colors', () => {
    const css = `:root {\n  --background: oklch(1 0 0);\n}`;

    const tokens = extractCssColorTokens({
      filePath: 'src/styles/tokens.css',
      content: css,
    });

    expect(tokens).toHaveLength(1);
    expect(tokens[0].name).toBe('--background');
    expect(tokens[0].value.hex).toBeDefined();
  });

  it('extracts rgb colors', () => {
    const css = `:root {\n  --accent: rgb(255, 0, 0);\n}`;

    const tokens = extractCssColorTokens({
      filePath: 'src/styles/tokens.css',
      content: css,
    });

    expect(tokens).toHaveLength(1);
    expect(tokens[0].name).toBe('--accent');
    expect(tokens[0].value.hex).toBe('#ff0000');
  });

  it('extracts hsl colors', () => {
    const css = `:root {\n  --secondary: hsl(240, 100%, 50%);\n}`;

    const tokens = extractCssColorTokens({
      filePath: 'src/styles/tokens.css',
      content: css,
    });

    expect(tokens).toHaveLength(1);
    expect(tokens[0].name).toBe('--secondary');
    expect(tokens[0].value.hex).toBeDefined();
  });

  it('resolves CSS variable references', () => {
    const css = `:root {\n  --primary: #3b82f6;\n  --color-primary: var(--primary);\n}`;

    const tokens = extractCssColorTokens({
      filePath: 'src/styles/tokens.css',
      content: css,
    });

    expect(tokens).toHaveLength(2);
    const colorPrimary = tokens.find((t) => t.name === '--color-primary');
    expect(colorPrimary).toBeDefined();
    expect(colorPrimary?.value.hex).toBe('#3b82f6');
  });

  it('extracts dark mode variants', () => {
    const css = `:root {\n  --background: #ffffff;\n}\n.dark {\n  --background: #000000;\n}`;

    const tokens = extractCssColorTokens({
      filePath: 'src/styles/tokens.css',
      content: css,
    });

    expect(tokens).toHaveLength(1);
    expect(tokens[0].name).toBe('--background');
    expect(tokens[0].value.hex).toBe('#ffffff');
    expect(tokens[0].darkModeValue?.hex).toBe('#000000');
  });

  it('extracts from @theme inline blocks', () => {
    const css = `@theme inline {\n  --color-primary: #3b82f6;\n  --color-secondary: #8b5cf6;\n}`;

    const tokens = extractCssColorTokens({
      filePath: 'src/styles/tokens.css',
      content: css,
    });

    expect(tokens).toHaveLength(2);
    expect(tokens.find((t) => t.name === '--color-primary')).toBeDefined();
    expect(tokens.find((t) => t.name === '--color-secondary')).toBeDefined();
  });

  it('resolves nested variable references', () => {
    const css = `:root {\n  --base: #3b82f6;\n  --primary: var(--base);\n  --color-primary: var(--primary);\n}`;

    const tokens = extractCssColorTokens({
      filePath: 'src/styles/tokens.css',
      content: css,
    });

    expect(tokens).toHaveLength(3);
    const colorPrimary = tokens.find((t) => t.name === '--color-primary');
    expect(colorPrimary?.value.hex).toBe('#3b82f6');
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

