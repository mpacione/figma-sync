"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCodeModel = buildCodeModel;
const cssTokens_1 = require("./cssTokens");
const components_1 = require("./components");
const screens_1 = require("./screens");
function buildCodeModel(input) {
    const colorTokens = input.cssFiles.flatMap((file) => (0, cssTokens_1.extractCssColorTokens)(file));
    const radiiTokens = [];
    const spacingTokens = [];
    const typographyTokens = [];
    input.cssFiles.forEach((file) => {
        const extracted = (0, cssTokens_1.extractCssDesignTokens)(file);
        radiiTokens.push(...extracted.radii);
        spacingTokens.push(...extracted.spacing);
        typographyTokens.push(...extracted.typography);
    });
    const tokens = {
        colors: colorTokens,
        radii: radiiTokens,
        spacing: spacingTokens,
        typography: typographyTokens,
    };
    const heuristics = input.config.heuristics;
    const components = input.componentFiles.flatMap((file) => (0, components_1.extractComponentsFromSource)(file.content, file.filePath, heuristics));
    const screens = (0, screens_1.buildScreensForAppRoutes)(input.screenFiles);
    return {
        version: '1.0',
        projectMeta: input.projectMeta,
        tokens,
        components,
        screens,
    };
}
