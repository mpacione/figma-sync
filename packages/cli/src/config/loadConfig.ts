import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseConfig, FigmaSyncConfig } from 'figma-sync-core';

export interface LoadConfigDeps {
  readFile?: (filePath: string, encoding: BufferEncoding) => Promise<string>;
  loadModule?: (specifier: string) => Promise<unknown>;
}

export async function loadConfigFromFile(
  configPath: string,
  deps: LoadConfigDeps = {},
): Promise<FigmaSyncConfig> {
  const resolved = path.resolve(configPath);
  const ext = path.extname(resolved).toLowerCase();

  const readFile = deps.readFile ?? fs.readFile;
  const loadModule =
    deps.loadModule ?? ((specifier: string) => import(specifier));

  let raw: unknown;

  if (ext === '.json') {
    const contents = await readFile(resolved, 'utf8');
    raw = JSON.parse(contents);
  } else if (ext === '.js' || ext === '.cjs' || ext === '.mjs') {
    const specifier = pathToFileURL(resolved).href;
    const mod = await loadModule(specifier);
    raw = (mod as any).default ?? mod;
  } else {
    throw new Error(
      `Unsupported config file extension: ${ext}. Use .json or .js for figma-sync.config.`,
    );
  }

  return parseConfig(raw);
}

