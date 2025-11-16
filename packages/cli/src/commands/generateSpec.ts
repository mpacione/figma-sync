import path from 'node:path';
import {
  type FigmaSyncConfig,
  type CodeModel,
  type LLMClient,
  zCodeModel,
  buildDesignSpec,
  enrichDesignComponentsWithLLM,
  buildFigmaInstructionSet,
} from 'figma-sync-core';

export interface GenerateSpecDeps {
  loadConfigFromFile: (configPath: string) => Promise<FigmaSyncConfig>;
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, content: string) => Promise<void>;
  cwd: string;
  createLLMClient?: (config: FigmaSyncConfig) => LLMClient | null;
}

export async function runGenerateSpec(
  configPath: string,
  deps: GenerateSpecDeps,
): Promise<void> {
  const config = await deps.loadConfigFromFile(configPath);

  const artifactsDir = path.resolve(deps.cwd, 'artifacts');
  const codeModelPath = path.join(artifactsDir, 'code-model.json');

  const raw = await deps.readFile(codeModelPath);
  const parsed: unknown = JSON.parse(raw);
  const codeModel: CodeModel = zCodeModel.parse(parsed);

  const baseSpec = buildDesignSpec(codeModel, config);

  let finalSpec = baseSpec;
  if (deps.createLLMClient) {
    const llm = deps.createLLMClient(config);
    if (llm) {
      const enrichedComponents = await enrichDesignComponentsWithLLM(
        codeModel,
        baseSpec.components,
        llm,
      );
      finalSpec = { ...baseSpec, components: enrichedComponents };
    }
  }

  const designSpecPath = path.join(artifactsDir, 'design-spec.json');
  await deps.writeFile(designSpecPath, JSON.stringify(finalSpec, null, 2));

  const instructions = buildFigmaInstructionSet(finalSpec);
  const instructionsPath = path.join(artifactsDir, 'figma-instructions.json');
  await deps.writeFile(instructionsPath, JSON.stringify(instructions, null, 2));
}

