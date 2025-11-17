/**
 * Type definitions for figma-sync plugin.
 * These are copied from figma-sync-core to avoid bundling Zod.
 * The CLI validates data before sending it to the plugin.
 */

export type FigmaOperationType =
  | 'CreatePage'
  | 'EnsurePage'
  | 'CreateVariableCollection'
  | 'CreateVariable'
  | 'CreateComponent'
  | 'CreateComponentSet'
  | 'CreateVariant'
  | 'CreateFrame'
  | 'CreateScreenFrame'
  | 'ApplyVariablesToLayers'
  | 'ReparentNode'
  | 'RenameNode';

interface BaseOperation {
  id: string;
  type: FigmaOperationType;
  description?: string;
}

export interface CreatePageOp extends BaseOperation {
  type: 'CreatePage';
  pageId: string;
  name: string;
  kind?: 'system-primitives' | 'system-patterns' | 'screens' | 'other';
  index?: number;
}

export interface EnsurePageOp extends BaseOperation {
  type: 'EnsurePage';
  pageId: string;
  name: string;
}

export interface CreateVariableCollectionOp extends BaseOperation {
  type: 'CreateVariableCollection';
  collectionId: string;
  name: string;
}

export interface CreateVariableOp extends BaseOperation {
  type: 'CreateVariable';
  variableId: string;
  collectionId: string;
  name: string;
  variableType: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';
  modeValues: Record<string, string | number | boolean>;
  scopes?: string[];
}

export interface CreateComponentOp extends BaseOperation {
  type: 'CreateComponent';
  componentId: string;
  designComponentId: string;
  pageId: string;
  name: string;
}

export interface CreateComponentSetOp extends BaseOperation {
  type: 'CreateComponentSet';
  componentSetId: string;
  componentIds: string[];
}

export interface CreateVariantOp extends BaseOperation {
  type: 'CreateVariant';
  variantComponentId: string;
  componentSetId: string;
  props: Record<string, string | boolean>;
}

export interface CreateFrameOp extends BaseOperation {
  type: 'CreateFrame';
  frameId: string;
  pageId: string;
  name: string;
}

export interface CreateScreenFrameOp extends BaseOperation {
  type: 'CreateScreenFrame';
  frameId: string;
  pageId: string;
  screenId: string;
  name: string;
}

export interface ApplyVariablesToLayersOp extends BaseOperation {
  type: 'ApplyVariablesToLayers';
  bindings: Array<{
    nodeRefId: string;
    property: string;
    variableId: string;
  }>;
}

export interface ReparentNodeOp extends BaseOperation {
  type: 'ReparentNode';
  nodeId: string;
  newParentId: string;
}

export interface RenameNodeOp extends BaseOperation {
  type: 'RenameNode';
  nodeId: string;
  name: string;
}

export type FigmaOperation =
  | CreatePageOp
  | EnsurePageOp
  | CreateVariableCollectionOp
  | CreateVariableOp
  | CreateComponentOp
  | CreateComponentSetOp
  | CreateVariantOp
  | CreateFrameOp
  | CreateScreenFrameOp
  | ApplyVariablesToLayersOp
  | ReparentNodeOp
  | RenameNodeOp;

export interface FigmaInstructionSet {
  version: '1.0';
  operations: FigmaOperation[];
}

export interface FigmaChangeSet {
  version: '1.0';
  changes: Array<{
    nodeId: string;
    changeType: 'rename' | 'reparent' | 'create' | 'delete';
    oldValue?: string;
    newValue?: string;
  }>;
}

