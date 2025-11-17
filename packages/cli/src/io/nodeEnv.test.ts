import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const runScanMock = vi.fn();
const runGenerateSpecMock = vi.fn();
const runValidateMock = vi.fn();
const runGeneratePatchesMock = vi.fn();
const runApplyPatchesMock = vi.fn();
const createServeHandlerMock = vi.fn();
const loadConfigFromFileMock = vi.fn(async () => ({
  projectName: 'Test Project',
  paths: {
    uiComponentsGlob: 'src/components/ui/**/*',
    screenComponentsGlob: 'app/**/page.tsx',
    cssVariablesFiles: ['src/styles/tokens.css'],
    tailwindConfig: 'tailwind.config.ts',
  },
  figma: {
    fileKey: 'FILE_KEY',
    pages: {
      primitives: 'System/Primitives',
      patterns: 'System/Patterns',
      screens: 'App/Screens',
    },
  },
  llm: {
    provider: 'openai',
    model: 'gpt-4',
    temperature: 0.2,
    maxTokens: 1024,
  },
  heuristics: {
    primitiveComponentPatterns: ['Button'],
    excludeComponents: [],
  },
}));

const createOpenAiLLMClientFromEnvMock = vi.fn();
const createServerMock = vi.fn((handler: any) => {
  return {
    listen: (_port: number, cb: () => void) => {
      cb();
    },
    on: (_event: string, _listener: (err: any) => void) => {
      // noop
    },
  };
});

vi.mock('../commands/scan', () => ({
  runScan: (configPath: string, deps: any) => runScanMock(configPath, deps),
}));

vi.mock('../commands/generateSpec', () => ({
  runGenerateSpec: (configPath: string, deps: any) =>
    runGenerateSpecMock(configPath, deps),
}));

vi.mock('../commands/validate', () => ({
  runValidate: (configPath: string, deps: any) => runValidateMock(configPath, deps),
}));

vi.mock('../commands/serve', () => ({
  createServeHandler: (configPath: string, deps: any) =>
    createServeHandlerMock(configPath, deps),
}));

vi.mock('../commands/generatePatches', () => ({
  runGeneratePatches: (configPath: string, deps: any) =>
    runGeneratePatchesMock(configPath, deps),
}));

vi.mock('../commands/applyPatches', () => ({
  runApplyPatches: (configPath: string, deps: any) =>
    runApplyPatchesMock(configPath, deps),
}));

vi.mock('../config/loadConfig', () => ({
  loadConfigFromFile: (configPath: string) => loadConfigFromFileMock(configPath),
}));

vi.mock('../llm/openaiClient', () => ({
  createOpenAiLLMClientFromEnv: (config: any) => createOpenAiLLMClientFromEnvMock(config),
}));

vi.mock('node:http', () => ({
  createServer: createServerMock,
}));

describe('nodeEnv helpers', () => {
  it('simpleGlob supports recursive patterns and page.tsx patterns', async () => {
    const { createNodeScanDeps } = await import('./nodeEnv');

    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'figma-sync-nodeEnv-'));
    await fs.mkdir(path.join(root, 'src/components/ui'), { recursive: true });
    await fs.writeFile(path.join(root, 'src/components/ui/Button.tsx'), '// Button', 'utf8');
    await fs.writeFile(path.join(root, 'src/components/ui/Card.tsx'), '// Card', 'utf8');

    await fs.mkdir(path.join(root, 'app/(group)/login'), { recursive: true });
    await fs.writeFile(path.join(root, 'app/page.tsx'), '// root', 'utf8');
    await fs.writeFile(
      path.join(root, 'app/(group)/login/page.tsx'),
      '// login',
      'utf8',
    );

    const deps = createNodeScanDeps(root);

    const uiFiles = await deps.glob('src/components/ui/**/*', root);
    expect(uiFiles.some((p) => p.endsWith('Button.tsx'))).toBe(true);
    expect(uiFiles.some((p) => p.endsWith('Card.tsx'))).toBe(true);

    const pageFiles = await deps.glob('app/**/page.tsx', root);
    expect(pageFiles.length).toBe(2);
    expect(pageFiles.some((p) => p.endsWith(path.join('app', 'page.tsx')))).toBe(true);
    expect(
      pageFiles.some((p) => p.includes(path.join('app', '(group)', 'login', 'page.tsx'))),
    ).toBe(true);
  });

  it('simpleGlob throws on unsupported patterns', async () => {
    const { createNodeScanDeps } = await import('./nodeEnv');
    const deps = createNodeScanDeps('/tmp');
    await expect(deps.glob('*.ts', '/tmp')).rejects.toThrow(/Unsupported glob pattern/);
  });

  it('run*WithNodeEnv resolves project root and delegates to commands', async () => {
    const {
      runScanWithNodeEnv,
      runGenerateSpecWithNodeEnv,
      runValidateWithNodeEnv,
      runServeWithNodeEnv,
      runGeneratePatchesWithNodeEnv,
      runApplyPatchesWithNodeEnv,
    } = await import('./nodeEnv');

    const root = path.resolve('/project-root');

    runScanMock.mockResolvedValue(undefined);
    runGenerateSpecMock.mockResolvedValue(undefined);
    runValidateMock.mockResolvedValue(undefined);
    runGeneratePatchesMock.mockResolvedValue(undefined);
    runApplyPatchesMock.mockResolvedValue(undefined);
    createServeHandlerMock.mockResolvedValue(async () => {});

    await runScanWithNodeEnv('scan.json', root);
    await runGenerateSpecWithNodeEnv('spec.json', root);
    await runValidateWithNodeEnv('config.json', root);
    await runServeWithNodeEnv('config.json', root);
    await runGeneratePatchesWithNodeEnv('patch.json', root);
    await runApplyPatchesWithNodeEnv('apply.json', root);

    expect(runScanMock).toHaveBeenCalledWith('scan.json', expect.objectContaining({ cwd: root }));
    expect(runGenerateSpecMock).toHaveBeenCalledWith(
      'spec.json',
      expect.objectContaining({ cwd: root }),
    );
    expect(runValidateMock).toHaveBeenCalledWith(
      'config.json',
      expect.objectContaining({ cwd: root }),
    );
    expect(createServeHandlerMock).toHaveBeenCalledWith(
      'config.json',
      expect.objectContaining({ cwd: root }),
    );
    expect(runGeneratePatchesMock).toHaveBeenCalledWith(
      'patch.json',
      expect.objectContaining({ cwd: root }),
    );
    expect(runApplyPatchesMock).toHaveBeenCalledWith(
      'apply.json',
      expect.objectContaining({ cwd: root }),
    );
  });

  it('runScanWithNodeEnv falls back to process.cwd when projectRoot is missing', async () => {
    const { runScanWithNodeEnv } = await import('./nodeEnv');

    runScanMock.mockReset();
    runScanMock.mockResolvedValue(undefined);

    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/cwd-root');
    try {
      await runScanWithNodeEnv('scan.json');
    } finally {
      cwdSpy.mockRestore();
    }

    const [, deps] = runScanMock.mock.calls[0];
    expect(deps.cwd).toBe(path.resolve('/cwd-root'));
  });

  it('createNodeGenerateSpecDeps.createLLMClient delegates to OpenAI factory', async () => {
    const { createNodeGenerateSpecDeps } = await import('./nodeEnv');

    const deps = createNodeGenerateSpecDeps('/cwd');
    const config = await loadConfigFromFileMock('figma-sync.config.json');

    createOpenAiLLMClientFromEnvMock.mockReturnValue({} as any);
    const client = deps.createLLMClient!(config as any);

    expect(createOpenAiLLMClientFromEnvMock).toHaveBeenCalledWith(config);
    expect(client).toEqual({});
  });

  it('createNodeValidateDeps and createNodeServeDeps implement fileExists and log', async () => {
    const { createNodeValidateDeps, createNodeServeDeps } = await import('./nodeEnv');

    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'figma-sync-nodeEnv-validate-'));
    const present = path.join(root, 'present.txt');
    await fs.writeFile(present, 'ok', 'utf8');

    const validateDeps = createNodeValidateDeps(root);
    const serveDeps = createNodeServeDeps(root);

    expect(await validateDeps.fileExists(present)).toBe(true);
    expect(await validateDeps.fileExists(path.join(root, 'missing.txt'))).toBe(false);
    expect(await serveDeps.fileExists(present)).toBe(true);
    expect(await serveDeps.fileExists(path.join(root, 'missing.txt'))).toBe(false);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      validateDeps.log?.('validate');
      serveDeps.log?.('serve');
      expect(consoleSpy).toHaveBeenCalled();
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('createNodeGeneratePatchesDeps.readStdin reads from process.stdin', async () => {
    const { createNodeGeneratePatchesDeps } = await import('./nodeEnv');

    const deps = createNodeGeneratePatchesDeps('/cwd');

    const originalSetEncoding = (process.stdin as any).setEncoding;
    const originalOn = (process.stdin as any).on;
    const listeners: Record<string, (chunk?: any) => void> = {};

    (process.stdin as any).setEncoding = vi.fn();
    (process.stdin as any).on = vi.fn((event: string, handler: any) => {
      listeners[event] = handler;
      return process.stdin as any;
    });

    try {
      const promise = deps.readStdin();
      listeners['data']?.('hello ');
      listeners['data']?.('world');
      listeners['end']?.();
      const result = await promise;
      expect(result).toBe('hello world');
    } finally {
      (process.stdin as any).setEncoding = originalSetEncoding;
      (process.stdin as any).on = originalOn;
    }
  });

  it('createNodeApplyPatchesDeps implements fileExists and log', async () => {
    const { createNodeApplyPatchesDeps } = await import('./nodeEnv');

    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'figma-sync-nodeEnv-apply-'));
    const present = path.join(root, 'present.ts');
    await fs.writeFile(present, '// ok', 'utf8');

    const deps = createNodeApplyPatchesDeps(root);

    expect(await deps.fileExists(present)).toBe(true);
    expect(await deps.fileExists(path.join(root, 'missing.ts'))).toBe(false);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      deps.log?.('apply');
      expect(consoleSpy).toHaveBeenCalled();
    } finally {
      consoleSpy.mockRestore();
    }
  });
});

