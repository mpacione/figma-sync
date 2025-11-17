import fs from 'node:fs/promises';
import type { Dirent } from 'node:fs';
import path from 'node:path';
import { runScan, type ScanDeps } from '../commands/scan';
import { runGenerateSpec, type GenerateSpecDeps } from '../commands/generateSpec';
import { runValidate, type ValidateDeps } from '../commands/validate';
import { createServeHandler, type ServeDeps } from '../commands/serve';
import { runGeneratePatches, type GeneratePatchesDeps } from '../commands/generatePatches';
import { runApplyPatches, type ApplyPatchesDeps } from '../commands/applyPatches';
import { runDiagnose, type DiagnoseDeps } from '../commands/diagnose';
import { loadConfigFromFile } from '../config/loadConfig';
import { createOpenAiLLMClientFromEnv } from '../llm/openaiClient';

async function walkFiles(dir: string): Promise<string[]> {
  let entries: Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    const code = (error as any)?.code as string | undefined;
    if (code === 'ENOENT') {
      // eslint-disable-next-line no-console
      console.log(
        `  [glob] [warn] root directory does not exist: ${dir} (returning 0 files).`,
      );
      return [];
    }
    throw error;
  }

  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(full)));
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

async function simpleGlob(pattern: string, cwd: string): Promise<string[]> {
  const absCwd = path.resolve(cwd);

  // Support patterns like "src/components/ui/**/*"
  if (pattern.endsWith('**/*')) {
    const rootRel = pattern.slice(0, -'**/*'.length).replace(/\/$/, '');
    const rootDir = path.resolve(absCwd, rootRel || '.');
    return walkFiles(rootDir);
  }

  // Support patterns like "app/**/page.tsx"
  if (pattern.includes('**/page.tsx')) {
    const [prefix] = pattern.split('**/page.tsx');
    const rootRel = prefix.replace(/\/$/, '') || '.';
    const rootDir = path.resolve(absCwd, rootRel);
    const all = await walkFiles(rootDir);
    return all.filter((file) => file.endsWith('page.tsx'));
  }

  throw new Error(`Unsupported glob pattern: ${pattern}`);
}

export function createNodeScanDeps(cwd: string): ScanDeps {
  return {
    loadConfigFromFile: (configPath) => loadConfigFromFile(configPath),
    readFile: (filePath) => fs.readFile(filePath, 'utf8'),
    writeFile: (filePath, content) => fs.writeFile(filePath, content, 'utf8'),
    ensureDir: async (dirPath) => {
      await fs.mkdir(dirPath, { recursive: true });
    },
    glob: (pattern, cwdArg) => simpleGlob(pattern, cwdArg),
    cwd,
  };
}

function resolveProjectRoot(projectRoot?: string): string {
  if (projectRoot && projectRoot.trim().length > 0) {
    return path.resolve(projectRoot);
  }
  return process.cwd();
}

function formatDuration(ms: number): string {
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds - minutes * 60;
  return `${minutes}m ${remainingSeconds.toFixed(1)}s`;
}

function nowIsoTimestamp(): string {
  return new Date().toISOString();
}

async function withCommandStatus(
  name: string,
  configPath: string,
  cwd: string,
  run: () => Promise<void>,
): Promise<void> {
  const start = Date.now();
  // eslint-disable-next-line no-console
  console.log(`[${nowIsoTimestamp()}] [figma-sync] ${name} - started`);
  // eslint-disable-next-line no-console
  console.log(`  config: ${configPath}`);
  // eslint-disable-next-line no-console
  console.log(`  project root: ${cwd}`);
  try {
    await run();
    const elapsed = Date.now() - start;
    // eslint-disable-next-line no-console
    console.log(
      `[${nowIsoTimestamp()}] [figma-sync] ${name} - success in ${formatDuration(elapsed)}`,
    );
  } catch (error) {
    const elapsed = Date.now() - start;
    // eslint-disable-next-line no-console
    console.error(
      `[${nowIsoTimestamp()}] [figma-sync] ${name} - FAILED in ${formatDuration(elapsed)}`,
    );
    // eslint-disable-next-line no-console
    console.error(`  error: ${(error as Error).message}`);
    throw error;
  }
}


export async function runScanWithNodeEnv(
  configPath: string,
  projectRoot?: string,
): Promise<void> {
  const cwd = resolveProjectRoot(projectRoot);
  const deps = createNodeScanDeps(cwd);
  await withCommandStatus('scan', configPath, cwd, async () => {
    await runScan(configPath, deps);
    // eslint-disable-next-line no-console
    console.log('  [ok] Wrote artifacts/code-model.json');
  });
}

export function createNodeGenerateSpecDeps(cwd: string): GenerateSpecDeps {
  return {
    loadConfigFromFile: (configPath) => loadConfigFromFile(configPath),
    readFile: (filePath) => fs.readFile(filePath, 'utf8'),
    writeFile: (filePath, content) => fs.writeFile(filePath, content, 'utf8'),
    cwd,
    createLLMClient: (config) => createOpenAiLLMClientFromEnv(config),
  };
}

export async function runGenerateSpecWithNodeEnv(
  configPath: string,
  projectRoot?: string,
): Promise<void> {
  const cwd = resolveProjectRoot(projectRoot);
  const deps = createNodeGenerateSpecDeps(cwd);
  await withCommandStatus('generate-spec', configPath, cwd, async () => {
    await runGenerateSpec(configPath, deps);
    // eslint-disable-next-line no-console
    console.log(
      '  [ok] Wrote artifacts/design-spec.json and artifacts/figma-instructions.json',
    );
  });
}

export function createNodeValidateDeps(cwd: string): ValidateDeps {
  return {
    loadConfigFromFile: (configPath) => loadConfigFromFile(configPath),
    readFile: (filePath) => fs.readFile(filePath, 'utf8'),
    fileExists: async (filePath) => {
      try {
        await fs.access(filePath);
        return true;
      } catch {
        return false;
      }
    },
    log: (message) => {
      // eslint-disable-next-line no-console
      console.log(message);
    },
    cwd,
  };
}

export async function runValidateWithNodeEnv(
  configPath: string,
  projectRoot?: string,
): Promise<void> {
  const cwd = resolveProjectRoot(projectRoot);
  const deps = createNodeValidateDeps(cwd);
  await withCommandStatus('validate', configPath, cwd, async () => {
    await runValidate(configPath, deps);
    // eslint-disable-next-line no-console
    console.log('  [ok] Validated config and any present artifacts under artifacts/.');
  });
}

export function createNodeServeDeps(cwd: string): ServeDeps {
  return {
    loadConfigFromFile: (configPath) => loadConfigFromFile(configPath),
    readFile: (filePath) => fs.readFile(filePath, 'utf8'),
    writeFile: (filePath, content) => fs.writeFile(filePath, content, 'utf8'),
    fileExists: async (filePath) => {
      try {
        await fs.access(filePath);
        return true;
      } catch {
        return false;
      }
    },
    log: (message) => {
      // eslint-disable-next-line no-console
      console.log(message);
    },
    cwd,
  };
}

export async function runServeWithNodeEnv(
  configPath: string,
  projectRoot?: string,
): Promise<void> {
  const cwd = resolveProjectRoot(projectRoot);
  const deps = createNodeServeDeps(cwd);
  await withCommandStatus('serve', configPath, cwd, async () => {
    const handler = await createServeHandler(configPath, deps);
    const http = await import('node:http');
    const port = Number(process.env.FIGMA_SYNC_SERVE_PORT ?? '7001');

    const server = http.createServer((req, res) => {
      let body = '';
      req.setEncoding('utf8');
      req.on('data', (chunk: string) => {
        body += chunk;
      });
      req.on('end', () => {
        void handler({ method: req.method, url: req.url, body }, res as any);
      });
    });

    await new Promise<void>((resolve, reject) => {
      server.listen(port, () => {
        // eslint-disable-next-line no-console
        console.log(`figma-sync serve listening on http://localhost:${port}`);
        // eslint-disable-next-line no-console
        console.log('Press Ctrl+C to stop the server and exit.');
        resolve();
      });
      server.on('error', reject);
    });
  });
}

export function createNodeGeneratePatchesDeps(cwd: string): GeneratePatchesDeps {
  return {
    loadConfigFromFile: (configPath) => loadConfigFromFile(configPath),
    readFile: (filePath) => fs.readFile(filePath, 'utf8'),
    writeFile: (filePath, content) => fs.writeFile(filePath, content, 'utf8'),
    readStdin: () =>
      new Promise<string>((resolve, reject) => {
        let data = '';
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', (chunk) => {
          data += chunk;
        });
        process.stdin.on('end', () => {
          resolve(data);
        });
        process.stdin.on('error', (err) => {
          reject(err);
        });
      }),
    cwd,
  };
}

export async function runGeneratePatchesWithNodeEnv(
  configPath: string,
  projectRoot?: string,
): Promise<void> {
  const cwd = resolveProjectRoot(projectRoot);
  const deps = createNodeGeneratePatchesDeps(cwd);
  await withCommandStatus('generate-patches', configPath, cwd, async () => {
    await runGeneratePatches(configPath, deps);
    // eslint-disable-next-line no-console
    console.log('  [ok] Wrote artifacts/code-patches.json');
  });
}

export function createNodeApplyPatchesDeps(cwd: string): ApplyPatchesDeps {
  return {
    loadConfigFromFile: (configPath) => loadConfigFromFile(configPath),
    readFile: (filePath) => fs.readFile(filePath, 'utf8'),
    writeFile: (filePath, content) => fs.writeFile(filePath, content, 'utf8'),
    fileExists: async (filePath) => {
      try {
        await fs.access(filePath);
        return true;
      } catch {
        return false;
      }
    },
    log: (message) => {
      // eslint-disable-next-line no-console
      console.log(message);
    },
    cwd,
  };
}

export async function runApplyPatchesWithNodeEnv(
  configPath: string,
  projectRoot?: string,
): Promise<void> {
  const cwd = resolveProjectRoot(projectRoot);
  const deps = createNodeApplyPatchesDeps(cwd);
  await withCommandStatus('apply-patches', configPath, cwd, async () => {
    await runApplyPatches(configPath, deps);
    // eslint-disable-next-line no-console
    console.log('  [ok] Applied any patches described in artifacts/code-patches.json');
  });
}

function createNodeDiagnoseDeps(cwd: string): DiagnoseDeps {
  return {
    loadConfigFromFile,
    readFile: async (filePath: string) => {
      return fs.readFile(filePath, 'utf-8');
    },
    glob: async (pattern: string, cwdOverride: string) => {
      return simpleGlob(pattern, cwdOverride);
    },
    cwd,
  };
}

export async function runDiagnoseWithNodeEnv(
  configPath: string,
  projectRoot?: string,
): Promise<void> {
  const cwd = resolveProjectRoot(projectRoot);
  const deps = createNodeDiagnoseDeps(cwd);
  await runDiagnose(configPath, deps);
}

