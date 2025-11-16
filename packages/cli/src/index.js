"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProgram = createProgram;
exports.runCli = runCli;
const commander_1 = require("commander");
const nodeEnv_1 = require("./io/nodeEnv");
const defaultHandlers = {
    runScan: nodeEnv_1.runScanWithNodeEnv,
    runGenerateSpec: nodeEnv_1.runGenerateSpecWithNodeEnv,
    runServe: nodeEnv_1.runServeWithNodeEnv,
    runGeneratePatches: nodeEnv_1.runGeneratePatchesWithNodeEnv,
    runApplyPatches: nodeEnv_1.runApplyPatchesWithNodeEnv,
    runValidate: nodeEnv_1.runValidateWithNodeEnv,
};
function withConfigOption(cmd) {
    return cmd.requiredOption('-c, --config <path>', 'Path to figma-sync config');
}
function createProgram(handlers = defaultHandlers) {
    const program = new commander_1.Command();
    program.name('figma-sync').description('CodeFigma sync CLI');
    program.exitOverride();
    withConfigOption(program
        .command('scan')
        .description('Scan codebase and emit a CodeModel artifact')).action(async (opts) => {
        await handlers.runScan(opts.config);
    });
    withConfigOption(program
        .command('generate-spec')
        .description('Generate DesignSpec and FigmaInstructionSet from CodeModel')).action(async (opts) => {
        await handlers.runGenerateSpec(opts.config);
    });
    withConfigOption(program
        .command('serve')
        .description('Serve DesignSpec and FigmaInstructionSet over HTTP')).action(async (opts) => {
        await handlers.runServe(opts.config);
    });
    withConfigOption(program
        .command('generate-patches')
        .description('Generate code patch suggestions from Figma changes')).action(async (opts) => {
        await handlers.runGeneratePatches(opts.config);
    });
    withConfigOption(program
        .command('apply-patches')
        .description('Apply code patch suggestions to the codebase')).action(async (opts) => {
        await handlers.runApplyPatches(opts.config);
    });
    withConfigOption(program
        .command('validate')
        .description('Validate figma-sync config and schemas')).action(async (opts) => {
        await handlers.runValidate(opts.config);
    });
    return program;
}
async function runCli(argv) {
    const program = createProgram();
    try {
        await program.parseAsync(argv);
        return 0;
    }
    catch (err) {
        if (typeof err?.exitCode === 'number') {
            return err.exitCode;
        }
        return 1;
    }
}
if (require.main === module) {
    void (async () => {
        const exitCode = await runCli(process.argv);
        if (typeof exitCode === 'number') {
            process.exitCode = exitCode;
        }
    })();
}
