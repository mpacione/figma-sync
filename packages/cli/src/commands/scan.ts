import path from 'node:path';
import type { FigmaSyncConfig, ProjectMeta } from 'figma-sync-core';
import {
  buildCodeModel,
  validateModel,
  type CssSourceFile,
  type ComponentSourceFile,
  type ScreenSourceFile,
} from 'figma-sync-core';
import { discoverProjectPaths } from '../utils/pathDiscovery';

export interface ScanDeps {
  loadConfigFromFile: (configPath: string) => Promise<FigmaSyncConfig>;
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, content: string) => Promise<void>;
  ensureDir: (dirPath: string) => Promise<void>;
  glob: (pattern: string, cwd: string) => Promise<string[]>;
  cwd: string;
}

export interface ScanOptions {
  autoFix?: boolean;
}

export async function runScan(
  configPath: string,
  deps: ScanDeps,
  options: ScanOptions = {},
): Promise<void> {
  const config = await deps.loadConfigFromFile(configPath);

  // Validate LLM configuration if present
  if (config.llm) {
    const validation = validateModel(config.llm.provider, config.llm.model);
    if (!validation.isValid && validation.warning) {
      // eslint-disable-next-line no-console
      console.log(`  [scan] [warn] ${validation.warning}`);
      if (validation.suggestion) {
        // eslint-disable-next-line no-console
        console.log(`  [scan] [info] Consider updating your config to use: "${validation.suggestion}"`);
      }
    }
  }

  // Validate paths and discover alternatives if needed
  // eslint-disable-next-line no-console
  console.log('  [scan] Validating configured paths...');
  const discoveryResult = await discoverProjectPaths(deps.cwd);

  // Check if configured paths exist, use discovery as fallback
  let uiComponentsGlob = config.paths.uiComponentsGlob;
  let screenComponentsGlob = config.paths.screenComponentsGlob;
  let cssVariablesFiles = config.paths.cssVariablesFiles;

  // Validate UI components glob
  const uiComponentPaths = await deps.glob(uiComponentsGlob, deps.cwd);
  if (uiComponentPaths.length === 0 && discoveryResult.paths.uiComponentsGlob) {
    // eslint-disable-next-line no-console
    console.log(
      `  [scan] [warn] No files found for uiComponentsGlob: "${uiComponentsGlob}"`,
    );
    // eslint-disable-next-line no-console
    console.log(
      `  [scan] [info] Using discovered pattern: "${discoveryResult.paths.uiComponentsGlob}"`,
    );
    uiComponentsGlob = discoveryResult.paths.uiComponentsGlob;
  }

  // Validate screen components glob
  const screenPathsCheck = await deps.glob(screenComponentsGlob, deps.cwd);
  if (
    screenPathsCheck.length === 0 &&
    discoveryResult.paths.screenComponentsGlob
  ) {
    // eslint-disable-next-line no-console
    console.log(
      `  [scan] [warn] No files found for screenComponentsGlob: "${screenComponentsGlob}"`,
    );
    // eslint-disable-next-line no-console
    console.log(
      `  [scan] [info] Using discovered pattern: "${discoveryResult.paths.screenComponentsGlob}"`,
    );
    screenComponentsGlob = discoveryResult.paths.screenComponentsGlob;
  }

  // Validate CSS files
  const missingCssFiles: string[] = [];
  for (const rel of cssVariablesFiles) {
    const abs = path.resolve(deps.cwd, rel);
    try {
      await deps.readFile(abs);
    } catch (error) {
      const code = (error as any)?.code as string | undefined;
      if (code === 'ENOENT') {
        missingCssFiles.push(rel);
      }
    }
  }

  if (
    missingCssFiles.length > 0 &&
    discoveryResult.paths.cssVariablesFiles.length > 0
  ) {
    // eslint-disable-next-line no-console
    console.log(
      `  [scan] [warn] ${missingCssFiles.length} CSS file(s) not found: ${missingCssFiles.join(', ')}`,
    );
    // eslint-disable-next-line no-console
    console.log(
      `  [scan] [info] Using discovered CSS files: ${discoveryResult.paths.cssVariablesFiles.join(', ')}`,
    );
    cssVariablesFiles = discoveryResult.paths.cssVariablesFiles as [
      string,
      ...string[],
    ];
  }

  const projectMeta: ProjectMeta = {
    name: config.projectName,
    framework: 'nextjs',
    tailwindEnabled: true,
  };

  // 1) CSS variables / design tokens
  const cssFiles: CssSourceFile[] = [];
  // eslint-disable-next-line no-console
  console.log(
    '  [scan] Reading CSS variables files from config.paths.cssVariablesFiles ...',
  );
  for (const rel of cssVariablesFiles) {
    const abs = path.resolve(deps.cwd, rel);
    try {
      const content = await deps.readFile(abs);
      cssFiles.push({ filePath: abs, content });
    } catch (error) {
      const code = (error as any)?.code as string | undefined;
      if (code === 'ENOENT') {
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
    `  [scan] CSS variables sources: ${cssFiles.length} loaded.`,
  );

  // 2) Component sources
  // eslint-disable-next-line no-console
  console.log(
    `  [scan] Discovering UI component source files via glob "${uiComponentsGlob}" ...`,
  );
  const componentPaths = await deps.glob(uiComponentsGlob, deps.cwd);
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
    `  [scan] Discovering screen route files via glob "${screenComponentsGlob}" ...`,
  );
  const screenPaths = await deps.glob(screenComponentsGlob, deps.cwd);
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

