import { describe, it, expect } from 'vitest';
import { extractComponentsFromSource } from './components';

const heuristics = {
  primitiveComponentPatterns: ['Button'],
  excludeComponents: ['DebugPanel'],
};

describe('extractComponentsFromSource', () => {
  it('extracts exported components with kinds and tailwind classes', () => {
    const src = `export function Button() {\n  return <button className="px-2 text-red-500" />;\n}\n\nexport const Card = () => <div className="shadow-sm" />;`;

    const components = extractComponentsFromSource(src, 'src/components/ui/Button.tsx', heuristics);

    expect(components.map((c) => c.name)).toEqual(['Button', 'Card']);
    const button = components.find((c) => c.name === 'Button')!;
    const card = components.find((c) => c.name === 'Card')!;

    expect(button.kind).toBe('primitive');
    expect(card.kind).toBe('pattern');
    expect(button.tailwindClasses).toEqual(expect.arrayContaining(['px-2', 'text-red-500']));
  });

  it('marks excluded components as unknown kind', () => {
    const src = `export function DebugPanel() { return <div />; }`;
    const components = extractComponentsFromSource(src, 'src/components/DebugPanel.tsx', heuristics);
    expect(components[0].kind).toBe('unknown');
  });
});

