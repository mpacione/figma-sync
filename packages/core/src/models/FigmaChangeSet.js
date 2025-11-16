"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zFigmaChangeSet = exports.zFigmaChange = exports.zFigmaChangeType = void 0;
const zod_1 = require("zod");
exports.zFigmaChangeType = zod_1.z.enum([
    'RenameComponent',
    'RenameScreen',
    'UpdateVariable',
]);
const zBaseChange = zod_1.z.object({
    id: zod_1.z.string(),
    type: exports.zFigmaChangeType,
    description: zod_1.z.string().optional(),
});
const zRenameComponentChange = zBaseChange.extend({
    type: zod_1.z.literal('RenameComponent'),
    componentId: zod_1.z.string(),
    newName: zod_1.z.string(),
});
const zRenameScreenChange = zBaseChange.extend({
    type: zod_1.z.literal('RenameScreen'),
    screenId: zod_1.z.string(),
    newName: zod_1.z.string(),
});
const zUpdateVariableChange = zBaseChange.extend({
    type: zod_1.z.literal('UpdateVariable'),
    variableId: zod_1.z.string(),
    variableName: zod_1.z.string(),
    newValue: zod_1.z.union([zod_1.z.string(), zod_1.z.number(), zod_1.z.boolean()]),
    modeId: zod_1.z.string().optional(),
});
exports.zFigmaChange = zod_1.z.discriminatedUnion('type', [
    zRenameComponentChange,
    zRenameScreenChange,
    zUpdateVariableChange,
]);
exports.zFigmaChangeSet = zod_1.z.object({
    version: zod_1.z.literal('1.0'),
    changes: zod_1.z.array(exports.zFigmaChange),
});
