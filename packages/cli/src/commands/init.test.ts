import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { runInitCommand } from './init';

async function createTempDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'figma-sync-init-test-'));
}

describe('runInitCommand', () => {
  it('creates config and adds env placeholder when files are missing', async () => {
    const dir = await createTempDir();

    await runInitCommand(dir);

    const configPath = path.join(dir, 'figma-sync.config.json');
    const configRaw = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(configRaw);

    expect(config.projectName).toBe('My Next.js App');
    expect(config.paths.uiComponentsGlob).toBe('src/components/ui/**/*');

    const envExamplePath = path.join(dir, '.env.example');
    const envExample = await fs.readFile(envExamplePath, 'utf8');
    expect(envExample).toContain('FIGMA_SYNC_OPENAI_API_KEY=');

    const envPath = path.join(dir, '.env');
    let envExists = true;
    try {
      await fs.access(envPath);
    } catch {
      envExists = false;
    }
    expect(envExists).toBe(false);
  });

  it('is idempotent when config and env example already exist', async () => {
    const dir = await createTempDir();

    await runInitCommand(dir);
    const configPath = path.join(dir, 'figma-sync.config.json');
    const envExamplePath = path.join(dir, '.env.example');

    const firstConfig = await fs.readFile(configPath, 'utf8');
    const firstEnvExample = await fs.readFile(envExamplePath, 'utf8');

    await runInitCommand(dir);

    const secondConfig = await fs.readFile(configPath, 'utf8');
    const secondEnvExample = await fs.readFile(envExamplePath, 'utf8');

    expect(secondConfig).toBe(firstConfig);
    // Placeholder should not be duplicated.
    const occurrences = secondEnvExample.split('FIGMA_SYNC_OPENAI_API_KEY').length - 1;
    expect(occurrences).toBe(1);
  });

  it('does not modify .env.example when .env already exists', async () => {
    const dir = await createTempDir();
    const envPath = path.join(dir, '.env');
    const envExamplePath = path.join(dir, '.env.example');

    await fs.writeFile(envPath, 'EXISTING=1\n', 'utf8');
    await fs.writeFile(envExamplePath, 'MY_VAR=value\n', 'utf8');

    await runInitCommand(dir);

    const envExampleAfter = await fs.readFile(envExamplePath, 'utf8');
    expect(envExampleAfter).toBe('MY_VAR=value\n');
  });
});

