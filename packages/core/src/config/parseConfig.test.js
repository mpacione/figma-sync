"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const parseConfig_1 = require("./parseConfig");
(0, vitest_1.describe)('parseConfig', () => {
    const validConfig = {
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
            temperature: 0.2,
            maxTokens: 1024,
        },
        heuristics: {
            primitiveComponentPatterns: ['Button', 'Input'],
            excludeComponents: ['DebugPanel'],
        },
    };
    (0, vitest_1.it)('parses a valid config object', () => {
        const parsed = (0, parseConfig_1.parseConfig)(validConfig);
        (0, vitest_1.expect)(parsed).toEqual(validConfig);
    });
    (0, vitest_1.it)('throws on invalid config', () => {
        const invalid = { projectName: 'Missing fields' };
        (0, vitest_1.expect)(() => (0, parseConfig_1.parseConfig)(invalid)).toThrow(/Invalid figma-sync config/);
    });
});
