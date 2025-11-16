"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_1 = require("./index");
let handlers;
let program;
async function run(args) {
    try {
        await program.parseAsync(['node', 'figma-sync', ...args]);
        return 0;
    }
    catch (err) {
        if (typeof err?.exitCode === 'number') {
            return err.exitCode;
        }
        throw err;
    }
}
(0, vitest_1.beforeEach)(() => {
    handlers = {
        runScan: vitest_1.vi.fn().mockResolvedValue(undefined),
        runGenerateSpec: vitest_1.vi.fn().mockResolvedValue(undefined),
        runServe: vitest_1.vi.fn().mockResolvedValue(undefined),
        runGeneratePatches: vitest_1.vi.fn().mockResolvedValue(undefined),
        runApplyPatches: vitest_1.vi.fn().mockResolvedValue(undefined),
        runValidate: vitest_1.vi.fn().mockResolvedValue(undefined),
    };
    program = (0, index_1.createProgram)(handlers);
});
(0, vitest_1.describe)('CLI program', () => {
    (0, vitest_1.it)('runs scan and delegates to handlers.runScan', async () => {
        const code = await run(['scan', '--config', 'figma-sync.config.json']);
        (0, vitest_1.expect)(code).toBe(0);
        (0, vitest_1.expect)(handlers.runScan).toHaveBeenCalledWith('figma-sync.config.json');
    });
    (0, vitest_1.it)('runs generate-spec and delegates to handlers.runGenerateSpec', async () => {
        const code = await run(['generate-spec', '--config', 'figma-sync.config.json']);
        (0, vitest_1.expect)(code).toBe(0);
        (0, vitest_1.expect)(handlers.runGenerateSpec).toHaveBeenCalledWith('figma-sync.config.json');
    });
    (0, vitest_1.it)('runs serve and delegates to handlers.runServe', async () => {
        const code = await run(['serve', '--config', 'figma-sync.config.json']);
        (0, vitest_1.expect)(code).toBe(0);
        (0, vitest_1.expect)(handlers.runServe).toHaveBeenCalledWith('figma-sync.config.json');
    });
    (0, vitest_1.it)('runs generate-patches and delegates to handlers.runGeneratePatches', async () => {
        const code = await run(['generate-patches', '--config', 'figma-sync.config.json']);
        (0, vitest_1.expect)(code).toBe(0);
        (0, vitest_1.expect)(handlers.runGeneratePatches).toHaveBeenCalledWith('figma-sync.config.json');
    });
    (0, vitest_1.it)('runs apply-patches and delegates to handlers.runApplyPatches', async () => {
        const code = await run(['apply-patches', '--config', 'figma-sync.config.json']);
        (0, vitest_1.expect)(code).toBe(0);
        (0, vitest_1.expect)(handlers.runApplyPatches).toHaveBeenCalledWith('figma-sync.config.json');
    });
    (0, vitest_1.it)('runs validate and delegates to handlers.runValidate', async () => {
        const code = await run(['validate', '--config', 'figma-sync.config.json']);
        (0, vitest_1.expect)(code).toBe(0);
        (0, vitest_1.expect)(handlers.runValidate).toHaveBeenCalledWith('figma-sync.config.json');
    });
    (0, vitest_1.it)('returns non-zero exit code on invalid command', async () => {
        const code = await run(['unknown']);
        (0, vitest_1.expect)(code).not.toBe(0);
    });
    (0, vitest_1.it)('returns non-zero exit code when required option is missing', async () => {
        const code = await run(['scan']);
        (0, vitest_1.expect)(code).not.toBe(0);
    });
});
