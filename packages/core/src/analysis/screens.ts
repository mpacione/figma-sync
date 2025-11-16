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

export function buildScreensForAppRoutes(files: ScreenSourceFile[]): CodeScreen[] {
  return files.map<CodeScreen>((file) => ({
    route: inferRouteFromAppPath(file.filePath),
    componentName: 'Page',
    filePath: file.filePath,
    usesComponents: extractUsedComponentNames(file.content),
    description: undefined,
  }));
}

