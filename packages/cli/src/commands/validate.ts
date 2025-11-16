import path from 'node:path';
import {
  type FigmaSyncConfig,
  zFigmaSyncConfig,
  zCodeModel,
  zDesignSpec,
  zFigmaInstructionSet,
  zCodePatchSet,
} from 'figma-sync-core';

export interface ValidateDeps {
  loadConfigFromFile: (configPath: string) => Promise<FigmaSyncConfig>;
  readFile: (filePath: string) => Promise<string>;
  fileExists: (filePath: string) => Promise<boolean>;
  log?: (message: string) => void;
  cwd: string;
}

async function validateJsonFile<T>(
  label: string,
  filePath: string,
  deps: ValidateDeps,
  schema: { parse: (value: unknown) => T },
): Promise<void> {
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

export async function runValidate(
  configPath: string,
  deps: ValidateDeps,
): Promise<void> {
  // Config validation happens inside loadConfigFromFile via zod.
  const config = await deps.loadConfigFromFile(configPath);
  zFigmaSyncConfig.parse(config);

  const artifactsDir = path.resolve(deps.cwd, 'artifacts');

  await validateJsonFile(
    'CodeModel',
    path.join(artifactsDir, 'code-model.json'),
    deps,
    zCodeModel,
  );
  await validateJsonFile(
    'DesignSpec',
    path.join(artifactsDir, 'design-spec.json'),
    deps,
    zDesignSpec,
  );
  await validateJsonFile(
    'FigmaInstructionSet',
    path.join(artifactsDir, 'figma-instructions.json'),
    deps,
    zFigmaInstructionSet,
  );
  await validateJsonFile(
    'CodePatchSet',
    path.join(artifactsDir, 'code-patches.json'),
    deps,
    zCodePatchSet,
  );
}

