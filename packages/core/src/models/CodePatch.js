"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zCodePatchSet = exports.zCodePatch = exports.zCodePatchHunk = exports.zCodeTokenPatchKind = void 0;
const zod_1 = require("zod");
exports.zCodeTokenPatchKind = zod_1.z.enum([
    'color',
    'radius',
    'spacing',
    'typography',
]);
exports.zCodePatchHunk = zod_1.z.object({
    filePath: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    before: zod_1.z.string(),
    after: zod_1.z.string(),
    tokenName: zod_1.z.string().optional(),
    tokenKind: exports.zCodeTokenPatchKind.optional(),
    /**
     * Synthetic, human-readable context for token patches.
     * For CSS variable tokens, this is a canonical declaration line
     * like `--primary: #ffffff;` before/after the change.
     */
    beforeDeclaration: zod_1.z.string().optional(),
    afterDeclaration: zod_1.z.string().optional(),
});
exports.zCodePatch = zod_1.z.object({
    id: zod_1.z.string(),
    description: zod_1.z.string(),
    hunks: zod_1.z.array(exports.zCodePatchHunk),
});
exports.zCodePatchSet = zod_1.z.object({
    version: zod_1.z.literal('1.0'),
    patches: zod_1.z.array(exports.zCodePatch),
});
