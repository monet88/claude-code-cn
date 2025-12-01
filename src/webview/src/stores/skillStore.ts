/**
 * Skills 配置 Store
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Skill, SkillsMap, SkillsConfig, SkillScope } from '../types/skill';
import { getVsCodeApi } from '../utils/vscodeApi';

/**
 * 向 VSCode 扩展发送消息并等待响应
 */
function sendMessageToExtension(type: string, payload?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const vscodeApi = getVsCodeApi();

    if (!vscodeApi) {
      reject(new Error('VSCode API not available'));
      return;
    }

    // 生成唯一消息 ID
    const messageId = `${type}_${Date.now()}_${Math.random()}`;

    // 监听响应
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (data && data.type === 'from-extension') {
        const message = data.message;
        // 根据不同的响应类型匹配
        const expectedTypes = [
          'allSkillsData',      // getAllSkills 的响应
          'skillImported',      // importSkill 的响应
          'skillDeleted',       // deleteSkill 的响应
          'skillOpened'         // openSkill 的响应
        ];

        if (expectedTypes.some(t => message.type === t)) {
          window.removeEventListener('message', handleMessage);
          resolve(message.payload);
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // 确保 payload 是可序列化的
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

    // 发送消息
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

    // 超时处理
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
  // Skills 配置
  const skills = ref<SkillsConfig>({
    global: {},
    local: {}
  });

  // 加载状态
  const loading = ref(false);

  // 错误信息
  const error = ref<string | null>(null);

  // 计算全部 Skills 数量
  const totalCount = computed(() => {
    return Object.keys(skills.value.global).length + Object.keys(skills.value.local).length;
  });

  // 计算全局 Skills 数量
  const globalCount = computed(() => Object.keys(skills.value.global).length);

  // 计算本地 Skills 数量
  const localCount = computed(() => Object.keys(skills.value.local).length);

  // 计算全部 Skills 列表
  const skillList = computed(() => {
    const global = Object.values(skills.value.global);
    const local = Object.values(skills.value.local);
    return [...global, ...local];
  });

  // 计算全局 Skills 列表
  const globalSkillList = computed(() => Object.values(skills.value.global));

  // 计算本地 Skills 列表
  const localSkillList = computed(() => Object.values(skills.value.local));

  /**
   * 初始化，加载 Skills 列表
   */
  async function initialize() {
    await loadSkills();
  }

  /**
   * 加载所有 Skills
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
   * 导入 Skill
   */
  async function importSkill(scope: SkillScope): Promise<{ success: boolean; count?: number; total?: number; error?: string; errors?: any[] }> {
    error.value = null;

    try {
      // 发送导入请求（后端会显示文件选择对话框）
      const result = await sendMessageToExtension('importSkill', { scope });

      if (result.success) {
        // 重新加载 Skills 列表
        await loadSkills();
        return {
          success: true,
          count: result.count,
          total: result.total,
          errors: result.errors
        };
      } else {
        error.value = result.error || '导入 Skill 失败';
        return { success: false, error: error.value ?? undefined };
      }
    } catch (e) {
      console.error('Failed to import Skill:', e);
      error.value = String(e);
      return { success: false, error: error.value ?? undefined };
    }
  }

  /**
   * 删除 Skill
   */
  async function deleteSkill(id: string, scope: SkillScope): Promise<{ success: boolean; error?: string }> {
    loading.value = true;
    error.value = null;

    try {
      const result = await sendMessageToExtension('deleteSkill', { id, scope });
      if (result.success) {
        // 重新加载 Skills 列表
        await loadSkills();
        return { success: true };
      } else {
        error.value = result.error || '删除 Skill 失败';
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
   * 在编辑器中打开 Skill
   */
  async function openSkill(skillPath: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await sendMessageToExtension('openSkill', { skillPath });
      if (result.success) {
        return { success: true };
      } else {
        error.value = result.error || '打开 Skill 失败';
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
