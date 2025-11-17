import fs from 'node:fs/promises';
import path from 'node:path';
import { glob } from 'glob';

export interface DiscoveredPaths {
  uiComponentsGlob: string | null;
  screenComponentsGlob: string | null;
  cssVariablesFiles: string[];
  tailwindConfig: string | null;
}

export interface PathDiscoveryResult {
  paths: DiscoveredPaths;
  warnings: string[];
  suggestions: string[];
}

/**
 * Common patterns for UI component directories
 */
const UI_COMPONENT_PATTERNS = [
  'components/ui/**/*',
  'src/components/ui/**/*',
  'app/components/ui/**/*',
  'lib/components/ui/**/*',
];

/**
 * Common patterns for screen/page components
 */
const SCREEN_COMPONENT_PATTERNS = [
  'app/**/page.tsx',
  'src/app/**/page.tsx',
  'pages/**/*',
  'src/pages/**/*',
];

/**
 * Common CSS file locations
 */
const CSS_FILE_PATTERNS = [
  'app/globals.css',
  'src/app/globals.css',
  'styles/globals.css',
  'src/styles/globals.css',
  'app.css',
  'src/app.css',
  'styles/tokens.css',
  'src/styles/tokens.css',
  'styles/variables.css',
  'src/styles/variables.css',
];

/**
 * Common Tailwind config locations
 */
const TAILWIND_CONFIG_PATTERNS = [
  'tailwind.config.ts',
  'tailwind.config.js',
  'tailwind.config.mjs',
  'tailwind.config.cjs',
];

/**
 * Check if a file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Count CSS variables in a file to rank by token density
 */
async function countCssVariables(filePath: string): Promise<number> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const matches = content.match(/--[a-zA-Z0-9-_]+\s*:/g);
    return matches ? matches.length : 0;
  } catch {
    return 0;
  }
}

/**
 * Discover UI component directory
 */
async function discoverUiComponents(cwd: string): Promise<string | null> {
  for (const pattern of UI_COMPONENT_PATTERNS) {
    const matches = await glob(pattern, { cwd, nodir: true });
    if (matches.length > 0) {
      // Return the pattern that matched
      return pattern;
    }
  }
  return null;
}

/**
 * Discover screen component pattern
 */
async function discoverScreenComponents(cwd: string): Promise<string | null> {
  for (const pattern of SCREEN_COMPONENT_PATTERNS) {
    const matches = await glob(pattern, { cwd, nodir: true });
    if (matches.length > 0) {
      return pattern;
    }
  }
  return null;
}

/**
 * Discover CSS files with design tokens
 */
async function discoverCssFiles(cwd: string): Promise<string[]> {
  const candidates: Array<{ path: string; score: number }> = [];

  for (const pattern of CSS_FILE_PATTERNS) {
    const fullPath = path.join(cwd, pattern);
    if (await fileExists(fullPath)) {
      const score = await countCssVariables(fullPath);
      if (score > 0) {
        candidates.push({ path: pattern, score });
      }
    }
  }

  // Sort by token density (highest first)
  candidates.sort((a, b) => b.score - a.score);

  // Return top candidates
  return candidates.slice(0, 3).map((c) => c.path);
}

/**
 * Discover Tailwind config file
 */
async function discoverTailwindConfig(cwd: string): Promise<string | null> {
  for (const pattern of TAILWIND_CONFIG_PATTERNS) {
    const fullPath = path.join(cwd, pattern);
    if (await fileExists(fullPath)) {
      return pattern;
    }
  }
  return null;
}

/**
 * Discover all project paths
 */
export async function discoverProjectPaths(
  cwd: string
): Promise<PathDiscoveryResult> {
  const warnings: string[] = [];
  const suggestions: string[] = [];

  const [uiComponents, screenComponents, cssFiles, tailwindConfig] =
    await Promise.all([
      discoverUiComponents(cwd),
      discoverScreenComponents(cwd),
      discoverCssFiles(cwd),
      discoverTailwindConfig(cwd),
    ]);

  if (!uiComponents) {
    warnings.push('Could not find UI components directory');
    suggestions.push(
      'Create a components/ui/ directory or specify uiComponentsGlob in config'
    );
  }

  if (!screenComponents) {
    warnings.push('Could not find screen/page components');
  }

  if (cssFiles.length === 0) {
    warnings.push('Could not find CSS files with design tokens');
    suggestions.push(
      'Create a CSS file with CSS variables (e.g., app/globals.css)'
    );
  }

  return {
    paths: {
      uiComponentsGlob: uiComponents,
      screenComponentsGlob: screenComponents,
      cssVariablesFiles: cssFiles,
      tailwindConfig,
    },
    warnings,
    suggestions,
  };
}

