import fs from 'node:fs/promises';
import path from 'node:path';
import { runScan, type ScanDeps } from '../commands/scan';
import { runGenerateSpec, type GenerateSpecDeps } from '../commands/generateSpec';
import { runValidate, type ValidateDeps } from '../commands/validate';
import { createServeHandler, type ServeDeps } from '../commands/serve';
import { runGeneratePatches, type GeneratePatchesDeps } from '../commands/generatePatches';
import { runApplyPatches, type ApplyPatchesDeps } from '../commands/applyPatches';
import { loadConfigFromFile } from '../config/loadConfig';
import { createOpenAiLLMClientFromEnv } from '../llm/openaiClient';

async function walkFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
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

export async function runScanWithNodeEnv(configPath: string): Promise<void> {
  const deps = createNodeScanDeps(process.cwd());
  await runScan(configPath, deps);
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
): Promise<void> {
  const deps = createNodeGenerateSpecDeps(process.cwd());
  await runGenerateSpec(configPath, deps);
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
): Promise<void> {
  const deps = createNodeValidateDeps(process.cwd());
  await runValidate(configPath, deps);
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

export async function runServeWithNodeEnv(configPath: string): Promise<void> {
  const deps = createNodeServeDeps(process.cwd());
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
      resolve();
    });
    server.on('error', reject);
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
): Promise<void> {
  const deps = createNodeGeneratePatchesDeps(process.cwd());
  await runGeneratePatches(configPath, deps);
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
): Promise<void> {
  const deps = createNodeApplyPatchesDeps(process.cwd());
  await runApplyPatches(configPath, deps);
}

