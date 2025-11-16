import { z } from 'zod';

export const zFigmaOperationType = z.enum([
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
export type FigmaOperationType = z.infer<typeof zFigmaOperationType>;

const zBaseOperation = z.object({
  id: z.string(),
  type: zFigmaOperationType,
  description: z.string().optional(),
});

const zCreatePageOp = zBaseOperation.extend({
  type: z.literal('CreatePage'),
  pageId: z.string(),
  name: z.string(),
  kind: z
    .enum(['system-primitives', 'system-patterns', 'screens', 'other'])
    .optional(),
  index: z.number().int().nonnegative().optional(),
});

const zEnsurePageOp = zBaseOperation.extend({
  type: z.literal('EnsurePage'),
  pageId: z.string(),
  name: z.string(),
});

const zCreateVariableCollectionOp = zBaseOperation.extend({
  type: z.literal('CreateVariableCollection'),
  collectionId: z.string(),
  name: z.string(),
});

const zCreateVariableOp = zBaseOperation.extend({
  type: z.literal('CreateVariable'),
  variableId: z.string(),
  collectionId: z.string(),
  name: z.string(),
  variableType: z.enum(['COLOR', 'FLOAT', 'STRING', 'BOOLEAN']),
  modeValues: z.record(
    z.union([z.string(), z.number(), z.boolean()]),
  ),
  scopes: z.array(z.string()).default([]),
});

const zCreateComponentOp = zBaseOperation.extend({
  type: z.literal('CreateComponent'),
  componentId: z.string(),
  designComponentId: z.string(),
  pageId: z.string(),
  name: z.string(),
});

const zCreateComponentSetOp = zBaseOperation.extend({
  type: z.literal('CreateComponentSet'),
  componentSetId: z.string(),
  componentIds: z.array(z.string()),
});

const zCreateVariantOp = zBaseOperation.extend({
  type: z.literal('CreateVariant'),
  variantComponentId: z.string(),
  componentSetId: z.string(),
  props: z.record(z.union([z.string(), z.boolean()])),
});

const zCreateFrameOp = zBaseOperation.extend({
  type: z.literal('CreateFrame'),
  frameId: z.string(),
  pageId: z.string(),
  name: z.string(),
});

const zCreateScreenFrameOp = zBaseOperation.extend({
  type: z.literal('CreateScreenFrame'),
  frameId: z.string(),
  pageId: z.string(),
  screenId: z.string(),
  name: z.string(),
});

const zApplyVariablesToLayersOp = zBaseOperation.extend({
  type: z.literal('ApplyVariablesToLayers'),
  bindings: z.array(
    z.object({
      nodeRefId: z.string(),
      property: z.string(),
      variableId: z.string(),
    }),
  ),
});

const zReparentNodeOp = zBaseOperation.extend({
  type: z.literal('ReparentNode'),
  nodeId: z.string(),
  newParentId: z.string(),
});

const zRenameNodeOp = zBaseOperation.extend({
  type: z.literal('RenameNode'),
  nodeId: z.string(),
  name: z.string(),
});

export const zFigmaOperation = z.discriminatedUnion('type', [
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
export type FigmaOperation = z.infer<typeof zFigmaOperation>;

export const zFigmaInstructionSet = z.object({
  version: z.literal('1.0'),
  operations: z.array(zFigmaOperation),
});
export type FigmaInstructionSet = z.infer<typeof zFigmaInstructionSet>;

