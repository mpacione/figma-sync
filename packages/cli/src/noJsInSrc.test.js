"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
function collectJsFiles(dir) {
    const entries = node_fs_1.default.readdirSync(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const full = node_path_1.default.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...collectJsFiles(full));
        }
        else if (entry.isFile() && full.endsWith('.js')) {
            files.push(full);
        }
    }
    return files;
}
(0, vitest_1.describe)('CLI source tree hygiene', () => {
    (0, vitest_1.it)('does not contain compiled .js files under packages/cli/src', () => {
        const srcDir = node_path_1.default.resolve(__dirname);
        const jsFiles = collectJsFiles(srcDir);
        (0, vitest_1.expect)(jsFiles, `Unexpected JS artifacts in src: ${jsFiles.join(', ')}`).toEqual([]);
    });
});
