/**
 * Token Usage Statistics Service
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
  summary?: string;  // Session title field
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
    sessions: number; // Percentage change
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
 * Token Pricing (Based on Claude API official pricing, per million tokens)
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
 * Get pricing based on model name
 */
function getModelPricing(model: string) {
  // Detect model type
  const modelLower = model.toLowerCase();

  if (modelLower.includes('opus-4') || modelLower.includes('claude-opus-4')) {
    return MODEL_PRICING['claude-opus-4'];
  } else if (modelLower.includes('haiku-4') || modelLower.includes('claude-haiku-4')) {
    return MODEL_PRICING['claude-haiku-4'];
  } else if (modelLower.includes('sonnet-4') || modelLower.includes('claude-sonnet-4')) {
    return MODEL_PRICING['claude-sonnet-4'];
  }

  // Default to Sonnet 4 pricing
  return MODEL_PRICING['claude-sonnet-4'];
}

/**
 * Convert project path to folder name in ~/.claude/projects
 *
 * Example:
 * - Mac: /Users/username/Desktop/project -> -Users-username-Desktop-project
 * - Windows: C:\Users\Admin\Desktop\project -> c--Users-Admin-Desktop-project
 */
function getProjectFolderName(projectPath: string): string {
  // Standardize path: convert backslashes to forward slashes (handle Windows paths)
  let normalizedPath = projectPath.replace(/\\/g, '/');

  // Handle Windows drive letter: C:/Users/... -> c-/Users/...
  // Drive letter to lowercase, colon to hyphen
  if (/^[a-zA-Z]:/.test(normalizedPath)) {
    normalizedPath = normalizedPath[0].toLowerCase() + '-' + normalizedPath.substring(2);
  }

  // Handle Chinese and special characters: replace non-ASCII characters with '-'
  const cleanPath = normalizedPath.replace(/[^\x00-\x7F]/g, '-');

  // Replace '/' with '-'
  // Mac: /Users/... → -Users-...
  // Windows: c-/Users/... → c--Users-...
  return cleanPath.replace(/\//g, '-');
}

/**
 * Read and parse a single session file (with deduplication mechanism)
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

    // Parse each JSON line
    for (const line of lines) {
      try {
        const data = JSON.parse(line);

        // Record timestamp of the first message
        if (!firstTimestamp && data.timestamp) {
          // Handle different timestamp formats
          if (typeof data.timestamp === 'string') {
            // ISO string format, e.g., "2025-11-18T03:33:37.934Z"
            firstTimestamp = new Date(data.timestamp).getTime();
          } else if (typeof data.timestamp === 'number') {
            // Number format, determine if it's seconds or milliseconds
            firstTimestamp = data.timestamp < 1000000000000 ? data.timestamp * 1000 : data.timestamp;
          }
        }

        // Find summary type messages
        if (data.type === 'summary' && data.summary) {
          sessionSummary = data.summary;
        }

        // Find usage data in assistant messages
        if (data.type === 'assistant' && data.message && data.message.usage) {
          const message = data.message;
          const msgUsage = message.usage;

          // Deduplication check: use message.id + requestId as unique identifier
          if (message.id && data.requestId) {
            const uniqueHash = `${message.id}:${data.requestId}`;
            if (processedHashes.has(uniqueHash)) {
              continue; // Skip duplicate entries
            }
            processedHashes.add(uniqueHash);
          }

          // Skip meaningless empty token entries
          const hasTokens =
            (msgUsage.input_tokens || 0) > 0 ||
            (msgUsage.output_tokens || 0) > 0 ||
            (msgUsage.cache_creation_input_tokens || 0) > 0 ||
            (msgUsage.cache_read_input_tokens || 0) > 0;

          if (!hasTokens) {
            continue;
          }

          // Extract model name
          if (message.model && model === 'unknown') {
            model = message.model;
          }

          // Accumulate token usage
          const inputTokens = msgUsage.input_tokens || 0;
          const outputTokens = msgUsage.output_tokens || 0;
          const cacheWriteTokens = msgUsage.cache_creation_input_tokens || 0;
          const cacheReadTokens = msgUsage.cache_read_input_tokens || 0;

          usage.inputTokens += inputTokens;
          usage.outputTokens += outputTokens;
          usage.cacheWriteTokens += cacheWriteTokens;
          usage.cacheReadTokens += cacheReadTokens;

          // Calculate cost (prioritize using API returned cost)
          if (data.costUSD) {
            totalCost += data.costUSD;
          } else if (message.model) {
            // Calculate cost manually
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
        // Skip unparseable lines
        continue;
      }
    }

    // Calculate total token count
    usage.totalTokens =
      usage.inputTokens +
      usage.outputTokens +
      usage.cacheWriteTokens +
      usage.cacheReadTokens;

    // If no token usage, return null
    if (usage.totalTokens === 0) {
      return null;
    }

    const sessionId = path.basename(filePath, '.jsonl');

    // Ensure timestamp is a valid number
    const validTimestamp = firstTimestamp && !isNaN(firstTimestamp) && firstTimestamp > 0
      ? firstTimestamp
      : Date.now();

    return {
      sessionId,
      timestamp: validTimestamp,
      model,
      usage,
      cost: totalCost,
      summary: sessionSummary,  // Session title
    };
  } catch (err) {
    console.error(`Failed to parse session file ${filePath}:`, err);
    return null;
  }
}

/**
 * Calculate fee (based on model and usage)
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
 * Aggregate daily data
 */
function aggregateDailyUsage(sessions: SessionSummary[]): DailyUsage[] {
  const dailyMap = new Map<string, DailyUsage>();

  sessions.forEach(session => {
    // Timestamp is already in milliseconds
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

    // Record models used
    if (session.model && !daily.modelsUsed.includes(session.model)) {
      daily.modelsUsed.push(session.model);
    }
  });

  // Sort by date
  return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Aggregate data by model
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

  // Sort by total cost descending
  return Array.from(modelMap.values()).sort((a, b) => b.totalCost - a.totalCost);
}

/**
 * Calculate weekly comparison data
 */
function calculateWeeklyComparison(sessions: SessionSummary[]): WeeklyComparison {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const currentWeekSessions = sessions.filter(s => {
    // Timestamp is already in milliseconds
    return s.timestamp > oneWeekAgo.getTime();
  });
  const lastWeekSessions = sessions.filter(s => {
    // Timestamp is already in milliseconds
    return s.timestamp > twoWeeksAgo.getTime() && s.timestamp <= oneWeekAgo.getTime();
  });

  // Aggregate current week data
  const currentWeek = {
    sessions: currentWeekSessions.length,
    cost: 0,
    tokens: 0
  };

  currentWeekSessions.forEach(s => {
    currentWeek.tokens += s.usage.totalTokens;
    currentWeek.cost += s.cost;
  });

  // Aggregate last week data
  const lastWeek = {
    sessions: lastWeekSessions.length,
    cost: 0,
    tokens: 0
  };

  lastWeekSessions.forEach(s => {
    lastWeek.tokens += s.usage.totalTokens;
    lastWeek.cost += s.cost;
  });

  // Calculate trends (percentage)
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
 * Get usage statistics for current project
 */
export async function getCurrentProjectStatistics(
  projectPath: string
): Promise<ProjectStatistics | null> {
  try {
    const claudeDir = path.join(os.homedir(), '.claude', 'projects');
    const projectFolderName = getProjectFolderName(projectPath);
    const projectDir = path.join(claudeDir, projectFolderName);

    // Check if project directory exists
    if (!fs.existsSync(projectDir)) {
      console.log(`Project directory not found: ${projectDir}`);
      return null;
    }

    // Read all session files
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

    // Parse all session files (with deduplication)
    const sessions: SessionSummary[] = [];
    const processedHashes = new Set<string>(); // Used for deduplication
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

        // Accumulate total usage
        totalUsage.inputTokens += session.usage.inputTokens;
        totalUsage.outputTokens += session.usage.outputTokens;
        totalUsage.cacheWriteTokens += session.usage.cacheWriteTokens;
        totalUsage.cacheReadTokens += session.usage.cacheReadTokens;
        totalUsage.totalTokens += session.usage.totalTokens;
        totalCost += session.cost;
      }
    }

    // Create two sorted versions of the sessions array
    const sessionsByTime = [...sessions].sort((a, b) => {
      // Timestamp is already in milliseconds
      return b.timestamp - a.timestamp;
    });
    const sessionsByCost = [...sessions].sort((a, b) => b.cost - a.cost);

    // Merge two arrays, deduplicate, and keep the most relevant sessions
    const topSessions = new Map<string, SessionSummary>();

    // Add recent 100 sessions first
    sessionsByTime.slice(0, 100).forEach(session => {
      topSessions.set(session.sessionId, session);
    });

    // Add 100 highest consumption sessions second
    sessionsByCost.slice(0, 100).forEach(session => {
      if (!topSessions.has(session.sessionId)) {
        topSessions.set(session.sessionId, session);
      }
    });

    // Convert back to array, sort by timestamp (default display order)
    const finalSessions = Array.from(topSessions.values())
      .sort((a, b) => {
        // Timestamp is already in milliseconds
        return b.timestamp - a.timestamp;
      });

    // Aggregate daily data
    const dailyUsage = aggregateDailyUsage(sessions);

    // Aggregate data by model
    const byModel = aggregateByModel(sessions);

    // Calculate weekly comparison
    const weeklyComparison = calculateWeeklyComparison(sessions);

    return {
      projectPath,
      projectName: path.basename(projectPath),
      totalSessions: sessions.length,
      totalUsage,
      estimatedCost: totalCost,
      sessions: finalSessions, // Returns the most relevant sessions (recent and highest cost)
      dailyUsage: dailyUsage.slice(-30), // Returns only the most recent 30 days
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
 * Get statistics list for all projects (for future extension)
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
      // Convert folder name back to path
      // -Users-username-Desktop-project -> /Users/username/Desktop/project
      const projectPath = folder.substring(1).replace(/-/g, '/');

      const stats = await getCurrentProjectStatistics('/' + projectPath);
      if (stats && stats.totalSessions > 0) {
        results.push(stats);
      }
    }

    // Sort by total cost
    results.sort((a, b) => b.estimatedCost - a.estimatedCost);

    return results;
  } catch (err) {
    console.error('Failed to get all projects statistics:', err);
    return [];
  }
}

/**
 * Get aggregated statistics for all projects
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

    // Aggregate data for all projects
    const allSessions: SessionSummary[] = [];
    const totalUsage: UsageData = {
      inputTokens: 0,
      outputTokens: 0,
      cacheWriteTokens: 0,
      cacheReadTokens: 0,
      totalTokens: 0,
    };
    let totalCost = 0;
    const processedHashes = new Set<string>(); // Global deduplication

    for (const folder of projectFolders) {
      const projectDir = path.join(claudeDir, folder);

      // Read all session files for this project
      const files = fs.readdirSync(projectDir).filter((f) => f.endsWith('.jsonl'));

      for (const file of files) {
        const filePath = path.join(projectDir, file);
        const session = await parseSessionFile(filePath, processedHashes);

        if (session) {
          allSessions.push(session);

          // Accumulate total usage
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
        projectName: 'All projects',
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

    // Create two sorted versions of the sessions array
    const sessionsByTime = [...allSessions].sort((a, b) => {
      // Timestamp is already in milliseconds
      return b.timestamp - a.timestamp;
    });
    const sessionsByCost = [...allSessions].sort((a, b) => b.cost - a.cost);

    // Merge two arrays, deduplicate, and keep the most relevant sessions
    const topSessions = new Map<string, SessionSummary>();

    // Add recent 100 sessions first
    sessionsByTime.slice(0, 100).forEach(session => {
      topSessions.set(session.sessionId, session);
    });

    // Add 100 highest consumption sessions second
    sessionsByCost.slice(0, 100).forEach(session => {
      if (!topSessions.has(session.sessionId)) {
        topSessions.set(session.sessionId, session);
      }
    });

    // Convert back to array, sort by timestamp (default display order)
    const finalSessions = Array.from(topSessions.values())
      .sort((a, b) => {
        // Timestamp is already in milliseconds
        return b.timestamp - a.timestamp;
      });

    // Aggregate daily data
    const dailyUsage = aggregateDailyUsage(allSessions);

    // Aggregate data by model
    const byModel = aggregateByModel(allSessions);

    // Calculate weekly comparison
    const weeklyComparison = calculateWeeklyComparison(allSessions);

    return {
      projectPath: 'all',
      projectName: 'All projects',
      totalSessions: allSessions.length,
      totalUsage,
      estimatedCost: totalCost,
      sessions: finalSessions, // Returns the most relevant sessions (recent and highest consumption)
      dailyUsage: dailyUsage.slice(-30), // Returns only the most recent 30 days
      weeklyComparison,
      byModel,
      lastUpdated: Date.now(),
    };
  } catch (err) {
    console.error('Failed to get all projects aggregated statistics:', err);
    return null;
  }
}
