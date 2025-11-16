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
});

