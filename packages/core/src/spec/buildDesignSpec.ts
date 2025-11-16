import type { FigmaSyncConfig } from '../config/schema';
import type { CodeModel } from '../models/CodeModel';
import {
  DesignSpec,
  DesignComponentSpec,
  DesignScreenSpec,
  DesignPageSpec,
} from '../models/DesignSpec';

function buildVariablesSection(codeModel: CodeModel): DesignSpec['variables'] {
  const collections = [
    { id: 'colors', name: 'Colors', description: 'Color tokens from code' },
    { id: 'radii', name: 'Radii', description: 'Radius tokens from code' },
    { id: 'spacing', name: 'Spacing', description: 'Spacing tokens from code' },
    {
      id: 'typography',
      name: 'Typography',
      description: 'Typography tokens from code (font sizes)',
    },
  ];

  const variables: DesignSpec['variables']['variables'] = [];

  codeModel.tokens.colors.forEach((token, index) => {
    variables.push({
      id: `color-${index}`,
      collectionId: 'colors',
      name: token.name,
      type: 'COLOR',
      modeValues: { default: token.value.hex },
      scopes: [],
    });
  });

  codeModel.tokens.radii.forEach((token, index) => {
    variables.push({
      id: `radius-${index}`,
      collectionId: 'radii',
      name: token.name,
      type: 'FLOAT',
      modeValues: { default: token.value },
      scopes: [],
    });
  });

  codeModel.tokens.spacing.forEach((token, index) => {
    variables.push({
      id: `spacing-${index}`,
      collectionId: 'spacing',
      name: token.name,
      type: 'FLOAT',
      modeValues: { default: token.value },
      scopes: [],
    });
  });

  codeModel.tokens.typography.forEach((token, index) => {
    variables.push({
      id: `typography-${index}`,
      collectionId: 'typography',
      name: token.name,
      type: 'FLOAT',
      modeValues: { default: token.fontSize },
      scopes: [],
    });
  });

  return { collections, variables };
}

function buildComponentsSection(
  codeModel: CodeModel,
  config: FigmaSyncConfig,
): { components: DesignComponentSpec[]; mapping: Record<string, string> } {
  const components: DesignComponentSpec[] = [];
  const mapping: Record<string, string> = {};

  codeModel.components.forEach((component, index) => {
    const id = `component-${index}`;
    const category =
      component.kind === 'primitive' ? ('primitive' as const) : ('pattern' as const);
    const pageName =
      category === 'primitive'
        ? config.figma.pages.primitives
        : config.figma.pages.patterns;

    components.push({
      id,
      name: component.name,
      category,
      sourceComponentName: component.name,
      propsModel: {
        variantProps: [],
        slotProps: [],
      },
      exampleVariants: [
        {
          id: `${id}-default`,
          name: 'Default',
          props: {},
        },
      ],
      placement: {
        page: pageName,
        section: undefined,
        gridPosition: { row: index, column: 0 },
      },
    });

    mapping[component.name] = id;
  });

  return { components, mapping };
}

function buildScreensSection(
  codeModel: CodeModel,
  screensPageName: string,
): { screens: DesignScreenSpec[]; mapping: Record<string, string> } {
  const screens: DesignScreenSpec[] = [];
  const mapping: Record<string, string> = {};

  codeModel.screens.forEach((screen, index) => {
    const id = `screen-${index}`;
    screens.push({
      id,
      route: screen.route,
      name: screen.route === '/' ? 'Home' : screen.route,
      componentsUsed: screen.usesComponents,
      layoutHints: {},
      states: ['default'],
    });
    mapping[screen.route] = id;
  });

  return { screens, mapping };
}

function buildPagesSection(config: FigmaSyncConfig): DesignPageSpec[] {
  return [
    {
      name: config.figma.pages.primitives,
      kind: 'system-primitives',
      sections: undefined,
    },
    {
      name: config.figma.pages.patterns,
      kind: 'system-patterns',
      sections: undefined,
    },
    {
      name: config.figma.pages.screens,
      kind: 'screens',
      sections: undefined,
    },
  ];
}

export function buildDesignSpec(
  codeModel: CodeModel,
  config: FigmaSyncConfig,
): DesignSpec {
  const variables = buildVariablesSection(codeModel);

  const { components, mapping: componentMapping } = buildComponentsSection(
    codeModel,
    config,
  );

  const { screens, mapping: screenMapping } = buildScreensSection(
    codeModel,
    config.figma.pages.screens,
  );

  const pages = buildPagesSection(config);

  const tokenMapping: Record<string, string> = {};
  variables.variables.forEach((v) => {
    tokenMapping[v.name] = v.id;
  });

  return {
    version: '1.0',
    projectMeta: codeModel.projectMeta,
    variables,
    styles: { styles: [] },
    components,
    screens,
    pages,
    mapping: {
      codeComponentToDesignId: componentMapping,
      codeTokenToVariableId: tokenMapping,
      routeToScreenId: screenMapping,
    },
  };
}

