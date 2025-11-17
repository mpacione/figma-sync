import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Simple, non-destructive setup helper.
 *
 * - Ensures a figma-sync.config.json exists in the target project folder.
 * - Adds a FIGMA_SYNC_OPENAI_API_KEY placeholder to .env.example if helpful.
 * - Prints clear next-step instructions for non-technical users.
 */
export async function runInitCommand(projectRoot: string): Promise<void> {
  const absRoot = path.resolve(projectRoot);
  const configPath = path.join(absRoot, 'figma-sync.config.json');

  // Header
  // eslint-disable-next-line no-console
  console.log('');
  // eslint-disable-next-line no-console
  console.log('figma-sync init');
  // eslint-disable-next-line no-console
  console.log('----------------');
  // eslint-disable-next-line no-console
  console.log(`Project folder: ${absRoot}`);

  // 1) Create config if missing
  let configExists = false;
  try {
    await fs.access(configPath);
    configExists = true;
  } catch {
    configExists = false;
  }

  if (configExists) {
    // eslint-disable-next-line no-console
    console.log(`- Found existing config at ${configPath}`);
  } else {
    const defaultConfig = {
      projectName: 'My Next.js App',
      paths: {
        uiComponentsGlob: 'src/components/ui/**/*',
        screenComponentsGlob: 'app/**/page.tsx',
        cssVariablesFiles: ['src/styles/tokens.css'],
        tailwindConfig: 'tailwind.config.ts',
      },
      figma: {
        fileKey: 'YOUR_FIGMA_FILE_KEY',
        pages: {
          primitives: 'System/Primitives',
          patterns: 'System/Patterns',
          screens: 'App/Screens',
        },
      },
      llm: {
        provider: 'openai',
        model: 'gpt-4.1-mini',
        temperature: 0.2,
        maxTokens: 1024,
      },
      heuristics: {
        primitiveComponentPatterns: ['Button', 'Input', 'Card'],
        excludeComponents: [],
      },
    };

    await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
    // eslint-disable-next-line no-console
    console.log(`- Created figma-sync.config.json at ${configPath}`);
  }

  // 2) Hint about OpenAI API key in .env.example
  const envPath = path.join(absRoot, '.env');
  const envExamplePath = path.join(absRoot, '.env.example');

  let envExists = false;
  try {
    await fs.access(envPath);
    envExists = true;
  } catch {
    envExists = false;
  }

  if (!envExists) {
    let existingEnvExample = '';
    try {
      existingEnvExample = await fs.readFile(envExamplePath, 'utf8');
    } catch {
      existingEnvExample = '';
    }

    if (!existingEnvExample.includes('FIGMA_SYNC_OPENAI_API_KEY')) {
      const line = 'FIGMA_SYNC_OPENAI_API_KEY=\n';
      const prefix = existingEnvExample && !existingEnvExample.endsWith('\n') ? `${existingEnvExample}\n` : existingEnvExample;
      await fs.writeFile(envExamplePath, `${prefix}${line}`, 'utf8');
      // eslint-disable-next-line no-console
      console.log(`- Added FIGMA_SYNC_OPENAI_API_KEY placeholder to ${envExamplePath}`);
    } else {
      // eslint-disable-next-line no-console
      console.log(`- Found FIGMA_SYNC_OPENAI_API_KEY placeholder in ${envExamplePath}`);
    }
  } else {
    // eslint-disable-next-line no-console
    console.log(`- Found existing .env at ${envPath} (no changes made)`);
  }

  // 3) Friendly next steps
  // eslint-disable-next-line no-console
  console.log('');
  // eslint-disable-next-line no-console
  console.log('Next steps:');
  // eslint-disable-next-line no-console
  console.log('- Open figma-sync.config.json in your code editor.');
  // eslint-disable-next-line no-console
  console.log('  - Fill in your Figma file key (the ID from your Figma file\'s URL).');
  // eslint-disable-next-line no-console
  console.log('  - Adjust any paths (components, screens, tokens, Tailwind config) to match your app.');
  // eslint-disable-next-line no-console
  console.log('- If you use OpenAI, put your real FIGMA_SYNC_OPENAI_API_KEY into .env or .env.local.');
}

