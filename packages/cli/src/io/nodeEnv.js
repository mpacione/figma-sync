"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNodeScanDeps = createNodeScanDeps;
exports.runScanWithNodeEnv = runScanWithNodeEnv;
exports.createNodeGenerateSpecDeps = createNodeGenerateSpecDeps;
exports.runGenerateSpecWithNodeEnv = runGenerateSpecWithNodeEnv;
exports.createNodeValidateDeps = createNodeValidateDeps;
exports.runValidateWithNodeEnv = runValidateWithNodeEnv;
exports.createNodeServeDeps = createNodeServeDeps;
exports.runServeWithNodeEnv = runServeWithNodeEnv;
exports.createNodeGeneratePatchesDeps = createNodeGeneratePatchesDeps;
exports.runGeneratePatchesWithNodeEnv = runGeneratePatchesWithNodeEnv;
exports.createNodeApplyPatchesDeps = createNodeApplyPatchesDeps;
exports.runApplyPatchesWithNodeEnv = runApplyPatchesWithNodeEnv;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const scan_1 = require("../commands/scan");
const generateSpec_1 = require("../commands/generateSpec");
const validate_1 = require("../commands/validate");
const serve_1 = require("../commands/serve");
const generatePatches_1 = require("../commands/generatePatches");
const applyPatches_1 = require("../commands/applyPatches");
const loadConfig_1 = require("../config/loadConfig");
const openaiClient_1 = require("../llm/openaiClient");
async function walkFiles(dir) {
    const entries = await promises_1.default.readdir(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const full = node_path_1.default.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...(await walkFiles(full)));
        }
        else if (entry.isFile()) {
            files.push(full);
        }
    }
    return files;
}
async function simpleGlob(pattern, cwd) {
    const absCwd = node_path_1.default.resolve(cwd);
    // Support patterns like "src/components/ui/**/*"
    if (pattern.endsWith('**/*')) {
        const rootRel = pattern.slice(0, -'**/*'.length).replace(/\/$/, '');
        const rootDir = node_path_1.default.resolve(absCwd, rootRel || '.');
        return walkFiles(rootDir);
    }
    // Support patterns like "app/**/page.tsx"
    if (pattern.includes('**/page.tsx')) {
        const [prefix] = pattern.split('**/page.tsx');
        const rootRel = prefix.replace(/\/$/, '') || '.';
        const rootDir = node_path_1.default.resolve(absCwd, rootRel);
        const all = await walkFiles(rootDir);
        return all.filter((file) => file.endsWith('page.tsx'));
    }
    throw new Error(`Unsupported glob pattern: ${pattern}`);
}
function createNodeScanDeps(cwd) {
    return {
        loadConfigFromFile: (configPath) => (0, loadConfig_1.loadConfigFromFile)(configPath),
        readFile: (filePath) => promises_1.default.readFile(filePath, 'utf8'),
        writeFile: (filePath, content) => promises_1.default.writeFile(filePath, content, 'utf8'),
        ensureDir: async (dirPath) => {
            await promises_1.default.mkdir(dirPath, { recursive: true });
        },
        glob: (pattern, cwdArg) => simpleGlob(pattern, cwdArg),
        cwd,
    };
}
async function runScanWithNodeEnv(configPath) {
    const deps = createNodeScanDeps(process.cwd());
    await (0, scan_1.runScan)(configPath, deps);
}
function createNodeGenerateSpecDeps(cwd) {
    return {
        loadConfigFromFile: (configPath) => (0, loadConfig_1.loadConfigFromFile)(configPath),
        readFile: (filePath) => promises_1.default.readFile(filePath, 'utf8'),
        writeFile: (filePath, content) => promises_1.default.writeFile(filePath, content, 'utf8'),
        cwd,
        createLLMClient: (config) => (0, openaiClient_1.createOpenAiLLMClientFromEnv)(config),
    };
}
async function runGenerateSpecWithNodeEnv(configPath) {
    const deps = createNodeGenerateSpecDeps(process.cwd());
    await (0, generateSpec_1.runGenerateSpec)(configPath, deps);
}
function createNodeValidateDeps(cwd) {
    return {
        loadConfigFromFile: (configPath) => (0, loadConfig_1.loadConfigFromFile)(configPath),
        readFile: (filePath) => promises_1.default.readFile(filePath, 'utf8'),
        fileExists: async (filePath) => {
            try {
                await promises_1.default.access(filePath);
                return true;
            }
            catch {
                return false;
            }
        },
        log: (message) => {
            // eslint-disable-next-line no-console
            console.log(message);
        },
        cwd,
    };
}
async function runValidateWithNodeEnv(configPath) {
    const deps = createNodeValidateDeps(process.cwd());
    await (0, validate_1.runValidate)(configPath, deps);
}
function createNodeServeDeps(cwd) {
    return {
        loadConfigFromFile: (configPath) => (0, loadConfig_1.loadConfigFromFile)(configPath),
        readFile: (filePath) => promises_1.default.readFile(filePath, 'utf8'),
        writeFile: (filePath, content) => promises_1.default.writeFile(filePath, content, 'utf8'),
        fileExists: async (filePath) => {
            try {
                await promises_1.default.access(filePath);
                return true;
            }
            catch {
                return false;
            }
        },
        log: (message) => {
            // eslint-disable-next-line no-console
            console.log(message);
        },
        cwd,
    };
}
async function runServeWithNodeEnv(configPath) {
    const deps = createNodeServeDeps(process.cwd());
    const handler = await (0, serve_1.createServeHandler)(configPath, deps);
    const http = await import('node:http');
    const port = Number(process.env.FIGMA_SYNC_SERVE_PORT ?? '7001');
    const server = http.createServer((req, res) => {
        let body = '';
        req.setEncoding('utf8');
        req.on('data', (chunk) => {
            body += chunk;
        });
        req.on('end', () => {
            void handler({ method: req.method, url: req.url, body }, res);
        });
    });
    await new Promise((resolve, reject) => {
        server.listen(port, () => {
            // eslint-disable-next-line no-console
            console.log(`figma-sync serve listening on http://localhost:${port}`);
            resolve();
        });
        server.on('error', reject);
    });
}
function createNodeGeneratePatchesDeps(cwd) {
    return {
        loadConfigFromFile: (configPath) => (0, loadConfig_1.loadConfigFromFile)(configPath),
        readFile: (filePath) => promises_1.default.readFile(filePath, 'utf8'),
        writeFile: (filePath, content) => promises_1.default.writeFile(filePath, content, 'utf8'),
        readStdin: () => new Promise((resolve, reject) => {
            let data = '';
            process.stdin.setEncoding('utf8');
            process.stdin.on('data', (chunk) => {
                data += chunk;
            });
            process.stdin.on('end', () => {
                resolve(data);
            });
            process.stdin.on('error', (err) => {
                reject(err);
            });
        }),
        cwd,
    };
}
async function runGeneratePatchesWithNodeEnv(configPath) {
    const deps = createNodeGeneratePatchesDeps(process.cwd());
    await (0, generatePatches_1.runGeneratePatches)(configPath, deps);
}
function createNodeApplyPatchesDeps(cwd) {
    return {
        loadConfigFromFile: (configPath) => (0, loadConfig_1.loadConfigFromFile)(configPath),
        readFile: (filePath) => promises_1.default.readFile(filePath, 'utf8'),
        writeFile: (filePath, content) => promises_1.default.writeFile(filePath, content, 'utf8'),
        fileExists: async (filePath) => {
            try {
                await promises_1.default.access(filePath);
                return true;
            }
            catch {
                return false;
            }
        },
        log: (message) => {
            // eslint-disable-next-line no-console
            console.log(message);
        },
        cwd,
    };
}
async function runApplyPatchesWithNodeEnv(configPath) {
    const deps = createNodeApplyPatchesDeps(process.cwd());
    await (0, applyPatches_1.runApplyPatches)(configPath, deps);
}
