/**
 * Skills configuration store
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Skill, SkillsMap, SkillsConfig, SkillScope } from '../types/skill';
import { getVsCodeApi } from '../utils/vscodeApi';

/**
 * Send message to VSCode extension and wait for response
 */
function sendMessageToExtension(type: string, payload?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const vscodeApi = getVsCodeApi();

    if (!vscodeApi) {
      reject(new Error('VSCode API not available'));
      return;
    }

    // Generate unique message ID
    const messageId = `${type}_${Date.now()}_${Math.random()}`;

    // Listen for response
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (data && data.type === 'from-extension') {
        const message = data.message;
        // Match different response types
        const expectedTypes = [
          'allSkillsData',      // getAllSkills response
          'skillImported',      // importSkill response
          'skillDeleted',       // deleteSkill response
          'skillOpened'         // openSkill response
        ];

        if (expectedTypes.some(t => message.type === t)) {
          window.removeEventListener('message', handleMessage);
          resolve(message.payload);
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // Ensure payload is serializable
    let serializedPayload = payload;
    if (payload !== undefined && payload !== null) {
      try {
        serializedPayload = JSON.parse(JSON.stringify(payload));
      } catch (e) {
        console.error('Failed to serialize payload:', e);
        reject(new Error('Payload is not serializable'));
        return;
      }
    }

    // Send message
    try {
      vscodeApi.postMessage({
        type,
        payload: serializedPayload,
        messageId
      });
    } catch (error) {
      window.removeEventListener('message', handleMessage);
      reject(error);
      return;
    }

    // Timeout handling
    setTimeout(() => {
      window.removeEventListener('message', handleMessage);
      reject(new Error(`Request timeout: ${type}`));
    }, 10000);
  });
}

/**
 * Skills Store
 */
export const useSkillStore = defineStore('skill', () => {
  // Skills configuration
  const skills = ref<SkillsConfig>({
    global: {},
    local: {}
  });

  // Loading status
  const loading = ref(false);

  // Error information
  const error = ref<string | null>(null);

  // Calculate total number of Skills
  const totalCount = computed(() => {
    return Object.keys(skills.value.global).length + Object.keys(skills.value.local).length;
  });

  // Calculate number of global Skills
  const globalCount = computed(() => Object.keys(skills.value.global).length);

  // Calculate number of local Skills
  const localCount = computed(() => Object.keys(skills.value.local).length);

  // Calculate total Skills list
  const skillList = computed(() => {
    const global = Object.values(skills.value.global);
    const local = Object.values(skills.value.local);
    return [...global, ...local];
  });

  // Calculate global Skills list
  const globalSkillList = computed(() => Object.values(skills.value.global));

  // Calculate local Skills list
  const localSkillList = computed(() => Object.values(skills.value.local));

  /**
   * Initialize, load Skills list
   */
  async function initialize() {
    await loadSkills();
  }

  /**
   * Load all Skills
   */
  async function loadSkills() {
    loading.value = true;
    error.value = null;

    try {
      const result = await sendMessageToExtension('getAllSkills');
      if (result) {
        skills.value = result;
      } else {
        skills.value = { global: {}, local: {} };
      }
    } catch (e) {
      console.error('Failed to load Skills:', e);
      error.value = String(e);
      skills.value = { global: {}, local: {} };
    } finally {
      loading.value = false;
    }
  }

  /**
   * Import Skill
   */
  async function importSkill(scope: SkillScope): Promise<{ success: boolean; count?: number; total?: number; error?: string; errors?: any[] }> {
    error.value = null;

    try {
      // Send import request (backend will show file selection dialog)
      const result = await sendMessageToExtension('importSkill', { scope });

      if (result.success) {
        // Reload Skills list
        return {
          success: true,
          count: result.count,
          total: result.total,
          errors: result.errors
        };
      } else {
        error.value = result.error || 'Failed to import Skill';
        return { success: false, error: error.value ?? undefined };
      }
    } catch (e) {
      console.error('Failed to import Skill:', e);
      error.value = String(e);
      return { success: false, error: error.value ?? undefined };
    }
  }

  /**
   * Delete Skill
   */
  async function deleteSkill(id: string, scope: SkillScope): Promise<{ success: boolean; error?: string }> {
    loading.value = true;
    error.value = null;

    try {
      const result = await sendMessageToExtension('deleteSkill', { id, scope });
      if (result.success) {
        // Reload Skills list
        await loadSkills();
        return { success: true };
      } else {
        error.value = result.error || 'Failed to delete Skill';
        return { success: false, error: error.value ?? undefined };
      }
    } catch (e) {
      console.error('Failed to delete Skill:', e);
      error.value = String(e);
      return { success: false, error: error.value ?? undefined };
    } finally {
      loading.value = false;
    }
  }

  /**
   * Open Skill in editor
   */
  async function openSkill(skillPath: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await sendMessageToExtension('openSkill', { skillPath });
      if (result.success) {
        return { success: true };
      } else {
        error.value = result.error || 'Failed to open Skill';
        return { success: false, error: error.value ?? undefined };
      }
    } catch (e) {
      console.error('Failed to open Skill:', e);
      error.value = String(e);
      return { success: false, error: error.value ?? undefined };
    }
  }

  return {
    skills,
    loading,
    error,
    totalCount,
    globalCount,
    localCount,
    skillList,
    globalSkillList,
    localSkillList,
    initialize,
    loadSkills,
    importSkill,
    deleteSkill,
    openSkill,
  };
});
