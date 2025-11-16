"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zFigmaInstructionSet = exports.zFigmaOperation = exports.zFigmaOperationType = void 0;
const zod_1 = require("zod");
exports.zFigmaOperationType = zod_1.z.enum([
    'CreatePage',
    'EnsurePage',
    'CreateVariableCollection',
    'CreateVariable',
    'CreateComponent',
    'CreateComponentSet',
    'CreateVariant',
    'CreateFrame',
    'CreateScreenFrame',
    'ApplyVariablesToLayers',
    'ReparentNode',
    'RenameNode',
]);
const zBaseOperation = zod_1.z.object({
    id: zod_1.z.string(),
    type: exports.zFigmaOperationType,
    description: zod_1.z.string().optional(),
});
const zCreatePageOp = zBaseOperation.extend({
    type: zod_1.z.literal('CreatePage'),
    pageId: zod_1.z.string(),
    name: zod_1.z.string(),
    kind: zod_1.z
        .enum(['system-primitives', 'system-patterns', 'screens', 'other'])
        .optional(),
    index: zod_1.z.number().int().nonnegative().optional(),
});
const zEnsurePageOp = zBaseOperation.extend({
    type: zod_1.z.literal('EnsurePage'),
    pageId: zod_1.z.string(),
    name: zod_1.z.string(),
});
const zCreateVariableCollectionOp = zBaseOperation.extend({
    type: zod_1.z.literal('CreateVariableCollection'),
    collectionId: zod_1.z.string(),
    name: zod_1.z.string(),
});
const zCreateVariableOp = zBaseOperation.extend({
    type: zod_1.z.literal('CreateVariable'),
    variableId: zod_1.z.string(),
    collectionId: zod_1.z.string(),
    name: zod_1.z.string(),
    variableType: zod_1.z.enum(['COLOR', 'FLOAT', 'STRING', 'BOOLEAN']),
    modeValues: zod_1.z.record(zod_1.z.union([zod_1.z.string(), zod_1.z.number(), zod_1.z.boolean()])),
    scopes: zod_1.z.array(zod_1.z.string()).default([]),
});
const zCreateComponentOp = zBaseOperation.extend({
    type: zod_1.z.literal('CreateComponent'),
    componentId: zod_1.z.string(),
    designComponentId: zod_1.z.string(),
    pageId: zod_1.z.string(),
    name: zod_1.z.string(),
});
const zCreateComponentSetOp = zBaseOperation.extend({
    type: zod_1.z.literal('CreateComponentSet'),
    componentSetId: zod_1.z.string(),
    componentIds: zod_1.z.array(zod_1.z.string()),
});
const zCreateVariantOp = zBaseOperation.extend({
    type: zod_1.z.literal('CreateVariant'),
    variantComponentId: zod_1.z.string(),
    componentSetId: zod_1.z.string(),
    props: zod_1.z.record(zod_1.z.union([zod_1.z.string(), zod_1.z.boolean()])),
});
const zCreateFrameOp = zBaseOperation.extend({
    type: zod_1.z.literal('CreateFrame'),
    frameId: zod_1.z.string(),
    pageId: zod_1.z.string(),
    name: zod_1.z.string(),
});
const zCreateScreenFrameOp = zBaseOperation.extend({
    type: zod_1.z.literal('CreateScreenFrame'),
    frameId: zod_1.z.string(),
    pageId: zod_1.z.string(),
    screenId: zod_1.z.string(),
    name: zod_1.z.string(),
});
const zApplyVariablesToLayersOp = zBaseOperation.extend({
    type: zod_1.z.literal('ApplyVariablesToLayers'),
    bindings: zod_1.z.array(zod_1.z.object({
        nodeRefId: zod_1.z.string(),
        property: zod_1.z.string(),
        variableId: zod_1.z.string(),
    })),
});
const zReparentNodeOp = zBaseOperation.extend({
    type: zod_1.z.literal('ReparentNode'),
    nodeId: zod_1.z.string(),
    newParentId: zod_1.z.string(),
});
const zRenameNodeOp = zBaseOperation.extend({
    type: zod_1.z.literal('RenameNode'),
    nodeId: zod_1.z.string(),
    name: zod_1.z.string(),
});
exports.zFigmaOperation = zod_1.z.discriminatedUnion('type', [
    zCreatePageOp,
    zEnsurePageOp,
    zCreateVariableCollectionOp,
    zCreateVariableOp,
    zCreateComponentOp,
    zCreateComponentSetOp,
    zCreateVariantOp,
    zCreateFrameOp,
    zCreateScreenFrameOp,
    zApplyVariablesToLayersOp,
    zReparentNodeOp,
    zRenameNodeOp,
]);
exports.zFigmaInstructionSet = zod_1.z.object({
    version: zod_1.z.literal('1.0'),
    operations: zod_1.z.array(exports.zFigmaOperation),
});
