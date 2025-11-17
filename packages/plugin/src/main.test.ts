import { describe, it, expect, vi } from 'vitest';

// Helper to run the plugin once with a mocked Figma environment.
async function runPluginWithEnv(setup: (ctx: any) => void) {
  vi.resetModules();

  const notifications: string[] = [];
  let uiOnMessage: ((msg: any) => void) | undefined;
  let closeResolve!: () => void;
  const closePromise = new Promise<void>((resolve) => {
    closeResolve = resolve;
  });

  const figma: any = {
    command: 'bootstrap-from-code',
    notify: (msg: string) => notifications.push(msg),
    showUI: vi.fn(),
    ui: {
      close: vi.fn(),
      get onmessage() {
        return uiOnMessage;
      },
      set onmessage(fn) {
        uiOnMessage = fn;
      },
    },
    clientStorage: {
      getAsync: vi.fn().mockResolvedValue(undefined),
      setAsync: vi.fn().mockResolvedValue(undefined),
    },
    root: { children: [] as any[] },
    variables: undefined,
    createPage: vi.fn(() => {
      const page: any = {
        name: '',
        children: [] as any[],
        appendChild(child: any) {
          this.children.push(child);
        },
      };
      return page;
    }),
    createFrame: vi.fn(() => {
      const frame: any = {
        name: '',
        x: 0,
        y: 0,
        children: [] as any[],
        appendChild(child: any) {
          this.children.push(child);
        },
        _data: {} as Record<string, string>,
        setPluginData(key: string, value: string) {
          this._data[key] = value;
        },
        getPluginData(key: string) {
          return this._data[key] ?? '';
        },
      };
      return frame;
    }),
    createComponent: vi.fn(() => {
      const component: any = {
        name: '',
        children: [] as any[],
        appendChild(child: any) {
          this.children.push(child);
        },
        _data: {} as Record<string, string>,
        setPluginData(key: string, value: string) {
          this._data[key] = value;
        },
        getPluginData(key: string) {
          return this._data[key] ?? '';
        },
      };
      return component;
    }),
    closePlugin: () => closeResolve(),
  };

  const fetchMock = vi.fn();

  (globalThis as any).figma = figma;
  (globalThis as any).fetch = fetchMock;

  setup({ figma, fetchMock, notifications, getUiOnMessage: () => uiOnMessage });

  await import('./main.ts');

  return { figma, fetchMock, notifications, getUiOnMessage: () => uiOnMessage, closePromise };
}

describe('figma-sync plugin main', () => {
  it('bootstrap-from-code fetches and applies instructions', async () => {
    const instructionSet = {
      version: '1.0' as const,
      operations: [
        { id: 'op1', type: 'CreatePage' as const, pageId: 'page1', name: 'Page' },
        {
          id: 'op2',
          type: 'CreateScreenFrame' as const,
          frameId: 'frame1',
          pageId: 'page1',
          screenId: 'screen1',
          name: 'Screen',
        },
        {
          id: 'op3',
          type: 'CreateComponent' as const,
          componentId: 'cmp1',
          designComponentId: 'cmp1',
          pageId: 'page1',
          name: 'Button',
        },
        {
          id: 'op4',
          type: 'CreateVariableCollection' as const,
          collectionId: 'vc1',
          name: 'Colors',
        },
        {
          id: 'op5',
          type: 'CreateVariable' as const,
          variableId: 'var1',
          collectionId: 'vc1',
          name: 'primary',
          variableType: 'COLOR',
          modeValues: { default: '#ffaa00' },
          scopes: [],
        },
        {
          id: 'op6',
          type: 'CreateVariable' as const,
          variableId: 'var2',
          collectionId: 'vc1',
          name: 'accent',
          variableType: 'COLOR',
          modeValues: { default: '#fa0' },
          scopes: [],
        },
        {
          id: 'op7',
          type: 'ReparentNode' as const,
          nodeId: 'cmp1',
          newParentId: 'frame1',
        },
        {
          id: 'op8',
          type: 'RenameNode' as const,
          nodeId: 'cmp1',
          name: 'Button Renamed',
        },
        {
          id: 'op9',
          type: 'EnsurePage' as const,
          pageId: 'page1',
          name: 'Page',
        },
      ],
    };

    const createdCollections: any[] = [];
    const createdVariables: any[] = [];

    const { figma, fetchMock, notifications, getUiOnMessage, closePromise } =
      await runPluginWithEnv(({ figma: f, fetchMock: fm }: any) => {
        f.command = 'bootstrap-from-code';
        f.variables = {
          createVariableCollection(name: string) {
            const collection = { id: 'vc1', name, defaultModeId: 'default-mode' };
            createdCollections.push(collection);
            return collection;
          },
          createVariable(name: string, collection: any, variableType: string) {
            const variable: any = {
              id: 'var1',
              name,
              variableType,
              defaultModeId: collection.defaultModeId,
              _values: {} as Record<string, unknown>,
              _data: {} as Record<string, string>,
              setValueForMode(modeId: string, value: unknown) {
                this._values[modeId] = value;
              },
              getValueForMode(modeId: string) {
                return this._values[modeId];
              },
              setPluginData(key: string, value: string) {
                this._data[key] = value;
              },
              getPluginData(key: string) {
                return this._data[key] ?? '';
              },
            };
            createdVariables.push(variable);
            return variable;
          },
        };
        fm.mockImplementation(async (url: string) => {
          expect(url).toBe('http://localhost:7001/figma-instructions');
          return { ok: true, status: 200, json: async () => instructionSet } as any;
        });
      });

    const onMessage = getUiOnMessage();
    expect(onMessage).toBeTypeOf('function');
    onMessage!({ type: 'figma-sync:set-server-url', url: 'http://localhost:7001' });

    await closePromise;

    expect(figma.createPage).toHaveBeenCalledTimes(1);
    expect(figma.createFrame).toHaveBeenCalledTimes(1);
    expect(figma.createComponent).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(notifications).toContain('figma-sync: applied instructions from local server');

    expect(createdCollections.length).toBe(1);
    expect(createdVariables.length).toBe(2);
    const primaryVar = createdVariables.find((v) => v.name === 'primary');
    const accentVar = createdVariables.find((v) => v.name === 'accent');
    expect(primaryVar?._values['default-mode']).toBeDefined();
    expect(primaryVar?._data['figma-sync:originalVariableValue']).toBe('#ffaa00');
    expect(accentVar?._values['default-mode']).toBeDefined();
    expect(accentVar?._data['figma-sync:originalVariableValue']).toBe('#fa0');

  });
  it('bootstrap-from-code falls back to default URL and reports unexpected response when instructions response is malformed', async () => {
    const { notifications, fetchMock, closePromise } = await runPluginWithEnv(
      ({ figma, fetchMock }: any) => {
        figma.command = 'bootstrap-from-code';
        // Remove UI/clientStorage so promptForServerUrl uses the fallback URL directly.
        (figma as any).showUI = undefined;
        (figma as any).ui = undefined;
        (figma as any).clientStorage = undefined;
        fetchMock.mockResolvedValue({});
      },
    );

    await closePromise;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:7001/figma-instructions',
    );
    expect(
      notifications.some((msg) =>
        msg.includes('figma-sync error: Unexpected response from server'),
      ),
    ).toBe(true);
  });

  it('bootstrap-from-code reports HTTP errors when fetching instructions', async () => {
    const { notifications, fetchMock, getUiOnMessage, closePromise } =
      await runPluginWithEnv(({ figma, fetchMock }: any) => {
        figma.command = 'bootstrap-from-code';
        fetchMock.mockResolvedValue({
          ok: false,
          status: 500,
          json: async () => ({}),
        });
      });

    const onMessage = getUiOnMessage();
    expect(onMessage).toBeTypeOf('function');
    onMessage!({
      type: 'figma-sync:set-server-url',
      url: 'http://localhost:7001',
    });

    await closePromise;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(
      notifications.some((msg) =>
        msg.includes('figma-sync error: HTTP 500 fetching figma-instructions'),
      ),
    ).toBe(true);
  });
  it('bootstrap-from-code reports missing references and missing Variables API', async () => {
    const instructionSet = {
      version: '1.0' as const,
      operations: [
        {
          id: 'op1',
          type: 'CreateScreenFrame' as const,
          frameId: 'frame1',
          pageId: 'missing-page',
          screenId: 'screen1',
          name: 'Orphan Screen',
        },
        {
          id: 'op2',
          type: 'CreateComponent' as const,
          componentId: 'cmp1',
          designComponentId: 'cmp1',
          pageId: 'missing-page',
          name: 'Orphan Component',
        },
        {
          id: 'op3',
          type: 'CreateVariableCollection' as const,
          collectionId: 'vc1',
          name: 'Colors',
        },
        {
          id: 'op4',
          type: 'CreateVariable' as const,
          variableId: 'var1',
          collectionId: 'vc2',
          name: 'primary',
          variableType: 'COLOR',
          modeValues: { default: '#000000' },
          scopes: [],
        },
        {
          id: 'op5',
          type: 'ReparentNode' as const,
          nodeId: 'missing-node',
          newParentId: 'missing-parent',
        },
        {
          id: 'op6',
          type: 'RenameNode' as const,
          nodeId: 'missing-node',
          name: 'Renamed',
        },
      ],
    };

    const { notifications, fetchMock, getUiOnMessage, closePromise } =
      await runPluginWithEnv(({ figma, fetchMock }: any) => {
        figma.command = 'bootstrap-from-code';
        figma.variables = undefined;
        fetchMock.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => instructionSet,
        });
      });

    const onMessage = getUiOnMessage();
    expect(onMessage).toBeTypeOf('function');
    onMessage!({
      type: 'figma-sync:set-server-url',
      url: 'http://localhost:7001',
    });

    await closePromise;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(
      notifications.some((msg) =>
        msg.includes('Missing page for screen frame'),
      ),
    ).toBe(true);
    expect(
      notifications.some((msg) =>
        msg.includes('Missing page for component'),
      ),
    ).toBe(true);
    expect(
      notifications.filter((msg) =>
        msg.includes('Variables API not available in this Figma environment'),
      ).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      notifications.some((msg) =>
        msg.includes('Missing node or parent for ReparentNode operation'),
      ),
    ).toBe(true);
    expect(
      notifications.some((msg) =>
        msg.includes('Missing node for RenameNode operation'),
      ),
    ).toBe(true);
  });





  it('export-changes notifies when there are no changes', async () => {
    const { notifications, fetchMock, closePromise } = await runPluginWithEnv(
      ({ figma, fetchMock }: any) => {
        figma.command = 'export-changes';
        figma.root.children = []; // no pages
        figma.variables = { getLocalVariables: () => [] };
        fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
      },
    );

    await closePromise;

    expect(fetchMock).not.toHaveBeenCalled();
    expect(notifications).toContain('figma-sync: no changes detected');
  });

  it('export-changes posts a change set when there are renames and variable changes', async () => {
    const { fetchMock, notifications, getUiOnMessage, closePromise } =
      await runPluginWithEnv(({ figma, fetchMock }: any) => {
        const makeNode = (
          name: string,
          data: Record<string, string> = {},
          children: any[] = [],
        ) => ({
          name,
          children,
          getPluginData(key: string) {
            return data[key] ?? '';
          },
        });

        figma.command = 'export-changes';
        const componentNode = makeNode('Button Renamed', {
          'figma-sync:originalName': 'Button',
          'figma-sync:designComponentId': 'cmp1',
        });
        const screenNode = makeNode('Login Renamed', {
          'figma-sync:originalName': 'Login',
          'figma-sync:screenId': 'screen1',
        });
        figma.root.children = [{ children: [componentNode, screenNode] }];

        const variableData: Record<string, string> = {
          'figma-sync:originalVariableValue': '#000000',
        };
        const variable = {
          id: 'var1',
          name: 'primary',
          defaultModeId: 'default-mode',
          getValueForMode: () => ({ r: 1, g: 1, b: 1 }),
          getPluginData(key: string) {
            return variableData[key] ?? '';
          },
        };
        figma.variables = { getLocalVariables: () => [variable] };

        fetchMock.mockImplementation(async (url: string, init?: any) => {
          expect(url).toBe('http://localhost:7001/figma-changes');
          const body = JSON.parse((init as any).body);
          const types = body.changes.map((c: any) => c.type);
          expect(types).toContain('RenameComponent');
          expect(types).toContain('RenameScreen');
          expect(types).toContain('UpdateVariable');
          return { ok: true, status: 200 } as any;
        });
      });

    const onMessage = getUiOnMessage();
    expect(onMessage).toBeTypeOf('function');
    onMessage!({ type: 'figma-sync:set-server-url', url: 'http://localhost:7001' });

    await closePromise;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(notifications).toContain('figma-sync: emitted changes to local server');
  });
  it('export-changes reports an error when posting changes returns an unexpected response', async () => {
    const { fetchMock, notifications, getUiOnMessage, closePromise } =
      await runPluginWithEnv(({ figma, fetchMock }: any) => {
        const makeNode = (
          name: string,
          data: Record<string, string> = {},
          children: any[] = [],
        ) => ({
          name,
          children,
          getPluginData(key: string) {
            return data[key] ?? '';
          },
        });

        figma.command = 'export-changes';
        const componentNode = makeNode('Button Renamed', {
          'figma-sync:originalName': 'Button',
          'figma-sync:designComponentId': 'cmp1',
        });
        figma.root.children = [{ children: [componentNode] }];

        fetchMock.mockResolvedValue({});
      });

    const onMessage = getUiOnMessage();
    expect(onMessage).toBeTypeOf('function');
    onMessage!({
      type: 'figma-sync:set-server-url',
      url: 'http://localhost:7001',
    });

    await closePromise;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(
      notifications.some((msg) =>
        msg.includes(
          'figma-sync error: Unexpected response from server when posting changes',
        ),
      ),
    ).toBe(true);
  });

  it('export-changes reports HTTP errors when posting changes fails', async () => {
    const { fetchMock, notifications, getUiOnMessage, closePromise } =
      await runPluginWithEnv(({ figma, fetchMock }: any) => {
        const makeNode = (
          name: string,
          data: Record<string, string> = {},
          children: any[] = [],
        ) => ({
          name,
          children,
          getPluginData(key: string) {
            return data[key] ?? '';
          },
        });

        figma.command = 'export-changes';
        const componentNode = makeNode('Button Renamed', {
          'figma-sync:originalName': 'Button',
          'figma-sync:designComponentId': 'cmp1',
        });
        figma.root.children = [{ children: [componentNode] }];

        fetchMock.mockResolvedValue({
          ok: false,
          status: 500,
          json: async () => ({}),
        });
      });

    const onMessage = getUiOnMessage();
    expect(onMessage).toBeTypeOf('function');
    onMessage!({
      type: 'figma-sync:set-server-url',
      url: 'http://localhost:7001',
    });

    await closePromise;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(
      notifications.some((msg) =>
        msg.includes('figma-sync error: HTTP 500 posting figma-changes'),
      ),
    ).toBe(true);
  });




  it('unknown command is reported via notify', async () => {
    const { notifications, closePromise } = await runPluginWithEnv(
      ({ figma }: any) => {
        figma.command = 'some-unknown-command';
      },
    );

    await closePromise;

    expect(notifications.some((msg) => msg.includes('unknown command'))).toBe(true);
  });
});

