"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const node_child_process_1 = require("node:child_process");
const node_util_1 = require("node:util");
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const node_os_1 = __importDefault(require("node:os"));
const execFileAsync = (0, node_util_1.promisify)(node_child_process_1.execFile);
(0, vitest_1.describe)('CLI binary smoke test', () => {
    (0, vitest_1.it)('builds the CLI and runs scan via dist/index.js against a temp repo', async () => {
        const repoRoot = node_path_1.default.resolve(__dirname, '..', '..', '..');
        await execFileAsync('npm', ['run', 'build', '--prefix', 'packages/core'], {
            cwd: repoRoot,
        });
        await execFileAsync('npm', ['run', 'build', '--prefix', 'packages/cli'], {
            cwd: repoRoot,
        });
        const cliEntry = node_path_1.default.join(repoRoot, 'packages/cli/dist/index.js');
        const tmpRoot = await promises_1.default.mkdtemp(node_path_1.default.join(node_os_1.default.tmpdir(), 'figma-sync-cli-smoke-'));
        const config = {
            projectName: 'Smoke Test Project',
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
        await promises_1.default.mkdir(node_path_1.default.join(tmpRoot, 'src', 'styles'), { recursive: true });
        await promises_1.default.mkdir(node_path_1.default.join(tmpRoot, 'src', 'components', 'ui'), {
            recursive: true,
        });
        await promises_1.default.mkdir(node_path_1.default.join(tmpRoot, 'app', 'login'), { recursive: true });
        await promises_1.default.writeFile(node_path_1.default.join(tmpRoot, 'figma-sync.config.json'), JSON.stringify(config, null, 2), 'utf8');
        await promises_1.default.writeFile(node_path_1.default.join(tmpRoot, 'src', 'styles', 'tokens.css'), ':root { --primary: #ffffff; }', 'utf8');
        await promises_1.default.writeFile(node_path_1.default.join(tmpRoot, 'src', 'components', 'ui', 'Button.tsx'), 'export function Button() { return <button className="px-2" />; }', 'utf8');
        await promises_1.default.writeFile(node_path_1.default.join(tmpRoot, 'app', 'login', 'page.tsx'), 'export default function Page() { return <Button><span /></Button>; }', 'utf8');
        await promises_1.default.writeFile(node_path_1.default.join(tmpRoot, 'tailwind.config.ts'), 'export default {};', 'utf8');
        await execFileAsync('node', [cliEntry, 'scan', '--config', 'figma-sync.config.json'], { cwd: tmpRoot });
        const codeModelPath = node_path_1.default.join(tmpRoot, 'artifacts', 'code-model.json');
        const contents = await promises_1.default.readFile(codeModelPath, 'utf8');
        const model = JSON.parse(contents);
        (0, vitest_1.expect)(model.version).toBe('1.0');
        (0, vitest_1.expect)(model.projectMeta.name).toBe('Smoke Test Project');
    });
});
