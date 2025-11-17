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
import { ensureOpenAiApiKey } from '../utils/ensureApiKey';

export interface GenerateSpecDeps {
  loadConfigFromFile: (configPath: string) => Promise<FigmaSyncConfig>;
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, content: string) => Promise<void>;
  cwd: string;
  createLLMClient?: (config: FigmaSyncConfig) => LLMClient | null;
}

function looksLikeFigmaFileKey(fileKey: string): boolean {
  return /^[A-Za-z0-9]{20,64}$/.test(fileKey);
}

function nowIsoTimestamp(): string {
  return new Date().toISOString();
}

function logConfigAndEnvSummary(
  config: FigmaSyncConfig,
  configPath: string,
): void {
  // eslint-disable-next-line no-console
  console.log(
    `[${nowIsoTimestamp()}] [figma-sync] generate-spec - config loaded from ${configPath}`,
  );
  // eslint-disable-next-line no-console
  console.log(`  project: ${config.projectName}`);
  // eslint-disable-next-line no-console
  console.log(`  figma.fileKey: ${config.figma.fileKey}`);
  if (!looksLikeFigmaFileKey(config.figma.fileKey)) {
    // eslint-disable-next-line no-console
    console.log(
      '  [warn] figma.fileKey does not look like a bare Figma file key. ' +
        'Expected the ID from your Figma URL after /file/.',
    );
  } else {
    // eslint-disable-next-line no-console
    console.log('  [ok] figma.fileKey looks like a valid Figma file key format.');
  }
  // eslint-disable-next-line no-console
  console.log(
    `  figma.pages: primitives="${config.figma.pages.primitives}", patterns="${config.figma.pages.patterns}", screens="${config.figma.pages.screens}"`,
  );

  const provider = config.llm.provider;
  const hasOpenAiKey = !!process.env.FIGMA_SYNC_OPENAI_API_KEY;
  if (provider === 'openai') {
    if (hasOpenAiKey) {
      // eslint-disable-next-line no-console
      console.log(
        '  [ok] LLM provider=openai, FIGMA_SYNC_OPENAI_API_KEY is present (value not printed).',
      );
    } else {
      // eslint-disable-next-line no-console
      console.log(
        '  [info] LLM provider=openai, FIGMA_SYNC_OPENAI_API_KEY is missing - LLM enrichment will be skipped.',
      );
    }
  } else {
    // eslint-disable-next-line no-console
    console.log(
      `  [info] LLM provider="${provider}". No built-in env check; ensure any required keys are set.`,
    );
  }
}


export async function runGenerateSpec(
  configPath: string,
  deps: GenerateSpecDeps,
): Promise<void> {
  const config = await deps.loadConfigFromFile(configPath);

  // Ensure API key is available if needed
  await ensureOpenAiApiKey(config.llm.provider);

  logConfigAndEnvSummary(config, configPath);

  const artifactsDir = path.resolve(deps.cwd, 'artifacts');
  const codeModelPath = path.join(artifactsDir, 'code-model.json');

  // eslint-disable-next-line no-console
  console.log(
    `[${nowIsoTimestamp()}] [figma-sync] generate-spec - reading CodeModel from ${codeModelPath}`,
  );

  const raw = await deps.readFile(codeModelPath);
  const parsed: unknown = JSON.parse(raw);
  const codeModel: CodeModel = zCodeModel.parse(parsed);

  // eslint-disable-next-line no-console
  console.log(
    `[${nowIsoTimestamp()}] [figma-sync] generate-spec - CodeModel loaded (${codeModel.components.length} components, ${codeModel.screens.length} screens)`,
  );

  const baseSpec = buildDesignSpec(codeModel, config);

  let finalSpec = baseSpec;
  if (deps.createLLMClient) {
    const llm = deps.createLLMClient(config);
    if (llm) {
      const enrichmentStart = Date.now();
      // eslint-disable-next-line no-console
      console.log(
        `[${nowIsoTimestamp()}] [figma-sync] generate-spec - LLM enrichment started (components=${baseSpec.components.length}, provider=${config.llm.provider}, model=${config.llm.model})`,
      );
      const enrichedComponents = await enrichDesignComponentsWithLLM(
        codeModel,
        baseSpec.components,
        llm,
      );
      const elapsedSeconds = ((Date.now() - enrichmentStart) / 1000).toFixed(1);
      // eslint-disable-next-line no-console
      console.log(
        `[${nowIsoTimestamp()}] [figma-sync] generate-spec - LLM enrichment success in ${elapsedSeconds}s`,
      );
      finalSpec = { ...baseSpec, components: enrichedComponents };
    } else {
      // eslint-disable-next-line no-console
      console.log(
        `[${nowIsoTimestamp()}] [figma-sync] generate-spec - LLM client was not created; continuing without enrichment.`,
      );
    }
  } else {
    // eslint-disable-next-line no-console
    console.log(
      `[${nowIsoTimestamp()}] [figma-sync] generate-spec - no LLM client factory provided; using base spec without enrichment.`,
    );
  }

  const designSpecPath = path.join(artifactsDir, 'design-spec.json');
  await deps.writeFile(designSpecPath, JSON.stringify(finalSpec, null, 2));

  const instructions = buildFigmaInstructionSet(finalSpec);
  const instructionsPath = path.join(artifactsDir, 'figma-instructions.json');
  await deps.writeFile(instructionsPath, JSON.stringify(instructions, null, 2));
}

