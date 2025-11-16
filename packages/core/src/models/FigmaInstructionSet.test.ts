import { describe, it, expect } from 'vitest';
import { zFigmaInstructionSet } from './FigmaInstructionSet';

describe('zFigmaInstructionSet', () => {
  const base = {
    version: '1.0' as const,
    operations: [
      {
        id: 'op1',
        type: 'CreatePage' as const,
        pageId: 'page1',
        name: 'System/Primitives',
        kind: 'system-primitives' as const,
        index: 0,
      },
      {
        id: 'op2',
        type: 'CreateVariableCollection' as const,
        collectionId: 'vc1',
        name: 'Colors',
      },
      {
        id: 'op3',
        type: 'CreateVariable' as const,
        variableId: 'v1',
        collectionId: 'vc1',
        name: 'primary',
        variableType: 'COLOR' as const,
        modeValues: { default: '#ffffff' },
        scopes: [],
      },
      {
        id: 'op4',
        type: 'RenameNode' as const,
        nodeId: 'n1',
        name: 'New Name',
      },
    ],
  };

  it('accepts a valid FigmaInstructionSet', () => {
    const parsed = zFigmaInstructionSet.parse(base);
    expect(parsed).toEqual(base);
  });

  it('rejects invalid version', () => {
    const invalid = { ...base, version: '0.9' };
    expect(() => zFigmaInstructionSet.parse(invalid)).toThrow();
  });
});

