"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const serve_1 = require("./serve");
const config = {
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
    const headers = {};
    let body = '';
    const res = {
        statusCode: 200,
        setHeader(name, value) {
            headers[name] = value;
        },
        end(chunk) {
            if (chunk)
                body += chunk;
        },
    };
    return { res, headers, get body() { return body; } };
}
(0, vitest_1.describe)('createServeHandler', () => {
    (0, vitest_1.it)('serves health and artifact endpoints', async () => {
        const files = {
            '/repo/artifacts/code-model.json': JSON.stringify({ version: '1.0' }),
            '/repo/artifacts/design-spec.json': JSON.stringify({ version: '1.0' }),
            '/repo/artifacts/figma-instructions.json': JSON.stringify({ version: '1.0' }),
            '/repo/artifacts/code-patches.json': JSON.stringify({ version: '1.0' }),
        };
        const deps = {
            loadConfigFromFile: async (configPath) => {
                (0, vitest_1.expect)(configPath).toBe('figma-sync.config.json');
                return config;
            },
            readFile: async (filePath) => {
                const content = files[filePath];
                if (!content)
                    throw new Error(`Missing file: ${filePath}`);
                return content;
            },
            writeFile: async (filePath, content) => {
                files[filePath] = content;
            },
            fileExists: async (filePath) => !!files[filePath],
            cwd: '/repo',
        };
        const handler = await (0, serve_1.createServeHandler)('figma-sync.config.json', deps);
        // /health
        {
            const mock = createMockResponse();
            await handler({ method: 'GET', url: '/health' }, mock.res);
            (0, vitest_1.expect)(mock.res.statusCode).toBe(200);
            (0, vitest_1.expect)(JSON.parse(mock.body)).toEqual({ status: 'ok' });
        }
        // /code-model
        {
            const mock = createMockResponse();
            await handler({ method: 'GET', url: '/code-model' }, mock.res);
            (0, vitest_1.expect)(mock.res.statusCode).toBe(200);
            (0, vitest_1.expect)(JSON.parse(mock.body)).toEqual({ version: '1.0' });
        }
        // /code-patches
        {
            const mock = createMockResponse();
            await handler({ method: 'GET', url: '/code-patches' }, mock.res);
            (0, vitest_1.expect)(mock.res.statusCode).toBe(200);
            (0, vitest_1.expect)(JSON.parse(mock.body)).toEqual({ version: '1.0' });
        }
        // POST /figma-changes
        {
            const mock = createMockResponse();
            const payload = {
                version: '1.0',
                changes: [],
            };
            await handler({ method: 'POST', url: '/figma-changes', body: JSON.stringify(payload) }, mock.res);
            (0, vitest_1.expect)(mock.res.statusCode).toBe(200);
            (0, vitest_1.expect)(JSON.parse(mock.body)).toEqual({ status: 'ok' });
            (0, vitest_1.expect)(files['/repo/artifacts/figma-changes.json']).toBeDefined();
        }
        // unknown path
        {
            const { res } = createMockResponse();
            await handler({ method: 'GET', url: '/unknown' }, res);
            (0, vitest_1.expect)(res.statusCode).toBe(404);
        }
    });
});
