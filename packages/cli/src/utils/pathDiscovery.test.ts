import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { discoverProjectPaths } from './pathDiscovery';

describe('pathDiscovery', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create a temporary directory for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'figma-sync-test-'));
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('discoverProjectPaths', () => {
    it('discovers components/ui directory', async () => {
      // Create components/ui directory with a component
      await fs.mkdir(path.join(tempDir, 'components', 'ui'), {
        recursive: true,
      });
      await fs.writeFile(
        path.join(tempDir, 'components', 'ui', 'button.tsx'),
        'export const Button = () => <button />;'
      );

      const result = await discoverProjectPaths(tempDir);

      // Should discover the first matching pattern
      expect(result.paths.uiComponentsGlob).toBe('components/ui/**/*');
      expect(result.warnings).not.toContain(
        'Could not find UI components directory'
      );
    });

    it('discovers src/components/ui directory', async () => {
      // Create src/components/ui directory
      await fs.mkdir(path.join(tempDir, 'src', 'components', 'ui'), {
        recursive: true,
      });
      await fs.writeFile(
        path.join(tempDir, 'src', 'components', 'ui', 'input.tsx'),
        'export const Input = () => <input />;'
      );

      const result = await discoverProjectPaths(tempDir);

      // Should discover the first matching pattern
      expect(result.paths.uiComponentsGlob).toBe('src/components/ui/**/*');
    });

    it('discovers app/**/page.tsx pattern', async () => {
      // Create app directory with page files
      await fs.mkdir(path.join(tempDir, 'app', 'dashboard'), {
        recursive: true,
      });
      await fs.writeFile(
        path.join(tempDir, 'app', 'page.tsx'),
        'export default function Page() {}'
      );
      await fs.writeFile(
        path.join(tempDir, 'app', 'dashboard', 'page.tsx'),
        'export default function Dashboard() {}'
      );

      const result = await discoverProjectPaths(tempDir);

      // Should discover the first matching pattern
      expect(result.paths.screenComponentsGlob).toBe('app/**/page.tsx');
    });

    it('discovers CSS files with design tokens', async () => {
      // Create app/globals.css with CSS variables
      await fs.mkdir(path.join(tempDir, 'app'), { recursive: true });
      await fs.writeFile(
        path.join(tempDir, 'app', 'globals.css'),
        `
:root {
  --primary: #3b82f6;
  --secondary: #8b5cf6;
  --background: #ffffff;
}
        `
      );

      const result = await discoverProjectPaths(tempDir);

      expect(result.paths.cssVariablesFiles).toContain('app/globals.css');
      expect(result.warnings).not.toContain(
        'Could not find CSS files with design tokens'
      );
    });

    it('ranks CSS files by token density', async () => {
      // Create multiple CSS files with different token counts
      await fs.mkdir(path.join(tempDir, 'app'), { recursive: true });
      await fs.mkdir(path.join(tempDir, 'styles'), { recursive: true });

      // File with few tokens
      await fs.writeFile(
        path.join(tempDir, 'app', 'globals.css'),
        ':root { --primary: #000; }'
      );

      // File with many tokens
      await fs.writeFile(
        path.join(tempDir, 'styles', 'tokens.css'),
        `
:root {
  --color-1: #000;
  --color-2: #111;
  --color-3: #222;
  --color-4: #333;
  --color-5: #444;
}
        `
      );

      const result = await discoverProjectPaths(tempDir);

      // styles/tokens.css should be first (more tokens)
      expect(result.paths.cssVariablesFiles[0]).toBe('styles/tokens.css');
      expect(result.paths.cssVariablesFiles).toContain('app/globals.css');
    });

    it('discovers tailwind.config.ts', async () => {
      await fs.writeFile(
        path.join(tempDir, 'tailwind.config.ts'),
        'export default {}'
      );

      const result = await discoverProjectPaths(tempDir);

      expect(result.paths.tailwindConfig).toBe('tailwind.config.ts');
    });

    it('discovers tailwind.config.js', async () => {
      await fs.writeFile(
        path.join(tempDir, 'tailwind.config.js'),
        'module.exports = {}'
      );

      const result = await discoverProjectPaths(tempDir);

      expect(result.paths.tailwindConfig).toBe('tailwind.config.js');
    });

    it('returns null when no paths are found', async () => {
      // Empty directory
      const result = await discoverProjectPaths(tempDir);

      expect(result.paths.uiComponentsGlob).toBeNull();
      expect(result.paths.screenComponentsGlob).toBeNull();
      expect(result.paths.cssVariablesFiles).toEqual([]);
      expect(result.paths.tailwindConfig).toBeNull();
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('provides helpful suggestions when paths not found', async () => {
      const result = await discoverProjectPaths(tempDir);

      expect(result.suggestions).toContain(
        'Create a components/ui/ directory or specify uiComponentsGlob in config'
      );
      expect(result.suggestions).toContain(
        'Create a CSS file with CSS variables (e.g., app/globals.css)'
      );
    });
  });
});

