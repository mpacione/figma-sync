"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zFigmaSyncConfig = void 0;
const zod_1 = require("zod");
exports.zFigmaSyncConfig = zod_1.z.object({
    projectName: zod_1.z.string(),
    paths: zod_1.z.object({
        uiComponentsGlob: zod_1.z.string(),
        screenComponentsGlob: zod_1.z.string(),
        cssVariablesFiles: zod_1.z.array(zod_1.z.string()).nonempty(),
        tailwindConfig: zod_1.z.string(),
    }),
    figma: zod_1.z.object({
        fileKey: zod_1.z.string(),
        pages: zod_1.z.object({
            primitives: zod_1.z.string(),
            patterns: zod_1.z.string(),
            screens: zod_1.z.string(),
        }),
    }),
    llm: zod_1.z.object({
        provider: zod_1.z.string(),
        model: zod_1.z.string(),
        temperature: zod_1.z.number().min(0).max(2),
        maxTokens: zod_1.z.number().int().positive(),
    }),
    heuristics: zod_1.z.object({
        primitiveComponentPatterns: zod_1.z.array(zod_1.z.string()),
        excludeComponents: zod_1.z.array(zod_1.z.string()),
    }),
});
