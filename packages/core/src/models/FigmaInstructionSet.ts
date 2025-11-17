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

const zFigmaColor = z.object({
  r: z.number().min(0).max(1),
  g: z.number().min(0).max(1),
  b: z.number().min(0).max(1),
  a: z.number().min(0).max(1).optional(),
});

const zFigmaPaint = z.object({
  type: z.enum(['SOLID']),
  color: zFigmaColor,
  opacity: z.number().min(0).max(1).optional(),
});

const zTextProperties = z.object({
  fontFamily: z.string().optional(),
  fontWeight: z.number().optional(),
  fontSize: z.number().optional(),
  textColor: zFigmaColor.optional(),
}).optional();

const zVisualProperties = z.object({
  fills: z.array(zFigmaPaint).optional(),
  strokes: z.array(zFigmaPaint).optional(),
  strokeWeight: z.number().optional(),
  cornerRadius: z.number().optional(),
  paddingLeft: z.number().optional(),
  paddingRight: z.number().optional(),
  paddingTop: z.number().optional(),
  paddingBottom: z.number().optional(),
  minWidth: z.number().optional(),
  minHeight: z.number().optional(),
  // Auto-layout properties
  layoutMode: z.enum(['NONE', 'HORIZONTAL', 'VERTICAL']).optional(),
  primaryAxisSizingMode: z.enum(['FIXED', 'AUTO']).optional(),
  counterAxisSizingMode: z.enum(['FIXED', 'AUTO']).optional(),
  primaryAxisAlignItems: z.enum(['MIN', 'CENTER', 'MAX', 'SPACE_BETWEEN']).optional(),
  counterAxisAlignItems: z.enum(['MIN', 'CENTER', 'MAX', 'BASELINE']).optional(),
  itemSpacing: z.number().optional(),
  // Text properties
  textProperties: zTextProperties,
}).optional();

const zCreateComponentOp = zBaseOperation.extend({
  type: z.literal('CreateComponent'),
  componentId: z.string(),
  designComponentId: z.string(),
  pageId: z.string(),
  name: z.string(),
  visualProperties: zVisualProperties,
  x: z.number().optional(),
  y: z.number().optional(),
});

const zCreateComponentSetOp = zBaseOperation.extend({
  type: z.literal('CreateComponentSet'),
  componentSetId: z.string(),
  componentIds: z.array(z.string()),
  x: z.number().optional(),
  y: z.number().optional(),
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
  width: z.number().optional(),
  height: z.number().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  description: z.string().optional(),
  componentCount: z.number().optional(),
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

