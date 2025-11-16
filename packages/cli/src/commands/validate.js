"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runValidate = runValidate;
const node_path_1 = __importDefault(require("node:path"));
const figma_sync_core_1 = require("figma-sync-core");
async function validateJsonFile(label, filePath, deps, schema) {
    const { log } = deps;
    const exists = await deps.fileExists(filePath);
    if (!exists) {
        log?.(`${label}: ${filePath} (missing, skipping)`);
        return;
    }
    const raw = await deps.readFile(filePath);
    const parsed = JSON.parse(raw);
    schema.parse(parsed);
    log?.(`${label}: ${filePath} (valid)`);
}
async function runValidate(configPath, deps) {
    // Config validation happens inside loadConfigFromFile via zod.
    const config = await deps.loadConfigFromFile(configPath);
    figma_sync_core_1.zFigmaSyncConfig.parse(config);
    const artifactsDir = node_path_1.default.resolve(deps.cwd, 'artifacts');
    await validateJsonFile('CodeModel', node_path_1.default.join(artifactsDir, 'code-model.json'), deps, figma_sync_core_1.zCodeModel);
    await validateJsonFile('DesignSpec', node_path_1.default.join(artifactsDir, 'design-spec.json'), deps, figma_sync_core_1.zDesignSpec);
    await validateJsonFile('FigmaInstructionSet', node_path_1.default.join(artifactsDir, 'figma-instructions.json'), deps, figma_sync_core_1.zFigmaInstructionSet);
    await validateJsonFile('CodePatchSet', node_path_1.default.join(artifactsDir, 'code-patches.json'), deps, figma_sync_core_1.zCodePatchSet);
}
