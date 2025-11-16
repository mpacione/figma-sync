import { describe, it, expect } from 'vitest';
import { FIGMA_SYNC_CORE_VERSION } from './index';

describe('FIGMA_SYNC_CORE_VERSION', () => {
  it('is set to 0.1.0', () => {
    expect(FIGMA_SYNC_CORE_VERSION).toBe('0.1.0');
  });
});

