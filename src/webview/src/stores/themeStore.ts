/**
 * 主题管理 Store
 */

import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export type ThemeMode = 'light' | 'dark';

export interface ThemeConfig {
  mode: ThemeMode;
  followSystem: boolean;
}

const THEME_STORAGE_KEY = 'claude-code-theme';

export const useThemeStore = defineStore('theme', () => {
  // 主题模式：light 或 dark
  const mode = ref<ThemeMode>('light');

  // 是否跟随系统主题
  const followSystem = ref(false);

  /**
   * 从本地存储加载主题配置
   */
  function loadTheme() {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored) {
        const config: ThemeConfig = JSON.parse(stored);
        mode.value = config.mode || 'light';
        followSystem.value = config.followSystem || false;
      } else {
        // 默认检测系统主题
        detectSystemTheme();
      }
    } catch (error) {
      console.error('Failed to load theme:', error);
      detectSystemTheme();
    }
  }

  /**
   * 保存主题配置到本地存储
   */
  function saveTheme() {
    try {
      const config: ThemeConfig = {
        mode: mode.value,
        followSystem: followSystem.value,
      };
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  }

  /**
   * 检测系统主题
   */
  function detectSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      mode.value = 'dark';
    } else {
      mode.value = 'light';
    }
  }

  /**
   * 切换主题模式
   */
  function toggleTheme() {
    mode.value = mode.value === 'light' ? 'dark' : 'light';
    followSystem.value = false;
    applyTheme();
    saveTheme();
  }

  /**
   * 设置主题模式
   */
  function setTheme(newMode: ThemeMode) {
    mode.value = newMode;
    followSystem.value = false;
    applyTheme();
    saveTheme();
  }

  /**
   * 设置是否跟随系统主题
   */
  function setFollowSystem(follow: boolean) {
    followSystem.value = follow;
    if (follow) {
      detectSystemTheme();
    }
    applyTheme();
    saveTheme();
  }


  /**
   * 应用主题到 DOM
   */
  function applyTheme() {
    // 确保body元素存在
    if (!document.body) {
      console.warn('Body element not found, theme will be applied when DOM is ready');
      return;
    }

    const body = document.body;

    // 移除所有主题类
    body.classList.remove('custom-theme-light', 'custom-theme-dark');

    // 添加当前主题类
    body.classList.add(`custom-theme-${mode.value}`);

    // 设置 data 属性，用于 CSS 选择器
    body.setAttribute('data-theme', mode.value);
  }

  /**
   * 初始化主题
   */
  function init() {
    loadTheme();

    // 确保DOM加载完成后应用主题
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        applyTheme();
      });
    } else {
      applyTheme();
    }

    // 监听系统主题变化
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', (e) => {
        if (followSystem.value) {
          mode.value = e.matches ? 'dark' : 'light';
          applyTheme();
          saveTheme();
        }
      });
    }

  }

  // 监听主题变化
  watch(mode, () => {
    applyTheme();
  });

  return {
    mode,
    followSystem,
    init,
    toggleTheme,
    setTheme,
    setFollowSystem,
    loadTheme,
    saveTheme,
  };
});