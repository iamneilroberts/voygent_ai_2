/**
 * Core Instructions Service
 *
 * Manages loading, caching, and state of Voygent core instructions.
 * Fetches from API, caches in localStorage, handles errors gracefully.
 */

import {
  CoreInstructionsService as ICoreInstructionsService,
  CoreInstructionsError,
  InstructionsLoadState,
  InstructionsResult,
  LoadOptions,
  CORE_INSTRUCTIONS_CONSTANTS,
} from '../types/coreInstructions';
import { storageAdapter, STORAGE_KEY } from '../utils/storageAdapter';

/**
 * Core Instructions Service Implementation
 */
export class CoreInstructionsService implements ICoreInstructionsService {
  private state: InstructionsLoadState = {
    status: 'idle',
    content: null,
    errorMessage: null,
    lastLoadTime: null,
    source: 'none',
  };

  /**
   * Load core instructions from cache or network
   */
  async loadInstructions(options?: LoadOptions): Promise<InstructionsResult> {
    const {
      forceRefresh = false,
      timeout = CORE_INSTRUCTIONS_CONSTANTS.DEFAULT_TIMEOUT,
    } = options || {};

    // Update state to loading
    this.state = {
      ...this.state,
      status: 'loading',
      errorMessage: null,
    };

    try {
      // Try cache first (unless forceRefresh)
      if (!forceRefresh) {
        const cached = storageAdapter.get(STORAGE_KEY);
        if (cached && cached.content) {
          // Validate cached content
          if (this.validateContent(cached.content)) {
            // Update state to loaded from cache
            this.state = {
              status: 'loaded',
              content: cached.content,
              errorMessage: null,
              lastLoadTime: cached.cachedAt,
              source: 'localStorage',
            };

            return {
              content: cached.content,
              source: 'cache',
              loadedAt: cached.cachedAt,
              version: cached.version,
            };
          } else {
            console.warn('Cached content failed validation, fetching fresh');
          }
        }
      }

      // Fetch from network
      const content = await this.fetchFromNetwork(timeout);

      // Validate content
      if (!this.validateContent(content)) {
        throw new CoreInstructionsError(
          'Invalid content size or format',
          'INVALID_CONTENT'
        );
      }

      // Store in cache
      const now = Date.now();
      storageAdapter.set(STORAGE_KEY, {
        content,
        cachedAt: now,
        source: 'network',
      });

      // Update state to loaded from network
      this.state = {
        status: 'loaded',
        content,
        errorMessage: null,
        lastLoadTime: now,
        source: 'network',
      };

      return {
        content,
        source: 'network',
        loadedAt: now,
      };
    } catch (error) {
      // Update state to error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.state = {
        status: 'error',
        content: null,
        errorMessage,
        lastLoadTime: null,
        source: 'none',
      };

      // Re-throw as CoreInstructionsError if not already
      if (error instanceof CoreInstructionsError) {
        throw error;
      }

      throw this.convertError(error);
    }
  }

  /**
   * Get current instructions from memory (synchronous)
   */
  getCurrentInstructions(): string | null {
    return this.state.content;
  }

  /**
   * Clear cached instructions from localStorage
   */
  clearCache(): void {
    storageAdapter.remove(STORAGE_KEY);
  }

  /**
   * Get current load status
   */
  getStatus(): InstructionsLoadState {
    return { ...this.state };
  }

  /**
   * Fetch instructions from network with timeout
   */
  private async fetchFromNetwork(timeout: number): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(CORE_INSTRUCTIONS_CONSTANTS.API_ENDPOINT, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          throw new CoreInstructionsError(
            'Core instructions file not found on server',
            'FETCH_FAILED'
          );
        }
        throw new CoreInstructionsError(
          `Server returned ${response.status}: ${response.statusText}`,
          'FETCH_FAILED'
        );
      }

      const content = await response.text();
      return content;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof CoreInstructionsError) {
        throw error;
      }

      // Handle abort (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new CoreInstructionsError(
          'Request timed out after ' + timeout + 'ms',
          'TIMEOUT',
          error
        );
      }

      // Handle network errors
      if (error instanceof TypeError) {
        throw new CoreInstructionsError(
          'Network request failed. Check your connection.',
          'NETWORK_ERROR',
          error
        );
      }

      throw new CoreInstructionsError(
        'Failed to fetch instructions',
        'FETCH_FAILED',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Validate content size and format
   */
  private validateContent(content: string): boolean {
    if (!content || typeof content !== 'string') {
      return false;
    }

    const size = new Blob([content]).size;

    if (size < CORE_INSTRUCTIONS_CONSTANTS.MIN_CONTENT_SIZE) {
      console.warn('Content too small:', size, 'bytes');
      return false;
    }

    if (size > CORE_INSTRUCTIONS_CONSTANTS.MAX_CONTENT_SIZE) {
      console.warn('Content too large:', size, 'bytes');
      return false;
    }

    return true;
  }

  /**
   * Convert unknown errors to CoreInstructionsError
   */
  private convertError(error: unknown): CoreInstructionsError {
    if (error instanceof CoreInstructionsError) {
      return error;
    }

    if (error instanceof Error) {
      // Try to categorize the error
      if (error.name === 'AbortError') {
        return new CoreInstructionsError('Request timed out', 'TIMEOUT', error);
      }

      if (error.name === 'TypeError') {
        return new CoreInstructionsError('Network error', 'NETWORK_ERROR', error);
      }

      if (error.name === 'SyntaxError') {
        return new CoreInstructionsError('Failed to parse response', 'PARSE_ERROR', error);
      }

      return new CoreInstructionsError(error.message, 'FETCH_FAILED', error);
    }

    return new CoreInstructionsError('Unknown error occurred', 'FETCH_FAILED');
  }
}

/**
 * Singleton instance (optional - can also create new instances)
 */
export const coreInstructionsService = new CoreInstructionsService();
