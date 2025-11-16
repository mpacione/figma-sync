import { describe, it, expect } from 'vitest';
import { zDesignSpec } from './DesignSpec';

describe('zDesignSpec', () => {
  const base = {
    version: '1.0' as const,
    projectMeta: {
      name: 'Test Project',
      framework: 'nextjs' as const,
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
          type: 'COLOR' as const,
          modeValues: { default: '#ffffff' },
          scopes: [],
        },
      ],
    },
    styles: {
      styles: [
        { id: 's1', name: 'Body', type: 'TEXT' as const, description: '' },
      ],
    },
    components: [
      {
        id: 'c1',
        name: 'Button',
        category: 'primitive' as const,
        sourceComponentName: 'Button',
        propsModel: {
          variantProps: [
            { name: 'variant', type: 'enum' as const, values: ['primary'] },
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
        kind: 'system-primitives' as const,
        sections: [{ name: 'Buttons', description: 'Button components' }],
      },
    ],
    mapping: {
      codeComponentToDesignId: { Button: 'c1' },
      codeTokenToVariableId: { 'tokens.colors.primary': 'v1' },
      routeToScreenId: { '/login': 'screen1' },
    },
  };

  it('accepts a valid DesignSpec', () => {
    const parsed = zDesignSpec.parse(base);
    expect(parsed).toEqual(base);
  });

  it('rejects an invalid version', () => {
    const invalid = { ...base, version: '0.9' };
    expect(() => zDesignSpec.parse(invalid)).toThrow();
  });
});

