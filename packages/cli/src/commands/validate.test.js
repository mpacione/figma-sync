"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const validate_1 = require("./validate");
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
        temperature: 0.2,
        maxTokens: 1024,
    },
    heuristics: {
        primitiveComponentPatterns: ['Button'],
        excludeComponents: [],
    },
};
const codeModel = {
    version: '1.0',
    projectMeta: {
        name: 'Test Project',
        framework: 'nextjs',
        tailwindEnabled: true,
    },
    tokens: {
        colors: [],
        radii: [],
        spacing: [],
        typography: [],
    },
    components: [],
    screens: [],
};
const designSpec = {
    version: '1.0',
    projectMeta: codeModel.projectMeta,
    variables: { collections: [], variables: [] },
    styles: { styles: [] },
    components: [],
    screens: [],
    pages: [],
    mapping: {
        codeComponentToDesignId: {},
        codeTokenToVariableId: {},
        routeToScreenId: {},
    },
};
const instructionSet = {
    version: '1.0',
    operations: [],
};
const patchSet = {
    version: '1.0',
    patches: [],
};
(0, vitest_1.describe)('runValidate', () => {
    (0, vitest_1.it)('validates existing artifacts and skips missing ones', async () => {
        const files = {
            '/repo/artifacts/code-model.json': JSON.stringify(codeModel),
            '/repo/artifacts/design-spec.json': JSON.stringify(designSpec),
            '/repo/artifacts/figma-instructions.json': JSON.stringify(instructionSet),
            '/repo/artifacts/code-patches.json': JSON.stringify(patchSet),
        };
        const logs = [];
        const deps = {
            loadConfigFromFile: async (configPath) => {
                (0, vitest_1.expect)(configPath).toBe('figma-sync.config.json');
                return config;
            },
            readFile: async (filePath) => {
                const content = files[filePath];
                if (!content)
                    throw new Error(`Missing file: ${filePath}`);
                return content;
            },
            fileExists: async (filePath) => !!files[filePath],
            log: (message) => {
                logs.push(message);
            },
            cwd: '/repo',
        };
        await (0, validate_1.runValidate)('figma-sync.config.json', deps);
        (0, vitest_1.expect)(logs.some((l) => l.includes('CodeModel'))).toBe(true);
        (0, vitest_1.expect)(logs.some((l) => l.includes('DesignSpec'))).toBe(true);
        (0, vitest_1.expect)(logs.some((l) => l.includes('FigmaInstructionSet'))).toBe(true);
        (0, vitest_1.expect)(logs.some((l) => l.includes('CodePatchSet'))).toBe(true);
    });
});
