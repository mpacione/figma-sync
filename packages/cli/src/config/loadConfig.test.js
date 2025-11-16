"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const loadConfig_1 = require("./loadConfig");
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
        primitiveComponentPatterns: ['Button'],
        excludeComponents: [],
    },
};
(0, vitest_1.describe)('loadConfigFromFile', () => {
    (0, vitest_1.it)('loads and parses a JSON config', async () => {
        const readFile = vitest_1.vi
            .fn()
            .mockResolvedValue(JSON.stringify(validConfig));
        const loadModule = vitest_1.vi.fn();
        const result = await (0, loadConfig_1.loadConfigFromFile)('/path/to/figma-sync.config.json', {
            readFile,
            loadModule,
        });
        (0, vitest_1.expect)(result).toEqual(validConfig);
        (0, vitest_1.expect)(readFile).toHaveBeenCalledTimes(1);
        (0, vitest_1.expect)(loadModule).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('loads and parses a JS config via module loader', async () => {
        const readFile = vitest_1.vi.fn();
        const loadModule = vitest_1.vi.fn().mockResolvedValue({ default: validConfig });
        const result = await (0, loadConfig_1.loadConfigFromFile)('/path/to/figma-sync.config.js', {
            readFile,
            loadModule,
        });
        (0, vitest_1.expect)(result).toEqual(validConfig);
        (0, vitest_1.expect)(loadModule).toHaveBeenCalledTimes(1);
    });
    (0, vitest_1.it)('throws on unsupported extension', async () => {
        const readFile = vitest_1.vi.fn();
        const loadModule = vitest_1.vi.fn();
        await (0, vitest_1.expect)((0, loadConfig_1.loadConfigFromFile)('/path/to/figma-sync.config.txt', {
            readFile,
            loadModule,
        })).rejects.toThrow(/Unsupported config file extension/);
    });
});
