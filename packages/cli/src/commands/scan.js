"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runScan = runScan;
const node_path_1 = __importDefault(require("node:path"));
const figma_sync_core_1 = require("figma-sync-core");
async function runScan(configPath, deps) {
    const config = await deps.loadConfigFromFile(configPath);
    const projectMeta = {
        name: config.projectName,
        framework: 'nextjs',
        tailwindEnabled: true,
    };
    const cssFiles = [];
    for (const rel of config.paths.cssVariablesFiles) {
        const abs = node_path_1.default.resolve(deps.cwd, rel);
        const content = await deps.readFile(abs);
        cssFiles.push({ filePath: abs, content });
    }
    const componentPaths = await deps.glob(config.paths.uiComponentsGlob, deps.cwd);
    const componentFiles = await Promise.all(componentPaths.map(async (p) => ({
        filePath: p,
        content: await deps.readFile(p),
    })));
    const screenPaths = await deps.glob(config.paths.screenComponentsGlob, deps.cwd);
    const screenFiles = await Promise.all(screenPaths.map(async (p) => ({
        filePath: p,
        content: await deps.readFile(p),
    })));
    const codeModel = (0, figma_sync_core_1.buildCodeModel)({
        projectMeta,
        config,
        cssFiles,
        componentFiles,
        screenFiles,
    });
    const artifactsDir = node_path_1.default.resolve(deps.cwd, 'artifacts');
    await deps.ensureDir(artifactsDir);
    const outPath = node_path_1.default.join(artifactsDir, 'code-model.json');
    await deps.writeFile(outPath, JSON.stringify(codeModel, null, 2));
}
