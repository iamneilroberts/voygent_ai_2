/**
 * Unit Test: Voygent Recoil Store
 * Feature: 002-rebuild-the-whole
 *
 * Tests Recoil atoms for Voygent state management.
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { snapshot_UNSTABLE, RecoilRoot } from 'recoil';
import {
  voygentLastUsage,
  voygentStatusVerbosity,
  voygentMCPStatus,
  voygentCumulativeUsage,
  voygentTripProgress,
  voygentMCPHealthy,
  voygentRequiredMCPHealthy,
} from '../../src/store/voygent';

describe('Voygent Recoil Atoms', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('voygentLastUsage atom', () => {
    test('should persist to localStorage', () => {
      const testData = {
        model: 'claude-3-5-sonnet-20241022',
        inputTokens: 1234,
        outputTokens: 567,
        approximate: false,
        price: 0.0089,
        timestamp: Date.now(),
      };

      // Set localStorage
      localStorage.setItem('voygentLastUsage', JSON.stringify(testData));

      // Create snapshot and check default value loads from localStorage
      const initialSnapshot = snapshot_UNSTABLE();
      const loadedValue = initialSnapshot.getLoadable(voygentLastUsage).getValue();

      expect(loadedValue).toEqual(testData);
    });

    test('should default to null when localStorage is empty', () => {
      const initialSnapshot = snapshot_UNSTABLE();
      const value = initialSnapshot.getLoadable(voygentLastUsage).getValue();

      expect(value).toBeNull();
    });
  });

  describe('voygentStatusVerbosity atom', () => {
    test('should default to "normal"', () => {
      const initialSnapshot = snapshot_UNSTABLE();
      const value = initialSnapshot.getLoadable(voygentStatusVerbosity).getValue();

      expect(value).toBe('normal');
    });

    test('should persist verbosity changes to localStorage', () => {
      localStorage.setItem('voygentStatusVerbosity', JSON.stringify('verbose'));

      const initialSnapshot = snapshot_UNSTABLE();
      const value = initialSnapshot.getLoadable(voygentStatusVerbosity).getValue();

      expect(value).toBe('verbose');
    });
  });

  describe('voygentMCPStatus atom', () => {
    test('should initialize with correct MCP server list', () => {
      const initialSnapshot = snapshot_UNSTABLE();
      const mcpStatus = initialSnapshot.getLoadable(voygentMCPStatus).getValue();

      // Should be an array
      expect(Array.isArray(mcpStatus)).toBe(true);

      // Should have the correct servers
      const serverNames = mcpStatus.map((s) => s.name);
      expect(serverNames).toContain('d1_database');
      expect(serverNames).toContain('prompt_instructions');
      expect(serverNames).toContain('template_document');

      // Each server should have correct shape
      mcpStatus.forEach((server) => {
        expect(server).toHaveProperty('name');
        expect(server).toHaveProperty('connected');
        expect(server).toHaveProperty('healthy');
        expect(server).toHaveProperty('lastCheck');
        expect(typeof server.connected).toBe('boolean');
        expect(typeof server.healthy).toBe('boolean');
        expect(typeof server.lastCheck).toBe('number');
      });
    });

    test('should default all servers to unhealthy state', () => {
      const initialSnapshot = snapshot_UNSTABLE();
      const mcpStatus = initialSnapshot.getLoadable(voygentMCPStatus).getValue();

      // All servers should start as not connected/healthy
      mcpStatus.forEach((server) => {
        expect(server.connected).toBe(false);
        expect(server.healthy).toBe(false);
        expect(server.lastCheck).toBe(0);
      });
    });
  });

  describe('voygentMCPHealthy selector', () => {
    test('should return false when all servers are unhealthy', () => {
      const initialSnapshot = snapshot_UNSTABLE();
      const isHealthy = initialSnapshot.getLoadable(voygentMCPHealthy).getValue();

      expect(isHealthy).toBe(false);
    });
  });

  describe('voygentRequiredMCPHealthy selector', () => {
    test('should check only required servers (d1_database, prompt_instructions, template_document)', () => {
      const initialSnapshot = snapshot_UNSTABLE();
      const isHealthy = initialSnapshot.getLoadable(voygentRequiredMCPHealthy).getValue();

      // Should be false initially since all servers start unhealthy
      expect(isHealthy).toBe(false);
    });
  });

  describe('voygentCumulativeUsage atom', () => {
    test('should default to null', () => {
      const initialSnapshot = snapshot_UNSTABLE();
      const value = initialSnapshot.getLoadable(voygentCumulativeUsage).getValue();

      expect(value).toBeNull();
    });

    test('should not persist to localStorage (session-only)', () => {
      // This atom should NOT have localStorage persistence
      localStorage.setItem('voygentCumulativeUsage', JSON.stringify({ test: 'data' }));

      const initialSnapshot = snapshot_UNSTABLE();
      const value = initialSnapshot.getLoadable(voygentCumulativeUsage).getValue();

      // Should still be null, ignoring localStorage
      expect(value).toBeNull();
    });
  });

  describe('voygentTripProgress atom', () => {
    test('should default to null', () => {
      const initialSnapshot = snapshot_UNSTABLE();
      const value = initialSnapshot.getLoadable(voygentTripProgress).getValue();

      expect(value).toBeNull();
    });
  });
});
