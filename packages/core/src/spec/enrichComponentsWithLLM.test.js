"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const enrichComponentsWithLLM_1 = require("./enrichComponentsWithLLM");
const buildDesignSpec_1 = require("./buildDesignSpec");
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
    screens: [],
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
function createFakeLLM(result) {
    return {
        async generate(_prompt, _options) {
            return JSON.stringify(result);
        },
        async generateJSON(_prompt, _schema) {
            return result;
        },
    };
}
(0, vitest_1.describe)('enrichDesignComponentsWithLLM', () => {
    (0, vitest_1.it)('merges LLM-provided props and example variants into components', async () => {
        const baseSpec = (0, buildDesignSpec_1.buildDesignSpec)(codeModel, config);
        const llmResult = {
            components: [
                {
                    name: 'Button',
                    propsModel: {
                        variantProps: [
                            { name: 'variant', type: 'enum', values: ['primary', 'secondary'] },
                            { name: 'disabled', type: 'boolean' },
                        ],
                        slotProps: [{ name: 'icon' }],
                    },
                    exampleVariants: [
                        {
                            name: 'Primary',
                            props: { variant: 'primary', disabled: false },
                        },
                    ],
                },
            ],
        };
        const llm = createFakeLLM(llmResult);
        const enriched = await (0, enrichComponentsWithLLM_1.enrichDesignComponentsWithLLM)(codeModel, baseSpec.components, llm);
        (0, vitest_1.expect)(enriched).toHaveLength(1);
        const button = enriched[0];
        (0, vitest_1.expect)(button.propsModel.variantProps).toEqual(llmResult.components[0].propsModel.variantProps);
        (0, vitest_1.expect)(button.exampleVariants[0].name).toBe('Primary');
        (0, vitest_1.expect)(button.exampleVariants[0].props).toEqual(llmResult.components[0].exampleVariants[0].props);
        (0, vitest_1.expect)(button.exampleVariants[0].id).toMatch(/^component-0-ex-0$/);
    });
    (0, vitest_1.it)('returns base components when LLM provides no matching entries', async () => {
        const baseSpec = (0, buildDesignSpec_1.buildDesignSpec)(codeModel, config);
        const llm = createFakeLLM({ components: [] });
        const enriched = await (0, enrichComponentsWithLLM_1.enrichDesignComponentsWithLLM)(codeModel, baseSpec.components, llm);
        (0, vitest_1.expect)(enriched).toEqual(baseSpec.components);
    });
});
