import path from 'node:path';
import type { FigmaSyncConfig } from 'figma-sync-core';
import { zFigmaChangeSet } from 'figma-sync-core';

export interface ServeDeps {
  loadConfigFromFile: (configPath: string) => Promise<FigmaSyncConfig>;
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, content: string) => Promise<void>;
  fileExists: (filePath: string) => Promise<boolean>;
  log?: (message: string) => void;
  cwd: string;
}

export interface ServeRequest {
  method?: string;
  url?: string | null;
  body?: string;
}

export interface ServeResponse {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(body?: string): void;
}

export type ServeHandler = (req: ServeRequest, res: ServeResponse) => Promise<void>;

interface ServeContext {
  artifactsDir: string;
}

function getPathname(url: string | null | undefined): string {
  if (!url) return '/';
  return url.split('?')[0] || '/';
}

function sendJson(res: ServeResponse, statusCode: number, body: unknown): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

async function handleArtifactRequest(
  label: string,
  fileName: string,
  ctx: ServeContext,
  deps: ServeDeps,
  res: ServeResponse,
): Promise<void> {
  const filePath = path.join(ctx.artifactsDir, fileName);
  const exists = await deps.fileExists(filePath);
  if (!exists) {
    deps.log?.(`${label}: ${filePath} (missing)`);
    res.statusCode = 404;
    res.end('Not found');
    return;
  }

  try {
    const content = await deps.readFile(filePath);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(content);
  } catch (error) {
    deps.log?.(`${label}: ${filePath} (error: ${(error as Error).message})`);
    res.statusCode = 500;
    res.end('Internal server error');
  }
}

async function handleRequest(
  ctx: ServeContext,
  deps: ServeDeps,
  req: ServeRequest,
  res: ServeResponse,
): Promise<void> {
  const method = (req.method || 'GET').toUpperCase();
  const pathname = getPathname(req.url ?? '/');

  if (method === 'GET' && pathname === '/health') {
    sendJson(res, 200, { status: 'ok' });
    return;
  }

  if (method === 'GET' && pathname === '/') {
    sendJson(res, 200, {
      endpoints: [
        '/health',
        '/code-model',
        '/design-spec',
        '/spec',
        '/figma-instructions',
        '/instructions',
        '/figma-changes',
        '/code-patches',
      ],
    });
    return;
  }

  if (method === 'GET' && pathname === '/code-model') {
    await handleArtifactRequest('CodeModel', 'code-model.json', ctx, deps, res);
    return;
  }

  if (method === 'GET' && pathname === '/design-spec') {
    await handleArtifactRequest('DesignSpec', 'design-spec.json', ctx, deps, res);
    return;
  }

  if (method === 'GET' && pathname === '/spec') {
    await handleArtifactRequest('DesignSpec', 'design-spec.json', ctx, deps, res);
    return;
  }

  if (method === 'GET' && pathname === '/figma-instructions') {
    await handleArtifactRequest(
      'FigmaInstructionSet',
      'figma-instructions.json',
      ctx,
      deps,
      res,
    );
    return;
  }

  if (method === 'GET' && pathname === '/instructions') {
    await handleArtifactRequest(
      'FigmaInstructionSet',
      'figma-instructions.json',
      ctx,
      deps,
      res,
    );
    return;
  }

  if (method === 'GET' && pathname === '/figma-changes') {
    await handleArtifactRequest('FigmaChangeSet', 'figma-changes.json', ctx, deps, res);
    return;
  }

  if (method === 'GET' && pathname === '/code-patches') {
    await handleArtifactRequest('CodePatchSet', 'code-patches.json', ctx, deps, res);
    return;
  }

  if (method === 'POST' && pathname === '/figma-changes') {
    const body = req.body ?? '';
    try {
      const parsed = JSON.parse(body);
      const changeSet = zFigmaChangeSet.parse(parsed);
      const filePath = path.join(ctx.artifactsDir, 'figma-changes.json');
      await deps.writeFile(filePath, JSON.stringify(changeSet, null, 2));
      deps.log?.(`FigmaChangeSet: ${filePath} (written)`);
      sendJson(res, 200, { status: 'ok' });
    } catch (error) {
      deps.log?.(`FigmaChangeSet: error parsing or writing change set: ${(error as Error).message}`);
      res.statusCode = 400;
      res.end('Invalid FigmaChangeSet payload');
    }
    return;
  }

  res.statusCode = 404;
  res.end('Not found');
}

export async function createServeHandler(
  configPath: string,
  deps: ServeDeps,
): Promise<ServeHandler> {
  await deps.loadConfigFromFile(configPath);
  const artifactsDir = path.resolve(deps.cwd, 'artifacts');
  const ctx: ServeContext = { artifactsDir };

  return async (req, res) => {
    await handleRequest(ctx, deps, req, res);
  };
}

