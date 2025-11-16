"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const FigmaChangeSet_1 = require("./FigmaChangeSet");
(0, vitest_1.describe)('FigmaChangeSet', () => {
    (0, vitest_1.it)('validates rename component and screen changes', () => {
        const changes = FigmaChangeSet_1.zFigmaChangeSet.parse({
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
        (0, vitest_1.expect)(changes.changes).toHaveLength(2);
        (0, vitest_1.expect)(changes.changes[0]?.type).toBe('RenameComponent');
        (0, vitest_1.expect)(changes.changes[1]?.type).toBe('RenameScreen');
    });
    (0, vitest_1.it)('validates UpdateVariable changes', () => {
        const changes = FigmaChangeSet_1.zFigmaChangeSet.parse({
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
        (0, vitest_1.expect)(changes.changes).toHaveLength(1);
        (0, vitest_1.expect)(changes.changes[0]?.type).toBe('UpdateVariable');
    });
});
