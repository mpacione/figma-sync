import path from 'node:path';
import type { FigmaSyncConfig, ProjectMeta } from 'figma-sync-core';
import {
  buildCodeModel,
  type CssSourceFile,
  type ComponentSourceFile,
  type ScreenSourceFile,
} from 'figma-sync-core';

export interface ScanDeps {
  loadConfigFromFile: (configPath: string) => Promise<FigmaSyncConfig>;
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, content: string) => Promise<void>;
  ensureDir: (dirPath: string) => Promise<void>;
  glob: (pattern: string, cwd: string) => Promise<string[]>;
  cwd: string;
}

export async function runScan(
  configPath: string,
  deps: ScanDeps,
): Promise<void> {
  const config = await deps.loadConfigFromFile(configPath);

  const projectMeta: ProjectMeta = {
    name: config.projectName,
    framework: 'nextjs',
    tailwindEnabled: true,
  };

  const cssFiles: CssSourceFile[] = [];
  for (const rel of config.paths.cssVariablesFiles) {
    const abs = path.resolve(deps.cwd, rel);
    const content = await deps.readFile(abs);
    cssFiles.push({ filePath: abs, content });
  }

  const componentPaths = await deps.glob(
    config.paths.uiComponentsGlob,
    deps.cwd,
  );
  const componentFiles: ComponentSourceFile[] = await Promise.all(
    componentPaths.map(async (p) => ({
      filePath: p,
      content: await deps.readFile(p),
    })),
  );

  const screenPaths = await deps.glob(
    config.paths.screenComponentsGlob,
    deps.cwd,
  );
  const screenFiles: ScreenSourceFile[] = await Promise.all(
    screenPaths.map(async (p) => ({
      filePath: p,
      content: await deps.readFile(p),
    })),
  );

  const codeModel = buildCodeModel({
    projectMeta,
    config,
    cssFiles,
    componentFiles,
    screenFiles,
  });

  const artifactsDir = path.resolve(deps.cwd, 'artifacts');
  await deps.ensureDir(artifactsDir);
  const outPath = path.join(artifactsDir, 'code-model.json');
  await deps.writeFile(outPath, JSON.stringify(codeModel, null, 2));
}

