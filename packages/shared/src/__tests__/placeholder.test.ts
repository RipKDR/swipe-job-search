import { describe, it, expect } from 'vitest';
import { PlaceholderSchema } from '../schemas/placeholder';

describe('placeholder schema (Phase 1)', () => {
  it('validates basic shape', () => {
    const result = PlaceholderSchema.safeParse({ id: '1', createdAt: new Date() });
    expect(result.success).toBe(true);
  });
});