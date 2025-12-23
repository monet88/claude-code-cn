/**
 * Provider configuration related type definitions
 */

/**
 * Provider configuration
 */
export interface ProviderConfig {
  /** Unique ID */
  id: string;
  /** Name */
  name: string;
  /** Website URL */
  websiteUrl?: string;
  /** API Key */
  apiKey: string;
  /** Base URL */
  baseUrl: string;
  /** Main model */
  mainModel?: string;
  /** Haiku default model */
  haikuModel?: string;
  /** Sonnet default model */
  sonnetModel?: string;
  /** Opus default model */
  opusModel?: string;
  /** Whether it is a preset provider */
  isPreset?: boolean;
  /** Whether it is the active provider */
  isActive?: boolean;
  /** Whether it is the default provider (cannot be deleted) */
  isDefault?: boolean;
}

/**
 * Provider category
 */
export type ProviderCategory =
  | 'official'      // Official
  | 'cn_official'   // Chinese official
  | 'aggregator'    // Aggregator
  | 'third_party'   // Third party
  | 'custom';       // Custom

/**
 * Preset provider
 */
export interface PresetProvider {
  id: string;
  name: string;
  websiteUrl?: string;
  baseUrl?: string;
  isRecommended?: boolean;
  category?: ProviderCategory;
  isPartner?: boolean;  // Whether it is a partner
  description?: string;  // Description
  theme?: {
    backgroundColor?: string;
    textColor?: string;
    icon?: string;
  };
}

/**
 * Claude settings.json configuration structure
 */
export interface ClaudeSettings {
  env: {
    ANTHROPIC_AUTH_TOKEN?: string;
    ANTHROPIC_BASE_URL?: string;
    [key: string]: string | undefined;
  };
}

/**
 * Preset provider list
 */
export const PRESET_PROVIDERS: PresetProvider[] = [
  // Official provider
  {
    id: 'claude-official',
    name: 'Claude',
    baseUrl: 'https://api.anthropic.com',
    category: 'official',
    description: 'Official API',
    theme: {
      backgroundColor: '#7C3AED',
      textColor: '#FFFFFF',
      icon: 'sparkle'
    }
  },

  // Chinese official
  {
    id: 'deepseek',
    name: 'DeepSeek',
    websiteUrl: 'https://platform.deepseek.com',
    category: 'cn_official',
    description: 'DeepSeek',
    isRecommended: false,
    theme: {
      backgroundColor: '#0EA5E9',
      textColor: '#FFFFFF'
    }
  },
  {
    id: 'zhipu-glm',
    name: 'Zhipu GLM',
    websiteUrl: 'https://open.bigmodel.cn',
    category: 'cn_official',
    description: 'Zhipu GLM',
    isRecommended: true,
    theme: {
      backgroundColor: '#10B981',
      textColor: '#FFFFFF'
    }
  },
  {
    id: 'zai-glm',
    name: 'Z.ai GLM',
    category: 'cn_official',
    isRecommended: true,
    description: 'Z.ai GLM',
    theme: {
      backgroundColor: '#8B5CF6',
      textColor: '#FFFFFF'
    }
  },
  {
    id: 'qwen-coder',
    name: 'Qwen Coder',
    websiteUrl: 'https://dashscope.aliyun.com',
    category: 'cn_official',
    description: 'Qwen Coder',
    theme: {
      backgroundColor: '#F97316',
      textColor: '#FFFFFF'
    }
  },
  {
    id: 'kimi-k2',
    name: 'Kimi k2',
    websiteUrl: 'https://platform.moonshot.cn',
    category: 'cn_official',
    description: 'Kimi',
    theme: {
      backgroundColor: '#EC4899',
      textColor: '#FFFFFF'
    }
  },

  // Aggregator
  {
    id: '88code',
    name: '88code',
    websiteUrl: 'https://www.88code.org',
    category: 'aggregator',
    description: 'Stable aggregation service',
    isRecommended: false,
    theme: {
      backgroundColor: '#EF4444',
      textColor: '#FFFFFF'
    }
  },
  {
    id: 'packycode',
    name: 'PackyCode',
    category: 'aggregator',
    isRecommended: true,
    isPartner: true,
    description: 'Partner, 9折 discount',
    theme: {
      backgroundColor: '#F59E0B',
      textColor: '#FFFFFF',
      icon: 'star'
    }
  },
  {
    id: 'aihubmix',
    name: 'AiHubMix',
    category: 'aggregator',
    description: 'AI Hub Mix'
  },
  {
    id: 'anyrouter',
    name: 'AnyRouter',
    category: 'aggregator',
    description: 'AnyRouter'
  },

  // Third party
  {
    id: 'kat-coder',
    name: 'KAT-Coder',
    category: 'third_party',
    description: 'Third party'
  },
  {
    id: 'longcat',
    name: 'Longcat',
    category: 'third_party',
    description: 'Longcat'
  },
  {
    id: 'minimax',
    name: 'MiniMax',
    websiteUrl: 'https://platform.minimaxi.com',
    category: 'third_party',
    description: 'MiniMax'
  },
  {
    id: 'modelscope',
    name: 'ModelScope',
    websiteUrl: 'https://modelscope.cn',
    category: 'third_party',
    description: 'ModelScope'
  },
  {
    id: 'dmxapi',
    name: 'DMXAPI',
    category: 'third_party',
    description: 'DMX API'
  },
  {
    id: 'foxcode',
    name: 'FoxCode',
    websiteUrl: 'https://foxcode.rjj.cc/',
    category: 'third_party',
    description: 'FoxCode'
  }
];
