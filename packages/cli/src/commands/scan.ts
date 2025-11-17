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

  // 1) CSS variables / design tokens
  const cssFiles: CssSourceFile[] = [];
  const missingCssFiles: string[] = [];
  // eslint-disable-next-line no-console
  console.log(
    '  [scan] Reading CSS variables files from config.paths.cssVariablesFiles ...',
  );
  for (const rel of config.paths.cssVariablesFiles) {
    const abs = path.resolve(deps.cwd, rel);
    try {
      const content = await deps.readFile(abs);
      cssFiles.push({ filePath: abs, content });
    } catch (error) {
      const code = (error as any)?.code as string | undefined;
      if (code === 'ENOENT') {
        missingCssFiles.push(abs);
        // eslint-disable-next-line no-console
        console.log(
          `  [scan] [warn] CSS variables file not found: ${abs} (skipping).`,
        );
      } else {
        throw error;
      }
    }
  }
  // eslint-disable-next-line no-console
  console.log(
    `  [scan] CSS variables sources: ${cssFiles.length} loaded, ${missingCssFiles.length} missing (of ${config.paths.cssVariablesFiles.length} configured).`,
  );

  // 2) Component sources
  // eslint-disable-next-line no-console
  console.log(
    `  [scan] Discovering UI component source files via glob "${config.paths.uiComponentsGlob}" ...`,
  );
  const componentPaths = await deps.glob(
    config.paths.uiComponentsGlob,
    deps.cwd,
  );
  // eslint-disable-next-line no-console
  console.log(
    `  [scan] Found ${componentPaths.length} component file(s). Reading contents...`,
  );
  const componentFiles: ComponentSourceFile[] = await Promise.all(
    componentPaths.map(async (p) => ({
      filePath: p,
      content: await deps.readFile(p),
    })),
  );

  // 3) Screen route sources
  // eslint-disable-next-line no-console
  console.log(
    `  [scan] Discovering screen route files via glob "${config.paths.screenComponentsGlob}" ...`,
  );
  const screenPaths = await deps.glob(
    config.paths.screenComponentsGlob,
    deps.cwd,
  );
  // eslint-disable-next-line no-console
  console.log(
    `  [scan] Found ${screenPaths.length} screen file(s). Reading contents...`,
  );
  const screenFiles: ScreenSourceFile[] = await Promise.all(
    screenPaths.map(async (p) => ({
      filePath: p,
      content: await deps.readFile(p),
    })),
  );

  // 4) Build CodeModel
  const codeModel = buildCodeModel({
    projectMeta,
    config,
    cssFiles,
    componentFiles,
    screenFiles,
  });
  // eslint-disable-next-line no-console
  console.log(
    `  [scan] Built CodeModel with ${codeModel.components.length} components, ${codeModel.screens.length} screens, and ${codeModel.tokens.colors.length} color token(s).`,
  );

  // 5) Write artifact
  const artifactsDir = path.resolve(deps.cwd, 'artifacts');
  await deps.ensureDir(artifactsDir);
  const outPath = path.join(artifactsDir, 'code-model.json');
  // eslint-disable-next-line no-console
  console.log(`  [scan] Writing CodeModel to ${outPath} ...`);
  await deps.writeFile(outPath, JSON.stringify(codeModel, null, 2));
}

