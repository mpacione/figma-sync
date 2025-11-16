"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const buildCodePatches_1 = require("./buildCodePatches");
const baseCodeModel = {
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
const baseDesignSpec = {
    version: '1.0',
    projectMeta: baseCodeModel.projectMeta,
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
(0, vitest_1.describe)('buildCodePatchesForChanges', () => {
    (0, vitest_1.it)('returns an empty patch set when there are no changes', () => {
        const changeSet = { version: '1.0', changes: [] };
        const patches = (0, buildCodePatches_1.buildCodePatchesForChanges)(baseCodeModel, baseDesignSpec, changeSet);
        (0, vitest_1.expect)(patches.version).toBe('1.0');
        (0, vitest_1.expect)(patches.patches).toEqual([]);
    });
    (0, vitest_1.it)('generates simple rename patches for RenameComponent changes', () => {
        const codeModel = {
            ...baseCodeModel,
            components: [
                {
                    name: 'Button',
                    sourceFile: 'src/components/ui/Button.tsx',
                    exportedName: 'Button',
                    kind: 'primitive',
                    props: [],
                    usageExamples: [],
                    tailwindClasses: [],
                    childrenStructure: undefined,
                },
            ],
        };
        const designSpec = {
            ...baseDesignSpec,
            components: [
                {
                    id: 'component-0',
                    name: 'Button',
                    category: 'primitive',
                    sourceComponentName: 'Button',
                    propsModel: { variantProps: [], slotProps: [] },
                    exampleVariants: [
                        { id: 'component-0-default', name: 'Default', props: {} },
                    ],
                    placement: {
                        page: 'System/Primitives',
                        section: undefined,
                        gridPosition: { row: 0, column: 0 },
                    },
                },
            ],
            mapping: {
                ...baseDesignSpec.mapping,
                codeComponentToDesignId: { Button: 'component-0' },
            },
        };
        const changeSet = {
            version: '1.0',
            changes: [
                {
                    id: 'chg-1',
                    type: 'RenameComponent',
                    componentId: 'component-0',
                    newName: 'PrimaryButton',
                },
                {
                    id: 'chg-2',
                    type: 'RenameScreen',
                    screenId: 'screen-0',
                    newName: 'Login (v2)',
                },
            ],
        };
        const patches = (0, buildCodePatches_1.buildCodePatchesForChanges)(codeModel, designSpec, changeSet);
        (0, vitest_1.expect)(patches.version).toBe('1.0');
        (0, vitest_1.expect)(patches.patches).toHaveLength(1);
        const patch = patches.patches[0];
        (0, vitest_1.expect)(patch.id).toBe('chg-1');
        (0, vitest_1.expect)(patch.hunks).toHaveLength(1);
        const hunk = patch.hunks[0];
        (0, vitest_1.expect)(hunk.filePath).toBe('src/components/ui/Button.tsx');
        (0, vitest_1.expect)(hunk.before).toBe('Button');
        (0, vitest_1.expect)(hunk.after).toBe('PrimaryButton');
    });
    (0, vitest_1.it)('generates value update patches for UpdateVariable changes', () => {
        const codeModel = {
            ...baseCodeModel,
            tokens: {
                colors: [
                    {
                        name: '--primary',
                        source: 'css-variable',
                        value: { hex: '#ffffff' },
                        darkModeValue: undefined,
                        usageCount: 0,
                        locations: [
                            { filePath: 'src/styles/tokens.css', line: 1, column: 1 },
                        ],
                    },
                ],
                radii: [],
                spacing: [],
                typography: [],
            },
        };
        const designSpec = {
            ...baseDesignSpec,
            variables: {
                collections: [
                    { id: 'colors', name: 'Colors', description: 'Color tokens from code' },
                ],
                variables: [
                    {
                        id: 'var-1',
                        collectionId: 'colors',
                        name: '--primary',
                        type: 'COLOR',
                        modeValues: { default: '#ffffff' },
                        scopes: [],
                    },
                ],
            },
            mapping: {
                ...baseDesignSpec.mapping,
                codeTokenToVariableId: { '--primary': 'var-1' },
            },
        };
        const changeSet = {
            version: '1.0',
            changes: [
                {
                    id: 'chg-3',
                    type: 'UpdateVariable',
                    variableId: 'var-1',
                    variableName: '--primary',
                    newValue: '#000000',
                },
            ],
        };
        const patches = (0, buildCodePatches_1.buildCodePatchesForChanges)(codeModel, designSpec, changeSet);
        (0, vitest_1.expect)(patches.patches).toHaveLength(1);
        const patch = patches.patches[0];
        (0, vitest_1.expect)(patch.id).toBe('chg-3');
        (0, vitest_1.expect)(patch.hunks).toHaveLength(1);
        const hunk = patch.hunks[0];
        (0, vitest_1.expect)(hunk.filePath).toBe('src/styles/tokens.css');
        (0, vitest_1.expect)(hunk.before).toBe('#ffffff');
        (0, vitest_1.expect)(hunk.after).toBe('#000000');
        (0, vitest_1.expect)(hunk.tokenName).toBe('--primary');
        (0, vitest_1.expect)(hunk.tokenKind).toBe('color');
        (0, vitest_1.expect)(hunk.beforeDeclaration).toBe('--primary: #ffffff;');
        (0, vitest_1.expect)(hunk.afterDeclaration).toBe('--primary: #000000;');
    });
});
