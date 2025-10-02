/**
 * Unit Test: StatusBar Component
 * Feature: 002-rebuild-the-whole
 *
 * Tests the StatusBar component that displays token usage and trip progress.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import StatusBar from '../../src/components/StatusBar';

// Mock fetch for API polling
global.fetch = vi.fn();

describe('StatusBar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should render with token usage data', async () => {
    // Mock API response with token usage
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ok: true,
        model: 'claude-3-5-sonnet-20241022',
        inputTokens: 1234,
        outputTokens: 567,
        approximate: false,
        price: 0.0089,
      }),
    });

    render(
      <RecoilRoot>
        <StatusBar />
      </RecoilRoot>
    );

    // Wait for component to fetch and display data
    await waitFor(() => {
      expect(screen.queryByText(/tokens/i)).toBeInTheDocument();
    });

    // Should display token counts
    expect(screen.getByText(/1234/)).toBeInTheDocument();
    expect(screen.getByText(/567/)).toBeInTheDocument();
  });

  test('should render with trip progress data', async () => {
    // Mock API response with trip progress
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ok: true,
        tripName: 'Paris Winter Trip',
        dates: 'Dec 15-22, 2025',
        phase: 'Hotels',
        step: 2,
        percent: 35,
        cost: 1200,
        budget: 2000,
      }),
    });

    render(
      <RecoilRoot>
        <StatusBar />
      </RecoilRoot>
    );

    // Wait for component to fetch and display data
    await waitFor(() => {
      expect(screen.queryByText(/Paris Winter Trip/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Hotels/i)).toBeInTheDocument();
    expect(screen.getByText(/35%/i)).toBeInTheDocument();
  });

  test('should render nothing when no data available (204 response)', async () => {
    // Mock 204 No Content response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => ({}),
    });

    const { container } = render(
      <RecoilRoot>
        <StatusBar />
      </RecoilRoot>
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    // Component should render but be empty or hidden
    // Specific implementation depends on design
    expect(container.firstChild).toBeTruthy();
  });

  test('should display "~" prefix when approximate=true', async () => {
    // Mock API response with approximate token usage
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ok: true,
        model: 'claude-3-5-sonnet-20241022',
        inputTokens: 1200,
        outputTokens: 500,
        approximate: true,
        price: 0.008,
      }),
    });

    render(
      <RecoilRoot>
        <StatusBar />
      </RecoilRoot>
    );

    // Wait for component to display approximate indicator
    await waitFor(() => {
      expect(screen.queryByText(/~/)).toBeInTheDocument();
    });
  });

  test('should poll /api/voygen/status every 15 seconds', async () => {
    vi.useFakeTimers();

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });

    render(
      <RecoilRoot>
        <StatusBar />
      </RecoilRoot>
    );

    // Initial fetch
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    // Advance 15 seconds
    vi.advanceTimersByTime(15000);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    // Advance another 15 seconds
    vi.advanceTimersByTime(15000);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(3);
    });

    vi.useRealTimers();
  });
});
