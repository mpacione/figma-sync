import path from 'node:path';
import {
  type FigmaSyncConfig,
  type CodePatchSet,
  zCodePatchSet,
  applyCodePatchSetToFiles,
} from 'figma-sync-core';

export interface ApplyPatchesDeps {
  loadConfigFromFile: (configPath: string) => Promise<FigmaSyncConfig>;
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, content: string) => Promise<void>;
  fileExists: (filePath: string) => Promise<boolean>;
  log?: (message: string) => void;
  cwd: string;
}

export async function runApplyPatches(
  configPath: string,
  deps: ApplyPatchesDeps,
): Promise<void> {
  const config = await deps.loadConfigFromFile(configPath);
  // Config is currently unused but validated via loadConfigFromFile.
  void config;

  const artifactsDir = path.resolve(deps.cwd, 'artifacts');
  const patchesPath = path.join(artifactsDir, 'code-patches.json');

  const exists = await deps.fileExists(patchesPath);
  if (!exists) {
    throw new Error(`code-patches.json not found at ${patchesPath}`);
  }

  const rawPatchSet = await deps.readFile(patchesPath);
  const patchSet: CodePatchSet = zCodePatchSet.parse(JSON.parse(rawPatchSet));

  const files: Record<string, string> = {};
  const filePaths = new Set<string>();

  for (const patch of patchSet.patches) {
    for (const hunk of patch.hunks) {
      filePaths.add(hunk.filePath);
    }
  }

  for (const relPath of filePaths) {
    const absPath = path.resolve(deps.cwd, relPath);
    files[relPath] = await deps.readFile(absPath);
  }

  const result = applyCodePatchSetToFiles(patchSet, files);

  if (result.changes.length === 0) {
    deps.log?.('No changes to apply from code-patches.json');
    return;
  }

  for (const change of result.changes) {
    const absPath = path.resolve(deps.cwd, change.filePath);
    await deps.writeFile(absPath, change.content);
    deps.log?.(`Applied patches to ${change.filePath}`);
  }
}

