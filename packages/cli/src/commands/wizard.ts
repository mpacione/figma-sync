import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';
import {
  runScanWithNodeEnv,
  runGenerateSpecWithNodeEnv,
  runServeWithNodeEnv,
  runApplyPatchesWithNodeEnv,
} from '../io/nodeEnv';
import { runGeneratePatches, type GeneratePatchesDeps } from './generatePatches';
import { loadConfigFromFile } from '../config/loadConfig';
import { runInitCommand } from './init';
import { ensureOpenAiApiKey } from '../utils/ensureApiKey';

function createInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

/**
 * Interactive first-run helper aimed at non-technical users.
 *
 * It guides the user through:
 * - Ensuring config exists (using init if needed).
 * - Scanning the app and generating artifacts.
 * - Starting the local HTTP server.
 * - Running the Figma plugin to bootstrap and export changes.
 * - Turning Figma changes into code changes.
 */
export async function runWizardCommand(
  projectRoot: string,
  configPath: string,
): Promise<void> {
  const absRoot = path.resolve(projectRoot);
  const absConfigPath = path.isAbsolute(configPath)
    ? configPath
    : path.join(absRoot, configPath);

  // eslint-disable-next-line no-console
  console.log('');
  // eslint-disable-next-line no-console
  console.log('┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓');
  // eslint-disable-next-line no-console
  console.log('┃  figma-sync first-run wizard                              ┃');
  // eslint-disable-next-line no-console
  console.log('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛');
  // eslint-disable-next-line no-console
  console.log(`Project folder: ${absRoot}`);
  // eslint-disable-next-line no-console
  console.log(
    'This will guide you through the full code ⇄ Figma ⇄ code loop for this project.',
  );
  // eslint-disable-next-line no-console
  console.log('Tip: Press Ctrl+C at any time to abort and exit the wizard.');

  // Ensure config exists (or create a starter one).
  try {
    await fs.access(absConfigPath);
    // eslint-disable-next-line no-console
    console.log(`- Found existing config: ${absConfigPath}`);
  } catch {
    // eslint-disable-next-line no-console
    console.log(`- No figma-sync config found at ${absConfigPath}`);
    // eslint-disable-next-line no-console
    console.log('- Running init to create a starter figma-sync.config.json ...');
    await runInitCommand(absRoot);
    // eslint-disable-next-line no-console
    console.log('- A starter config file has been created.');
    // eslint-disable-next-line no-console
    console.log('  Please open it in your editor and fill in the Figma file key and any paths you need.');
  }

  const rl = createInterface();

  // Pause so the user can edit the config if needed.
  // eslint-disable-next-line no-console
  console.log('');
  // eslint-disable-next-line no-console
  console.log('When you are ready to continue, press Enter here.');
  await ask(rl, '> ');

  // Load config and ensure API key is available
  const config = await loadConfigFromFile(absConfigPath);
  if (config.llm) {
    await ensureOpenAiApiKey(config.llm.provider);
  }

  // 1) Scan + generate-spec
  // eslint-disable-next-line no-console
  console.log('');
  // eslint-disable-next-line no-console
  console.log('Step 1/4: Analyze your code and generate artifacts ...');
  // eslint-disable-next-line no-console
  console.log('  - Running scan (reads your code and builds a CodeModel)...');
  await runScanWithNodeEnv(absConfigPath, absRoot);
  // eslint-disable-next-line no-console
  console.log('  - Running generate-spec (builds DesignSpec and Figma instructions)...');
  await runGenerateSpecWithNodeEnv(absConfigPath, absRoot);
  // eslint-disable-next-line no-console
  console.log('- Done. Created artifacts/ with JSON files describing your code and Figma instructions.');

  // 2) Start server
  // eslint-disable-next-line no-console
  console.log('');
  // eslint-disable-next-line no-console
  console.log('Step 2/4: Start the local figma-sync server ...');
  // eslint-disable-next-line no-console
  console.log('The server will listen on http://localhost:7001 by default.');
  // eslint-disable-next-line no-console
  console.log('Tip: You can stop the server at any time with Ctrl+C in this terminal.');
  await runServeWithNodeEnv(absConfigPath, absRoot);
  // eslint-disable-next-line no-console
  console.log('- Server started. Leave this process running while you use the Figma plugin.');

  // 3) Guide through Figma bootstrap & export
  // eslint-disable-next-line no-console
  console.log('');
  // eslint-disable-next-line no-console
  console.log('Step 3/4: Use the Figma plugin.');
  // eslint-disable-next-line no-console
  console.log('In the Figma desktop app:');
  // eslint-disable-next-line no-console
  console.log('  1) Go to Plugins → Development → "Link existing plugin…" and select');
  // eslint-disable-next-line no-console
  console.log('     the manifest.json file from the figma-sync repo (packages/plugin/manifest.json).');
  // eslint-disable-next-line no-console
  console.log('  2) Open the Figma file you want to sync (matching the file key in your config).');
  // eslint-disable-next-line no-console
  console.log('  3) Run Plugins → figma-sync → "Bootstrap from code" and accept the default server URL');
  // eslint-disable-next-line no-console
  console.log('     http://localhost:7001. Wait for pages/components/screens/variables to appear.');
  // eslint-disable-next-line no-console
  console.log('  4) Make a small change in Figma (for example, rename a component or change a token value).');
  // eslint-disable-next-line no-console
  console.log('  5) Run Plugins → figma-sync → "Export changes" and confirm the server URL again.');
  // eslint-disable-next-line no-console
  console.log('When you have done all of that, press Enter here to continue.');
  await ask(rl, '> ');

  // 4) Turn Figma changes into code changes
  // eslint-disable-next-line no-console
  console.log('');
  // eslint-disable-next-line no-console
  console.log('Step 4/4: Apply Figma changes to your code.');

  const artifactsDir = path.join(absRoot, 'artifacts');
  const changesPath = path.join(artifactsDir, 'figma-changes.json');

  try {
    await fs.access(changesPath);
  } catch {
    // eslint-disable-next-line no-console
    console.log('- I could not find artifacts/figma-changes.json.');
    // eslint-disable-next-line no-console
    console.log('  This usually means the plugin did not successfully export changes.');
    // eslint-disable-next-line no-console
    console.log('  Please run "Export changes" again in Figma and then re-run this wizard.');
    rl.close();
    return;
  }

  const deps: GeneratePatchesDeps = {
    loadConfigFromFile: (cfgPath) => loadConfigFromFile(cfgPath),
    readFile: (filePath) => fs.readFile(filePath, 'utf8'),
    writeFile: (filePath, content) => fs.writeFile(filePath, content, 'utf8'),
    readStdin: () => fs.readFile(changesPath, 'utf8'),
    cwd: absRoot,
  };

  // eslint-disable-next-line no-console
  console.log('  - Generating code patches from Figma changes...');
  await runGeneratePatches(absConfigPath, deps);
  // eslint-disable-next-line no-console
  console.log('  - Applying patches to your code...');
  await runApplyPatchesWithNodeEnv(absConfigPath, absRoot);

  // eslint-disable-next-line no-console
  console.log('- Done. I generated code patches and applied them to your project.');
  // eslint-disable-next-line no-console
  console.log('  Open your code editor (or run your app) and confirm the change you made in Figma');
  // eslint-disable-next-line no-console
  console.log('  is now reflected in your code.');

  rl.close();
}

