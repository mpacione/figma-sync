import path from 'node:path';
import type { FigmaSyncConfig } from 'figma-sync-core';
import { discoverProjectPaths } from '../utils/pathDiscovery';

export interface DiagnoseDeps {
  loadConfigFromFile: (configPath: string) => Promise<FigmaSyncConfig>;
  readFile: (filePath: string) => Promise<string>;
  glob: (pattern: string, cwd: string) => Promise<string[]>;
  cwd: string;
}

interface PathCheckResult {
  path: string;
  exists: boolean;
  fileCount?: number;
  suggestion?: string;
}

export async function runDiagnose(
  configPath: string,
  deps: DiagnoseDeps,
): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('🔍 Diagnosing figma-sync configuration...\n');

  // Load config
  let config: FigmaSyncConfig;
  try {
    config = await deps.loadConfigFromFile(configPath);
    // eslint-disable-next-line no-console
    console.log('✅ Configuration file loaded successfully');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('❌ Failed to load configuration file:', error);
    return;
  }

  // eslint-disable-next-line no-console
  console.log(`   Project: ${config.projectName}\n`);

  // Discover paths
  // eslint-disable-next-line no-console
  console.log('🔎 Discovering project paths...');
  const discoveryResult = await discoverProjectPaths(deps.cwd);

  // Check UI components glob
  // eslint-disable-next-line no-console
  console.log('\n📦 UI Components:');
  // eslint-disable-next-line no-console
  console.log(`   Configured: ${config.paths.uiComponentsGlob}`);
  const uiComponentPaths = await deps.glob(
    config.paths.uiComponentsGlob,
    deps.cwd,
  );
  if (uiComponentPaths.length > 0) {
    // eslint-disable-next-line no-console
    console.log(`   ✅ Found ${uiComponentPaths.length} file(s)`);
  } else {
    // eslint-disable-next-line no-console
    console.log('   ❌ No files found');
    if (discoveryResult.paths.uiComponentsGlob) {
      // eslint-disable-next-line no-console
      console.log(
        `   💡 Suggestion: Use "${discoveryResult.paths.uiComponentsGlob}"`,
      );
    }
  }

  // Check screen components glob
  // eslint-disable-next-line no-console
  console.log('\n📄 Screen Components:');
  // eslint-disable-next-line no-console
  console.log(`   Configured: ${config.paths.screenComponentsGlob}`);
  const screenPaths = await deps.glob(
    config.paths.screenComponentsGlob,
    deps.cwd,
  );
  if (screenPaths.length > 0) {
    // eslint-disable-next-line no-console
    console.log(`   ✅ Found ${screenPaths.length} file(s)`);
  } else {
    // eslint-disable-next-line no-console
    console.log('   ❌ No files found');
    if (discoveryResult.paths.screenComponentsGlob) {
      // eslint-disable-next-line no-console
      console.log(
        `   💡 Suggestion: Use "${discoveryResult.paths.screenComponentsGlob}"`,
      );
    }
  }

  // Check CSS files
  // eslint-disable-next-line no-console
  console.log('\n🎨 CSS Variables Files:');
  const cssResults: PathCheckResult[] = [];
  for (const rel of config.paths.cssVariablesFiles) {
    const abs = path.resolve(deps.cwd, rel);
    let exists = false;
    try {
      await deps.readFile(abs);
      exists = true;
    } catch {
      // File doesn't exist
    }
    cssResults.push({ path: rel, exists });
  }

  for (const result of cssResults) {
    if (result.exists) {
      // eslint-disable-next-line no-console
      console.log(`   ✅ ${result.path}`);
    } else {
      // eslint-disable-next-line no-console
      console.log(`   ❌ ${result.path} (not found)`);
    }
  }

  if (
    cssResults.some((r) => !r.exists) &&
    discoveryResult.paths.cssVariablesFiles.length > 0
  ) {
    // eslint-disable-next-line no-console
    console.log('   💡 Discovered CSS files:');
    for (const file of discoveryResult.paths.cssVariablesFiles) {
      // eslint-disable-next-line no-console
      console.log(`      - ${file}`);
    }
  }

  // Check Tailwind config
  // eslint-disable-next-line no-console
  console.log('\n⚙️  Tailwind Config:');
  // eslint-disable-next-line no-console
  console.log(`   Configured: ${config.paths.tailwindConfig}`);
  const tailwindPath = path.resolve(deps.cwd, config.paths.tailwindConfig);
  let tailwindExists = false;
  try {
    await deps.readFile(tailwindPath);
    tailwindExists = true;
    // eslint-disable-next-line no-console
    console.log('   ✅ File exists');
  } catch {
    // eslint-disable-next-line no-console
    console.log('   ❌ File not found');
    if (discoveryResult.paths.tailwindConfig) {
      // eslint-disable-next-line no-console
      console.log(
        `   💡 Suggestion: Use "${discoveryResult.paths.tailwindConfig}"`,
      );
    }
  }

  // Summary
  // eslint-disable-next-line no-console
  console.log('\n📊 Summary:');
  const issues: string[] = [];
  if (uiComponentPaths.length === 0) {
    issues.push('UI components glob matches no files');
  }
  if (screenPaths.length === 0) {
    issues.push('Screen components glob matches no files');
  }
  if (cssResults.some((r) => !r.exists)) {
    issues.push('Some CSS files not found');
  }
  if (!tailwindExists) {
    issues.push('Tailwind config not found');
  }

  if (issues.length === 0) {
    // eslint-disable-next-line no-console
    console.log('   ✅ All paths are valid!');
  } else {
    // eslint-disable-next-line no-console
    console.log(`   ⚠️  ${issues.length} issue(s) found:`);
    for (const issue of issues) {
      // eslint-disable-next-line no-console
      console.log(`      - ${issue}`);
    }
    // eslint-disable-next-line no-console
    console.log(
      '\n   Run `figma-sync scan` to automatically use discovered paths.',
    );
  }
}

