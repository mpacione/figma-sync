/**
 * Tests for Tailwind to Figma mapper
 */

import { describe, it, expect } from 'vitest';
import { mapTailwindToFigma } from './mapper';

describe('mapTailwindToFigma', () => {
  it('should map px-4 to paddingLeft/Right: 16', () => {
    const result = mapTailwindToFigma(['px-4']);
    expect(result.paddingLeft).toBe(16);
    expect(result.paddingRight).toBe(16);
  });

  it('should map py-2 to paddingTop/Bottom: 8', () => {
    const result = mapTailwindToFigma(['py-2']);
    expect(result.paddingTop).toBe(8);
    expect(result.paddingBottom).toBe(8);
  });

  it('should map h-9 to height: 36', () => {
    const result = mapTailwindToFigma(['h-9']);
    expect(result.height).toBe(36);
  });

  it('should map size-9 to width/height: 36', () => {
    const result = mapTailwindToFigma(['size-9']);
    expect(result.width).toBe(36);
    expect(result.height).toBe(36);
  });

  it('should map rounded-md to cornerRadius: 6', () => {
    const result = mapTailwindToFigma(['rounded-md']);
    expect(result.cornerRadius).toBe(6);
  });

  it('should map text-sm to fontSize: 14', () => {
    const result = mapTailwindToFigma(['text-sm']);
    expect(result.fontSize).toBe(14);
    expect(result.fontFamily).toBe('Inter');
  });

  it('should map font-medium to fontWeight: 500', () => {
    const result = mapTailwindToFigma(['font-medium']);
    expect(result.fontWeight).toBe(500);
    expect(result.fontFamily).toBe('Inter');
  });

  it('should map gap-2 to itemSpacing: 8', () => {
    const result = mapTailwindToFigma(['gap-2']);
    expect(result.itemSpacing).toBe(8);
  });

  it('should map inline-flex to layoutMode: HORIZONTAL', () => {
    const result = mapTailwindToFigma(['inline-flex']);
    expect(result.layoutMode).toBe('HORIZONTAL');
    expect(result.primaryAxisSizingMode).toBe('AUTO');
    expect(result.counterAxisSizingMode).toBe('AUTO');
  });

  it('should map items-center to counterAxisAlignItems: CENTER', () => {
    const result = mapTailwindToFigma(['items-center']);
    expect(result.counterAxisAlignItems).toBe('CENTER');
  });

  it('should map justify-center to primaryAxisAlignItems: CENTER', () => {
    const result = mapTailwindToFigma(['justify-center']);
    expect(result.primaryAxisAlignItems).toBe('CENTER');
  });

  it('should map border to strokeWeight: 1', () => {
    const result = mapTailwindToFigma(['border']);
    expect(result.strokeWeight).toBe(1);
  });

  it('should combine multiple classes correctly', () => {
    const result = mapTailwindToFigma([
      'inline-flex',
      'items-center',
      'justify-center',
      'gap-2',
      'px-4',
      'py-2',
      'h-9',
      'rounded-md',
      'text-sm',
      'font-medium',
    ]);

    expect(result.layoutMode).toBe('HORIZONTAL');
    expect(result.counterAxisAlignItems).toBe('CENTER');
    expect(result.primaryAxisAlignItems).toBe('CENTER');
    expect(result.itemSpacing).toBe(8);
    expect(result.paddingLeft).toBe(16);
    expect(result.paddingRight).toBe(16);
    expect(result.paddingTop).toBe(8);
    expect(result.paddingBottom).toBe(8);
    expect(result.height).toBe(36);
    expect(result.cornerRadius).toBe(6);
    expect(result.fontSize).toBe(14);
    expect(result.fontWeight).toBe(500);
    expect(result.fontFamily).toBe('Inter');
  });

  it('should ignore pseudo-classes', () => {
    const result = mapTailwindToFigma(['px-4', 'hover:px-6', 'focus:px-8']);
    expect(result.paddingLeft).toBe(16);
    expect(result.paddingRight).toBe(16);
  });

  it('should ignore dark mode variants', () => {
    const result = mapTailwindToFigma(['px-4', 'dark:px-6']);
    expect(result.paddingLeft).toBe(16);
    expect(result.paddingRight).toBe(16);
  });

  it('should ignore arbitrary values', () => {
    const result = mapTailwindToFigma(['px-4', '[&_svg]:size-4']);
    expect(result.paddingLeft).toBe(16);
    expect(result.paddingRight).toBe(16);
  });
});

