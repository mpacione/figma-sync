"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfigFromFile = loadConfigFromFile;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const node_url_1 = require("node:url");
const figma_sync_core_1 = require("figma-sync-core");
async function loadConfigFromFile(configPath, deps = {}) {
    const resolved = node_path_1.default.resolve(configPath);
    const ext = node_path_1.default.extname(resolved).toLowerCase();
    const readFile = deps.readFile ?? promises_1.default.readFile;
    const loadModule = deps.loadModule ?? ((specifier) => import(specifier));
    let raw;
    if (ext === '.json') {
        const contents = await readFile(resolved, 'utf8');
        raw = JSON.parse(contents);
    }
    else if (ext === '.js' || ext === '.cjs' || ext === '.mjs') {
        const specifier = (0, node_url_1.pathToFileURL)(resolved).href;
        const mod = await loadModule(specifier);
        raw = mod.default ?? mod;
    }
    else {
        throw new Error(`Unsupported config file extension: ${ext}. Use .json or .js for figma-sync.config.`);
    }
    return (0, figma_sync_core_1.parseConfig)(raw);
}
