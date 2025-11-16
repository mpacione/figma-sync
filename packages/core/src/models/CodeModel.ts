import { z } from 'zod';

export const zFilePosition = z.object({
  filePath: z.string(),
  line: z.number().int().nonnegative(),
  column: z.number().int().nonnegative(),
});
export type FilePosition = z.infer<typeof zFilePosition>;

export const zCodeColorValue = z.object({
  hex: z.string(),
  alpha: z.number().min(0).max(1).optional(),
});
export type CodeColorValue = z.infer<typeof zCodeColorValue>;

export const zCodeColorSource = z.enum(['css-variable', 'tailwind-theme', 'inline']);
export type CodeColorSource = z.infer<typeof zCodeColorSource>;

export const zCodeColorToken = z.object({
  name: z.string(),
  source: zCodeColorSource,
  value: zCodeColorValue,
  darkModeValue: zCodeColorValue.optional(),
  usageCount: z.number().int().nonnegative(),
  locations: z.array(zFilePosition),
});
export type CodeColorToken = z.infer<typeof zCodeColorToken>;

export const zNumericToken = z.object({
  name: z.string(),
  value: z.number(),
  unit: z.string().default('px'),
  usageCount: z.number().int().nonnegative(),
  locations: z.array(zFilePosition),
});
export type NumericToken = z.infer<typeof zNumericToken>;

export const zCodeTypographyToken = z.object({
  name: z.string(),
  fontFamily: z.string(),
  fontSize: z.number(),
  lineHeight: z.number().optional(),
  fontWeight: z.union([z.string(), z.number()]).optional(),
  letterSpacing: z.number().optional(),
  usageCount: z.number().int().nonnegative(),
  locations: z.array(zFilePosition),
});
export type CodeTypographyToken = z.infer<typeof zCodeTypographyToken>;

export const zCodeTokens = z.object({
  colors: z.array(zCodeColorToken),
  radii: z.array(zNumericToken),
  spacing: z.array(zNumericToken),
  typography: z.array(zCodeTypographyToken),
});
export type CodeTokens = z.infer<typeof zCodeTokens>;

export const zCodeComponentKind = z.enum([
  'primitive',
  'pattern',
  'screenFragment',
  'unknown',
]);
export type CodeComponentKind = z.infer<typeof zCodeComponentKind>;

export const zCodeComponentProp = z.object({
  name: z.string(),
  type: z.string(),
  optional: z.boolean().default(false),
  defaultValue: z.string().optional(),
});
export type CodeComponentProp = z.infer<typeof zCodeComponentProp>;

export const zCodeComponentUsageExample = z.object({
  filePath: z.string(),
  snippet: z.string(),
});
export type CodeComponentUsageExample = z.infer<typeof zCodeComponentUsageExample>;

export interface ChildrenStructureNode {
  type: 'element' | 'component' | 'text';
  name?: string;
  children?: ChildrenStructureNode[];
}

export const zChildrenStructureNode: z.ZodType<ChildrenStructureNode> = z.lazy(
  () =>
    z.object({
      type: z.enum(['element', 'component', 'text']),
      name: z.string().optional(),
      children: z.array(zChildrenStructureNode).optional(),
    }),
);

export const zCodeComponent = z.object({
  name: z.string(),
  sourceFile: z.string(),
  exportedName: z.string(),
  kind: zCodeComponentKind,
  props: z.array(zCodeComponentProp),
  usageExamples: z.array(zCodeComponentUsageExample),
  tailwindClasses: z.array(z.string()),
  childrenStructure: z.array(zChildrenStructureNode).optional(),
});
export type CodeComponent = z.infer<typeof zCodeComponent>;

export const zCodeScreen = z.object({
  route: z.string(),
  componentName: z.string(),
  filePath: z.string(),
  usesComponents: z.array(z.string()),
  description: z.string().optional(),
});
export type CodeScreen = z.infer<typeof zCodeScreen>;

export const zProjectMeta = z.object({
  name: z.string(),
  framework: z.enum(['nextjs', 'react', 'other']),
  tailwindEnabled: z.boolean().default(true),
});
export type ProjectMeta = z.infer<typeof zProjectMeta>;

export const zCodeModel = z.object({
  version: z.literal('1.0'),
  projectMeta: zProjectMeta,
  tokens: zCodeTokens,
  components: z.array(zCodeComponent),
  screens: z.array(zCodeScreen),
});
export type CodeModel = z.infer<typeof zCodeModel>;

