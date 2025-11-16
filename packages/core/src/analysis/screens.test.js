"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const screens_1 = require("./screens");
(0, vitest_1.describe)('inferRouteFromAppPath', () => {
    (0, vitest_1.it)('infers a simple route from app path', () => {
        (0, vitest_1.expect)((0, screens_1.inferRouteFromAppPath)('app/login/page.tsx')).toBe('/login');
    });
    (0, vitest_1.it)('ignores group segments in parentheses', () => {
        (0, vitest_1.expect)((0, screens_1.inferRouteFromAppPath)('app/(marketing)/pricing/page.tsx')).toBe('/pricing');
    });
    (0, vitest_1.it)('returns root for index route', () => {
        (0, vitest_1.expect)((0, screens_1.inferRouteFromAppPath)('app/page.tsx')).toBe('/');
    });
});
(0, vitest_1.describe)('buildScreensForAppRoutes', () => {
    (0, vitest_1.it)('builds CodeScreen entries with used components', () => {
        const files = [
            {
                filePath: 'app/login/page.tsx',
                content: 'export default function Page() { return <Button><Icon /></Button>; }',
            },
        ];
        const screens = (0, screens_1.buildScreensForAppRoutes)(files);
        (0, vitest_1.expect)(screens).toHaveLength(1);
        (0, vitest_1.expect)(screens[0]).toMatchObject({
            route: '/login',
            componentName: 'Page',
            usesComponents: vitest_1.expect.arrayContaining(['Button', 'Icon']),
        });
    });
});
