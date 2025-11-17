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

  it('skips RenameComponent changes when no matching code component is found', () => {
    const codeModel: CodeModel = {
      ...baseCodeModel,
      components: [
        {
          name: 'Card',
          sourceFile: 'src/components/ui/Card.tsx',
          exportedName: 'Card',
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
          id: 'component-1',
          name: 'Button',
          category: 'primitive',
          sourceComponentName: 'Button',
          propsModel: { variantProps: [], slotProps: [] },
          exampleVariants: [
            { id: 'component-1-default', name: 'Default', props: {} },
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
        codeComponentToDesignId: { Button: 'component-1' },
      },
    };

    const changeSet: FigmaChangeSet = {
      version: '1.0',
      changes: [
        {
          id: 'chg-no-component',
          type: 'RenameComponent',
          componentId: 'component-1',
          newName: 'PrimaryButton',
        },
      ],
    };

    const patches = buildCodePatchesForChanges(codeModel, designSpec, changeSet);
    expect(patches.patches).toEqual([]);
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

  it('returns no patches when UpdateVariable has no mapped code token', () => {
    const changeSet: FigmaChangeSet = {
      version: '1.0',
      changes: [
        {
          id: 'chg-unmapped',
          type: 'UpdateVariable',
          variableId: 'var-unmapped',
          variableName: '--unmapped',
          newValue: '#000000',
        },
      ],
    };

    const patches = buildCodePatchesForChanges(baseCodeModel, baseDesignSpec, changeSet);
    expect(patches.patches).toEqual([]);
  });

  it('generates patches for radius, spacing and typography token updates', () => {
    const codeModel: CodeModel = {
      ...baseCodeModel,
      tokens: {
        colors: [],
        radii: [
          {
            name: '--radius-sm',
            value: 4,
            unit: 'px',
            usageCount: 0,
            locations: [
              { filePath: 'src/styles/tokens.css', line: 2, column: 1 },
            ],
          },
          {
            // No locations: should be ignored when building patches.
            name: '--radius-noloc',
            value: 4,
            unit: 'px',
            usageCount: 0,
            locations: [],
          },
        ],
        spacing: [
          {
            name: '--space-md',
            value: 8,
            unit: 'px',
            usageCount: 0,
            locations: [
              { filePath: 'src/styles/tokens.css', line: 3, column: 1 },
            ],
          },
        ],
        typography: [
          {
            name: '--font-size-body',
            fontFamily: 'system-ui',
            fontSize: 16,
            usageCount: 0,
            locations: [
              { filePath: 'src/styles/tokens.css', line: 4, column: 1 },
            ],
          },
        ],
      },
    };

    const designSpec: DesignSpec = {
      ...baseDesignSpec,
      variables: {
        collections: [
          { id: 'sizes', name: 'Sizes', description: 'Numeric tokens from code' },
        ],
        variables: [
          {
            id: 'var-radius',
            collectionId: 'sizes',
            name: '--radius-sm',
            type: 'FLOAT',
            modeValues: { default: 4 },
            scopes: [],
          },
          {
            id: 'var-radius-noloc',
            collectionId: 'sizes',
            name: '--radius-noloc',
            type: 'FLOAT',
            modeValues: { default: 4 },
            scopes: [],
          },
          {
            id: 'var-spacing',
            collectionId: 'sizes',
            name: '--space-md',
            type: 'FLOAT',
            modeValues: { default: 8 },
            scopes: [],
          },
          {
            id: 'var-typography',
            collectionId: 'sizes',
            name: '--font-size-body',
            type: 'FLOAT',
            modeValues: { default: 16 },
            scopes: [],
          },
        ],
      },
      mapping: {
        ...baseDesignSpec.mapping,
        codeTokenToVariableId: {
          '--radius-sm': 'var-radius',
          '--radius-noloc': 'var-radius-noloc',
          '--space-md': 'var-spacing',
          '--font-size-body': 'var-typography',
        },
      },
    };

    const changeSet: FigmaChangeSet = {
      version: '1.0',
      changes: [
        {
          id: 'chg-radius',
          type: 'UpdateVariable',
          variableId: 'var-radius',
          variableName: '--radius-sm',
          newValue: 8,
        },
        {
          id: 'chg-radius-noloc',
          type: 'UpdateVariable',
          variableId: 'var-radius-noloc',
          variableName: '--radius-noloc',
          newValue: 8,
        },
        {
          id: 'chg-spacing',
          type: 'UpdateVariable',
          variableId: 'var-spacing',
          variableName: '--space-md',
          newValue: 12,
        },
        {
          id: 'chg-typography',
          type: 'UpdateVariable',
          variableId: 'var-typography',
          variableName: '--font-size-body',
          newValue: 18,
        },
      ],
    };

    const patches = buildCodePatchesForChanges(codeModel, designSpec, changeSet);

    // We should get three patches: radius, spacing and typography. The token
    // with no locations should not produce a patch.
    const patchIds = patches.patches.map((p) => p.id).sort();
    expect(patchIds).toEqual(['chg-radius', 'chg-spacing', 'chg-typography']);
  });

  it('handles unknown change types via exhaustive default branch without throwing', () => {
    const changeSet = {
      version: '1.0',
      // Cast to any so we can inject an unknown type and exercise the
      // exhaustive guard branch.
      changes: [
        {
          id: 'chg-unknown',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          type: 'SomeNewChangeType' as any,
        },
      ],
    } as FigmaChangeSet;

    const patches = buildCodePatchesForChanges(baseCodeModel, baseDesignSpec, changeSet);
    expect(patches.patches).toEqual([]);
  });

});

