import { zFigmaSyncConfig, FigmaSyncConfig } from './schema';

export function parseConfig(raw: unknown): FigmaSyncConfig {
  const result = zFigmaSyncConfig.safeParse(raw);
  if (!result.success) {
    throw new Error(
      `Invalid figma-sync config: ${result.error.message}`,
    );
  }
  return result.data;
}

