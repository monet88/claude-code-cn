/**
 * Toast light prompt store
 */

import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  duration: number;
}

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<ToastMessage[]>([]);

  /**
   * Show toast message
   */
  function show(message: string, type: ToastMessage['type'] = 'info', duration = 3000) {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const toast: ToastMessage = { id, message, type, duration };

    toasts.value.push(toast);

    // Automatically remove
    if (duration > 0) {
      setTimeout(() => {
        remove(id);
      }, duration);
    }

    return id;
  }

  /**
   * Show success message
   */
  function success(message: string, duration = 3000) {
    return show(message, 'success', duration);
  }

  /**
   * Show info message
   */
  function info(message: string, duration = 3000) {
    return show(message, 'info', duration);
  }

  /**
   * Show warning message
   */
  function warning(message: string, duration = 3000) {
    return show(message, 'warning', duration);
  }

  /**
   * Show error message
   */
  function error(message: string, duration = 5000) {
    return show(message, 'error', duration);
  }

  /**
   * Remove specified toast
   */
  function remove(id: string) {
    const index = toasts.value.findIndex(t => t.id === id);
    if (index !== -1) {
      toasts.value.splice(index, 1);
    }
  }

  /**
   * Clear all toasts
   */
  function clear() {
    toasts.value = [];
  }

  return {
    toasts,
    show,
    success,
    info,
    warning,
    error,
    remove,
    clear,
  };
});
