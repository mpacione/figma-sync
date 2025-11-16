"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const scan_1 = require("./scan");
(0, vitest_1.describe)('runScan', () => {
    (0, vitest_1.it)('builds and writes a CodeModel artifact based on config and sources', async () => {
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
        const files = {
            '/repo/src/styles/tokens.css': ':root { --primary: #ffffff; }',
            '/repo/src/components/ui/Button.tsx': 'export function Button() { return <button className="px-2" />; }',
            '/repo/app/login/page.tsx': 'export default function Page() { return <Button><Icon /></Button>; }',
        };
        const written = {};
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
                written[filePath] = content;
            },
            ensureDir: async () => {
                // no-op for tests
            },
            glob: async (pattern, cwd) => {
                (0, vitest_1.expect)(cwd).toBe('/repo');
                if (pattern === 'src/components/ui/**/*') {
                    return ['/repo/src/components/ui/Button.tsx'];
                }
                if (pattern === 'app/**/page.tsx') {
                    return ['/repo/app/login/page.tsx'];
                }
                return [];
            },
            cwd: '/repo',
        };
        await (0, scan_1.runScan)('figma-sync.config.json', deps);
        const outPath = '/repo/artifacts/code-model.json';
        (0, vitest_1.expect)(written[outPath]).toBeDefined();
        const model = JSON.parse(written[outPath]);
        (0, vitest_1.expect)(model.version).toBe('1.0');
        (0, vitest_1.expect)(model.projectMeta.name).toBe('Test Project');
        (0, vitest_1.expect)(model.components.map((c) => c.name)).toEqual(['Button']);
        (0, vitest_1.expect)(model.screens[0].route).toBe('/login');
    });
});
