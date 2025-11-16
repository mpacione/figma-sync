import { describe, it, expect } from 'vitest';
import type { CodeModel } from '../models/CodeModel';
import type { DesignSpec } from '../models/DesignSpec';
import type { FigmaChangeSet } from '../models/FigmaChangeSet';
import { buildCodePatchesForChanges } from './buildCodePatches';

const baseCodeModel: CodeModel = {
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

const baseDesignSpec: DesignSpec = {
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

describe('buildCodePatchesForChanges', () => {
  it('returns an empty patch set when there are no changes', () => {
    const changeSet: FigmaChangeSet = { version: '1.0', changes: [] };
    const patches = buildCodePatchesForChanges(baseCodeModel, baseDesignSpec, changeSet);
    expect(patches.version).toBe('1.0');
    expect(patches.patches).toEqual([]);
  });

  it('generates simple rename patches for RenameComponent changes', () => {
    const codeModel: CodeModel = {
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

    const designSpec: DesignSpec = {
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

    const changeSet: FigmaChangeSet = {
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

    const patches = buildCodePatchesForChanges(codeModel, designSpec, changeSet);

    expect(patches.version).toBe('1.0');
    expect(patches.patches).toHaveLength(1);
    const patch = patches.patches[0]!;
    expect(patch.id).toBe('chg-1');
    expect(patch.hunks).toHaveLength(1);
    const hunk = patch.hunks[0]!;
    expect(hunk.filePath).toBe('src/components/ui/Button.tsx');
    expect(hunk.before).toBe('Button');
    expect(hunk.after).toBe('PrimaryButton');
  });

  it('generates value update patches for UpdateVariable changes', () => {
    const codeModel: CodeModel = {
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

    const designSpec: DesignSpec = {
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

    const changeSet: FigmaChangeSet = {
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

    const patches = buildCodePatchesForChanges(codeModel, designSpec, changeSet);

    expect(patches.patches).toHaveLength(1);
    const patch = patches.patches[0]!;
    expect(patch.id).toBe('chg-3');
    expect(patch.hunks).toHaveLength(1);
    const hunk = patch.hunks[0]!;
    expect(hunk.filePath).toBe('src/styles/tokens.css');
    expect(hunk.before).toBe('#ffffff');
    expect(hunk.after).toBe('#000000');
    expect(hunk.tokenName).toBe('--primary');
    expect(hunk.tokenKind).toBe('color');
    expect(hunk.beforeDeclaration).toBe('--primary: #ffffff;');
    expect(hunk.afterDeclaration).toBe('--primary: #000000;');
  });

});

