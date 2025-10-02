/**
 * App Integration Example
 *
 * This file demonstrates how to integrate core instructions loading
 * into the main App component.
 *
 * USAGE: Copy this code into your actual App.tsx file
 */

import React, { useEffect } from 'react';
import { useCoreInstructions } from './hooks/useCoreInstructions';
import { showLoadingToast, showSuccessToast, showErrorToast } from './utils/instructionToasts';
import { registerVoygentCommand } from './commands/voygentCommand';

/**
 * Example App component with core instructions loading
 */
export function AppWithCoreInstructions() {
  const { load, isLoaded, isLoading, hasError, state } = useCoreInstructions();

  // Load instructions on app startup
  useEffect(() => {
    let toastId: string | number | undefined;

    const loadInstructions = async () => {
      try {
        // Only show toast for network loads (not cache)
        if (!state.content) {
          toastId = showLoadingToast();
        }

        await load();

        // Show success toast only for initial network load
        if (toastId) {
          showSuccessToast(toastId);
        }
      } catch (error) {
        // Show error toast
        if (toastId) {
          showErrorToast(error instanceof Error ? error : new Error('Failed to load'), toastId);
        } else {
          showErrorToast(error instanceof Error ? error : new Error('Failed to load'));
        }

        // Don't block app startup on error
        console.error('Failed to load core instructions:', error);
      }
    };

    loadInstructions();
  }, []); // Run once on mount

  // Register /voygent command on mount
  useEffect(() => {
    // Note: Replace with actual command registry from LibreChat
    // registerVoygentCommand(commandRegistry);
  }, []);

  return (
    <div className="app">
      {/* Your existing app content */}
      <h1>LibreChat with Voygent</h1>

      {/* Optional: Show loading state */}
      {isLoading && (
        <div className="loading-indicator">
          Loading Voygent instructions...
        </div>
      )}

      {/* Optional: Show error state */}
      {hasError && (
        <div className="error-notice">
          ⚠ Instructions failed to load. Type /voygent to retry.
        </div>
      )}

      {/* Optional: Show success state */}
      {isLoaded && (
        <div className="success-indicator">
          ✓ Voygent ready
        </div>
      )}

      {/* Rest of your app */}
    </div>
  );
}

/**
 * INTEGRATION INSTRUCTIONS:
 *
 * 1. Copy the useEffect hooks above into your main App.tsx component
 * 2. Import the required hooks and utilities
 * 3. Register the /voygent command with your command registry
 * 4. Initialize toast service (if using custom toast library)
 * 5. Remove this example file after integration
 *
 * Minimal integration (silent loading):
 * ```tsx
 * import { useCoreInstructions } from './hooks/useCoreInstructions';
 *
 * function App() {
 *   const { load } = useCoreInstructions();
 *
 *   useEffect(() => {
 *     load().catch(console.error);
 *   }, []);
 *
 *   return <YourAppContent />;
 * }
 * ```
 */
