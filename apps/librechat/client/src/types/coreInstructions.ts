/**
 * Core Instructions Types
 *
 * Type definitions for the Voygent core instructions loading system.
 * Handles loading state, localStorage caching, and error management.
 */

/**
 * Status of the core instructions loading process
 */
export type InstructionStatus = 'idle' | 'loading' | 'loaded' | 'error';

/**
 * Source from which instructions were loaded
 */
export type InstructionSource = 'localStorage' | 'network' | 'none';

/**
 * Error codes for core instructions operations
 */
export type ErrorCode =
  | 'FETCH_FAILED'       // Network request failed
  | 'PARSE_ERROR'        // Failed to parse response or stored data
  | 'STORAGE_QUOTA_EXCEEDED'  // localStorage quota exceeded
  | 'INVALID_CONTENT'    // Content validation failed (size, format)
  | 'TIMEOUT'            // Request timed out
  | 'NETWORK_ERROR';     // Generic network error

/**
 * Complete state of core instructions loading
 */
export interface InstructionsLoadState {
  /** Current loading status */
  status: InstructionStatus;

  /** Loaded instructions content (null if not loaded) */
  content: string | null;

  /** Error message if status is 'error' (null otherwise) */
  errorMessage: string | null;

  /** Timestamp of last successful load (null if never loaded) */
  lastLoadTime: number | null;

  /** Source of current instructions */
  source: InstructionSource;
}

/**
 * Schema for instructions stored in localStorage
 */
export interface StoredInstructions {
  /** The instruction content */
  content: string;

  /** Timestamp when cached (Unix milliseconds) */
  cachedAt: number;

  /** Source of cached data (always 'network' for stored data) */
  source: 'network';

  /** Optional version identifier from the instructions file */
  version?: string;
}

/**
 * Options for loading core instructions
 */
export interface LoadOptions {
  /** Force refresh from network, bypass cache (default: false) */
  forceRefresh?: boolean;

  /** Request timeout in milliseconds (default: 5000) */
  timeout?: number;

  /** Show toast notifications during loading (default: true) */
  showToast?: boolean;
}

/**
 * Result returned from successful instruction loading
 */
export interface InstructionsResult {
  /** The loaded instructions content */
  content: string;

  /** Source from which instructions were loaded */
  source: 'cache' | 'network';

  /** Timestamp when loaded (Unix milliseconds) */
  loadedAt: number;

  /** Optional version identifier */
  version?: string;
}

/**
 * Custom error class for core instructions operations
 */
export class CoreInstructionsError extends Error {
  /** Machine-readable error code */
  public readonly code: ErrorCode;

  /** Original error if this wraps another error */
  public readonly originalError?: Error;

  constructor(message: string, code: ErrorCode, originalError?: Error) {
    super(message);
    this.name = 'CoreInstructionsError';
    this.code = code;
    this.originalError = originalError;

    // Maintains proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CoreInstructionsError);
    }
  }
}

/**
 * Service interface for managing core instructions
 */
export interface CoreInstructionsService {
  /**
   * Load core instructions from network or cache
   * @param options Loading options
   * @returns Promise resolving to instructions result
   * @throws CoreInstructionsError on failure
   */
  loadInstructions(options?: LoadOptions): Promise<InstructionsResult>;

  /**
   * Get current instructions from memory (synchronous)
   * @returns Current instructions or null if not loaded
   */
  getCurrentInstructions(): string | null;

  /**
   * Clear cached instructions from localStorage
   */
  clearCache(): void;

  /**
   * Get current load status
   */
  getStatus(): InstructionsLoadState;
}

/**
 * Constants for core instructions system
 */
export const CORE_INSTRUCTIONS_CONSTANTS = {
  /** localStorage key for cached instructions */
  STORAGE_KEY: 'voygent-core-instructions',

  /** API endpoint for fetching instructions */
  API_ENDPOINT: '/api/config/core-instructions',

  /** Default request timeout in milliseconds */
  DEFAULT_TIMEOUT: 5000,

  /** Minimum valid content size in bytes */
  MIN_CONTENT_SIZE: 100,

  /** Maximum valid content size in bytes */
  MAX_CONTENT_SIZE: 10240,

  /** Toast auto-dismiss duration for success in milliseconds */
  TOAST_SUCCESS_DURATION: 3000,
} as const;

/**
 * Toast message templates
 */
export const TOAST_MESSAGES = {
  loading: 'Loading Voygent instructions...',
  success: '✓ Voygent instructions loaded successfully',
  error: (message: string) => `⚠ Failed to load instructions: ${message}`,
  errorWithRetry: '⚠ Failed to load instructions. Type /voygent to retry',
} as const;
