import fs from 'node:fs/promises';
import path from 'node:path';

interface DiscoveredPaths {
  uiComponentsGlob: string;
  screenComponentsGlob: string;
  cssVariablesFiles: string[];
  tailwindConfig: string;
}

/**
 * Recursively search for a directory by name, up to maxDepth levels deep.
 */
async function findDirectory(
  root: string,
  targetName: string,
  maxDepth: number = 3,
  currentDepth: number = 0,
): Promise<string | null> {
  if (currentDepth >= maxDepth) return null;

  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      
      // Skip common directories that shouldn't be searched
      if (['node_modules', '.git', '.next', 'dist', 'build', '.turbo'].includes(entry.name)) {
        continue;
      }
      
      const fullPath = path.join(root, entry.name);
      
      if (entry.name === targetName) {
        return fullPath;
      }
      
      // Recurse into subdirectories
      const found = await findDirectory(fullPath, targetName, maxDepth, currentDepth + 1);
      if (found) return found;
    }
  } catch {
    // Ignore permission errors, etc.
  }
  
  return null;
}

/**
 * Search for a file by name or pattern in the project root and immediate subdirectories.
 */
async function findFile(
  root: string,
  fileNames: string[],
  maxDepth: number = 2,
  currentDepth: number = 0,
): Promise<string | null> {
  if (currentDepth >= maxDepth) return null;

  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    
    // First check files in current directory
    for (const entry of entries) {
      if (entry.isFile() && fileNames.includes(entry.name)) {
        return path.join(root, entry.name);
      }
    }
    
    // Then recurse into subdirectories
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      
      // Skip common directories
      if (['node_modules', '.git', '.next', 'dist', 'build', '.turbo'].includes(entry.name)) {
        continue;
      }
      
      const fullPath = path.join(root, entry.name);
      const found = await findFile(fullPath, fileNames, maxDepth, currentDepth + 1);
      if (found) return found;
    }
  } catch {
    // Ignore errors
  }
  
  return null;
}

/**
 * Discover project paths by searching the filesystem.
 * Returns intelligent defaults based on what actually exists in the project.
 */
export async function discoverProjectPaths(projectRoot: string): Promise<DiscoveredPaths> {
  const absRoot = path.resolve(projectRoot);
  
  // 1. Find UI components directory
  let uiComponentsGlob = 'src/components/ui/**/*'; // default
  
  // Search for common UI component directory patterns
  const uiDir = await findDirectory(absRoot, 'ui');
  if (uiDir) {
    const relativePath = path.relative(absRoot, uiDir);
    uiComponentsGlob = `${relativePath}/**/*`;
  } else {
    // Check if components/ exists at root (without src/)
    const componentsDir = path.join(absRoot, 'components');
    try {
      const stat = await fs.stat(componentsDir);
      if (stat.isDirectory()) {
        // Check if there's a ui subdirectory
        const uiSubdir = path.join(componentsDir, 'ui');
        try {
          const uiStat = await fs.stat(uiSubdir);
          if (uiStat.isDirectory()) {
            uiComponentsGlob = 'components/ui/**/*';
          } else {
            // No ui subdirectory, use all components
            uiComponentsGlob = 'components/**/*';
          }
        } catch {
          // No ui subdirectory, use all components
          uiComponentsGlob = 'components/**/*';
        }
      }
    } catch {
      // components/ doesn't exist, keep default
    }
  }
  
  // 2. Find screen components (Next.js app directory)
  let screenComponentsGlob = 'app/**/page.tsx'; // default
  
  const appDir = path.join(absRoot, 'app');
  try {
    const stat = await fs.stat(appDir);
    if (stat.isDirectory()) {
      screenComponentsGlob = 'app/**/page.tsx';
    }
  } catch {
    // app/ doesn't exist, keep default
  }
  
  // 3. Find CSS variables files
  const cssVariablesFiles: string[] = [];
  
  // Search for common CSS token file names
  const cssFile = await findFile(absRoot, [
    'globals.css',
    'tokens.css',
    'variables.css',
    'theme.css',
  ]);
  
  if (cssFile) {
    cssVariablesFiles.push(path.relative(absRoot, cssFile));
  } else {
    // Default fallback
    cssVariablesFiles.push('src/styles/tokens.css');
  }
  
  // 4. Find Tailwind config
  let tailwindConfig = 'tailwind.config.ts'; // default
  
  const tailwindFile = await findFile(absRoot, [
    'tailwind.config.ts',
    'tailwind.config.js',
    'tailwind.config.mjs',
    'tailwind.config.cjs',
  ], 1); // Only search root level
  
  if (tailwindFile) {
    tailwindConfig = path.relative(absRoot, tailwindFile);
  }
  
  return {
    uiComponentsGlob,
    screenComponentsGlob,
    cssVariablesFiles,
    tailwindConfig,
  };
}

