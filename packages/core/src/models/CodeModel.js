"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zCodeModel = exports.zProjectMeta = exports.zCodeScreen = exports.zCodeComponent = exports.zChildrenStructureNode = exports.zCodeComponentUsageExample = exports.zCodeComponentProp = exports.zCodeComponentKind = exports.zCodeTokens = exports.zCodeTypographyToken = exports.zNumericToken = exports.zCodeColorToken = exports.zCodeColorSource = exports.zCodeColorValue = exports.zFilePosition = void 0;
const zod_1 = require("zod");
exports.zFilePosition = zod_1.z.object({
    filePath: zod_1.z.string(),
    line: zod_1.z.number().int().nonnegative(),
    column: zod_1.z.number().int().nonnegative(),
});
exports.zCodeColorValue = zod_1.z.object({
    hex: zod_1.z.string(),
    alpha: zod_1.z.number().min(0).max(1).optional(),
});
exports.zCodeColorSource = zod_1.z.enum(['css-variable', 'tailwind-theme', 'inline']);
exports.zCodeColorToken = zod_1.z.object({
    name: zod_1.z.string(),
    source: exports.zCodeColorSource,
    value: exports.zCodeColorValue,
    darkModeValue: exports.zCodeColorValue.optional(),
    usageCount: zod_1.z.number().int().nonnegative(),
    locations: zod_1.z.array(exports.zFilePosition),
});
exports.zNumericToken = zod_1.z.object({
    name: zod_1.z.string(),
    value: zod_1.z.number(),
    unit: zod_1.z.string().default('px'),
    usageCount: zod_1.z.number().int().nonnegative(),
    locations: zod_1.z.array(exports.zFilePosition),
});
exports.zCodeTypographyToken = zod_1.z.object({
    name: zod_1.z.string(),
    fontFamily: zod_1.z.string(),
    fontSize: zod_1.z.number(),
    lineHeight: zod_1.z.number().optional(),
    fontWeight: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional(),
    letterSpacing: zod_1.z.number().optional(),
    usageCount: zod_1.z.number().int().nonnegative(),
    locations: zod_1.z.array(exports.zFilePosition),
});
exports.zCodeTokens = zod_1.z.object({
    colors: zod_1.z.array(exports.zCodeColorToken),
    radii: zod_1.z.array(exports.zNumericToken),
    spacing: zod_1.z.array(exports.zNumericToken),
    typography: zod_1.z.array(exports.zCodeTypographyToken),
});
exports.zCodeComponentKind = zod_1.z.enum([
    'primitive',
    'pattern',
    'screenFragment',
    'unknown',
]);
exports.zCodeComponentProp = zod_1.z.object({
    name: zod_1.z.string(),
    type: zod_1.z.string(),
    optional: zod_1.z.boolean().default(false),
    defaultValue: zod_1.z.string().optional(),
});
exports.zCodeComponentUsageExample = zod_1.z.object({
    filePath: zod_1.z.string(),
    snippet: zod_1.z.string(),
});
exports.zChildrenStructureNode = zod_1.z.lazy(() => zod_1.z.object({
    type: zod_1.z.enum(['element', 'component', 'text']),
    name: zod_1.z.string().optional(),
    children: zod_1.z.array(exports.zChildrenStructureNode).optional(),
}));
exports.zCodeComponent = zod_1.z.object({
    name: zod_1.z.string(),
    sourceFile: zod_1.z.string(),
    exportedName: zod_1.z.string(),
    kind: exports.zCodeComponentKind,
    props: zod_1.z.array(exports.zCodeComponentProp),
    usageExamples: zod_1.z.array(exports.zCodeComponentUsageExample),
    tailwindClasses: zod_1.z.array(zod_1.z.string()),
    childrenStructure: zod_1.z.array(exports.zChildrenStructureNode).optional(),
});
exports.zCodeScreen = zod_1.z.object({
    route: zod_1.z.string(),
    componentName: zod_1.z.string(),
    filePath: zod_1.z.string(),
    usesComponents: zod_1.z.array(zod_1.z.string()),
    description: zod_1.z.string().optional(),
});
exports.zProjectMeta = zod_1.z.object({
    name: zod_1.z.string(),
    framework: zod_1.z.enum(['nextjs', 'react', 'other']),
    tailwindEnabled: zod_1.z.boolean().default(true),
});
exports.zCodeModel = zod_1.z.object({
    version: zod_1.z.literal('1.0'),
    projectMeta: exports.zProjectMeta,
    tokens: exports.zCodeTokens,
    components: zod_1.z.array(exports.zCodeComponent),
    screens: zod_1.z.array(exports.zCodeScreen),
});
