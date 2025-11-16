import type { DesignSpec } from '../models/DesignSpec';
import { FigmaInstructionSet, FigmaOperation } from '../models/FigmaInstructionSet';

function slugifyName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'page';
}

export function buildFigmaInstructionSet(
  spec: DesignSpec,
): FigmaInstructionSet {
  const operations: FigmaOperation[] = [];
  let opCounter = 0;
  const nextOpId = () => `op-${(opCounter += 1)}`;

  // Pages
  const pageNameToId = new Map<string, string>();
  spec.pages.forEach((page, index) => {
    const pageId = `page-${slugifyName(page.name)}-${index}`;
    pageNameToId.set(page.name, pageId);
    operations.push({
      id: nextOpId(),
      type: 'CreatePage',
      pageId,
      name: page.name,
      kind: page.kind,
      index,
    });
  });

  // Variables
  spec.variables.collections.forEach((collection) => {
    operations.push({
      id: nextOpId(),
      type: 'CreateVariableCollection',
      collectionId: collection.id,
      name: collection.name,
    });
  });

  spec.variables.variables.forEach((variable) => {
    operations.push({
      id: nextOpId(),
      type: 'CreateVariable',
      variableId: variable.id,
      collectionId: variable.collectionId,
      name: variable.name,
      variableType: variable.type,
      modeValues: variable.modeValues,
      scopes: variable.scopes ?? [],
    });
  });

  // Components
  spec.components.forEach((component) => {
    const pageId = pageNameToId.get(component.placement.page);
    operations.push({
      id: nextOpId(),
      type: 'CreateComponent',
      componentId: component.id,
      designComponentId: component.id,
      pageId: pageId ?? 'page-default',
      name: component.name,
    });
  });

  // Screens
  const screensPageEntry = spec.pages.find((p) => p.kind === 'screens');
  const screensPageId = screensPageEntry
    ? pageNameToId.get(screensPageEntry.name)
    : undefined;

  spec.screens.forEach((screen) => {
    if (!screensPageId) return;
    operations.push({
      id: nextOpId(),
      type: 'CreateScreenFrame',
      frameId: `frame-${screen.id}`,
      pageId: screensPageId,
      screenId: screen.id,
      name: screen.name,
    });
  });

  return { version: '1.0', operations };
}

