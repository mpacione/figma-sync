"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const cssTokens_1 = require("./cssTokens");
(0, vitest_1.describe)('extractCssColorTokens', () => {
    (0, vitest_1.it)('extracts CSS variable color tokens with positions', () => {
        const css = `:root {\n  --primary: #ffffff;\n  --radius-sm: 4px;\n}`;
        const tokens = (0, cssTokens_1.extractCssColorTokens)({
            filePath: 'src/styles/tokens.css',
            content: css,
        });
        (0, vitest_1.expect)(tokens).toHaveLength(1);
        (0, vitest_1.expect)(tokens[0]).toMatchObject({
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
    (0, vitest_1.it)('skips non-color CSS variables', () => {
        const css = `:root {\n  --radius-sm: 4px;\n}`;
        const tokens = (0, cssTokens_1.extractCssColorTokens)({
            filePath: 'src/styles/tokens.css',
            content: css,
        });
        (0, vitest_1.expect)(tokens).toHaveLength(0);
    });
});
(0, vitest_1.describe)('extractCssDesignTokens', () => {
    (0, vitest_1.it)('classifies numeric CSS variables into radii, spacing, and typography buckets', () => {
        const css = `:root {\n  --radius-sm: 4px;\n  --space-md: 8px;\n  --font-size-body: 16px;\n  --primary: #ffffff;\n}`;
        const tokens = (0, cssTokens_1.extractCssDesignTokens)({
            filePath: 'src/styles/tokens.css',
            content: css,
        });
        (0, vitest_1.expect)(tokens.radii).toHaveLength(1);
        (0, vitest_1.expect)(tokens.radii[0]).toMatchObject({
            name: '--radius-sm',
            value: 4,
            unit: 'px',
        });
        (0, vitest_1.expect)(tokens.spacing).toHaveLength(1);
        (0, vitest_1.expect)(tokens.spacing[0]).toMatchObject({
            name: '--space-md',
            value: 8,
            unit: 'px',
        });
        (0, vitest_1.expect)(tokens.typography).toHaveLength(1);
        (0, vitest_1.expect)(tokens.typography[0]).toMatchObject({
            name: '--font-size-body',
            fontFamily: 'system-ui',
            fontSize: 16,
        });
    });
});
