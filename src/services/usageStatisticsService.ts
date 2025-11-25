/**
 * Token 使用统计服务
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface UsageData {
  inputTokens: number;
  outputTokens: number;
  cacheWriteTokens: number;
  cacheReadTokens: number;
  totalTokens: number;
}

export interface SessionSummary {
  sessionId: string;
  timestamp: number;
  model: string;
  usage: UsageData;
  cost: number;
  summary?: string;  // 添加会话标题字段
}

export interface ModelUsage {
  model: string;
  totalCost: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  sessionCount: number;
}

export interface DailyUsage {
  date: string;
  sessions: number;
  usage: UsageData;
  cost: number;
  modelsUsed: string[];
}

export interface WeeklyComparison {
  currentWeek: {
    sessions: number;
    cost: number;
    tokens: number;
  };
  lastWeek: {
    sessions: number;
    cost: number;
    tokens: number;
  };
  trends: {
    sessions: number; // 百分比变化
    cost: number;
    tokens: number;
  };
}

export interface ProjectStatistics {
  projectPath: string;
  projectName: string;
  totalSessions: number;
  totalUsage: UsageData;
  estimatedCost: number;
  sessions: SessionSummary[];
  dailyUsage: DailyUsage[];
  weeklyComparison: WeeklyComparison;
  byModel: ModelUsage[];
  lastUpdated: number;
}

/**
 * Token 定价（基于 Claude API 官方定价，每百万 tokens）
 */
const MODEL_PRICING = {
  // Claude Opus 4 pricing (per million tokens)
  'claude-opus-4': {
    input: 15.0,
    output: 75.0,
    cacheWrite: 18.75,
    cacheRead: 1.50,
  },
  // Claude Sonnet 4 / 4.5 pricing (per million tokens)
  'claude-sonnet-4': {
    input: 3.0,
    output: 15.0,
    cacheWrite: 3.75,
    cacheRead: 0.30,
  },
  // Claude Haiku 4 / 4.5 pricing (per million tokens)
  'claude-haiku-4': {
    input: 0.8,
    output: 4.0,
    cacheWrite: 1.0,
    cacheRead: 0.08,
  },
};

/**
 * 根据模型名称获取定价
 */
function getModelPricing(model: string) {
  // 检测模型类型
  const modelLower = model.toLowerCase();

  if (modelLower.includes('opus-4') || modelLower.includes('claude-opus-4')) {
    return MODEL_PRICING['claude-opus-4'];
  } else if (modelLower.includes('haiku-4') || modelLower.includes('claude-haiku-4')) {
    return MODEL_PRICING['claude-haiku-4'];
  } else if (modelLower.includes('sonnet-4') || modelLower.includes('claude-sonnet-4')) {
    return MODEL_PRICING['claude-sonnet-4'];
  }

  // 默认使用 Sonnet 4 定价
  return MODEL_PRICING['claude-sonnet-4'];
}

/**
 * 将项目路径转换为 ~/.claude/projects 中的文件夹名称
 *
 * 示例：
 * - Mac: /Users/username/Desktop/project -> -Users-username-Desktop-project
 * - Windows: C:\Users\Admin\Desktop\project -> c--Users-Admin-Desktop-project
 */
function getProjectFolderName(projectPath: string): string {
  // 标准化路径：将反斜杠转换为正斜杠（处理Windows路径）
  let normalizedPath = projectPath.replace(/\\/g, '/');

  // 处理Windows盘符：C:/Users/... -> c-/Users/...
  // 盘符转小写，冒号转为连字符
  if (/^[a-zA-Z]:/.test(normalizedPath)) {
    normalizedPath = normalizedPath[0].toLowerCase() + '-' + normalizedPath.substring(2);
  }

  // 处理中文和特殊字符：将非ASCII字符替换为 '-'
  const cleanPath = normalizedPath.replace(/[^\x00-\x7F]/g, '-');

  // 将 '/' 替换为 '-'
  // Mac: /Users/... → -Users-...
  // Windows: c-/Users/... → c--Users-...
  return cleanPath.replace(/\//g, '-');
}

/**
 * 读取并解析单个会话文件（带去重机制）
 */
async function parseSessionFile(
  filePath: string,
  processedHashes: Set<string>
): Promise<SessionSummary | null> {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n');

    const usage: UsageData = {
      inputTokens: 0,
      outputTokens: 0,
      cacheWriteTokens: 0,
      cacheReadTokens: 0,
      totalTokens: 0,
    };

    let firstTimestamp = 0;
    let model = 'unknown';
    let totalCost = 0;
    let sessionSummary: string | undefined;

    // 解析每一行 JSON
    for (const line of lines) {
      try {
        const data = JSON.parse(line);

        // 记录第一条消息的时间戳
        if (!firstTimestamp && data.timestamp) {
          // 处理不同格式的时间戳
          if (typeof data.timestamp === 'string') {
            // ISO 字符串格式，如 "2025-11-18T03:33:37.934Z"
            firstTimestamp = new Date(data.timestamp).getTime();
          } else if (typeof data.timestamp === 'number') {
            // 数字格式，判断是秒还是毫秒
            firstTimestamp = data.timestamp < 1000000000000 ? data.timestamp * 1000 : data.timestamp;
          }
        }

        // 查找 summary 类型的消息
        if (data.type === 'summary' && data.summary) {
          sessionSummary = data.summary;
        }

        // 查找 assistant 消息中的 usage 数据
        if (data.type === 'assistant' && data.message && data.message.usage) {
          const message = data.message;
          const msgUsage = message.usage;

          // 去重检查：使用 message.id + requestId 作为唯一标识
          if (message.id && data.requestId) {
            const uniqueHash = `${message.id}:${data.requestId}`;
            if (processedHashes.has(uniqueHash)) {
              continue; // 跳过重复的条目
            }
            processedHashes.add(uniqueHash);
          }

          // 跳过无意义的空 token 条目
          const hasTokens =
            (msgUsage.input_tokens || 0) > 0 ||
            (msgUsage.output_tokens || 0) > 0 ||
            (msgUsage.cache_creation_input_tokens || 0) > 0 ||
            (msgUsage.cache_read_input_tokens || 0) > 0;

          if (!hasTokens) {
            continue;
          }

          // 提取模型名称
          if (message.model && model === 'unknown') {
            model = message.model;
          }

          // 累加 token 使用量
          const inputTokens = msgUsage.input_tokens || 0;
          const outputTokens = msgUsage.output_tokens || 0;
          const cacheWriteTokens = msgUsage.cache_creation_input_tokens || 0;
          const cacheReadTokens = msgUsage.cache_read_input_tokens || 0;

          usage.inputTokens += inputTokens;
          usage.outputTokens += outputTokens;
          usage.cacheWriteTokens += cacheWriteTokens;
          usage.cacheReadTokens += cacheReadTokens;

          // 计算成本（优先使用 API 返回的成本）
          if (data.costUSD) {
            totalCost += data.costUSD;
          } else if (message.model) {
            // 自行计算成本
            const pricing = getModelPricing(message.model);
            const cost =
              (inputTokens * pricing.input) / 1_000_000 +
              (outputTokens * pricing.output) / 1_000_000 +
              (cacheWriteTokens * pricing.cacheWrite) / 1_000_000 +
              (cacheReadTokens * pricing.cacheRead) / 1_000_000;
            totalCost += cost;
          }
        }
      } catch (err) {
        // 跳过无法解析的行
        continue;
      }
    }

    // 计算总 token 数
    usage.totalTokens =
      usage.inputTokens +
      usage.outputTokens +
      usage.cacheWriteTokens +
      usage.cacheReadTokens;

    // 如果没有任何 token 使用，返回 null
    if (usage.totalTokens === 0) {
      return null;
    }

    const sessionId = path.basename(filePath, '.jsonl');

    // 确保 timestamp 是有效的数字
    const validTimestamp = firstTimestamp && !isNaN(firstTimestamp) && firstTimestamp > 0
      ? firstTimestamp
      : Date.now();

    return {
      sessionId,
      timestamp: validTimestamp,
      model,
      usage,
      cost: totalCost,
      summary: sessionSummary,  // 添加会话标题
    };
  } catch (err) {
    console.error(`Failed to parse session file ${filePath}:`, err);
    return null;
  }
}

/**
 * 计算费用（基于模型和使用量）
 */
function calculateCost(usage: UsageData, model: string = 'claude-sonnet-4'): number {
  const pricing = getModelPricing(model);
  return (
    (usage.inputTokens * pricing.input) / 1_000_000 +
    (usage.outputTokens * pricing.output) / 1_000_000 +
    (usage.cacheWriteTokens * pricing.cacheWrite) / 1_000_000 +
    (usage.cacheReadTokens * pricing.cacheRead) / 1_000_000
  );
}

/**
 * 聚合日期数据
 */
function aggregateDailyUsage(sessions: SessionSummary[]): DailyUsage[] {
  const dailyMap = new Map<string, DailyUsage>();

  sessions.forEach(session => {
    // 时间戳已经是毫秒单位
    const date = new Date(session.timestamp).toISOString().split('T')[0];

    if (!dailyMap.has(date)) {
      dailyMap.set(date, {
        date,
        sessions: 0,
        usage: {
          inputTokens: 0,
          outputTokens: 0,
          cacheWriteTokens: 0,
          cacheReadTokens: 0,
          totalTokens: 0
        },
        cost: 0,
        modelsUsed: []
      });
    }

    const daily = dailyMap.get(date)!;
    daily.sessions += 1;
    daily.usage.inputTokens += session.usage.inputTokens;
    daily.usage.outputTokens += session.usage.outputTokens;
    daily.usage.cacheWriteTokens += session.usage.cacheWriteTokens;
    daily.usage.cacheReadTokens += session.usage.cacheReadTokens;
    daily.usage.totalTokens += session.usage.totalTokens;
    daily.cost += session.cost;

    // 记录使用的模型
    if (session.model && !daily.modelsUsed.includes(session.model)) {
      daily.modelsUsed.push(session.model);
    }
  });

  // 按日期排序
  return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * 聚合按模型的数据
 */
function aggregateByModel(sessions: SessionSummary[]): ModelUsage[] {
  const modelMap = new Map<string, ModelUsage>();

  sessions.forEach(session => {
    if (!modelMap.has(session.model)) {
      modelMap.set(session.model, {
        model: session.model,
        totalCost: 0,
        totalTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
        sessionCount: 0,
      });
    }

    const modelStat = modelMap.get(session.model)!;
    modelStat.totalCost += session.cost;
    modelStat.inputTokens += session.usage.inputTokens;
    modelStat.outputTokens += session.usage.outputTokens;
    modelStat.cacheCreationTokens += session.usage.cacheWriteTokens;
    modelStat.cacheReadTokens += session.usage.cacheReadTokens;
    modelStat.totalTokens += session.usage.totalTokens;
    modelStat.sessionCount += 1;
  });

  // 按总成本降序排序
  return Array.from(modelMap.values()).sort((a, b) => b.totalCost - a.totalCost);
}

/**
 * 计算周对比数据
 */
function calculateWeeklyComparison(sessions: SessionSummary[]): WeeklyComparison {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const currentWeekSessions = sessions.filter(s => {
    // 时间戳已经是毫秒单位
    return s.timestamp > oneWeekAgo.getTime();
  });
  const lastWeekSessions = sessions.filter(s => {
    // 时间戳已经是毫秒单位
    return s.timestamp > twoWeeksAgo.getTime() && s.timestamp <= oneWeekAgo.getTime();
  });

  // 聚合当前周数据
  const currentWeek = {
    sessions: currentWeekSessions.length,
    cost: 0,
    tokens: 0
  };

  currentWeekSessions.forEach(s => {
    currentWeek.tokens += s.usage.totalTokens;
    currentWeek.cost += s.cost;
  });

  // 聚合上周数据
  const lastWeek = {
    sessions: lastWeekSessions.length,
    cost: 0,
    tokens: 0
  };

  lastWeekSessions.forEach(s => {
    lastWeek.tokens += s.usage.totalTokens;
    lastWeek.cost += s.cost;
  });

  // 计算趋势（百分比）
  const trends = {
    sessions: lastWeek.sessions === 0 ? 0 :
      ((currentWeek.sessions - lastWeek.sessions) / lastWeek.sessions) * 100,
    cost: lastWeek.cost === 0 ? 0 :
      ((currentWeek.cost - lastWeek.cost) / lastWeek.cost) * 100,
    tokens: lastWeek.tokens === 0 ? 0 :
      ((currentWeek.tokens - lastWeek.tokens) / lastWeek.tokens) * 100
  };

  return {
    currentWeek,
    lastWeek,
    trends
  };
}

/**
 * 获取当前项目的使用统计
 */
export async function getCurrentProjectStatistics(
  projectPath: string
): Promise<ProjectStatistics | null> {
  try {
    const claudeDir = path.join(os.homedir(), '.claude', 'projects');
    const projectFolderName = getProjectFolderName(projectPath);
    const projectDir = path.join(claudeDir, projectFolderName);

    // 检查项目目录是否存在
    if (!fs.existsSync(projectDir)) {
      console.log(`Project directory not found: ${projectDir}`);
      return null;
    }

    // 读取所有会话文件
    const files = fs.readdirSync(projectDir).filter((f) => f.endsWith('.jsonl'));

    if (files.length === 0) {
      return {
        projectPath,
        projectName: path.basename(projectPath),
        totalSessions: 0,
        totalUsage: {
          inputTokens: 0,
          outputTokens: 0,
          cacheWriteTokens: 0,
          cacheReadTokens: 0,
          totalTokens: 0,
        },
        estimatedCost: 0,
        sessions: [],
        dailyUsage: [],
        weeklyComparison: {
          currentWeek: { sessions: 0, cost: 0, tokens: 0 },
          lastWeek: { sessions: 0, cost: 0, tokens: 0 },
          trends: { sessions: 0, cost: 0, tokens: 0 }
        },
        byModel: [],
        lastUpdated: Date.now(),
      };
    }

    // 解析所有会话文件（带去重）
    const sessions: SessionSummary[] = [];
    const processedHashes = new Set<string>(); // 用于去重
    const totalUsage: UsageData = {
      inputTokens: 0,
      outputTokens: 0,
      cacheWriteTokens: 0,
      cacheReadTokens: 0,
      totalTokens: 0,
    };
    let totalCost = 0;

    for (const file of files) {
      const filePath = path.join(projectDir, file);
      const session = await parseSessionFile(filePath, processedHashes);

      if (session) {
        sessions.push(session);

        // 累加总使用量
        totalUsage.inputTokens += session.usage.inputTokens;
        totalUsage.outputTokens += session.usage.outputTokens;
        totalUsage.cacheWriteTokens += session.usage.cacheWriteTokens;
        totalUsage.cacheReadTokens += session.usage.cacheReadTokens;
        totalUsage.totalTokens += session.usage.totalTokens;
        totalCost += session.cost;
      }
    }

    // 创建两个排序版本的会话数组
    const sessionsByTime = [...sessions].sort((a, b) => {
      // 时间戳已经是毫秒单位
      return b.timestamp - a.timestamp;
    });
    const sessionsByCost = [...sessions].sort((a, b) => b.cost - a.cost);

    // 合并两个数组，去重，保留最相关的会话
    const topSessions = new Map<string, SessionSummary>();

    // 先添加最近100个会话
    sessionsByTime.slice(0, 100).forEach(session => {
      topSessions.set(session.sessionId, session);
    });

    // 再添加消费最高的100个会话
    sessionsByCost.slice(0, 100).forEach(session => {
      if (!topSessions.has(session.sessionId)) {
        topSessions.set(session.sessionId, session);
      }
    });

    // 转回数组，按时间戳排序（默认显示顺序）
    const finalSessions = Array.from(topSessions.values())
      .sort((a, b) => {
        // 时间戳已经是毫秒单位
        return b.timestamp - a.timestamp;
      });

    // 聚合日期数据
    const dailyUsage = aggregateDailyUsage(sessions);

    // 聚合按模型数据
    const byModel = aggregateByModel(sessions);

    // 计算周对比
    const weeklyComparison = calculateWeeklyComparison(sessions);

    return {
      projectPath,
      projectName: path.basename(projectPath),
      totalSessions: sessions.length,
      totalUsage,
      estimatedCost: totalCost,
      sessions: finalSessions, // 返回最相关的会话（最近的和消费最高的）
      dailyUsage: dailyUsage.slice(-30), // 只返回最近 30 天
      weeklyComparison,
      byModel,
      lastUpdated: Date.now(),
    };
  } catch (err) {
    console.error('Failed to get project statistics:', err);
    return null;
  }
}

/**
 * 获取所有项目的统计列表（用于未来扩展）
 */
export async function getAllProjectsStatistics(): Promise<ProjectStatistics[]> {
  try {
    const claudeDir = path.join(os.homedir(), '.claude', 'projects');

    if (!fs.existsSync(claudeDir)) {
      return [];
    }

    const projectFolders = fs.readdirSync(claudeDir).filter((f) => {
      const fullPath = path.join(claudeDir, f);
      return fs.statSync(fullPath).isDirectory();
    });

    const results: ProjectStatistics[] = [];

    for (const folder of projectFolders) {
      // 将文件夹名转回路径
      // -Users-username-Desktop-project -> /Users/username/Desktop/project
      const projectPath = folder.substring(1).replace(/-/g, '/');

      const stats = await getCurrentProjectStatistics('/' + projectPath);
      if (stats && stats.totalSessions > 0) {
        results.push(stats);
      }
    }

    // 按总费用排序
    results.sort((a, b) => b.estimatedCost - a.estimatedCost);

    return results;
  } catch (err) {
    console.error('Failed to get all projects statistics:', err);
    return [];
  }
}

/**
 * 获取所有项目的聚合统计数据
 */
export async function getAllProjectsAggregatedStatistics(): Promise<ProjectStatistics | null> {
  try {
    const claudeDir = path.join(os.homedir(), '.claude', 'projects');

    if (!fs.existsSync(claudeDir)) {
      return null;
    }

    const projectFolders = fs.readdirSync(claudeDir).filter((f) => {
      const fullPath = path.join(claudeDir, f);
      return fs.statSync(fullPath).isDirectory();
    });

    // 聚合所有项目的数据
    const allSessions: SessionSummary[] = [];
    const totalUsage: UsageData = {
      inputTokens: 0,
      outputTokens: 0,
      cacheWriteTokens: 0,
      cacheReadTokens: 0,
      totalTokens: 0,
    };
    let totalCost = 0;
    const processedHashes = new Set<string>(); // 用于全局去重

    for (const folder of projectFolders) {
      const projectDir = path.join(claudeDir, folder);

      // 读取该项目的所有会话文件
      const files = fs.readdirSync(projectDir).filter((f) => f.endsWith('.jsonl'));

      for (const file of files) {
        const filePath = path.join(projectDir, file);
        const session = await parseSessionFile(filePath, processedHashes);

        if (session) {
          allSessions.push(session);

          // 累加总使用量
          totalUsage.inputTokens += session.usage.inputTokens;
          totalUsage.outputTokens += session.usage.outputTokens;
          totalUsage.cacheWriteTokens += session.usage.cacheWriteTokens;
          totalUsage.cacheReadTokens += session.usage.cacheReadTokens;
          totalUsage.totalTokens += session.usage.totalTokens;
          totalCost += session.cost;
        }
      }
    }

    if (allSessions.length === 0) {
      return {
        projectPath: 'all',
        projectName: '所有项目',
        totalSessions: 0,
        totalUsage: {
          inputTokens: 0,
          outputTokens: 0,
          cacheWriteTokens: 0,
          cacheReadTokens: 0,
          totalTokens: 0,
        },
        estimatedCost: 0,
        sessions: [],
        dailyUsage: [],
        weeklyComparison: {
          currentWeek: { sessions: 0, cost: 0, tokens: 0 },
          lastWeek: { sessions: 0, cost: 0, tokens: 0 },
          trends: { sessions: 0, cost: 0, tokens: 0 }
        },
        byModel: [],
        lastUpdated: Date.now(),
      };
    }

    // 创建两个排序版本的会话数组
    const sessionsByTime = [...allSessions].sort((a, b) => {
      // 时间戳已经是毫秒单位
      return b.timestamp - a.timestamp;
    });
    const sessionsByCost = [...allSessions].sort((a, b) => b.cost - a.cost);

    // 合并两个数组，去重，保留最相关的会话
    const topSessions = new Map<string, SessionSummary>();

    // 先添加最近100个会话
    sessionsByTime.slice(0, 100).forEach(session => {
      topSessions.set(session.sessionId, session);
    });

    // 再添加消费最高的100个会话
    sessionsByCost.slice(0, 100).forEach(session => {
      if (!topSessions.has(session.sessionId)) {
        topSessions.set(session.sessionId, session);
      }
    });

    // 转回数组，按时间戳排序（默认显示顺序）
    const finalSessions = Array.from(topSessions.values())
      .sort((a, b) => {
        // 时间戳已经是毫秒单位
        return b.timestamp - a.timestamp;
      });

    // 聚合日期数据
    const dailyUsage = aggregateDailyUsage(allSessions);

    // 聚合按模型数据
    const byModel = aggregateByModel(allSessions);

    // 计算周对比
    const weeklyComparison = calculateWeeklyComparison(allSessions);

    return {
      projectPath: 'all',
      projectName: '所有项目',
      totalSessions: allSessions.length,
      totalUsage,
      estimatedCost: totalCost,
      sessions: finalSessions, // 返回最相关的会话（最近的和消费最高的）
      dailyUsage: dailyUsage.slice(-30), // 只返回最近 30 天
      weeklyComparison,
      byModel,
      lastUpdated: Date.now(),
    };
  } catch (err) {
    console.error('Failed to get all projects aggregated statistics:', err);
    return null;
  }
}
