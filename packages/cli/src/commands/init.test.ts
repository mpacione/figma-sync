import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { runInitCommand } from './init';

async function createTempDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'figma-sync-init-test-'));
}

describe('runInitCommand', () => {
  it('creates config when missing', async () => {
    const dir = await createTempDir();

    await runInitCommand(dir);

    const configPath = path.join(dir, 'figma-sync.config.json');
    const configRaw = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(configRaw);

    expect(config.projectName).toBe('My Next.js App');
    // Since temp dir is empty, it should fall back to defaults
    expect(config.paths.uiComponentsGlob).toBeDefined();
    expect(config.paths.screenComponentsGlob).toBeDefined();
    expect(config.paths.cssVariablesFiles).toBeInstanceOf(Array);
    expect(config.paths.tailwindConfig).toBeDefined();
  });

  it('is idempotent when config already exists', async () => {
    const dir = await createTempDir();

    await runInitCommand(dir);
    const configPath = path.join(dir, 'figma-sync.config.json');

    const firstConfig = await fs.readFile(configPath, 'utf8');

    await runInitCommand(dir);

    const secondConfig = await fs.readFile(configPath, 'utf8');

    expect(secondConfig).toBe(firstConfig);
  });

  it('does not create or modify .env files in target repo', async () => {
    const dir = await createTempDir();

    await runInitCommand(dir);

    const envPath = path.join(dir, '.env');
    const envExamplePath = path.join(dir, '.env.example');

    let envExists = false;
    let envExampleExists = false;

    try {
      await fs.access(envPath);
      envExists = true;
    } catch {
      // Expected
    }

    try {
      await fs.access(envExamplePath);
      envExampleExists = true;
    } catch {
      // Expected
    }

    expect(envExists).toBe(false);
    expect(envExampleExists).toBe(false);
  });

  it('discovers actual project structure when directories exist', async () => {
    const dir = await createTempDir();

    // Create a realistic project structure
    await fs.mkdir(path.join(dir, 'components', 'ui'), { recursive: true });
    await fs.mkdir(path.join(dir, 'app'), { recursive: true });
    await fs.writeFile(path.join(dir, 'app', 'globals.css'), ':root { --primary: #000; }');
    await fs.writeFile(path.join(dir, 'tailwind.config.js'), 'module.exports = {}');

    await runInitCommand(dir);

    const configPath = path.join(dir, 'figma-sync.config.json');
    const configRaw = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(configRaw);

    // Should discover the actual paths
    expect(config.paths.uiComponentsGlob).toBe('components/ui/**/*');
    expect(config.paths.screenComponentsGlob).toBe('app/**/page.tsx');
    expect(config.paths.cssVariablesFiles).toContain('app/globals.css');
    expect(config.paths.tailwindConfig).toBe('tailwind.config.js');
  });
});

