"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const FigmaInstructionSet_1 = require("./FigmaInstructionSet");
(0, vitest_1.describe)('zFigmaInstructionSet', () => {
    const base = {
        version: '1.0',
        operations: [
            {
                id: 'op1',
                type: 'CreatePage',
                pageId: 'page1',
                name: 'System/Primitives',
                kind: 'system-primitives',
                index: 0,
            },
            {
                id: 'op2',
                type: 'CreateVariableCollection',
                collectionId: 'vc1',
                name: 'Colors',
            },
            {
                id: 'op3',
                type: 'CreateVariable',
                variableId: 'v1',
                collectionId: 'vc1',
                name: 'primary',
                variableType: 'COLOR',
                modeValues: { default: '#ffffff' },
                scopes: [],
            },
            {
                id: 'op4',
                type: 'RenameNode',
                nodeId: 'n1',
                name: 'New Name',
            },
        ],
    };
    (0, vitest_1.it)('accepts a valid FigmaInstructionSet', () => {
        const parsed = FigmaInstructionSet_1.zFigmaInstructionSet.parse(base);
        (0, vitest_1.expect)(parsed).toEqual(base);
    });
    (0, vitest_1.it)('rejects invalid version', () => {
        const invalid = { ...base, version: '0.9' };
        (0, vitest_1.expect)(() => FigmaInstructionSet_1.zFigmaInstructionSet.parse(invalid)).toThrow();
    });
});
