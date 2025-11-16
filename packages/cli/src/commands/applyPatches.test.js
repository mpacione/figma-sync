"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const applyPatches_1 = require("./applyPatches");
(0, vitest_1.describe)('runApplyPatches', () => {
    (0, vitest_1.it)('applies code patches to files', async () => {
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
        const patchSet = {
            version: '1.0',
            patches: [
                {
                    id: 'patch-1',
                    description: 'Rename Button to PrimaryButton',
                    hunks: [
                        {
                            filePath: 'src/components/ui/Button.tsx',
                            before: 'Button',
                            after: 'PrimaryButton',
                        },
                    ],
                },
            ],
        };
        const files = {
            '/repo/artifacts/code-patches.json': JSON.stringify(patchSet),
            '/repo/src/components/ui/Button.tsx': 'export const Button = () => <Button />;\n',
        };
        const written = {};
        const logs = [];
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
            fileExists: async (filePath) => !!files[filePath],
            log: (message) => {
                logs.push(message);
            },
            cwd: '/repo',
        };
        await (0, applyPatches_1.runApplyPatches)('figma-sync.config.json', deps);
        const updatedPath = '/repo/src/components/ui/Button.tsx';
        (0, vitest_1.expect)(written[updatedPath]).toBeDefined();
        (0, vitest_1.expect)(written[updatedPath]).toContain('PrimaryButton = () => <PrimaryButton />');
        (0, vitest_1.expect)(logs.some((l) => l.includes('Applied patches to src/components/ui/Button.tsx'))).toBe(true);
    });
});
