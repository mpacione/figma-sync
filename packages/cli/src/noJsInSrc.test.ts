import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

function collectJsFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectJsFiles(full));
    } else if (entry.isFile() && full.endsWith('.js')) {
      files.push(full);
    }
  }

  return files;
}

describe('CLI source tree hygiene', () => {
  it('does not contain compiled .js files under packages/cli/src', () => {
    const srcDir = path.resolve(__dirname);
    const jsFiles = collectJsFiles(srcDir);
    expect(jsFiles, `Unexpected JS artifacts in src: ${jsFiles.join(', ')}`).toEqual([]);
  });
});

