import { describe, it, expect, vi, beforeEach } from 'vitest';

const runInitCommandMock = vi.fn<[string], Promise<void>>();
const runWizardCommandMock = vi.fn<[string, string], Promise<void>>();

vi.mock('./commands/init', () => ({
  runInitCommand: (projectRoot: string) => runInitCommandMock(projectRoot),
}));

vi.mock('./commands/wizard', () => ({
  runWizardCommand: (projectRoot: string, configPath: string) =>
    runWizardCommandMock(projectRoot, configPath),
}));

beforeEach(() => {
  runInitCommandMock.mockReset();
  runWizardCommandMock.mockReset();
});

describe('CLI init and wizard commands', () => {
  it('init prefers command-level --project-root over global option', async () => {
    const { createProgram } = await import('./index');
    const program = createProgram();

    await program.parseAsync([
      'node',
      'figma-sync',
      'init',
      '--project-root',
      '/from-command',
    ]);

    expect(runInitCommandMock).toHaveBeenCalledWith('/from-command');
  });

  it('init falls back to global --project-root when command option is missing', async () => {
    const { createProgram } = await import('./index');
    const program = createProgram();

    await program.parseAsync([
      'node',
      'figma-sync',
      '--project-root',
      '/from-global',
      'init',
    ]);

    expect(runInitCommandMock).toHaveBeenCalledWith('/from-global');
  });

  it('init defaults to process.cwd when no project root is provided', async () => {
    const { createProgram } = await import('./index');
    const program = createProgram();

    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/fake-cwd');

    try {
      await program.parseAsync(['node', 'figma-sync', 'init']);
      expect(runInitCommandMock).toHaveBeenCalledWith('/fake-cwd');
    } finally {
      cwdSpy.mockRestore();
    }
  });

  it('wizard uses command-level project root and config when provided', async () => {
    const { createProgram } = await import('./index');
    const program = createProgram();

    await program.parseAsync([
      'node',
      'figma-sync',
      'wizard',
      '--project-root',
      '/wizard-root',
      '--config',
      'custom.json',
    ]);

    expect(runWizardCommandMock).toHaveBeenCalledWith('/wizard-root', 'custom.json');
  });

  it('wizard falls back to global project root and default config path', async () => {
    const { createProgram } = await import('./index');
    const program = createProgram();

    await program.parseAsync([
      'node',
      'figma-sync',
      '--project-root',
      '/wizard-global',
      'wizard',
    ]);

    expect(runWizardCommandMock).toHaveBeenCalledWith(
      '/wizard-global',
      'figma-sync.config.json',
    );
  });

  it('wizard defaults to process.cwd and default config when nothing is provided', async () => {
    const { createProgram } = await import('./index');
    const program = createProgram();

    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/wizard-cwd');

    try {
      await program.parseAsync(['node', 'figma-sync', 'wizard']);
      expect(runWizardCommandMock).toHaveBeenCalledWith(
        '/wizard-cwd',
        'figma-sync.config.json',
      );
    } finally {
      cwdSpy.mockRestore();
    }
  });
});

