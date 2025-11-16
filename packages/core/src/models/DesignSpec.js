"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zDesignSpec = exports.zIdMapping = exports.zDesignPageSpec = exports.zDesignPageSection = exports.zDesignPageKind = exports.zDesignScreenSpec = exports.zDesignComponentSpec = exports.zDesignComponentPlacement = exports.zDesignComponentExampleVariant = exports.zDesignComponentPropsModel = exports.zDesignComponentSlotProp = exports.zDesignComponentVariantProp = exports.zDesignComponentCategory = exports.zDesignStylesSpec = exports.zDesignStyle = exports.zDesignVariablesSpec = exports.zDesignVariable = exports.zDesignVariableCollection = exports.zDesignVariableType = void 0;
const zod_1 = require("zod");
const CodeModel_1 = require("./CodeModel");
exports.zDesignVariableType = zod_1.z.enum([
    'COLOR',
    'FLOAT',
    'STRING',
    'BOOLEAN',
]);
exports.zDesignVariableCollection = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
});
exports.zDesignVariable = zod_1.z.object({
    id: zod_1.z.string(),
    collectionId: zod_1.z.string(),
    name: zod_1.z.string(),
    type: exports.zDesignVariableType,
    modeValues: zod_1.z.record(zod_1.z.union([zod_1.z.string(), zod_1.z.number(), zod_1.z.boolean()])),
    scopes: zod_1.z.array(zod_1.z.string()).default([]),
});
exports.zDesignVariablesSpec = zod_1.z.object({
    collections: zod_1.z.array(exports.zDesignVariableCollection),
    variables: zod_1.z.array(exports.zDesignVariable),
});
exports.zDesignStyle = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    type: zod_1.z.enum(['COLOR', 'TEXT', 'EFFECT', 'GRID']),
    description: zod_1.z.string().optional(),
});
exports.zDesignStylesSpec = zod_1.z.object({
    styles: zod_1.z.array(exports.zDesignStyle),
});
exports.zDesignComponentCategory = zod_1.z.enum(['primitive', 'pattern']);
exports.zDesignComponentVariantProp = zod_1.z.object({
    name: zod_1.z.string(),
    type: zod_1.z.enum(['boolean', 'enum']),
    values: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.zDesignComponentSlotProp = zod_1.z.object({
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
});
exports.zDesignComponentPropsModel = zod_1.z.object({
    variantProps: zod_1.z.array(exports.zDesignComponentVariantProp),
    slotProps: zod_1.z.array(exports.zDesignComponentSlotProp),
});
exports.zDesignComponentExampleVariant = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    props: zod_1.z.record(zod_1.z.union([zod_1.z.string(), zod_1.z.boolean()])),
});
exports.zDesignComponentPlacement = zod_1.z.object({
    page: zod_1.z.string(),
    section: zod_1.z.string().optional(),
    gridPosition: zod_1.z
        .object({ row: zod_1.z.number().int(), column: zod_1.z.number().int() })
        .optional(),
});
exports.zDesignComponentSpec = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    category: exports.zDesignComponentCategory,
    sourceComponentName: zod_1.z.string(),
    propsModel: exports.zDesignComponentPropsModel,
    exampleVariants: zod_1.z.array(exports.zDesignComponentExampleVariant),
    placement: exports.zDesignComponentPlacement,
});
exports.zDesignScreenSpec = zod_1.z.object({
    id: zod_1.z.string(),
    route: zod_1.z.string(),
    name: zod_1.z.string(),
    componentsUsed: zod_1.z.array(zod_1.z.string()),
    layoutHints: zod_1.z.record(zod_1.z.string()).default({}),
    states: zod_1.z.array(zod_1.z.string()),
});
exports.zDesignPageKind = zod_1.z.enum([
    'system-primitives',
    'system-patterns',
    'screens',
    'other',
]);
exports.zDesignPageSection = zod_1.z.object({
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
});
exports.zDesignPageSpec = zod_1.z.object({
    name: zod_1.z.string(),
    kind: exports.zDesignPageKind,
    sections: zod_1.z.array(exports.zDesignPageSection).optional(),
});
exports.zIdMapping = zod_1.z.object({
    codeComponentToDesignId: zod_1.z.record(zod_1.z.string()),
    codeTokenToVariableId: zod_1.z.record(zod_1.z.string()),
    routeToScreenId: zod_1.z.record(zod_1.z.string()),
});
exports.zDesignSpec = zod_1.z.object({
    version: zod_1.z.literal('1.0'),
    projectMeta: CodeModel_1.zProjectMeta,
    variables: exports.zDesignVariablesSpec,
    styles: exports.zDesignStylesSpec,
    components: zod_1.z.array(exports.zDesignComponentSpec),
    screens: zod_1.z.array(exports.zDesignScreenSpec),
    pages: zod_1.z.array(exports.zDesignPageSpec),
    mapping: exports.zIdMapping,
});
