"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const applyCodePatches_1 = require("./applyCodePatches");
(0, vitest_1.describe)('applyCodePatchSetToFiles', () => {
    (0, vitest_1.it)('applies simple hunks to files', () => {
        const patchSet = {
            version: '1.0',
            patches: [
                {
                    id: 'patch-1',
                    description: 'Rename Button to PrimaryButton',
                    hunks: [
                        {
                            filePath: 'src/Button.tsx',
                            before: 'Button',
                            after: 'PrimaryButton',
                        },
                    ],
                },
            ],
        };
        const files = {
            'src/Button.tsx': 'export const Button = () => <Button />;\n',
        };
        const result = (0, applyCodePatches_1.applyCodePatchSetToFiles)(patchSet, files);
        (0, vitest_1.expect)(result.changes).toHaveLength(1);
        const change = result.changes[0];
        (0, vitest_1.expect)(change.filePath).toBe('src/Button.tsx');
        (0, vitest_1.expect)(change.content).toContain('PrimaryButton = () => <PrimaryButton />');
        (0, vitest_1.expect)(change.content).not.toContain('Button = () => <Button />');
    });
    (0, vitest_1.it)('throws when before text is not found in strict mode', () => {
        const patchSet = {
            version: '1.0',
            patches: [
                {
                    id: 'patch-1',
                    description: 'Rename Button',
                    hunks: [
                        {
                            filePath: 'src/Button.tsx',
                            before: 'NonExistent',
                            after: 'PrimaryButton',
                        },
                    ],
                },
            ],
        };
        const files = { 'src/Button.tsx': 'export const Button = () => null;\n' };
        (0, vitest_1.expect)(() => (0, applyCodePatches_1.applyCodePatchSetToFiles)(patchSet, files)).toThrow(/No occurrences of before text/);
    });
    (0, vitest_1.it)('can skip missing files when strict is false', () => {
        const patchSet = {
            version: '1.0',
            patches: [
                {
                    id: 'patch-1',
                    description: 'Rename Button',
                    hunks: [
                        {
                            filePath: 'src/Missing.tsx',
                            before: 'Button',
                            after: 'PrimaryButton',
                        },
                    ],
                },
            ],
        };
        const result = (0, applyCodePatches_1.applyCodePatchSetToFiles)(patchSet, {}, { strict: false });
        (0, vitest_1.expect)(result.changes).toEqual([]);
    });
    (0, vitest_1.it)('updates only CSS variable declarations for color token hunks', () => {
        const patchSet = {
            version: '1.0',
            patches: [
                {
                    id: 'patch-color',
                    description: 'Update primary color token',
                    hunks: [
                        {
                            filePath: 'src/styles/tokens.css',
                            before: '#ffffff',
                            after: '#000000',
                            tokenName: '--primary',
                            tokenKind: 'color',
                        },
                    ],
                },
            ],
        };
        const files = {
            'src/styles/tokens.css': [
                ':root {',
                '  --primary: #ffffff;',
                '  background: #ffffff;',
                '}',
                '',
            ].join('\n'),
        };
        const result = (0, applyCodePatches_1.applyCodePatchSetToFiles)(patchSet, files);
        (0, vitest_1.expect)(result.changes).toHaveLength(1);
        const change = result.changes[0];
        (0, vitest_1.expect)(change.filePath).toBe('src/styles/tokens.css');
        (0, vitest_1.expect)(change.content).toContain('--primary: #000000;');
        // Other uses of the literal should remain unchanged.
        (0, vitest_1.expect)(change.content).toContain('background: #ffffff;');
    });
    (0, vitest_1.it)('updates only CSS variable declarations for numeric token hunks', () => {
        const patchSet = {
            version: '1.0',
            patches: [
                {
                    id: 'patch-radius',
                    description: 'Update radius token',
                    hunks: [
                        {
                            filePath: 'src/styles/tokens.css',
                            before: '4',
                            after: '8',
                            tokenName: '--radius-sm',
                            tokenKind: 'radius',
                        },
                    ],
                },
            ],
        };
        const files = {
            'src/styles/tokens.css': [
                ':root {',
                '  --radius-sm: 4px;',
                '}',
                '.btn { border-radius: var(--radius-sm); }',
                '',
            ].join('\n'),
        };
        const result = (0, applyCodePatches_1.applyCodePatchSetToFiles)(patchSet, files);
        (0, vitest_1.expect)(result.changes).toHaveLength(1);
        const change = result.changes[0];
        (0, vitest_1.expect)(change.filePath).toBe('src/styles/tokens.css');
        (0, vitest_1.expect)(change.content).toContain('--radius-sm: 8px;');
        // Usage sites should remain unchanged.
        (0, vitest_1.expect)(change.content).toContain('border-radius: var(--radius-sm);');
    });
});
