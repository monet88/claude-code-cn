/**
 * Theme management store
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
  // Theme mode: light or dark
  const mode = ref<ThemeMode>('light');

  // Whether to follow system theme
  const followSystem = ref(false);

  /**
   * Load theme configuration from local storage
   */
  function loadTheme() {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored) {
        const config: ThemeConfig = JSON.parse(stored);
        mode.value = config.mode || 'light';
        followSystem.value = config.followSystem || false;
      } else {
        // Detect system theme by default
        detectSystemTheme();
      }
    } catch (error) {
      console.error('Failed to load theme:', error);
      detectSystemTheme();
    }
  }

  /**
   * Save theme configuration to local storage
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
   * Detect system theme
   */
  function detectSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      mode.value = 'dark';
    } else {
      mode.value = 'light';
    }
  }

  /**
   * Toggle theme mode
   */
  function toggleTheme() {
    mode.value = mode.value === 'light' ? 'dark' : 'light';
    followSystem.value = false;
    applyTheme();
    saveTheme();
  }

  /**
   * Set theme mode
   */
  function setTheme(newMode: ThemeMode) {
    mode.value = newMode;
    followSystem.value = false;
    applyTheme();
    saveTheme();
  }

  /**
   * Set whether to follow system theme
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
   * Apply theme to DOM
   */
  function applyTheme() {
    // Ensure body element exists
    if (!document.body) {
      console.warn('Body element not found, theme will be applied when DOM is ready');
      return;
    }

    const body = document.body;

    // Remove all theme classes
    body.classList.remove('custom-theme-light', 'custom-theme-dark');

    // Add current theme class
    body.classList.add(`custom-theme-${mode.value}`);

    // Set data attribute for CSS selectors
    body.setAttribute('data-theme', mode.value);
  }

  /**
   * Initialize theme
   */
  function init() {
    loadTheme();

    // Ensure DOM is loaded before applying theme
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        applyTheme();
      });
    } else {
      applyTheme();
    }

    // Listen for system theme changes
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

  // Watch for theme changes
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