"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const figma_sync_core_1 = require("figma-sync-core");
const DEFAULT_SERVER_URL = 'http://localhost:7001';
const PLUGIN_KEY_PREFIX = 'figma-sync:';
const PLUGIN_KEY_ORIGINAL_NAME = `${PLUGIN_KEY_PREFIX}originalName`;
const PLUGIN_KEY_DESIGN_COMPONENT_ID = `${PLUGIN_KEY_PREFIX}designComponentId`;
const PLUGIN_KEY_SCREEN_ID = `${PLUGIN_KEY_PREFIX}screenId`;
const PLUGIN_KEY_ORIGINAL_VARIABLE_VALUE = `${PLUGIN_KEY_PREFIX}originalVariableValue`;
const SERVER_URL_STORAGE_KEY = `${PLUGIN_KEY_PREFIX}serverUrl`;
async function promptForServerUrl() {
    const fallbackUrl = DEFAULT_SERVER_URL;
    if (!figma ||
        typeof figma.showUI !== 'function' ||
        !figma.ui ||
        !figma.clientStorage) {
        return fallbackUrl;
    }
    let initialUrl = fallbackUrl;
    try {
        const stored = await figma.clientStorage.getAsync(SERVER_URL_STORAGE_KEY);
        if (typeof stored === 'string' && stored.trim()) {
            initialUrl = stored.trim();
        }
    }
    catch {
        // Ignore storage errors and use fallbackUrl
    }
    return new Promise((resolve) => {
        const html = `
      <style>
        body { font-family: system-ui, sans-serif; margin: 8px; }
        label { display: block; margin-bottom: 4px; }
        input { width: 100%; box-sizing: border-box; margin-bottom: 8px; }
        button { padding: 4px 8px; }
      </style>
      <label>figma-sync server URL</label>
      <input id="url" />
      <button id="ok">OK</button>
      <script>
        const input = document.getElementById('url');
        input.value = ${JSON.stringify(initialUrl)};
        const submit = () => {
          parent.postMessage({ pluginMessage: { type: 'figma-sync:set-server-url', url: input.value } }, '*');
        };
        document.getElementById('ok').onclick = submit;
        input.addEventListener('keydown', (event) => {
          if (event.key === 'Enter') submit();
        });
        input.focus();
        input.select();
      </script>
    `;
        figma.showUI(html, { width: 340, height: 140 });
        figma.ui.onmessage = async (msg) => {
            if (msg?.type === 'figma-sync:set-server-url' && typeof msg.url === 'string') {
                const url = msg.url.trim() || fallbackUrl;
                try {
                    await figma.clientStorage.setAsync(SERVER_URL_STORAGE_KEY, url);
                }
                catch {
                    // Ignore storage errors
                }
                figma.ui.close?.();
                resolve(url);
            }
        };
    });
}
async function fetchInstructionSet(baseUrl = DEFAULT_SERVER_URL) {
    const res = (await fetch(`${baseUrl}/figma-instructions`));
    if (!res || typeof res.ok !== 'boolean') {
        throw new Error('Unexpected response from server');
    }
    if (!res.ok) {
        throw new Error(`HTTP ${res.status ?? 'error'} fetching figma-instructions`);
    }
    const data = await res.json();
    return figma_sync_core_1.zFigmaInstructionSet.parse(data);
}
// Very small executor that handles a subset of operations for now.
async function applyInstructions(instructions) {
    const nodeRefs = new Map();
    for (const op of instructions.operations) {
        switch (op.type) {
            case 'CreatePage': {
                const page = figma.createPage();
                page.name = op.name;
                nodeRefs.set(op.pageId, page);
                break;
            }
            case 'CreateScreenFrame': {
                const page = nodeRefs.get(op.pageId);
                if (!page) {
                    figma.notify?.(`Missing page for screen frame ${op.screenId}`);
                    break;
                }
                const frame = figma.createFrame();
                frame.name = op.name;
                frame.x = 0;
                frame.y = 0;
                page.appendChild(frame);
                frame.setPluginData?.(PLUGIN_KEY_SCREEN_ID, op.screenId);
                frame.setPluginData?.(PLUGIN_KEY_ORIGINAL_NAME, op.name);
                nodeRefs.set(op.frameId, frame);
                break;
            }
            case 'CreateComponent': {
                const page = nodeRefs.get(op.pageId);
                if (!page) {
                    figma.notify?.(`Missing page for component ${op.name}`);
                    break;
                }
                const component = figma.createComponent();
                component.name = op.name;
                page.appendChild(component);
                component.setPluginData?.(PLUGIN_KEY_DESIGN_COMPONENT_ID, op.designComponentId);
                component.setPluginData?.(PLUGIN_KEY_ORIGINAL_NAME, op.name);
                nodeRefs.set(op.componentId, component);
                break;
            }
            case 'CreateVariableCollection': {
                const variablesApi = figma.variables;
                if (!variablesApi || typeof variablesApi.createVariableCollection !== 'function') {
                    figma.notify?.('Variables API not available in this Figma environment');
                    break;
                }
                const collection = variablesApi.createVariableCollection(op.name);
                nodeRefs.set(op.collectionId, collection);
                break;
            }
            case 'CreateVariable': {
                const variablesApi = figma.variables;
                if (!variablesApi || typeof variablesApi.createVariable !== 'function') {
                    figma.notify?.('Variables API not available in this Figma environment');
                    break;
                }
                const collection = nodeRefs.get(op.collectionId);
                if (!collection) {
                    figma.notify?.(`Missing variable collection for variable ${op.name}`);
                    break;
                }
                const variable = variablesApi.createVariable(op.name, collection, op.variableType);
                const defaultModeId = collection.defaultModeId;
                const defaultValue = op.modeValues && Object.prototype.hasOwnProperty.call(op.modeValues, 'default')
                    ? op.modeValues['default']
                    : undefined;
                if (defaultModeId && defaultValue !== undefined) {
                    let valueToSet = defaultValue;
                    if (op.variableType === 'COLOR' && typeof defaultValue === 'string') {
                        const hex = defaultValue.trim();
                        const match = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(hex);
                        if (match) {
                            let hexPart = match[1];
                            if (hexPart.length === 3) {
                                hexPart = hexPart
                                    .split('')
                                    .map((ch) => ch + ch)
                                    .join('');
                            }
                            const num = parseInt(hexPart, 16);
                            const r = ((num >> 16) & 0xff) / 255;
                            const g = ((num >> 8) & 0xff) / 255;
                            const b = (num & 0xff) / 255;
                            valueToSet = { r, g, b, a: 1 };
                        }
                    }
                    // For FLOAT/STRING/BOOLEAN, we pass the value through as-is.
                    variable.setValueForMode(defaultModeId, valueToSet);
                    // Persist the original "default" value in plugin data so we can
                    // detect changes later when exporting a FigmaChangeSet.
                    const originalValueString = String(defaultValue);
                    variable.setPluginData?.(PLUGIN_KEY_ORIGINAL_VARIABLE_VALUE, originalValueString);
                }
                nodeRefs.set(op.variableId, variable);
                break;
            }
            case 'ReparentNode': {
                const node = nodeRefs.get(op.nodeId);
                const newParent = nodeRefs.get(op.newParentId);
                if (!node || !newParent) {
                    figma.notify?.('Missing node or parent for ReparentNode operation');
                    break;
                }
                newParent.appendChild(node);
                break;
            }
            case 'RenameNode': {
                const node = nodeRefs.get(op.nodeId);
                if (!node) {
                    figma.notify?.('Missing node for RenameNode operation');
                    break;
                }
                node.name = op.name;
                break;
            }
            default: {
                // Other operations (variables, variables application, variants, etc.)
                // can be added incrementally. For now we skip them.
                break;
            }
        }
    }
}
function collectFigmaChanges() {
    const changes = [];
    let counter = 0;
    const getPluginData = (node, key) => {
        if (typeof node.getPluginData === 'function') {
            const value = node.getPluginData(key);
            return value || null;
        }
        return null;
    };
    const visit = (node) => {
        const currentName = typeof node.name === 'string' ? node.name : null;
        const originalName = getPluginData(node, PLUGIN_KEY_ORIGINAL_NAME);
        if (currentName && originalName && currentName !== originalName) {
            const designComponentId = getPluginData(node, PLUGIN_KEY_DESIGN_COMPONENT_ID);
            const screenId = getPluginData(node, PLUGIN_KEY_SCREEN_ID);
            if (designComponentId) {
                changes.push({
                    id: `chg-${++counter}`,
                    type: 'RenameComponent',
                    componentId: designComponentId,
                    newName: currentName,
                });
            }
            else if (screenId) {
                changes.push({
                    id: `chg-${++counter}`,
                    type: 'RenameScreen',
                    screenId,
                    newName: currentName,
                });
            }
        }
        if (Array.isArray(node.children)) {
            for (const child of node.children) {
                visit(child);
            }
        }
    };
    // Walk pages and frames to detect renames.
    if (figma?.root?.children) {
        for (const page of figma.root.children) {
            visit(page);
        }
    }
    // Inspect local variables to detect value changes for tokens that were
    // originally created by figma-sync (we stored their original "default"
    // value in plugin data when applying instructions).
    const variablesApi = figma.variables;
    if (variablesApi && typeof variablesApi.getLocalVariables === 'function') {
        const vars = variablesApi.getLocalVariables();
        for (const variable of vars) {
            const originalValueString = getPluginData(variable, PLUGIN_KEY_ORIGINAL_VARIABLE_VALUE);
            if (!originalValueString)
                continue;
            const defaultModeId = variable.defaultModeId;
            if (!defaultModeId || typeof variable.getValueForMode !== 'function') {
                continue;
            }
            const currentValue = variable.getValueForMode(defaultModeId);
            let currentValueString = null;
            let newValueForChange = null;
            if (currentValue &&
                typeof currentValue === 'object' &&
                'r' in currentValue &&
                'g' in currentValue &&
                'b' in currentValue) {
                // Approximate conversion of RGBA to hex for COLOR variables.
                const r = Math.round(currentValue.r * 255);
                const g = Math.round(currentValue.g * 255);
                const b = Math.round(currentValue.b * 255);
                const toHex = (n) => n.toString(16).padStart(2, '0');
                const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`.toLowerCase();
                currentValueString = hex;
                newValueForChange = hex;
            }
            else if (typeof currentValue === 'number' ||
                typeof currentValue === 'string' ||
                typeof currentValue === 'boolean') {
                currentValueString = String(currentValue);
                newValueForChange = currentValue;
            }
            if (currentValueString !== null &&
                currentValueString !== originalValueString &&
                newValueForChange !== null) {
                changes.push({
                    id: `chg-${++counter}`,
                    type: 'UpdateVariable',
                    variableId: variable.id,
                    variableName: variable.name,
                    newValue: newValueForChange,
                    modeId: defaultModeId,
                });
            }
        }
    }
    return { version: '1.0', changes };
}
async function postChangeSet(changeSet, baseUrl = DEFAULT_SERVER_URL) {
    const res = (await fetch(`${baseUrl}/figma-changes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changeSet),
    }));
    if (!res || typeof res.ok !== 'boolean') {
        throw new Error('Unexpected response from server when posting changes');
    }
    if (!res.ok) {
        throw new Error(`HTTP ${res.status ?? 'error'} posting figma-changes`);
    }
}
async function main() {
    try {
        const command = typeof figma.command === 'string'
            ? figma.command
            : 'bootstrap-from-code';
        if (command === 'bootstrap-from-code' || command === 'apply-from-code') {
            const baseUrl = await promptForServerUrl();
            const instructions = await fetchInstructionSet(baseUrl);
            await applyInstructions(instructions);
            figma.notify?.('figma-sync: applied instructions from local server');
        }
        else if (command === 'export-changes' || command === 'emit-changes') {
            const changeSet = collectFigmaChanges();
            if (changeSet.changes.length === 0) {
                figma.notify?.('figma-sync: no changes detected');
            }
            else {
                const baseUrl = await promptForServerUrl();
                await postChangeSet(changeSet, baseUrl);
                figma.notify?.('figma-sync: emitted changes to local server');
            }
        }
        else {
            figma.notify?.(`figma-sync: unknown command "${command}"`);
        }
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        figma.notify?.(`figma-sync error: ${message}`);
    }
    finally {
        figma.closePlugin?.();
    }
}
void main();
