import { FigmaSyncConfig } from '../config/schema';
import {
  CodeModel,
  CodeTokens,
  ProjectMeta,
} from '../models/CodeModel';
import { CssSourceFile, ComponentSourceFile, ScreenSourceFile } from './sources';
import { extractCssColorTokens, extractCssDesignTokens } from './cssTokens';
import { extractComponentsFromSource } from './components';
import { buildScreensForAppRoutes } from './screens';

export interface BuildCodeModelInput {
  projectMeta: ProjectMeta;
  config: FigmaSyncConfig;
  cssFiles: CssSourceFile[];
  componentFiles: ComponentSourceFile[];
  screenFiles: ScreenSourceFile[];
}

export function buildCodeModel(input: BuildCodeModelInput): CodeModel {
  const colorTokens = input.cssFiles.flatMap((file) =>
    extractCssColorTokens(file),
  );

  const radiiTokens: CodeTokens['radii'] = [];
  const spacingTokens: CodeTokens['spacing'] = [];
  const typographyTokens: CodeTokens['typography'] = [];

  input.cssFiles.forEach((file) => {
    const extracted = extractCssDesignTokens(file);
    radiiTokens.push(...extracted.radii);
    spacingTokens.push(...extracted.spacing);
    typographyTokens.push(...extracted.typography);
  });

  const tokens: CodeTokens = {
    colors: colorTokens,
    radii: radiiTokens,
    spacing: spacingTokens,
    typography: typographyTokens,
  };

  const heuristics = input.config.heuristics;

  const components = input.componentFiles.flatMap((file) =>
    extractComponentsFromSource(file.content, file.filePath, heuristics),
  );

  const screens = buildScreensForAppRoutes(input.screenFiles);

  return {
    version: '1.0',
    projectMeta: input.projectMeta,
    tokens,
    components,
    screens,
  };
}

