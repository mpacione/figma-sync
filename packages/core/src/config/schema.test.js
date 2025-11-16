"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const schema_1 = require("./schema");
(0, vitest_1.describe)('zFigmaSyncConfig', () => {
    (0, vitest_1.it)('accepts a valid config', () => {
        const config = {
            projectName: 'Test Project',
            paths: {
                uiComponentsGlob: 'src/components/ui/**/*',
                screenComponentsGlob: 'app/**/page.tsx',
                cssVariablesFiles: ['src/styles/tokens.css'],
                tailwindConfig: 'tailwind.config.ts',
            },
            figma: {
                fileKey: 'FILE_KEY',
                pages: {
                    primitives: 'System/Primitives',
                    patterns: 'System/Patterns',
                    screens: 'App/Screens',
                },
            },
            llm: {
                provider: 'openai',
                model: 'gpt-4',
                temperature: 0.5,
                maxTokens: 1024,
            },
            heuristics: {
                primitiveComponentPatterns: ['Button'],
                excludeComponents: [],
            },
        };
        const parsed = schema_1.zFigmaSyncConfig.parse(config);
        (0, vitest_1.expect)(parsed).toEqual(config);
    });
    (0, vitest_1.it)('rejects config with missing required fields', () => {
        const invalid = { projectName: 'Missing fields' };
        (0, vitest_1.expect)(() => schema_1.zFigmaSyncConfig.parse(invalid)).toThrow();
    });
});
