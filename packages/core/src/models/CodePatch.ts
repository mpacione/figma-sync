import { z } from 'zod';

export const zCodeTokenPatchKind = z.enum([
  'color',
  'radius',
  'spacing',
  'typography',
]);
export type CodeTokenPatchKind = z.infer<typeof zCodeTokenPatchKind>;

export const zCodePatchHunk = z.object({
  filePath: z.string(),
  description: z.string().optional(),
  before: z.string(),
  after: z.string(),
  tokenName: z.string().optional(),
  tokenKind: zCodeTokenPatchKind.optional(),
  /**
   * Synthetic, human-readable context for token patches.
   * For CSS variable tokens, this is a canonical declaration line
   * like `--primary: #ffffff;` before/after the change.
   */
  beforeDeclaration: z.string().optional(),
  afterDeclaration: z.string().optional(),
});
export type CodePatchHunk = z.infer<typeof zCodePatchHunk>;

export const zCodePatch = z.object({
  id: z.string(),
  description: z.string(),
  hunks: z.array(zCodePatchHunk),
});
export type CodePatch = z.infer<typeof zCodePatch>;

export const zCodePatchSet = z.object({
  version: z.literal('1.0'),
  patches: z.array(zCodePatch),
});
export type CodePatchSet = z.infer<typeof zCodePatchSet>;

