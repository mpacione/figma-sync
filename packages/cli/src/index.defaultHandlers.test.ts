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

describe('CLI default handlers wiring', () => {
  it('delegates commands to nodeEnv wrappers when using default program', async () => {
    const nodeEnv = await import('./io/nodeEnv');
    const { createProgram } = await import('./index');

    const program = createProgram();

    const run = async (args: string[]) => {
      try {
        await program.parseAsync(['node', 'figma-sync', ...args]);
      } catch (err: any) {
        if (typeof err?.exitCode === 'number') {
          // Swallow commander exitOverride errors for tests.
          return;
        }
        throw err;
      }
    };

    await run(['scan', '--config', 'figma-sync.config.json']);
    await run(['generate-spec', '--config', 'figma-sync.config.json']);
    await run(['serve', '--config', 'figma-sync.config.json']);
    await run(['generate-patches', '--config', 'figma-sync.config.json']);
    await run(['apply-patches', '--config', 'figma-sync.config.json']);
    await run(['validate', '--config', 'figma-sync.config.json']);

    expect(nodeEnv.runScanWithNodeEnv).toHaveBeenCalledWith(
      'figma-sync.config.json',
      undefined,
    );
    expect(nodeEnv.runGenerateSpecWithNodeEnv).toHaveBeenCalled();
    expect(nodeEnv.runServeWithNodeEnv).toHaveBeenCalled();
    expect(nodeEnv.runGeneratePatchesWithNodeEnv).toHaveBeenCalled();
    expect(nodeEnv.runApplyPatchesWithNodeEnv).toHaveBeenCalled();
    expect(nodeEnv.runValidateWithNodeEnv).toHaveBeenCalled();
  });
});

