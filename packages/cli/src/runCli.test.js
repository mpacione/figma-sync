"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
vitest_1.vi.mock('./io/nodeEnv', () => {
    return {
        runScanWithNodeEnv: vitest_1.vi.fn().mockResolvedValue(undefined),
        runGenerateSpecWithNodeEnv: vitest_1.vi.fn().mockResolvedValue(undefined),
        runServeWithNodeEnv: vitest_1.vi.fn().mockResolvedValue(undefined),
        runGeneratePatchesWithNodeEnv: vitest_1.vi.fn().mockResolvedValue(undefined),
        runApplyPatchesWithNodeEnv: vitest_1.vi.fn().mockResolvedValue(undefined),
        runValidateWithNodeEnv: vitest_1.vi.fn().mockResolvedValue(undefined),
    };
});
(0, vitest_1.describe)('runCli', () => {
    (0, vitest_1.it)('delegates to runScanWithNodeEnv and returns 0 on success', async () => {
        const nodeEnv = await import('./io/nodeEnv');
        const { runCli } = await import('./index');
        const code = await runCli([
            'node',
            'figma-sync',
            'scan',
            '--config',
            'figma-sync.config.json',
        ]);
        (0, vitest_1.expect)(code).toBe(0);
        (0, vitest_1.expect)(nodeEnv.runScanWithNodeEnv).toHaveBeenCalledWith('figma-sync.config.json');
    });
    (0, vitest_1.it)('returns non-zero on unknown command', async () => {
        const { runCli } = await import('./index');
        const code = await runCli(['node', 'figma-sync', 'unknown']);
        (0, vitest_1.expect)(code).not.toBe(0);
    });
    (0, vitest_1.it)('returns non-zero when required --config is missing', async () => {
        const { runCli } = await import('./index');
        const code = await runCli(['node', 'figma-sync', 'scan']);
        (0, vitest_1.expect)(code).not.toBe(0);
    });
});
