import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';
import { discoverProjectPaths } from './discoverPaths';

/**
 * Prompt user for input via readline.
 */
function promptUser(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Simple, non-destructive setup helper.
 *
 * - Ensures a figma-sync.config.json exists in the target project folder.
 * - Automatically discovers project paths by searching the filesystem.
 * - Prompts for Figma file key interactively.
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
    // eslint-disable-next-line no-console
    console.log('');
    // eslint-disable-next-line no-console
    console.log('Config already exists. Run `figma-sync wizard` to get started!');
    return;
  }

  // eslint-disable-next-line no-console
  console.log('- Discovering project structure...');

  const discoveredPaths = await discoverProjectPaths(absRoot);

  // eslint-disable-next-line no-console
  console.log(`  Found UI components: ${discoveredPaths.uiComponentsGlob}`);
  // eslint-disable-next-line no-console
  console.log(`  Found screens: ${discoveredPaths.screenComponentsGlob}`);
  // eslint-disable-next-line no-console
  console.log(`  Found CSS: ${discoveredPaths.cssVariablesFiles.join(', ')}`);
  // eslint-disable-next-line no-console
  console.log(`  Found Tailwind config: ${discoveredPaths.tailwindConfig}`);

  // Prompt for Figma file key (only if stdin is a TTY)
  let figmaFileKey = 'YOUR_FIGMA_FILE_KEY';

  if (process.stdin.isTTY) {
    // eslint-disable-next-line no-console
    console.log('');
    // eslint-disable-next-line no-console
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    // eslint-disable-next-line no-console
    console.log('  Figma File Key Required');
    // eslint-disable-next-line no-console
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    // eslint-disable-next-line no-console
    console.log('');
    // eslint-disable-next-line no-console
    console.log('Please paste your Figma file key (the ID from your Figma file\'s URL).');
    // eslint-disable-next-line no-console
    console.log('Example: https://www.figma.com/file/ABC123xyz/My-Design → ABC123xyz');
    // eslint-disable-next-line no-console
    console.log('');
    // eslint-disable-next-line no-console
    console.log('You can also press Enter to skip and fill it in later.');
    // eslint-disable-next-line no-console
    console.log('');

    const userInput = await promptUser('Figma File Key: ');

    if (userInput && userInput.length > 0) {
      figmaFileKey = userInput;
      // eslint-disable-next-line no-console
      console.log('  [ok] Figma file key saved to config.');
    } else {
      // eslint-disable-next-line no-console
      console.log('  [info] Skipped. You can add it later by editing figma-sync.config.json');
    }
  }

  const defaultConfig = {
    projectName: 'My Next.js App',
    paths: discoveredPaths,
    figma: {
      fileKey: figmaFileKey,
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
  console.log('');
  // eslint-disable-next-line no-console
  console.log(`- Created figma-sync.config.json`);

  // 2) Friendly next steps
  // eslint-disable-next-line no-console
  console.log('');
  // eslint-disable-next-line no-console
  console.log('Next steps:');
  // eslint-disable-next-line no-console
  console.log('- Run `figma-sync wizard` to complete the full setup and test the sync.');
  // eslint-disable-next-line no-console
  console.log('- Or run `figma-sync scan` to scan your codebase and generate artifacts.');
  // eslint-disable-next-line no-console
  console.log('');
}

