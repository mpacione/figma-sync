"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServeHandler = createServeHandler;
const node_path_1 = __importDefault(require("node:path"));
const figma_sync_core_1 = require("figma-sync-core");
function getPathname(url) {
    if (!url)
        return '/';
    return url.split('?')[0] || '/';
}
function sendJson(res, statusCode, body) {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(body));
}
async function handleArtifactRequest(label, fileName, ctx, deps, res) {
    const filePath = node_path_1.default.join(ctx.artifactsDir, fileName);
    const exists = await deps.fileExists(filePath);
    if (!exists) {
        deps.log?.(`${label}: ${filePath} (missing)`);
        res.statusCode = 404;
        res.end('Not found');
        return;
    }
    try {
        const content = await deps.readFile(filePath);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(content);
    }
    catch (error) {
        deps.log?.(`${label}: ${filePath} (error: ${error.message})`);
        res.statusCode = 500;
        res.end('Internal server error');
    }
}
async function handleRequest(ctx, deps, req, res) {
    const method = (req.method || 'GET').toUpperCase();
    const pathname = getPathname(req.url ?? '/');
    if (method === 'GET' && pathname === '/health') {
        sendJson(res, 200, { status: 'ok' });
        return;
    }
    if (method === 'GET' && pathname === '/') {
        sendJson(res, 200, {
            endpoints: [
                '/health',
                '/code-model',
                '/design-spec',
                '/spec',
                '/figma-instructions',
                '/instructions',
                '/figma-changes',
                '/code-patches',
            ],
        });
        return;
    }
    if (method === 'GET' && pathname === '/code-model') {
        await handleArtifactRequest('CodeModel', 'code-model.json', ctx, deps, res);
        return;
    }
    if (method === 'GET' && pathname === '/design-spec') {
        await handleArtifactRequest('DesignSpec', 'design-spec.json', ctx, deps, res);
        return;
    }
    if (method === 'GET' && pathname === '/spec') {
        await handleArtifactRequest('DesignSpec', 'design-spec.json', ctx, deps, res);
        return;
    }
    if (method === 'GET' && pathname === '/figma-instructions') {
        await handleArtifactRequest('FigmaInstructionSet', 'figma-instructions.json', ctx, deps, res);
        return;
    }
    if (method === 'GET' && pathname === '/instructions') {
        await handleArtifactRequest('FigmaInstructionSet', 'figma-instructions.json', ctx, deps, res);
        return;
    }
    if (method === 'GET' && pathname === '/figma-changes') {
        await handleArtifactRequest('FigmaChangeSet', 'figma-changes.json', ctx, deps, res);
        return;
    }
    if (method === 'GET' && pathname === '/code-patches') {
        await handleArtifactRequest('CodePatchSet', 'code-patches.json', ctx, deps, res);
        return;
    }
    if (method === 'POST' && pathname === '/figma-changes') {
        const body = req.body ?? '';
        try {
            const parsed = JSON.parse(body);
            const changeSet = figma_sync_core_1.zFigmaChangeSet.parse(parsed);
            const filePath = node_path_1.default.join(ctx.artifactsDir, 'figma-changes.json');
            await deps.writeFile(filePath, JSON.stringify(changeSet, null, 2));
            deps.log?.(`FigmaChangeSet: ${filePath} (written)`);
            sendJson(res, 200, { status: 'ok' });
        }
        catch (error) {
            deps.log?.(`FigmaChangeSet: error parsing or writing change set: ${error.message}`);
            res.statusCode = 400;
            res.end('Invalid FigmaChangeSet payload');
        }
        return;
    }
    res.statusCode = 404;
    res.end('Not found');
}
async function createServeHandler(configPath, deps) {
    await deps.loadConfigFromFile(configPath);
    const artifactsDir = node_path_1.default.resolve(deps.cwd, 'artifacts');
    const ctx = { artifactsDir };
    return async (req, res) => {
        await handleRequest(ctx, deps, req, res);
    };
}
