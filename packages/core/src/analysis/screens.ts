import * as ts from 'typescript';
import { ScreenSourceFile } from './sources';
import { CodeScreen } from '../models/CodeModel';

export function inferRouteFromAppPath(filePath: string): string {
  const appIndex = filePath.indexOf('app/');
  if (appIndex === -1) return '/';

  const afterApp = filePath.slice(appIndex + 'app/'.length);
  const withoutPage = afterApp.replace(/(^|\/)page\.[jt]sx?$/, '');
  const segments = withoutPage
    .split('/')
    .filter(Boolean)
    .filter((segment) => !(segment.startsWith('(') && segment.endsWith(')')));

  if (segments.length === 0) return '/';
  return `/${segments.join('/')}`;
}

function extractUsedComponentNames(source: string): string[] {
  const names = new Set<string>();
  const JSX_COMPONENT_RE = /<([A-Z][A-Za-z0-9]*)\b/g;
  let match: RegExpExecArray | null;
  while ((match = JSX_COMPONENT_RE.exec(source)) !== null) {
    names.add(match[1]);
  }
  return Array.from(names);
}

/**
 * Parse JSX structure from page.tsx to extract layout information
 * Returns a simplified structure describing the page layout
 */
function parsePageStructure(source: string): {
  hasLayout: boolean;
  sections: string[];
  componentCount: number;
} {
  const sourceFile = ts.createSourceFile(
    'page.tsx',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  let hasLayout = false;
  const sections = new Set<string>();
  let componentCount = 0;

  function visit(node: ts.Node) {
    // Look for JSX elements
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      componentCount++;

      // Get the tag name
      const tagName = ts.isJsxElement(node)
        ? node.openingElement.tagName.getText(sourceFile)
        : node.tagName.getText(sourceFile);

      // Check for common layout patterns
      if (tagName.toLowerCase().includes('layout') ||
          tagName.toLowerCase().includes('container') ||
          tagName.toLowerCase().includes('wrapper')) {
        hasLayout = true;
      }

      // Check for common section names
      if (tagName.toLowerCase().includes('header') ||
          tagName.toLowerCase().includes('nav') ||
          tagName.toLowerCase().includes('main') ||
          tagName.toLowerCase().includes('footer') ||
          tagName.toLowerCase().includes('sidebar') ||
          tagName === 'header' ||
          tagName === 'nav' ||
          tagName === 'main' ||
          tagName === 'footer' ||
          tagName === 'aside') {
        sections.add(tagName);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return {
    hasLayout,
    sections: Array.from(sections),
    componentCount,
  };
}

export function buildScreensForAppRoutes(files: ScreenSourceFile[]): CodeScreen[] {
  return files.map<CodeScreen>((file) => {
    const structure = parsePageStructure(file.content);

    return {
      route: inferRouteFromAppPath(file.filePath),
      componentName: 'Page',
      filePath: file.filePath,
      usesComponents: extractUsedComponentNames(file.content),
      description: `Page with ${structure.componentCount} components${structure.sections.length > 0 ? `, sections: ${structure.sections.join(', ')}` : ''}`,
    };
  });
}

