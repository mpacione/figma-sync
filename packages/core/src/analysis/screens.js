"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inferRouteFromAppPath = inferRouteFromAppPath;
exports.buildScreensForAppRoutes = buildScreensForAppRoutes;
function inferRouteFromAppPath(filePath) {
    const appIndex = filePath.indexOf('app/');
    if (appIndex === -1)
        return '/';
    const afterApp = filePath.slice(appIndex + 'app/'.length);
    const withoutPage = afterApp.replace(/(^|\/)page\.[jt]sx?$/, '');
    const segments = withoutPage
        .split('/')
        .filter(Boolean)
        .filter((segment) => !(segment.startsWith('(') && segment.endsWith(')')));
    if (segments.length === 0)
        return '/';
    return `/${segments.join('/')}`;
}
function extractUsedComponentNames(source) {
    const names = new Set();
    const JSX_COMPONENT_RE = /<([A-Z][A-Za-z0-9]*)\b/g;
    let match;
    while ((match = JSX_COMPONENT_RE.exec(source)) !== null) {
        names.add(match[1]);
    }
    return Array.from(names);
}
function buildScreensForAppRoutes(files) {
    return files.map((file) => ({
        route: inferRouteFromAppPath(file.filePath),
        componentName: 'Page',
        filePath: file.filePath,
        usesComponents: extractUsedComponentNames(file.content),
        description: undefined,
    }));
}
