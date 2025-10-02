/**
 * LocalStorage Adapter
 *
 * Provides safe access to localStorage for storing and retrieving core instructions.
 * Handles errors gracefully (corrupted JSON, quota exceeded, unavailable storage).
 */

import { StoredInstructions } from '../types/coreInstructions';

/**
 * localStorage key for cached core instructions
 */
export const STORAGE_KEY = 'voygent-core-instructions' as const;

/**
 * Storage adapter interface
 */
interface StorageAdapter {
  get(key: typeof STORAGE_KEY): StoredInstructions | null;
  set(key: typeof STORAGE_KEY, value: StoredInstructions): boolean;
  remove(key: typeof STORAGE_KEY): void;
  has(key: typeof STORAGE_KEY): boolean;
}

/**
 * Get stored instructions from localStorage
 *
 * @param key Storage key
 * @returns Parsed instructions or null if not found/invalid
 */
function get(key: typeof STORAGE_KEY): StoredInstructions | null {
  try {
    // Check if localStorage is available
    if (typeof localStorage === 'undefined') {
      console.warn('localStorage is not available');
      return null;
    }

    const stored = localStorage.getItem(key);

    if (!stored) {
      return null;
    }

    // Parse JSON
    const parsed = JSON.parse(stored);

    // Basic validation
    if (!parsed || typeof parsed !== 'object') {
      console.warn('Invalid stored instructions format');
      return null;
    }

    if (!parsed.content || !parsed.cachedAt || !parsed.source) {
      console.warn('Stored instructions missing required fields');
      return null;
    }

    return parsed as StoredInstructions;
  } catch (error) {
    // Handle JSON parse errors or other errors
    if (error instanceof SyntaxError) {
      console.error('Corrupted localStorage data, clearing cache:', error);
      // Clear corrupted data
      try {
        localStorage.removeItem(key);
      } catch (clearError) {
        // Ignore
      }
    } else {
      console.error('Error reading from localStorage:', error);
    }
    return null;
  }
}

/**
 * Store instructions in localStorage
 *
 * @param key Storage key
 * @param value Instructions to store
 * @returns true if successful, false otherwise
 */
function set(key: typeof STORAGE_KEY, value: StoredInstructions): boolean {
  try {
    // Check if localStorage is available
    if (typeof localStorage === 'undefined') {
      console.warn('localStorage is not available');
      return false;
    }

    // Serialize to JSON
    const serialized = JSON.stringify(value);

    // Store in localStorage
    localStorage.setItem(key, serialized);

    return true;
  } catch (error) {
    // Handle quota exceeded or other storage errors
    if (
      error instanceof DOMException &&
      (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
    ) {
      console.error('localStorage quota exceeded. Cannot cache instructions.');
    } else if (error instanceof DOMException && error.name === 'SecurityError') {
      console.error('localStorage access denied (possibly private browsing mode).');
    } else {
      console.error('Error writing to localStorage:', error);
    }
    return false;
  }
}

/**
 * Remove instructions from localStorage
 *
 * @param key Storage key
 */
function remove(key: typeof STORAGE_KEY): void {
  try {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing from localStorage:', error);
  }
}

/**
 * Check if instructions exist in localStorage
 *
 * @param key Storage key
 * @returns true if key exists, false otherwise
 */
function has(key: typeof STORAGE_KEY): boolean {
  try {
    if (typeof localStorage === 'undefined') {
      return false;
    }

    return localStorage.getItem(key) !== null;
  } catch (error) {
    console.error('Error checking localStorage:', error);
    return false;
  }
}

/**
 * Storage adapter export
 */
export const storageAdapter: StorageAdapter = {
  get,
  set,
  remove,
  has,
};
