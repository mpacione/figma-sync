"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const buildDesignSpec_1 = require("./buildDesignSpec");
const buildFigmaInstructionSet_1 = require("./buildFigmaInstructionSet");
const FigmaInstructionSet_1 = require("../models/FigmaInstructionSet");
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
(0, vitest_1.describe)('buildFigmaInstructionSet', () => {
    (0, vitest_1.it)('creates a set of operations to materialize the DesignSpec in Figma', () => {
        const designSpec = (0, buildDesignSpec_1.buildDesignSpec)(codeModel, config);
        const instructions = (0, buildFigmaInstructionSet_1.buildFigmaInstructionSet)(designSpec);
        // Validate against schema
        const parsed = FigmaInstructionSet_1.zFigmaInstructionSet.parse(instructions);
        (0, vitest_1.expect)(parsed.version).toBe('1.0');
        const createPageOps = parsed.operations.filter((op) => op.type === 'CreatePage');
        (0, vitest_1.expect)(createPageOps.map((op) => op.name)).toEqual([
            'System/Primitives',
            'System/Patterns',
            'App/Screens',
        ]);
        const createVarCollectionOps = parsed.operations.filter((op) => op.type === 'CreateVariableCollection');
        (0, vitest_1.expect)(createVarCollectionOps[0]?.name).toBe('Colors');
        const createVarOps = parsed.operations.filter((op) => op.type === 'CreateVariable');
        (0, vitest_1.expect)(createVarOps[0]?.name).toBe('--primary');
        const createComponentOps = parsed.operations.filter((op) => op.type === 'CreateComponent');
        (0, vitest_1.expect)(createComponentOps[0]?.name).toBe('Button');
        const createScreenFrameOps = parsed.operations.filter((op) => op.type === 'CreateScreenFrame');
        (0, vitest_1.expect)(createScreenFrameOps[0]?.screenId).toBe(designSpec.screens[0].id);
    });
});
