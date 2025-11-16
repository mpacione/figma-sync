"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runGenerateSpec = runGenerateSpec;
const node_path_1 = __importDefault(require("node:path"));
const figma_sync_core_1 = require("figma-sync-core");
async function runGenerateSpec(configPath, deps) {
    const config = await deps.loadConfigFromFile(configPath);
    const artifactsDir = node_path_1.default.resolve(deps.cwd, 'artifacts');
    const codeModelPath = node_path_1.default.join(artifactsDir, 'code-model.json');
    const raw = await deps.readFile(codeModelPath);
    const parsed = JSON.parse(raw);
    const codeModel = figma_sync_core_1.zCodeModel.parse(parsed);
    const baseSpec = (0, figma_sync_core_1.buildDesignSpec)(codeModel, config);
    let finalSpec = baseSpec;
    if (deps.createLLMClient) {
        const llm = deps.createLLMClient(config);
        if (llm) {
            const enrichedComponents = await (0, figma_sync_core_1.enrichDesignComponentsWithLLM)(codeModel, baseSpec.components, llm);
            finalSpec = { ...baseSpec, components: enrichedComponents };
        }
    }
    const designSpecPath = node_path_1.default.join(artifactsDir, 'design-spec.json');
    await deps.writeFile(designSpecPath, JSON.stringify(finalSpec, null, 2));
    const instructions = (0, figma_sync_core_1.buildFigmaInstructionSet)(finalSpec);
    const instructionsPath = node_path_1.default.join(artifactsDir, 'figma-instructions.json');
    await deps.writeFile(instructionsPath, JSON.stringify(instructions, null, 2));
}
