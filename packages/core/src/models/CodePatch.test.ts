import { describe, it, expect } from 'vitest';
import { zCodePatchHunk, zCodePatch, zCodePatchSet } from './CodePatch';

describe('CodePatch models', () => {
  it('validates a basic hunk', () => {
    const hunk = zCodePatchHunk.parse({
      filePath: 'src/Button.tsx',
      before: 'old',
      after: 'new',
    });
    expect(hunk.filePath).toBe('src/Button.tsx');
  });

  it('validates a patch and patch set', () => {
    const patch = zCodePatch.parse({
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

    expect(patch.hunks).toHaveLength(1);

    const set = zCodePatchSet.parse({
      version: '1.0',
      patches: [patch],
    });

    expect(set.patches[0]?.id).toBe('patch-1');
  });
});

