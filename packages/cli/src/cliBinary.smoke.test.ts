import { describe, it, expect } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const execFileAsync = promisify(execFile);

describe('CLI binary smoke test', () => {
  it('builds the CLI and runs scan via dist/index.js against a temp repo', async () => {
    const repoRoot = path.resolve(__dirname, '..', '..', '..');

    await execFileAsync('npm', ['run', 'build', '--prefix', 'packages/core'], {
      cwd: repoRoot,
    });

    await execFileAsync('npm', ['run', 'build', '--prefix', 'packages/cli'], {
      cwd: repoRoot,
    });

    const cliEntry = path.join(repoRoot, 'packages/cli/dist/index.js');

    const tmpRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), 'figma-sync-cli-smoke-'),
    );

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

    await fs.mkdir(path.join(tmpRoot, 'src', 'styles'), { recursive: true });
    await fs.mkdir(path.join(tmpRoot, 'src', 'components', 'ui'), {
      recursive: true,
    });
    await fs.mkdir(path.join(tmpRoot, 'app', 'login'), { recursive: true });

    await fs.writeFile(
      path.join(tmpRoot, 'figma-sync.config.json'),
      JSON.stringify(config, null, 2),
      'utf8',
    );
    await fs.writeFile(
      path.join(tmpRoot, 'src', 'styles', 'tokens.css'),
      ':root { --primary: #ffffff; }',
      'utf8',
    );
    await fs.writeFile(
      path.join(tmpRoot, 'src', 'components', 'ui', 'Button.tsx'),
      'export function Button() { return <button className="px-2" />; }',
      'utf8',
    );
    await fs.writeFile(
      path.join(tmpRoot, 'app', 'login', 'page.tsx'),
      'export default function Page() { return <Button><span /></Button>; }',
      'utf8',
    );
    await fs.writeFile(
      path.join(tmpRoot, 'tailwind.config.ts'),
      'export default {};',
      'utf8',
    );

    await execFileAsync(
      'node',
      [cliEntry, 'scan', '--config', 'figma-sync.config.json'],
      { cwd: tmpRoot },
    );

    const codeModelPath = path.join(tmpRoot, 'artifacts', 'code-model.json');
    const contents = await fs.readFile(codeModelPath, 'utf8');
    const model = JSON.parse(contents);

    expect(model.version).toBe('1.0');
    expect(model.projectMeta.name).toBe('Smoke Test Project');
  });
});

