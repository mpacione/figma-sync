import type { FigmaInstructionSet, FigmaChangeSet } from './types';

// Minimal declarations so TypeScript can compile without pulling in Figma typings
// The real Figma runtime provides these.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const figma: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare function fetch(input: string, init?: any): Promise<any>;

const DEFAULT_SERVER_URL = 'http://localhost:7001';
const PLUGIN_KEY_PREFIX = 'figma-sync:';
const PLUGIN_KEY_ORIGINAL_NAME = `${PLUGIN_KEY_PREFIX}originalName`;
const PLUGIN_KEY_DESIGN_COMPONENT_ID = `${PLUGIN_KEY_PREFIX}designComponentId`;
const PLUGIN_KEY_SCREEN_ID = `${PLUGIN_KEY_PREFIX}screenId`;
const PLUGIN_KEY_ORIGINAL_VARIABLE_VALUE = `${PLUGIN_KEY_PREFIX}originalVariableValue`;

const SERVER_URL_STORAGE_KEY = `${PLUGIN_KEY_PREFIX}serverUrl`;

async function promptForServerUrl(): Promise<string> {
  const fallbackUrl = DEFAULT_SERVER_URL;

  if (
    !figma ||
    typeof figma.showUI !== 'function' ||
    !figma.ui ||
    !figma.clientStorage
  ) {
    return fallbackUrl;
  }

  let initialUrl = fallbackUrl;
  try {
    const stored = await figma.clientStorage.getAsync(SERVER_URL_STORAGE_KEY);
    if (typeof stored === 'string' && stored.trim()) {
      initialUrl = stored.trim();
    }
  } catch (_error) {
    // Ignore storage errors and use fallbackUrl
  }

  return new Promise<string>((resolve) => {
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

    figma.ui.onmessage = async (msg: any) => {
      if (msg && msg.type === 'figma-sync:set-server-url' && typeof msg.url === 'string') {
        const url = msg.url.trim() || fallbackUrl;
        try {
          await figma.clientStorage.setAsync(SERVER_URL_STORAGE_KEY, url);
        } catch (_error) {
          // Ignore storage errors
        }
        if (figma.ui.close) {
          figma.ui.close();
        }
        resolve(url);
      }
    };
  });
}



async function fetchInstructionSet(
  baseUrl: string = DEFAULT_SERVER_URL,
): Promise<FigmaInstructionSet> {
  const res = (await fetch(`${baseUrl}/figma-instructions`)) as any;
  if (!res || typeof res.ok !== 'boolean') {
    throw new Error('Unexpected response from server');
  }
  if (!res.ok) {
    const status = res.status !== undefined && res.status !== null ? res.status : 'error';
    throw new Error(`HTTP ${status} fetching figma-instructions`);
  }
  const data = await res.json();
  // Data is already validated by the CLI before being sent to the plugin
  return data as FigmaInstructionSet;
}

// Very small executor that handles a subset of operations for now.
async function applyInstructions(instructions: FigmaInstructionSet): Promise<void> {
  const nodeRefs = new Map<string, any>();

  // Load default font for text creation
  let fontLoaded = false;
  try {
    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
    fontLoaded = true;
  } catch (error) {
    // If Inter is not available, try loading the default font
    try {
      await figma.loadFontAsync({ family: 'Roboto', style: 'Regular' });
      fontLoaded = true;
    } catch (error2) {
      // Font loading failed, we'll skip text creation
      if (figma.notify) {
        figma.notify('Warning: Could not load fonts, components will be created without text labels');
      }
    }
  }

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
          if (figma.notify) {
            figma.notify(`Missing page for screen frame ${op.screenId}`);
          }
          break;
        }
        const frame = figma.createFrame();
        frame.name = op.name;

        // Set dimensions
        const width = op.width || 1440;
        const height = op.height || 900;
        frame.resize(width, height);

        // Set position
        frame.x = op.x || 0;
        frame.y = op.y || 0;

        // Set background
        frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];

        // Add placeholder content if we have description
        if (fontLoaded && (op.description || op.componentCount)) {
          const text = figma.createText();
          text.name = 'Screen Info';
          text.fontSize = 16;
          text.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }];

          let content = `Screen: ${op.name}\n`;
          if (op.description) {
            content += `${op.description}\n`;
          }
          if (op.componentCount !== undefined) {
            content += `Components used: ${op.componentCount}`;
          }

          text.characters = content;
          text.x = 40;
          text.y = 40;
          frame.appendChild(text);
        }

        page.appendChild(frame);
        if (frame.setPluginData) {
          frame.setPluginData(PLUGIN_KEY_SCREEN_ID, op.screenId);
          frame.setPluginData(PLUGIN_KEY_ORIGINAL_NAME, op.name);
        }
        nodeRefs.set(op.frameId, frame);
        break;
      }
      case 'CreateComponent': {
        const page = nodeRefs.get(op.pageId);
        if (!page) {
          if (figma.notify) {
            figma.notify(`Missing page for component ${op.name}`);
          }
          break;
        }
        const component = figma.createComponent();
        component.name = op.name;

        // Get visual properties from the operation
        const visualProps = op.visualProperties || {};

        // Apply fills (background)
        if (visualProps.fills && visualProps.fills.length > 0) {
          component.fills = visualProps.fills;
        } else {
          // Default fill
          component.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95 } }];
        }

        // Apply strokes (border)
        if (visualProps.strokes && visualProps.strokes.length > 0) {
          component.strokes = visualProps.strokes;
          component.strokeWeight = visualProps.strokeWeight || 1;
        }

        // Apply corner radius
        if (visualProps.cornerRadius !== undefined) {
          component.cornerRadius = visualProps.cornerRadius;
        }

        // Apply auto-layout properties
        const layoutMode = visualProps.layoutMode || 'HORIZONTAL';
        component.layoutMode = layoutMode;

        if (layoutMode !== 'NONE') {
          // Set sizing modes
          component.primaryAxisSizingMode = visualProps.primaryAxisSizingMode || 'AUTO';
          component.counterAxisSizingMode = visualProps.counterAxisSizingMode || 'AUTO';

          // Set alignment
          component.primaryAxisAlignItems = visualProps.primaryAxisAlignItems || 'CENTER';
          component.counterAxisAlignItems = visualProps.counterAxisAlignItems || 'CENTER';

          // Set spacing
          component.itemSpacing = visualProps.itemSpacing || 8;

          // Set padding
          component.paddingLeft = visualProps.paddingLeft || 16;
          component.paddingRight = visualProps.paddingRight || 16;
          component.paddingTop = visualProps.paddingTop || 8;
          component.paddingBottom = visualProps.paddingBottom || 8;
        }

        // Add text label with the component name
        if (fontLoaded) {
          const text = figma.createText();
          text.name = 'Label';
          text.characters = op.name.split('/')[0]; // Use just the component name, not the variant path

          // Apply text properties
          const textProps = visualProps.textProperties || {};
          text.fontSize = textProps.fontSize || 14;

          // Set text color
          if (textProps.textColor) {
            text.fills = [{ type: 'SOLID', color: textProps.textColor }];
          } else {
            // Fallback: determine color based on background
            const bgFill = visualProps.fills && visualProps.fills[0];
            if (bgFill && bgFill.color) {
              const brightness = (bgFill.color.r + bgFill.color.g + bgFill.color.b) / 3;
              const textColor = brightness > 0.5 ? { r: 0, g: 0, b: 0 } : { r: 1, g: 1, b: 1 };
              text.fills = [{ type: 'SOLID', color: textColor }];
            }
          }

          component.appendChild(text);

          // Set layout constraints for text (hug contents)
          if (layoutMode !== 'NONE') {
            text.layoutAlign = 'INHERIT';
            text.layoutGrow = 0; // Don't stretch, hug contents
          }
        } else {
          // If fonts aren't loaded, set a minimum size
          const minWidth = visualProps.minWidth || 100;
          const minHeight = visualProps.minHeight || 40;
          component.resize(minWidth, minHeight);
        }

        page.appendChild(component);

        // Apply position if provided
        if (op.x !== undefined && op.y !== undefined) {
          component.x = op.x;
          component.y = op.y;
        }

        if (component.setPluginData) {
          component.setPluginData(
            PLUGIN_KEY_DESIGN_COMPONENT_ID,
            op.designComponentId,
          );
          component.setPluginData(PLUGIN_KEY_ORIGINAL_NAME, op.name);
        }
        nodeRefs.set(op.componentId, component);
        break;
      }
      case 'CreateComponentSet': {
        // Collect all component nodes that should be combined
        const componentNodes: any[] = [];
        for (const componentId of op.componentIds) {
          const node = nodeRefs.get(componentId);
          if (node) {
            componentNodes.push(node);
          }
        }

        if (componentNodes.length === 0) {
          if (figma.notify) {
            figma.notify(`No components found for component set ${op.componentSetId}`);
          }
          break;
        }

        // Get the parent (should be the page)
        const parent = componentNodes[0].parent;
        if (!parent) {
          if (figma.notify) {
            figma.notify(`No parent found for component set ${op.componentSetId}`);
          }
          break;
        }

        // Combine components as variants
        if (typeof figma.combineAsVariants !== 'function') {
          if (figma.notify) {
            figma.notify('combineAsVariants API not available in this Figma environment');
          }
          break;
        }

        const componentSet = figma.combineAsVariants(componentNodes, parent);

        // Apply position if provided
        if (op.x !== undefined && op.y !== undefined) {
          componentSet.x = op.x;
          componentSet.y = op.y;
        }

        nodeRefs.set(op.componentSetId, componentSet);
        break;
      }
      case 'CreateVariableCollection': {
        const variablesApi = figma.variables;
        if (!variablesApi || typeof variablesApi.createVariableCollection !== 'function') {
          if (figma.notify) {
            figma.notify(
              'Variables API not available in this Figma environment',
            );
          }
          break;
        }
        const collection = variablesApi.createVariableCollection(op.name);
        nodeRefs.set(op.collectionId, collection);
        break;
      }
      case 'CreateVariable': {
        const variablesApi = figma.variables;
        if (!variablesApi || typeof variablesApi.createVariable !== 'function') {
          if (figma.notify) {
            figma.notify('Variables API not available in this Figma environment');
          }
          break;
        }

        const collection = nodeRefs.get(op.collectionId);
        if (!collection) {
          if (figma.notify) {
            figma.notify(`Missing variable collection for variable ${op.name}`);
          }
          break;
        }

        const variable = variablesApi.createVariable(
          op.name,
          collection,
          op.variableType,
        );

        const defaultModeId = collection.defaultModeId;
        const defaultValue =
          op.modeValues && Object.prototype.hasOwnProperty.call(op.modeValues, 'default')
            ? op.modeValues['default']
            : undefined;

        if (defaultModeId && defaultValue !== undefined) {
          let valueToSet: unknown = defaultValue;

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
          variable.setValueForMode(defaultModeId, valueToSet as any);

          // Persist the original "default" value in plugin data so we can
          // detect changes later when exporting a FigmaChangeSet.
          const originalValueString = String(defaultValue);
          if (variable.setPluginData) {
            variable.setPluginData(
              PLUGIN_KEY_ORIGINAL_VARIABLE_VALUE,
              originalValueString,
            );
          }
        }

        nodeRefs.set(op.variableId, variable);
        break;
      }
      case 'ReparentNode': {
        const node = nodeRefs.get(op.nodeId);
        const newParent = nodeRefs.get(op.newParentId);
        if (!node || !newParent) {
          if (figma.notify) {
            figma.notify('Missing node or parent for ReparentNode operation');
          }
          break;
        }
        newParent.appendChild(node);
        break;
      }
      case 'RenameNode': {
        const node = nodeRefs.get(op.nodeId);
        if (!node) {
          if (figma.notify) {
            figma.notify('Missing node for RenameNode operation');
          }
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

function collectFigmaChanges(): FigmaChangeSet {
  const changes: FigmaChangeSet['changes'] = [];
  let counter = 0;

  const getPluginData = (node: any, key: string): string | null => {
    if (typeof node.getPluginData === 'function') {
      const value = node.getPluginData(key);
      return value || null;
    }
    return null;
  };

  const visit = (node: any): void => {
    const currentName: string | null =
      typeof node.name === 'string' ? (node.name as string) : null;
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
      } else if (screenId) {
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
  if (figma && figma.root && figma.root.children) {
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
      const originalValueString = getPluginData(
        variable,
        PLUGIN_KEY_ORIGINAL_VARIABLE_VALUE,
      );
      if (!originalValueString) continue;

      const defaultModeId = variable.defaultModeId;
      if (!defaultModeId || typeof variable.getValueForMode !== 'function') {
        continue;
      }

      const currentValue = variable.getValueForMode(defaultModeId);
      let currentValueString: string | null = null;
      let newValueForChange: string | number | boolean | null = null;

      if (
        currentValue &&
        typeof currentValue === 'object' &&
        'r' in currentValue &&
        'g' in currentValue &&
        'b' in currentValue
      ) {
        // Approximate conversion of RGBA to hex for COLOR variables.
        const r = Math.round((currentValue as any).r * 255);
        const g = Math.round((currentValue as any).g * 255);
        const b = Math.round((currentValue as any).b * 255);
        const toHex = (n: number) => n.toString(16).padStart(2, '0');
        const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`.toLowerCase();
        currentValueString = hex;
        newValueForChange = hex;
      } else if (
        typeof currentValue === 'number' ||
        typeof currentValue === 'string' ||
        typeof currentValue === 'boolean'
      ) {
        currentValueString = String(currentValue);
        newValueForChange = currentValue as any;
      }

      if (
        currentValueString !== null &&
        currentValueString !== originalValueString &&
        newValueForChange !== null
      ) {
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

async function postChangeSet(
  changeSet: FigmaChangeSet,
  baseUrl: string = DEFAULT_SERVER_URL,
): Promise<void> {
  const res = (await fetch(`${baseUrl}/figma-changes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(changeSet),
  })) as any;

  if (!res || typeof res.ok !== 'boolean') {
    throw new Error('Unexpected response from server when posting changes');
  }
  if (!res.ok) {
    const status = res.status !== undefined && res.status !== null ? res.status : 'error';
    throw new Error(`HTTP ${status} posting figma-changes`);
  }
}

async function main(): Promise<void> {
  try {
    const command: string = typeof figma.command === 'string'
      ? (figma.command as string)
      : 'bootstrap-from-code';

    if (command === 'bootstrap-from-code' || command === 'apply-from-code') {
      const baseUrl = await promptForServerUrl();
      const instructions = await fetchInstructionSet(baseUrl);
      await applyInstructions(instructions);
      if (figma.notify) {
        figma.notify('figma-sync: applied instructions from local server');
      }
    } else if (command === 'export-changes' || command === 'emit-changes') {
      const changeSet = collectFigmaChanges();
      if (changeSet.changes.length === 0) {
        if (figma.notify) {
          figma.notify('figma-sync: no changes detected');
        }
      } else {
        const baseUrl = await promptForServerUrl();
        await postChangeSet(changeSet, baseUrl);
        if (figma.notify) {
          figma.notify('figma-sync: emitted changes to local server');
        }
      }
    } else {
      if (figma.notify) {
        figma.notify(`figma-sync: unknown command "${command}"`);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (figma.notify) {
      figma.notify(`figma-sync error: ${message}`);
    }
  } finally {
    if (figma.closePlugin) {
      figma.closePlugin();
    }
  }
}

void main();

