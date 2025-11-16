import { describe, it, expect } from 'vitest';
import { createServeHandler, type ServeDeps, type ServeResponse } from './serve';
import type { FigmaSyncConfig } from 'figma-sync-core';

const config: FigmaSyncConfig = {
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
};

function createMockResponse() {
  const headers: Record<string, string> = {};
  let body = '';
  const res: ServeResponse = {
    statusCode: 200,
    setHeader(name: string, value: string) {
      headers[name] = value;
    },
    end(chunk?: string) {
      if (chunk) body += chunk;
    },
  };
  return { res, headers, get body() { return body; } };
}

describe('createServeHandler', () => {
  it('serves health and artifact endpoints', async () => {
    const files: Record<string, string> = {
      '/repo/artifacts/code-model.json': JSON.stringify({ version: '1.0' }),
      '/repo/artifacts/design-spec.json': JSON.stringify({ version: '1.0' }),
      '/repo/artifacts/figma-instructions.json': JSON.stringify({ version: '1.0' }),
      '/repo/artifacts/code-patches.json': JSON.stringify({ version: '1.0' }),
    };

    const deps: ServeDeps = {
      loadConfigFromFile: async (configPath) => {
        expect(configPath).toBe('figma-sync.config.json');
        return config;
      },
      readFile: async (filePath) => {
        const content = files[filePath];
        if (!content) throw new Error(`Missing file: ${filePath}`);
        return content;
      },
      writeFile: async (filePath, content) => {
        files[filePath] = content;
      },
      fileExists: async (filePath) => !!files[filePath],
      cwd: '/repo',
    };

    const handler = await createServeHandler('figma-sync.config.json', deps);

    // /health
    {
      const mock = createMockResponse();
      await handler({ method: 'GET', url: '/health' }, mock.res);
      expect(mock.res.statusCode).toBe(200);
      expect(JSON.parse(mock.body)).toEqual({ status: 'ok' });
    }

    // /code-model
    {
      const mock = createMockResponse();
      await handler({ method: 'GET', url: '/code-model' }, mock.res);
      expect(mock.res.statusCode).toBe(200);
      expect(JSON.parse(mock.body)).toEqual({ version: '1.0' });
    }

    // /code-patches
    {
      const mock = createMockResponse();
      await handler({ method: 'GET', url: '/code-patches' }, mock.res);
      expect(mock.res.statusCode).toBe(200);
      expect(JSON.parse(mock.body)).toEqual({ version: '1.0' });
    }

    // POST /figma-changes
    {
      const mock = createMockResponse();
      const payload = {
        version: '1.0',
        changes: [],
      };
      await handler(
        { method: 'POST', url: '/figma-changes', body: JSON.stringify(payload) },
        mock.res,
      );
      expect(mock.res.statusCode).toBe(200);
      expect(JSON.parse(mock.body)).toEqual({ status: 'ok' });
      expect(files['/repo/artifacts/figma-changes.json']).toBeDefined();
    }

    // unknown path
    {
      const { res } = createMockResponse();
      await handler({ method: 'GET', url: '/unknown' }, res);
      expect(res.statusCode).toBe(404);
    }
  });
});

