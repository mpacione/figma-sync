import { describe, it, expect, vi } from 'vitest';

vi.mock('./io/nodeEnv', () => {
  return {
    runScanWithNodeEnv: vi.fn().mockResolvedValue(undefined),
    runGenerateSpecWithNodeEnv: vi.fn().mockResolvedValue(undefined),
    runServeWithNodeEnv: vi.fn().mockResolvedValue(undefined),
    runGeneratePatchesWithNodeEnv: vi.fn().mockResolvedValue(undefined),
    runApplyPatchesWithNodeEnv: vi.fn().mockResolvedValue(undefined),
    runValidateWithNodeEnv: vi.fn().mockResolvedValue(undefined),
  };
});

describe('runCli', () => {
  it('delegates to runScanWithNodeEnv and returns 0 on success', async () => {
    const nodeEnv = await import('./io/nodeEnv');
    const { runCli } = await import('./index');

    const code = await runCli([
      'node',
      'figma-sync',
      'scan',
      '--config',
      'figma-sync.config.json',
    ]);

    expect(code).toBe(0);
    expect(nodeEnv.runScanWithNodeEnv).toHaveBeenCalledWith(
      'figma-sync.config.json',
    );
  });

  it('returns non-zero on unknown command', async () => {
    const { runCli } = await import('./index');

    const code = await runCli(['node', 'figma-sync', 'unknown']);

    expect(code).not.toBe(0);
  });

  it('returns non-zero when required --config is missing', async () => {
    const { runCli } = await import('./index');

    const code = await runCli(['node', 'figma-sync', 'scan']);

    expect(code).not.toBe(0);
  });
});

