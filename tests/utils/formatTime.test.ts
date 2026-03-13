import { describe, it, expect, vi } from 'vitest';
import { formatTimeAgo } from '@/utils/formatTime';

describe('formatTimeAgo', () => {
  it('returns "Just now" for recent dates', () => {
    const now = new Date().toISOString();
    expect(formatTimeAgo(now)).toBe('Just now');
  });

  it('returns hours ago', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    expect(formatTimeAgo(threeHoursAgo)).toBe('3h ago');
  });

  it('returns days ago', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatTimeAgo(twoDaysAgo)).toBe('2d ago');
  });
});
