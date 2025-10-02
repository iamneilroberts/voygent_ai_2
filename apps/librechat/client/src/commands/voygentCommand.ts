/**
 * /voygent Slash Command
 *
 * Command to manually reload Voygent core instructions.
 * Provides a user-friendly way to refresh instructions or recover from load failures.
 */

import { coreInstructionsService } from '../services/CoreInstructionsService';
import {
  showLoadingToast,
  showSuccessToast,
  showErrorToast,
} from '../utils/instructionToasts';

/**
 * Command context (provided by LibreChat command system)
 */
export interface CommandContext {
  conversationId?: string;
  toast?: any; // LibreChat's toast service
  instructionsService?: any; // Can override default service
  [key: string]: any;
}

/**
 * Command result
 */
export interface CommandResult {
  success: boolean;
  message?: string;
  preventDefault: boolean; // Prevents message from being sent as chat
}

/**
 * /voygent command definition
 */
export const voygentCommand = {
  name: 'voygent',
  description: 'Reload Voygent core instructions',
  enabled: true,

  /**
   * Command handler
   */
  handler: async (args: string[], context: CommandContext): Promise<CommandResult> => {
    let toastId: string | number | undefined;

    try {
      // Show loading toast
      toastId = showLoadingToast();

      // Use service from context or default
      const service = context.instructionsService || coreInstructionsService;

      // Load instructions with force refresh
      await service.loadInstructions({
        forceRefresh: true,
        showToast: true,
      });

      // Show success toast
      showSuccessToast(toastId);

      return {
        success: true,
        message: 'Core instructions reloaded successfully',
        preventDefault: true, // Don't send as message
      };
    } catch (error) {
      // Show error toast
      showErrorToast(
        error instanceof Error ? error : new Error('Unknown error'),
        toastId
      );

      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to reload instructions',
        preventDefault: true, // Don't send as message even on error
      };
    }
  },
};

/**
 * Export handler for direct use
 */
export const handleVoygentCommand = voygentCommand.handler;

/**
 * Register command with LibreChat's command system
 * (This would be called during app initialization)
 */
export function registerVoygentCommand(commandRegistry: any): void {
  if (commandRegistry && typeof commandRegistry.register === 'function') {
    commandRegistry.register(voygentCommand);
  } else {
    console.warn('Command registry not available, /voygent command not registered');
  }
}
