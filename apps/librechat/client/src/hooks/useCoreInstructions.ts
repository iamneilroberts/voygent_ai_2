/**
 * useCoreInstructions Hook
 *
 * React hook for managing core instructions loading state and operations.
 * Wraps CoreInstructionsService with React state management.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  InstructionsLoadState,
  LoadOptions,
} from '../types/coreInstructions';
import { CoreInstructionsService } from '../services/CoreInstructionsService';

/**
 * Hook return type
 */
interface UseCoreInstructionsReturn {
  /** Current load state */
  state: InstructionsLoadState;

  /** Load or reload instructions */
  load: (options?: LoadOptions) => Promise<void>;

  /** Reload instructions (alias for load with forceRefresh) */
  reload: () => Promise<void>;

  /** Clear cache */
  clearCache: () => void;

  /** Whether instructions are currently loaded */
  isLoaded: boolean;

  /** Whether currently loading */
  isLoading: boolean;

  /** Whether in error state */
  hasError: boolean;
}

/**
 * React hook for core instructions management
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { state, load, reload, isLoaded } = useCoreInstructions();
 *
 *   useEffect(() => {
 *     load();
 *   }, []);
 *
 *   return <div>{isLoaded ? 'Ready!' : 'Loading...'}</div>;
 * }
 * ```
 */
export function useCoreInstructions(): UseCoreInstructionsReturn {
  // Create service instance (persists across renders)
  const serviceRef = useRef<CoreInstructionsService>(new CoreInstructionsService());

  // Track state
  const [state, setState] = useState<InstructionsLoadState>(() =>
    serviceRef.current.getStatus()
  );

  // Track if component is mounted (for cleanup)
  const isMountedRef = useRef(true);

  /**
   * Load instructions
   */
  const load = useCallback(async (options?: LoadOptions) => {
    const service = serviceRef.current;

    try {
      // Update state to loading
      setState(service.getStatus());

      // Load instructions
      await service.loadInstructions(options);

      // Update state if still mounted
      if (isMountedRef.current) {
        setState(service.getStatus());
      }
    } catch (error) {
      // Update state to error if still mounted
      if (isMountedRef.current) {
        setState(service.getStatus());
      }

      // Re-throw for caller to handle if needed
      throw error;
    }
  }, []);

  /**
   * Reload instructions (force refresh)
   */
  const reload = useCallback(async () => {
    await load({ forceRefresh: true });
  }, [load]);

  /**
   * Clear cache
   */
  const clearCache = useCallback(() => {
    serviceRef.current.clearCache();
  }, []);

  // Computed properties
  const isLoaded = state.status === 'loaded';
  const isLoading = state.status === 'loading';
  const hasError = state.status === 'error';

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    state,
    load,
    reload,
    clearCache,
    isLoaded,
    isLoading,
    hasError,
  };
}
