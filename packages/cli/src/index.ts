#!/usr/bin/env node


import { Command } from 'commander';
import {
  runScanWithNodeEnv,
  runGenerateSpecWithNodeEnv,
  runValidateWithNodeEnv,
  runServeWithNodeEnv,
  runGeneratePatchesWithNodeEnv,
  runApplyPatchesWithNodeEnv,
  runDiagnoseWithNodeEnv,
} from './io/nodeEnv';
import { runInitCommand } from './commands/init';
import { runWizardCommand } from './commands/wizard';

export interface CliHandlers {
  runScan: (configPath: string, projectRoot?: string) => Promise<void>;
  runGenerateSpec: (configPath: string, projectRoot?: string) => Promise<void>;
  runServe: (configPath: string, projectRoot?: string) => Promise<void>;
  runGeneratePatches: (configPath: string, projectRoot?: string) => Promise<void>;
  runApplyPatches: (configPath: string, projectRoot?: string) => Promise<void>;
  runValidate: (configPath: string, projectRoot?: string) => Promise<void>;
  runDiagnose: (configPath: string, projectRoot?: string) => Promise<void>;
}

const defaultHandlers: CliHandlers = {
  runScan: (configPath, projectRoot) => runScanWithNodeEnv(configPath, projectRoot),
  runGenerateSpec: (configPath, projectRoot) =>
    runGenerateSpecWithNodeEnv(configPath, projectRoot),
  runServe: (configPath, projectRoot) => runServeWithNodeEnv(configPath, projectRoot),
  runGeneratePatches: (configPath, projectRoot) =>
    runGeneratePatchesWithNodeEnv(configPath, projectRoot),
  runApplyPatches: (configPath, projectRoot) =>
    runApplyPatchesWithNodeEnv(configPath, projectRoot),
  runValidate: (configPath, projectRoot) => runValidateWithNodeEnv(configPath, projectRoot),
  runDiagnose: (configPath, projectRoot) => runDiagnoseWithNodeEnv(configPath, projectRoot),
};

function withConfigOption(cmd: Command): Command {
  return cmd.requiredOption('-c, --config <path>', 'Path to figma-sync config');
}

export function createProgram(handlers: CliHandlers = defaultHandlers): Command {
  const program = new Command();
  program.name('figma-sync').description('CodeFigma sync CLI');
  program.exitOverride();

  program.option(
    '--project-root <path>',
    'Root folder of the app you want to sync (defaults to the current directory)',
  );

  const getProjectRoot = (): string | undefined => {
    const opts = program.opts<{ projectRoot?: string }>();
    return opts.projectRoot;
  };

  withConfigOption(
    program
      .command('scan')
      .description('Scan codebase and emit a CodeModel artifact'),
  ).action(async (opts: { config: string }) => {
    await handlers.runScan(opts.config, getProjectRoot());
  });

  withConfigOption(
    program
      .command('generate-spec')
      .description('Generate DesignSpec and FigmaInstructionSet from CodeModel'),
  ).action(async (opts: { config: string }) => {
    await handlers.runGenerateSpec(opts.config, getProjectRoot());
  });

  withConfigOption(
    program
      .command('serve')
      .description('Serve DesignSpec and FigmaInstructionSet over HTTP'),
  ).action(async (opts: { config: string }) => {
    await handlers.runServe(opts.config, getProjectRoot());
  });

  withConfigOption(
    program
      .command('generate-patches')
      .description('Generate code patch suggestions from Figma changes'),
  ).action(async (opts: { config: string }) => {
    await handlers.runGeneratePatches(opts.config, getProjectRoot());
  });

  withConfigOption(
    program
      .command('apply-patches')
      .description('Apply code patch suggestions to the codebase'),
  ).action(async (opts: { config: string }) => {
    await handlers.runApplyPatches(opts.config, getProjectRoot());
  });

  withConfigOption(
    program
      .command('validate')
      .description('Validate figma-sync config and schemas'),
  ).action(async (opts: { config: string }) => {
    await handlers.runValidate(opts.config, getProjectRoot());
  });

  withConfigOption(
    program
      .command('diagnose')
      .description('Check configuration paths and suggest corrections'),
  ).action(async (opts: { config: string }) => {
    await handlers.runDiagnose(opts.config, getProjectRoot());
  });

  program
    .command('init')
    .description(
      'Set up figma-sync in a project by creating a starter figma-sync.config.json and env hints.',
    )
    .option(
      '--project-root <path>',
      'Root folder of the app you want to sync (defaults to the current directory)',
    )
    .action(async (opts: { projectRoot?: string }) => {
      const global = program.opts<{ projectRoot?: string }>();
      const projectRoot = opts.projectRoot ?? global.projectRoot ?? process.cwd();
      await runInitCommand(projectRoot);
    });

  program
    .command('wizard')
    .description(
      'Interactive first-run helper for non-technical users (guides you through the full code->Figma->code loop).',
    )
    .option(
      '--project-root <path>',
      'Root folder of the app you want to sync (defaults to the current directory)',
    )
    .option(
      '-c, --config <path>',
      'Path to figma-sync config (default: figma-sync.config.json in project root)',
    )
    .action(async (opts: { projectRoot?: string; config?: string }) => {
      const global = program.opts<{ projectRoot?: string }>();
      const projectRoot = opts.projectRoot ?? global.projectRoot ?? process.cwd();
      const configPath = opts.config ?? 'figma-sync.config.json';
      await runWizardCommand(projectRoot, configPath);
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
    /* c8 ignore next */
    return 1;
  }
}

/* c8 ignore start */
if (require.main === module) {
  void (async () => {
    const exitCode = await runCli(process.argv);
    if (typeof exitCode === 'number') {
      process.exitCode = exitCode;
    }
  })();
}
/* c8 ignore stop */


