"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const generateSpec_1 = require("./generateSpec");
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
        colors: [
            {
                name: '--primary',
                source: 'css-variable',
                value: { hex: '#ffffff' },
                darkModeValue: undefined,
                usageCount: 0,
                locations: [
                    {
                        filePath: 'src/styles/tokens.css',
                        line: 1,
                        column: 1,
                    },
                ],
            },
        ],
        radii: [],
        spacing: [],
        typography: [],
    },
    components: [
        {
            name: 'Button',
            sourceFile: 'src/components/ui/Button.tsx',
            exportedName: 'Button',
            kind: 'primitive',
            props: [],
            usageExamples: [],
            tailwindClasses: ['px-2'],
            childrenStructure: undefined,
        },
    ],
    screens: [
        {
            route: '/login',
            componentName: 'Page',
            filePath: 'app/login/page.tsx',
            usesComponents: ['Button'],
            description: undefined,
        },
    ],
};
(0, vitest_1.describe)('runGenerateSpec', () => {
    (0, vitest_1.it)('reads CodeModel, builds DesignSpec, and writes it to artifacts', async () => {
        const files = {
            '/repo/artifacts/code-model.json': JSON.stringify(codeModel),
        };
        const written = {};
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
            cwd: '/repo',
        };
        await (0, generateSpec_1.runGenerateSpec)('figma-sync.config.json', deps);
        const specPath = '/repo/artifacts/design-spec.json';
        (0, vitest_1.expect)(written[specPath]).toBeDefined();
        const spec = JSON.parse(written[specPath]);
        (0, vitest_1.expect)(spec.version).toBe('1.0');
        (0, vitest_1.expect)(spec.projectMeta.name).toBe('Test Project');
        (0, vitest_1.expect)(spec.components[0].name).toBe('Button');
        (0, vitest_1.expect)(spec.screens[0].route).toBe('/login');
        (0, vitest_1.expect)(spec.mapping.codeComponentToDesignId.Button).toBeDefined();
        const instructionsPath = '/repo/artifacts/figma-instructions.json';
        (0, vitest_1.expect)(written[instructionsPath]).toBeDefined();
        const instructions = JSON.parse(written[instructionsPath]);
        const parsed = figma_sync_core_1.zFigmaInstructionSet.parse(instructions);
        (0, vitest_1.expect)(parsed.version).toBe('1.0');
    });
});
