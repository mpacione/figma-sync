"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const components_1 = require("./components");
const heuristics = {
    primitiveComponentPatterns: ['Button'],
    excludeComponents: ['DebugPanel'],
};
(0, vitest_1.describe)('extractComponentsFromSource', () => {
    (0, vitest_1.it)('extracts exported components with kinds and tailwind classes', () => {
        const src = `export function Button() {\n  return <button className="px-2 text-red-500" />;\n}\n\nexport const Card = () => <div className="shadow-sm" />;`;
        const components = (0, components_1.extractComponentsFromSource)(src, 'src/components/ui/Button.tsx', heuristics);
        (0, vitest_1.expect)(components.map((c) => c.name)).toEqual(['Button', 'Card']);
        const button = components.find((c) => c.name === 'Button');
        const card = components.find((c) => c.name === 'Card');
        (0, vitest_1.expect)(button.kind).toBe('primitive');
        (0, vitest_1.expect)(card.kind).toBe('pattern');
        (0, vitest_1.expect)(button.tailwindClasses).toEqual(vitest_1.expect.arrayContaining(['px-2', 'text-red-500']));
    });
    (0, vitest_1.it)('marks excluded components as unknown kind', () => {
        const src = `export function DebugPanel() { return <div />; }`;
        const components = (0, components_1.extractComponentsFromSource)(src, 'src/components/DebugPanel.tsx', heuristics);
        (0, vitest_1.expect)(components[0].kind).toBe('unknown');
    });
});
