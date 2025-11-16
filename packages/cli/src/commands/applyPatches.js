"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runApplyPatches = runApplyPatches;
const node_path_1 = __importDefault(require("node:path"));
const figma_sync_core_1 = require("figma-sync-core");
async function runApplyPatches(configPath, deps) {
    const config = await deps.loadConfigFromFile(configPath);
    // Config is currently unused but validated via loadConfigFromFile.
    void config;
    const artifactsDir = node_path_1.default.resolve(deps.cwd, 'artifacts');
    const patchesPath = node_path_1.default.join(artifactsDir, 'code-patches.json');
    const exists = await deps.fileExists(patchesPath);
    if (!exists) {
        throw new Error(`code-patches.json not found at ${patchesPath}`);
    }
    const rawPatchSet = await deps.readFile(patchesPath);
    const patchSet = figma_sync_core_1.zCodePatchSet.parse(JSON.parse(rawPatchSet));
    const files = {};
    const filePaths = new Set();
    for (const patch of patchSet.patches) {
        for (const hunk of patch.hunks) {
            filePaths.add(hunk.filePath);
        }
    }
    for (const relPath of filePaths) {
        const absPath = node_path_1.default.resolve(deps.cwd, relPath);
        files[relPath] = await deps.readFile(absPath);
    }
    const result = (0, figma_sync_core_1.applyCodePatchSetToFiles)(patchSet, files);
    if (result.changes.length === 0) {
        deps.log?.('No changes to apply from code-patches.json');
        return;
    }
    for (const change of result.changes) {
        const absPath = node_path_1.default.resolve(deps.cwd, change.filePath);
        await deps.writeFile(absPath, change.content);
        deps.log?.(`Applied patches to ${change.filePath}`);
    }
}
