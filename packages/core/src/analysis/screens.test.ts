import { describe, it, expect } from 'vitest';
import { inferRouteFromAppPath, buildScreensForAppRoutes } from './screens';

describe('inferRouteFromAppPath', () => {
  it('infers a simple route from app path', () => {
    expect(inferRouteFromAppPath('app/login/page.tsx')).toBe('/login');
  });

  it('ignores group segments in parentheses', () => {
    expect(inferRouteFromAppPath('app/(marketing)/pricing/page.tsx')).toBe('/pricing');
  });

  it('returns root for index route', () => {
    expect(inferRouteFromAppPath('app/page.tsx')).toBe('/');
  });

  it('returns root when there is no app segment in the path', () => {
    expect(inferRouteFromAppPath('src/pages/index.tsx')).toBe('/');
  });
});

describe('buildScreensForAppRoutes', () => {
  it('builds CodeScreen entries with used components', () => {
    const files = [
      {
        filePath: 'app/login/page.tsx',
        content:
          'export default function Page() { return <Button><Icon /></Button>; }',
      },
    ];

    const screens = buildScreensForAppRoutes(files);
    expect(screens).toHaveLength(1);
    expect(screens[0]).toMatchObject({
      route: '/login',
      componentName: 'Page',
      usesComponents: expect.arrayContaining(['Button', 'Icon']),
    });
  });
});

