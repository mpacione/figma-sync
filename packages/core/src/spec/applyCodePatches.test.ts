import { describe, it, expect } from 'vitest';
import type { CodePatchSet } from '../models/CodePatch';
import { applyCodePatchSetToFiles } from './applyCodePatches';

describe('applyCodePatchSetToFiles', () => {
  it('applies simple hunks to files', () => {
    const patchSet: CodePatchSet = {
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

    const result = applyCodePatchSetToFiles(patchSet, files);
    expect(result.changes).toHaveLength(1);
    const change = result.changes[0]!;
    expect(change.filePath).toBe('src/Button.tsx');
    expect(change.content).toContain('PrimaryButton = () => <PrimaryButton />');
    expect(change.content).not.toContain('Button = () => <Button />');
  });

  it('throws when before text is not found in strict mode', () => {
    const patchSet: CodePatchSet = {
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

    expect(() => applyCodePatchSetToFiles(patchSet, files)).toThrow(
      /No occurrences of before text/,
    );
  });

  it('can skip missing files when strict is false', () => {
    const patchSet: CodePatchSet = {
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

    const result = applyCodePatchSetToFiles(patchSet, {}, { strict: false });
    expect(result.changes).toEqual([]);
  });

  it('updates only CSS variable declarations for color token hunks', () => {
    const patchSet: CodePatchSet = {
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

    const result = applyCodePatchSetToFiles(patchSet, files);
    expect(result.changes).toHaveLength(1);
    const change = result.changes[0]!;
    expect(change.filePath).toBe('src/styles/tokens.css');
    expect(change.content).toContain('--primary: #000000;');
    // Other uses of the literal should remain unchanged.
    expect(change.content).toContain('background: #ffffff;');
  });

  it('updates only CSS variable declarations for numeric token hunks', () => {
    const patchSet: CodePatchSet = {
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

    const result = applyCodePatchSetToFiles(patchSet, files);
    expect(result.changes).toHaveLength(1);
    const change = result.changes[0]!;
    expect(change.filePath).toBe('src/styles/tokens.css');
    expect(change.content).toContain('--radius-sm: 8px;');
    // Usage sites should remain unchanged.
    expect(change.content).toContain('border-radius: var(--radius-sm);');
  });

  it('throws when hunk.before is empty', () => {
    const patchSet: CodePatchSet = {
      version: '1.0',
      patches: [
        {
          id: 'patch-empty',
          description: 'Invalid empty before',
          hunks: [
            {
              filePath: 'src/Button.tsx',
              before: '',
              after: 'PrimaryButton',
            },
          ],
        },
      ],
    };

    const files = { 'src/Button.tsx': 'export const Button = () => null;\n' };

    expect(() => applyCodePatchSetToFiles(patchSet, files)).toThrow(
      /must not be empty/,
    );
  });

  it('does not update unrelated CSS variables when token name or value does not match', () => {
    const patchSet: CodePatchSet = {
      version: '1.0',
      patches: [
        {
          id: 'patch-unrelated',
          description: 'Attempt to update non-matching token',
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

    const original = [
      ':root {',
      '  --other: #ffffff;',
      '}',
      '',
    ].join('\n');

    const files = {
      'src/styles/tokens.css': original,
    };

    const result = applyCodePatchSetToFiles(patchSet, files, { strict: false });
    expect(result.changes).toEqual([]);
    expect(files['src/styles/tokens.css']).toBe(original);
  });

});

