import { Command } from 'commander';
import {
  runScanWithNodeEnv,
  runGenerateSpecWithNodeEnv,
  runValidateWithNodeEnv,
  runServeWithNodeEnv,
  runGeneratePatchesWithNodeEnv,
  runApplyPatchesWithNodeEnv,
} from './io/nodeEnv';

export interface CliHandlers {
  runScan: (configPath: string) => Promise<void>;
  runGenerateSpec: (configPath: string) => Promise<void>;
  runServe: (configPath: string) => Promise<void>;
  runGeneratePatches: (configPath: string) => Promise<void>;
  runApplyPatches: (configPath: string) => Promise<void>;
  runValidate: (configPath: string) => Promise<void>;
}

const defaultHandlers: CliHandlers = {
  runScan: runScanWithNodeEnv,
  runGenerateSpec: runGenerateSpecWithNodeEnv,
  runServe: runServeWithNodeEnv,
  runGeneratePatches: runGeneratePatchesWithNodeEnv,
  runApplyPatches: runApplyPatchesWithNodeEnv,
  runValidate: runValidateWithNodeEnv,
};

function withConfigOption(cmd: Command): Command {
  return cmd.requiredOption('-c, --config <path>', 'Path to figma-sync config');
}

export function createProgram(handlers: CliHandlers = defaultHandlers): Command {
  const program = new Command();
  program.name('figma-sync').description('CodeFigma sync CLI');
  program.exitOverride();

  withConfigOption(
    program
      .command('scan')
      .description('Scan codebase and emit a CodeModel artifact'),
  ).action(async (opts: { config: string }) => {
    await handlers.runScan(opts.config);
  });

  withConfigOption(
    program
      .command('generate-spec')
      .description('Generate DesignSpec and FigmaInstructionSet from CodeModel'),
  ).action(async (opts: { config: string }) => {
    await handlers.runGenerateSpec(opts.config);
  });

  withConfigOption(
    program
      .command('serve')
      .description('Serve DesignSpec and FigmaInstructionSet over HTTP'),
  ).action(async (opts: { config: string }) => {
    await handlers.runServe(opts.config);
  });

  withConfigOption(
    program
      .command('generate-patches')
      .description('Generate code patch suggestions from Figma changes'),
  ).action(async (opts: { config: string }) => {
    await handlers.runGeneratePatches(opts.config);
  });

  withConfigOption(
    program
      .command('apply-patches')
      .description('Apply code patch suggestions to the codebase'),
  ).action(async (opts: { config: string }) => {
    await handlers.runApplyPatches(opts.config);
  });

  withConfigOption(
    program
      .command('validate')
      .description('Validate figma-sync config and schemas'),
  ).action(async (opts: { config: string }) => {
    await handlers.runValidate(opts.config);
  });

  return program;
}

export async function runCli(argv: readonly string[]): Promise<number> {
  const program = createProgram();

  try {
    await program.parseAsync(argv as string[]);
    return 0;
  } catch (err: any) {
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


