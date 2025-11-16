"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runGeneratePatches = runGeneratePatches;
const node_path_1 = __importDefault(require("node:path"));
const figma_sync_core_1 = require("figma-sync-core");
async function runGeneratePatches(configPath, deps) {
    const config = await deps.loadConfigFromFile(configPath);
    // Config is currently unused but validated via loadConfigFromFile.
    void config;
    const artifactsDir = node_path_1.default.resolve(deps.cwd, 'artifacts');
    const codeModelPath = node_path_1.default.join(artifactsDir, 'code-model.json');
    const designSpecPath = node_path_1.default.join(artifactsDir, 'design-spec.json');
    const rawCodeModel = await deps.readFile(codeModelPath);
    const rawDesignSpec = await deps.readFile(designSpecPath);
    const rawChanges = await deps.readStdin();
    const codeModel = figma_sync_core_1.zCodeModel.parse(JSON.parse(rawCodeModel));
    const designSpec = figma_sync_core_1.zDesignSpec.parse(JSON.parse(rawDesignSpec));
    const changeSet = figma_sync_core_1.zFigmaChangeSet.parse(JSON.parse(rawChanges));
    const patchSet = (0, figma_sync_core_1.buildCodePatchesForChanges)(codeModel, designSpec, changeSet);
    const patchesPath = node_path_1.default.join(artifactsDir, 'code-patches.json');
    await deps.writeFile(patchesPath, JSON.stringify(patchSet, null, 2));
}
