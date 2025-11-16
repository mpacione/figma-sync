import { describe, it, expect } from 'vitest';
import { zFigmaChangeSet } from './FigmaChangeSet';

describe('FigmaChangeSet', () => {
  it('validates rename component and screen changes', () => {
    const changes = zFigmaChangeSet.parse({
      version: '1.0',
      changes: [
        {
          id: 'chg-1',
          type: 'RenameComponent',
          componentId: 'comp-1',
          newName: 'PrimaryButton',
        },
        {
          id: 'chg-2',
          type: 'RenameScreen',
          screenId: 'screen-1',
          newName: 'Login (v2)',
        },
      ],
    });

    expect(changes.changes).toHaveLength(2);
    expect(changes.changes[0]?.type).toBe('RenameComponent');
    expect(changes.changes[1]?.type).toBe('RenameScreen');
  });

  it('validates UpdateVariable changes', () => {
    const changes = zFigmaChangeSet.parse({
      version: '1.0',
      changes: [
        {
          id: 'chg-3',
          type: 'UpdateVariable',
          variableId: 'var-1',
          variableName: '--primary',
          newValue: '#000000',
          modeId: 'mode-default',
        },
      ],
    });

    expect(changes.changes).toHaveLength(1);
    expect(changes.changes[0]?.type).toBe('UpdateVariable');
  });
});

