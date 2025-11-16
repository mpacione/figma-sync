import path from 'node:path';
import {
  type FigmaSyncConfig,
  type CodeModel,
  type DesignSpec,
  type FigmaChangeSet,
  type CodePatchSet,
  zCodeModel,
  zDesignSpec,
  zFigmaChangeSet,
  buildCodePatchesForChanges,
} from 'figma-sync-core';

export interface GeneratePatchesDeps {
  loadConfigFromFile: (configPath: string) => Promise<FigmaSyncConfig>;
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, content: string) => Promise<void>;
  readStdin: () => Promise<string>;
  cwd: string;
}

export async function runGeneratePatches(
  configPath: string,
  deps: GeneratePatchesDeps,
): Promise<void> {
  const config = await deps.loadConfigFromFile(configPath);
  // Config is currently unused but validated via loadConfigFromFile.
  void config;

  const artifactsDir = path.resolve(deps.cwd, 'artifacts');

  const codeModelPath = path.join(artifactsDir, 'code-model.json');
  const designSpecPath = path.join(artifactsDir, 'design-spec.json');

  const rawCodeModel = await deps.readFile(codeModelPath);
  const rawDesignSpec = await deps.readFile(designSpecPath);
  const rawChanges = await deps.readStdin();

  const codeModel: CodeModel = zCodeModel.parse(JSON.parse(rawCodeModel));
  const designSpec: DesignSpec = zDesignSpec.parse(JSON.parse(rawDesignSpec));
  const changeSet: FigmaChangeSet = zFigmaChangeSet.parse(JSON.parse(rawChanges));

  const patchSet: CodePatchSet = buildCodePatchesForChanges(
    codeModel,
    designSpec,
    changeSet,
  );

  const patchesPath = path.join(artifactsDir, 'code-patches.json');
  await deps.writeFile(patchesPath, JSON.stringify(patchSet, null, 2));
}

