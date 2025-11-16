"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const CodePatch_1 = require("./CodePatch");
(0, vitest_1.describe)('CodePatch models', () => {
    (0, vitest_1.it)('validates a basic hunk', () => {
        const hunk = CodePatch_1.zCodePatchHunk.parse({
            filePath: 'src/Button.tsx',
            before: 'old',
            after: 'new',
        });
        (0, vitest_1.expect)(hunk.filePath).toBe('src/Button.tsx');
    });
    (0, vitest_1.it)('validates a patch and patch set', () => {
        const patch = CodePatch_1.zCodePatch.parse({
            id: 'patch-1',
            description: 'Rename Button to PrimaryButton',
            hunks: [
                {
                    filePath: 'src/Button.tsx',
                    before: 'Button',
                    after: 'PrimaryButton',
                },
            ],
        });
        (0, vitest_1.expect)(patch.hunks).toHaveLength(1);
        const set = CodePatch_1.zCodePatchSet.parse({
            version: '1.0',
            patches: [patch],
        });
        (0, vitest_1.expect)(set.patches[0]?.id).toBe('patch-1');
    });
});
