"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const DesignSpec_1 = require("./DesignSpec");
(0, vitest_1.describe)('zDesignSpec', () => {
    const base = {
        version: '1.0',
        projectMeta: {
            name: 'Test Project',
            framework: 'nextjs',
            tailwindEnabled: true,
        },
        variables: {
            collections: [
                { id: 'vc1', name: 'Colors', description: 'Color variables' },
            ],
            variables: [
                {
                    id: 'v1',
                    collectionId: 'vc1',
                    name: 'primary',
                    type: 'COLOR',
                    modeValues: { default: '#ffffff' },
                    scopes: [],
                },
            ],
        },
        styles: {
            styles: [
                { id: 's1', name: 'Body', type: 'TEXT', description: '' },
            ],
        },
        components: [
            {
                id: 'c1',
                name: 'Button',
                category: 'primitive',
                sourceComponentName: 'Button',
                propsModel: {
                    variantProps: [
                        { name: 'variant', type: 'enum', values: ['primary'] },
                    ],
                    slotProps: [{ name: 'children', description: 'Label' }],
                },
                exampleVariants: [
                    { id: 'cv1', name: 'Primary', props: { variant: 'primary' } },
                ],
                placement: {
                    page: 'System/Primitives',
                    section: 'Buttons',
                    gridPosition: { row: 0, column: 0 },
                },
            },
        ],
        screens: [
            {
                id: 'screen1',
                route: '/login',
                name: 'Login',
                componentsUsed: ['Button'],
                layoutHints: {},
                states: ['default'],
            },
        ],
        pages: [
            {
                name: 'System/Primitives',
                kind: 'system-primitives',
                sections: [{ name: 'Buttons', description: 'Button components' }],
            },
        ],
        mapping: {
            codeComponentToDesignId: { Button: 'c1' },
            codeTokenToVariableId: { 'tokens.colors.primary': 'v1' },
            routeToScreenId: { '/login': 'screen1' },
        },
    };
    (0, vitest_1.it)('accepts a valid DesignSpec', () => {
        const parsed = DesignSpec_1.zDesignSpec.parse(base);
        (0, vitest_1.expect)(parsed).toEqual(base);
    });
    (0, vitest_1.it)('rejects an invalid version', () => {
        const invalid = { ...base, version: '0.9' };
        (0, vitest_1.expect)(() => DesignSpec_1.zDesignSpec.parse(invalid)).toThrow();
    });
});
