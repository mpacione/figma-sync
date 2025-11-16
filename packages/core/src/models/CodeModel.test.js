"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const CodeModel_1 = require("./CodeModel");
(0, vitest_1.describe)('zCodeModel', () => {
    const base = {
        version: '1.0',
        projectMeta: {
            name: 'Test Project',
            framework: 'nextjs',
            tailwindEnabled: true,
        },
        tokens: {
            colors: [
                {
                    name: 'primary',
                    source: 'css-variable',
                    value: { hex: '#ffffff', alpha: 1 },
                    usageCount: 1,
                    locations: [{ filePath: 'src/App.tsx', line: 1, column: 1 }],
                },
            ],
            radii: [],
            spacing: [],
            typography: [],
        },
        components: [],
        screens: [],
    };
    (0, vitest_1.it)('accepts a valid CodeModel', () => {
        const parsed = CodeModel_1.zCodeModel.parse(base);
        (0, vitest_1.expect)(parsed).toEqual(base);
    });
    (0, vitest_1.it)('rejects an invalid CodeModel version', () => {
        const invalid = { ...base, version: '0.9' };
        (0, vitest_1.expect)(() => CodeModel_1.zCodeModel.parse(invalid)).toThrow();
    });
    (0, vitest_1.it)('rejects when required fields are missing', () => {
        const invalid = {
            version: '1.0',
        };
        (0, vitest_1.expect)(() => CodeModel_1.zCodeModel.parse(invalid)).toThrow();
    });
});
