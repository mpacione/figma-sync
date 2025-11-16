import { z } from 'zod';

export const zFigmaChangeType = z.enum([
  'RenameComponent',
  'RenameScreen',
  'UpdateVariable',
]);
export type FigmaChangeType = z.infer<typeof zFigmaChangeType>;

const zBaseChange = z.object({
  id: z.string(),
  type: zFigmaChangeType,
  description: z.string().optional(),
});

const zRenameComponentChange = zBaseChange.extend({
  type: z.literal('RenameComponent'),
  componentId: z.string(),
  newName: z.string(),
});

const zRenameScreenChange = zBaseChange.extend({
  type: z.literal('RenameScreen'),
  screenId: z.string(),
  newName: z.string(),
});

const zUpdateVariableChange = zBaseChange.extend({
  type: z.literal('UpdateVariable'),
  variableId: z.string(),
  variableName: z.string(),
  newValue: z.union([z.string(), z.number(), z.boolean()]),
  modeId: z.string().optional(),
});

export const zFigmaChange = z.discriminatedUnion('type', [
  zRenameComponentChange,
  zRenameScreenChange,
  zUpdateVariableChange,
]);
export type FigmaChange = z.infer<typeof zFigmaChange>;

export const zFigmaChangeSet = z.object({
  version: z.literal('1.0'),
  changes: z.array(zFigmaChange),
});
export type FigmaChangeSet = z.infer<typeof zFigmaChangeSet>;

