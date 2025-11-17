import { describe, it, expect } from 'vitest';
import { zCodeModel } from './CodeModel';

describe('zCodeModel', () => {
  const base = {
    version: '1.0' as const,
    projectMeta: {
      name: 'Test Project',
      framework: 'nextjs' as const,
      tailwindEnabled: true,
    },
    tokens: {
      colors: [
        {
          name: 'primary',
          source: 'css-variable' as const,
          value: { hex: '#ffffff', alpha: 1 },
          usageCount: 1,
          locations: [{ filePath: 'src/App.tsx', line: 1, column: 1 }],
        },
      ],
      radii: [],
      spacing: [],
      typography: [],
    },
    components: [],
    screens: [],
  };

  it('accepts a valid CodeModel', () => {
    const parsed = zCodeModel.parse(base);
    expect(parsed).toEqual(base);
  });

  it('rejects an invalid CodeModel version', () => {
    const invalid = { ...base, version: '0.9' };
    expect(() => zCodeModel.parse(invalid)).toThrow();
  });

  it('rejects when required fields are missing', () => {
    const invalid: unknown = {
      version: '1.0',
    };
    expect(() => zCodeModel.parse(invalid)).toThrow();
  });

  it('supports components with nested childrenStructure', () => {
    const withChildren = {
      ...base,
      components: [
        {
          name: 'Layout',
          sourceFile: 'src/components/Layout.tsx',
          exportedName: 'Layout',
          kind: 'pattern' as const,
          props: [],
          usageExamples: [],
          tailwindClasses: [],
          childrenStructure: [
            {
              type: 'element',
              name: 'div',
              children: [
                {
                  type: 'component',
                  name: 'Button',
                  children: [{ type: 'text', name: 'label' }],
                },
              ],
            },
          ],
        },
      ],
    };

    const parsed = zCodeModel.parse(withChildren);
    const child = parsed.components[0].childrenStructure?.[0].children?.[0]
      .children?.[0];
    expect(child).toMatchObject({ type: 'text', name: 'label' });
  });
});

