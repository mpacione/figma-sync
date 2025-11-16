"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const generatePatches_1 = require("./generatePatches");
const figma_sync_core_1 = require("figma-sync-core");
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
(0, vitest_1.describe)('runGeneratePatches', () => {
    (0, vitest_1.it)('reads artifacts and change set from stdin and writes a patch set', async () => {
        const files = {
            '/repo/artifacts/code-model.json': JSON.stringify(codeModel),
            '/repo/artifacts/design-spec.json': JSON.stringify(designSpec),
        };
        const written = {};
        const changesJson = JSON.stringify({
            version: '1.0',
            changes: [],
        });
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
            writeFile: async (filePath, content) => {
                written[filePath] = content;
            },
            readStdin: async () => changesJson,
            cwd: '/repo',
        };
        await (0, generatePatches_1.runGeneratePatches)('figma-sync.config.json', deps);
        const patchesPath = '/repo/artifacts/code-patches.json';
        (0, vitest_1.expect)(written[patchesPath]).toBeDefined();
        const patchSet = figma_sync_core_1.zCodePatchSet.parse(JSON.parse(written[patchesPath]));
        (0, vitest_1.expect)(patchSet.version).toBe('1.0');
        (0, vitest_1.expect)(patchSet.patches).toEqual([]);
    });
});
