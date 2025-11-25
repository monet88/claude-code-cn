/**
 * Toast 轻提示 Store
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
   * 显示 toast 消息
   */
  function show(message: string, type: ToastMessage['type'] = 'info', duration = 3000) {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const toast: ToastMessage = { id, message, type, duration };

    toasts.value.push(toast);

    // 自动移除
    if (duration > 0) {
      setTimeout(() => {
        remove(id);
      }, duration);
    }

    return id;
  }

  /**
   * 显示成功消息
   */
  function success(message: string, duration = 3000) {
    return show(message, 'success', duration);
  }

  /**
   * 显示信息消息
   */
  function info(message: string, duration = 3000) {
    return show(message, 'info', duration);
  }

  /**
   * 显示警告消息
   */
  function warning(message: string, duration = 3000) {
    return show(message, 'warning', duration);
  }

  /**
   * 显示错误消息
   */
  function error(message: string, duration = 5000) {
    return show(message, 'error', duration);
  }

  /**
   * 移除指定 toast
   */
  function remove(id: string) {
    const index = toasts.value.findIndex(t => t.id === id);
    if (index !== -1) {
      toasts.value.splice(index, 1);
    }
  }

  /**
   * 清除所有 toast
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
