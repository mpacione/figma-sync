import { z } from 'zod';
import { zProjectMeta } from './CodeModel';

export const zDesignVariableType = z.enum([
  'COLOR',
  'FLOAT',
  'STRING',
  'BOOLEAN',
]);
export type DesignVariableType = z.infer<typeof zDesignVariableType>;

export const zDesignVariableCollection = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
});
export type DesignVariableCollection = z.infer<
  typeof zDesignVariableCollection
>;

export const zDesignVariable = z.object({
  id: z.string(),
  collectionId: z.string(),
  name: z.string(),
  type: zDesignVariableType,
  modeValues: z.record(
    z.union([z.string(), z.number(), z.boolean()]),
  ),
  scopes: z.array(z.string()).default([]),
});
export type DesignVariable = z.infer<typeof zDesignVariable>;

export const zDesignVariablesSpec = z.object({
  collections: z.array(zDesignVariableCollection),
  variables: z.array(zDesignVariable),
});
export type DesignVariablesSpec = z.infer<typeof zDesignVariablesSpec>;

export const zDesignStyle = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['COLOR', 'TEXT', 'EFFECT', 'GRID']),
  description: z.string().optional(),
});
export type DesignStyle = z.infer<typeof zDesignStyle>;

export const zDesignStylesSpec = z.object({
  styles: z.array(zDesignStyle),
});
export type DesignStylesSpec = z.infer<typeof zDesignStylesSpec>;

export const zDesignComponentCategory = z.enum(['primitive', 'pattern']);
export type DesignComponentCategory = z.infer<
  typeof zDesignComponentCategory
>;

export const zDesignComponentVariantProp = z.object({
  name: z.string(),
  type: z.enum(['boolean', 'enum']),
  values: z.array(z.string()).optional(),
});
export type DesignComponentVariantProp = z.infer<
  typeof zDesignComponentVariantProp
>;

export const zDesignComponentSlotProp = z.object({
  name: z.string(),
  description: z.string().optional(),
});
export type DesignComponentSlotProp = z.infer<
  typeof zDesignComponentSlotProp
>;

export const zDesignComponentPropsModel = z.object({
  variantProps: z.array(zDesignComponentVariantProp),
  slotProps: z.array(zDesignComponentSlotProp),
});
export type DesignComponentPropsModel = z.infer<
  typeof zDesignComponentPropsModel
>;

export const zDesignComponentExampleVariant = z.object({
  id: z.string(),
  name: z.string(),
  props: z.record(z.union([z.string(), z.boolean()])),
});
export type DesignComponentExampleVariant = z.infer<
  typeof zDesignComponentExampleVariant
>;

export const zDesignComponentPlacement = z.object({
  page: z.string(),
  section: z.string().optional(),
  gridPosition: z
    .object({ row: z.number().int(), column: z.number().int() })
    .optional(),
});
export type DesignComponentPlacement = z.infer<
  typeof zDesignComponentPlacement
>;

export const zDesignComponentSpec = z.object({
  id: z.string(),
  name: z.string(),
  category: zDesignComponentCategory,
  sourceComponentName: z.string(),
  propsModel: zDesignComponentPropsModel,
  exampleVariants: z.array(zDesignComponentExampleVariant),
  placement: zDesignComponentPlacement,
});
export type DesignComponentSpec = z.infer<typeof zDesignComponentSpec>;

export const zDesignScreenSpec = z.object({
  id: z.string(),
  route: z.string(),
  name: z.string(),
  componentsUsed: z.array(z.string()),
  layoutHints: z.record(z.string()).default({}),
  states: z.array(z.string()),
});
export type DesignScreenSpec = z.infer<typeof zDesignScreenSpec>;

export const zDesignPageKind = z.enum([
  'system-primitives',
  'system-patterns',
  'screens',
  'other',
]);
export type DesignPageKind = z.infer<typeof zDesignPageKind>;

export const zDesignPageSection = z.object({
  name: z.string(),
  description: z.string().optional(),
});
export type DesignPageSection = z.infer<typeof zDesignPageSection>;

export const zDesignPageSpec = z.object({
  name: z.string(),
  kind: zDesignPageKind,
  sections: z.array(zDesignPageSection).optional(),
});
export type DesignPageSpec = z.infer<typeof zDesignPageSpec>;

export const zIdMapping = z.object({
  codeComponentToDesignId: z.record(z.string()),
  codeTokenToVariableId: z.record(z.string()),
  routeToScreenId: z.record(z.string()),
});
export type IdMapping = z.infer<typeof zIdMapping>;

export const zDesignSpec = z.object({
  version: z.literal('1.0'),
  projectMeta: zProjectMeta,
  variables: zDesignVariablesSpec,
  styles: zDesignStylesSpec,
  components: z.array(zDesignComponentSpec),
  screens: z.array(zDesignScreenSpec),
  pages: z.array(zDesignPageSpec),
  mapping: zIdMapping,
});
export type DesignSpec = z.infer<typeof zDesignSpec>;

