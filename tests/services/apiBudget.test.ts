// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getDailyUsage,
  incrementUsage,
  canMakeRequest,
  getUserFetchCount,
  incrementUserFetch,
  canUserFetch,
  resetIfNewDay,
  DAILY_LIMIT,
  USER_DAILY_FETCHES,
  BUDGET_RESERVE,
} from '@/services/apiBudget';

describe('apiBudget', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('global budget', () => {
    it('starts at 0 usage', () => {
      expect(getDailyUsage()).toBe(0);
    });

    it('increments usage', () => {
      incrementUsage(5);
      expect(getDailyUsage()).toBe(5);
    });

    it('allows requests when under limit', () => {
      expect(canMakeRequest(1)).toBe(true);
    });

    it('blocks requests when budget exhausted', () => {
      incrementUsage(DAILY_LIMIT);
      expect(canMakeRequest(1)).toBe(false);
    });

    it('reserves budget for shared pool emergency', () => {
      incrementUsage(DAILY_LIMIT - BUDGET_RESERVE);
      // Still under total limit, but in reserve zone
      expect(canMakeRequest(1)).toBe(false);
    });
  });

  describe('user fetch tracking', () => {
    it('starts at 0 fetches for a user', () => {
      expect(getUserFetchCount('user-1')).toBe(0);
    });

    it('increments user fetch count', () => {
      incrementUserFetch('user-1');
      expect(getUserFetchCount('user-1')).toBe(1);
    });

    it('allows fetch when under limit', () => {
      expect(canUserFetch('user-1')).toBe(true);
    });

    it('blocks fetch after 2 daily fetches', () => {
      incrementUserFetch('user-1');
      incrementUserFetch('user-1');
      expect(canUserFetch('user-1')).toBe(false);
    });

    it('tracks users independently', () => {
      incrementUserFetch('user-1');
      incrementUserFetch('user-1');
      expect(canUserFetch('user-1')).toBe(false);
      expect(canUserFetch('user-2')).toBe(true);
    });
  });

  describe('day reset', () => {
    it('resets usage on new day', () => {
      incrementUsage(100);
      incrementUserFetch('user-1');
      // Simulate yesterday's date
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      localStorage.setItem('heatstory_budget_date', yesterday.toISOString().split('T')[0]);
      resetIfNewDay();
      expect(getDailyUsage()).toBe(0);
      expect(getUserFetchCount('user-1')).toBe(0);
    });
  });
});
