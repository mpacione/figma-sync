"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const buildDesignSpec_1 = require("./buildDesignSpec");
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
        radii: [
            {
                name: '--radius-sm',
                value: 4,
                unit: 'px',
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
        spacing: [
            {
                name: '--space-md',
                value: 8,
                unit: 'px',
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
        typography: [
            {
                name: '--font-size-body',
                fontFamily: 'system-ui',
                fontSize: 16,
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
(0, vitest_1.describe)('buildDesignSpec', () => {
    (0, vitest_1.it)('builds a DesignSpec from a CodeModel and config', () => {
        const spec = (0, buildDesignSpec_1.buildDesignSpec)(codeModel, config);
        (0, vitest_1.expect)(spec.version).toBe('1.0');
        (0, vitest_1.expect)(spec.projectMeta.name).toBe('Test Project');
        (0, vitest_1.expect)(spec.variables.collections[0].name).toBe('Colors');
        (0, vitest_1.expect)(spec.variables.variables[0]).toMatchObject({
            name: '--primary',
            type: 'COLOR',
        });
        const collectionNames = spec.variables.collections.map((c) => c.name);
        (0, vitest_1.expect)(collectionNames).toContain('Radii');
        (0, vitest_1.expect)(collectionNames).toContain('Spacing');
        (0, vitest_1.expect)(collectionNames).toContain('Typography');
        const findVar = (name) => spec.variables.variables.find((v) => v.name === name);
        (0, vitest_1.expect)(findVar('--radius-sm')).toMatchObject({
            name: '--radius-sm',
            type: 'FLOAT',
            modeValues: { default: 4 },
        });
        (0, vitest_1.expect)(findVar('--space-md')).toMatchObject({
            name: '--space-md',
            type: 'FLOAT',
            modeValues: { default: 8 },
        });
        (0, vitest_1.expect)(findVar('--font-size-body')).toMatchObject({
            name: '--font-size-body',
            type: 'FLOAT',
            modeValues: { default: 16 },
        });
        (0, vitest_1.expect)(spec.components[0]).toMatchObject({
            name: 'Button',
            category: 'primitive',
            placement: { page: 'System/Primitives' },
        });
        (0, vitest_1.expect)(spec.screens[0]).toMatchObject({
            route: '/login',
            componentsUsed: ['Button'],
            states: ['default'],
        });
        (0, vitest_1.expect)(spec.pages.map((p) => p.name)).toEqual([
            'System/Primitives',
            'System/Patterns',
            'App/Screens',
        ]);
        (0, vitest_1.expect)(spec.mapping.codeComponentToDesignId.Button).toBeDefined();
        (0, vitest_1.expect)(spec.mapping.codeTokenToVariableId['--primary']).toBeDefined();
        (0, vitest_1.expect)(spec.mapping.codeTokenToVariableId['--radius-sm']).toBeDefined();
        (0, vitest_1.expect)(spec.mapping.codeTokenToVariableId['--space-md']).toBeDefined();
        (0, vitest_1.expect)(spec.mapping.codeTokenToVariableId['--font-size-body']).toBeDefined();
        (0, vitest_1.expect)(spec.mapping.routeToScreenId['/login']).toBeDefined();
    });
});
