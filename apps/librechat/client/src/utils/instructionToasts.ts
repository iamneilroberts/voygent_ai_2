/**
 * Instruction Toast Notifications
 *
 * Helper functions for showing toast notifications during core instructions loading.
 * Uses LibreChat's existing toast library with consistent messaging.
 */

import { TOAST_MESSAGES } from '../types/coreInstructions';

/**
 * Toast service interface (compatible with react-toastify or similar)
 */
interface ToastService {
  loading(message: string, options?: ToastOptions): string | number;
  success(message: string, options?: ToastOptions): string | number;
  error(message: string, options?: ToastOptions): string | number;
  dismiss(id?: string | number): void;
  update(id: string | number, options: ToastOptions): void;
}

interface ToastOptions {
  id?: string | number;
  autoClose?: number | false;
  type?: 'success' | 'error' | 'info' | 'warning';
}

// Note: This will need to be imported from LibreChat's actual toast implementation
// For now, we'll use a placeholder that can be replaced
let toastService: ToastService | null = null;

/**
 * Initialize toast service (call this with LibreChat's toast instance)
 */
export function initToastService(service: ToastService) {
  toastService = service;
}

/**
 * Get toast service (with fallback to console if not initialized)
 */
function getToastService(): ToastService {
  if (toastService) {
    return toastService;
  }

  // Fallback to console logging if toast service not available
  console.warn('Toast service not initialized, using console fallback');
  return {
    loading: (msg) => {
      console.log('[LOADING]', msg);
      return 'console-toast-' + Date.now();
    },
    success: (msg) => {
      console.log('[SUCCESS]', msg);
      return 'console-toast-' + Date.now();
    },
    error: (msg) => {
      console.error('[ERROR]', msg);
      return 'console-toast-' + Date.now();
    },
    dismiss: (id) => {
      console.log('[DISMISS]', id);
    },
    update: (id, options) => {
      console.log('[UPDATE]', id, options);
    },
  };
}

/**
 * Show loading toast
 *
 * @returns Toast ID for later updates
 */
export function showLoadingToast(): string | number {
  const toast = getToastService();
  return toast.loading(TOAST_MESSAGES.loading, {
    autoClose: false, // Don't auto-close loading toast
  });
}

/**
 * Show success toast
 *
 * @param toastId Optional toast ID to update (from showLoadingToast)
 */
export function showSuccessToast(toastId?: string | number): string | number {
  const toast = getToastService();

  if (toastId) {
    // Update existing toast
    toast.update(toastId, {
      type: 'success',
      autoClose: 3000, // Auto-close after 3 seconds
    });
    return toastId;
  }

  // Show new toast
  return toast.success(TOAST_MESSAGES.success, {
    autoClose: 3000,
  });
}

/**
 * Show error toast with retry instructions
 *
 * @param error Error object or message
 * @param toastId Optional toast ID to update (from showLoadingToast)
 */
export function showErrorToast(
  error: Error | string,
  toastId?: string | number
): string | number {
  const toast = getToastService();
  const message = TOAST_MESSAGES.errorWithRetry;

  if (toastId) {
    // Update existing toast
    toast.update(toastId, {
      type: 'error',
      autoClose: false, // Error toasts persist
    });
    return toastId;
  }

  // Show new toast
  return toast.error(message, {
    autoClose: false, // Error toasts don't auto-close
  });
}

/**
 * Dismiss a toast
 *
 * @param toastId Toast ID to dismiss
 */
export function dismissToast(toastId?: string | number): void {
  const toast = getToastService();
  toast.dismiss(toastId);
}

/**
 * Alternative: Direct integration with react-toastify
 * Uncomment and adjust if LibreChat uses react-toastify directly
 */

/*
import { toast } from 'react-toastify';

export function showLoadingToast(): string | number {
  return toast.loading(TOAST_MESSAGES.loading);
}

export function showSuccessToast(toastId?: string | number): string | number {
  if (toastId) {
    toast.update(toastId, {
      render: TOAST_MESSAGES.success,
      type: 'success',
      isLoading: false,
      autoClose: 3000,
    });
    return toastId;
  }
  return toast.success(TOAST_MESSAGES.success, { autoClose: 3000 });
}

export function showErrorToast(error: Error | string, toastId?: string | number): string | number {
  const message = TOAST_MESSAGES.errorWithRetry;

  if (toastId) {
    toast.update(toastId, {
      render: message,
      type: 'error',
      isLoading: false,
      autoClose: false,
    });
    return toastId;
  }
  return toast.error(message, { autoClose: false });
}

export function dismissToast(toastId?: string | number): void {
  toast.dismiss(toastId);
}
*/
