import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';

/**
 * Find the figma-sync repository root by looking for package.json with name "figma-sync".
 * Starts from the CLI package directory and walks up.
 */
async function findFigmaSyncRoot(): Promise<string> {
  let current = __dirname;
  
  // Walk up from packages/cli/src/utils to find the repo root
  for (let i = 0; i < 10; i++) {
    const pkgPath = path.join(current, 'package.json');
    try {
      const pkgContent = await fs.readFile(pkgPath, 'utf8');
      const pkg = JSON.parse(pkgContent);
      if (pkg.name === 'figma-sync' && pkg.workspaces) {
        return current;
      }
    } catch {
      // Continue searching
    }
    const parent = path.dirname(current);
    if (parent === current) {
      break; // Reached filesystem root
    }
    current = parent;
  }
  
  throw new Error('Could not find figma-sync repository root');
}

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
 * Ensure FIGMA_SYNC_OPENAI_API_KEY is available in process.env.
 *
 * If the key is missing and the config requires OpenAI:
 * - Prompt the user to paste their API key (only if stdin is a TTY)
 * - Save it to the figma-sync repo's .env file
 * - Load it into process.env
 *
 * @param llmProvider - The LLM provider from config (e.g., 'openai')
 * @returns true if API key is available or not needed, false if user skipped
 */
export async function ensureOpenAiApiKey(llmProvider: string): Promise<boolean> {
  // Only check for OpenAI provider
  if (llmProvider !== 'openai') {
    return true;
  }

  // Check if key is already present
  if (process.env.FIGMA_SYNC_OPENAI_API_KEY) {
    return true;
  }

  // Find the figma-sync repo root
  const repoRoot = await findFigmaSyncRoot();
  const envPath = path.join(repoRoot, '.env');

  // Try to load existing .env file
  try {
    const envContent = await fs.readFile(envPath, 'utf8');
    const lines = envContent.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('FIGMA_SYNC_OPENAI_API_KEY=')) {
        const value = trimmed.substring('FIGMA_SYNC_OPENAI_API_KEY='.length).trim();
        if (value && value.length > 0) {
          process.env.FIGMA_SYNC_OPENAI_API_KEY = value;
          // eslint-disable-next-line no-console
          console.log('  [ok] Loaded FIGMA_SYNC_OPENAI_API_KEY from figma-sync/.env');
          return true;
        }
      }
    }
  } catch {
    // .env file doesn't exist or can't be read
  }

  // Don't prompt if stdin is not a TTY (e.g., in tests or CI)
  if (!process.stdin.isTTY) {
    return false;
  }

  // Prompt user for API key
  // eslint-disable-next-line no-console
  console.log('');
  // eslint-disable-next-line no-console
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  // eslint-disable-next-line no-console
  console.log('  OpenAI API Key Required');
  // eslint-disable-next-line no-console
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  // eslint-disable-next-line no-console
  console.log('');
  // eslint-disable-next-line no-console
  console.log('Your config uses OpenAI for LLM enrichment, but no API key was found.');
  // eslint-disable-next-line no-console
  console.log('');
  // eslint-disable-next-line no-console
  console.log('Please paste your OpenAI API key (starts with sk-...)');
  // eslint-disable-next-line no-console
  console.log('or press Enter to skip LLM enrichment for now.');
  // eslint-disable-next-line no-console
  console.log('');
  
  const apiKey = await promptUser('OpenAI API Key: ');
  
  if (!apiKey || apiKey.length === 0) {
    // eslint-disable-next-line no-console
    console.log('  [info] Skipping LLM enrichment (no API key provided).');
    return false;
  }
  
  // Validate key format (basic check)
  if (!apiKey.startsWith('sk-')) {
    // eslint-disable-next-line no-console
    console.log('  [warning] API key does not start with "sk-". Saving anyway...');
  }
  
  // Save to .env file
  try {
    let envContent = '';
    try {
      envContent = await fs.readFile(envPath, 'utf8');
    } catch {
      // File doesn't exist, start fresh
    }
    
    // Check if key already exists in file (shouldn't happen, but be safe)
    const lines = envContent.split('\n');
    const filteredLines = lines.filter(line => !line.trim().startsWith('FIGMA_SYNC_OPENAI_API_KEY='));
    
    // Add the new key
    const newContent = [...filteredLines, `FIGMA_SYNC_OPENAI_API_KEY=${apiKey}`]
      .filter(line => line.trim().length > 0)
      .join('\n') + '\n';
    
    await fs.writeFile(envPath, newContent, 'utf8');
    
    // Load into process.env
    process.env.FIGMA_SYNC_OPENAI_API_KEY = apiKey;
    
    // eslint-disable-next-line no-console
    console.log(`  [ok] Saved API key to ${envPath}`);
    // eslint-disable-next-line no-console
    console.log('');
    
    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`  [error] Failed to save API key: ${(error as Error).message}`);
    return false;
  }
}

