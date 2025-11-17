import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CliHandlers } from './index';
import { createProgram } from './index';

let handlers: { [K in keyof CliHandlers]: ReturnType<typeof vi.fn> };
let program: ReturnType<typeof createProgram>;

async function run(args: string[]): Promise<number> {
  try {
    await program.parseAsync(['node', 'figma-sync', ...args]);
    return 0;
  } catch (err: any) {
    if (typeof err?.exitCode === 'number') {
      return err.exitCode;
    }
    throw err;
  }
}

beforeEach(() => {
  handlers = {
    runScan: vi.fn().mockResolvedValue(undefined),
    runGenerateSpec: vi.fn().mockResolvedValue(undefined),
    runServe: vi.fn().mockResolvedValue(undefined),
    runGeneratePatches: vi.fn().mockResolvedValue(undefined),
    runApplyPatches: vi.fn().mockResolvedValue(undefined),
    runValidate: vi.fn().mockResolvedValue(undefined),
  } as unknown as { [K in keyof CliHandlers]: ReturnType<typeof vi.fn> };

  program = createProgram(handlers as unknown as CliHandlers);
});

describe('CLI program', () => {
  it('runs scan and delegates to handlers.runScan', async () => {
    const code = await run(['scan', '--config', 'figma-sync.config.json']);
    expect(code).toBe(0);
    expect(handlers.runScan).toHaveBeenCalledWith(
      'figma-sync.config.json',
      undefined,
    );
  });

  it('runs generate-spec and delegates to handlers.runGenerateSpec', async () => {
    const code = await run(['generate-spec', '--config', 'figma-sync.config.json']);
    expect(code).toBe(0);
    expect(handlers.runGenerateSpec).toHaveBeenCalledWith(
      'figma-sync.config.json',
      undefined,
    );
  });

  it('runs serve and delegates to handlers.runServe', async () => {
    const code = await run(['serve', '--config', 'figma-sync.config.json']);
    expect(code).toBe(0);
    expect(handlers.runServe).toHaveBeenCalledWith('figma-sync.config.json', undefined);
  });

  it('runs generate-patches and delegates to handlers.runGeneratePatches', async () => {
    const code = await run(['generate-patches', '--config', 'figma-sync.config.json']);
    expect(code).toBe(0);
    expect(handlers.runGeneratePatches).toHaveBeenCalledWith(
      'figma-sync.config.json',
      undefined,
    );
  });

  it('runs apply-patches and delegates to handlers.runApplyPatches', async () => {
    const code = await run(['apply-patches', '--config', 'figma-sync.config.json']);
    expect(code).toBe(0);
    expect(handlers.runApplyPatches).toHaveBeenCalledWith(
      'figma-sync.config.json',
      undefined,
    );
  });

  it('runs validate and delegates to handlers.runValidate', async () => {
    const code = await run(['validate', '--config', 'figma-sync.config.json']);
    expect(code).toBe(0);
    expect(handlers.runValidate).toHaveBeenCalledWith(
      'figma-sync.config.json',
      undefined,
    );
  });

  it('returns non-zero exit code on invalid command', async () => {
    const code = await run(['unknown']);
    expect(code).not.toBe(0);
  });

  it('returns non-zero exit code when required option is missing', async () => {
    const code = await run(['scan']);
    expect(code).not.toBe(0);
  });
});

