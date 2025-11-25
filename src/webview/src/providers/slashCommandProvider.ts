import type { CommandAction } from '../core/AppContext'
import type { RuntimeInstance } from '../composables/useRuntime'
import type { DropdownItemType } from '../types/dropdown'

/**
 * Slash Command 数据提供者
 *
 * 从 CommandRegistry 获取并过滤 slash commands
 */

// 斜杠命令描述的中文翻译映射
const COMMAND_DESCRIPTION_ZH: Record<string, string> = {
  'Clear conversation history and free up context': '清除对话历史并释放上下文',
  'Visualize current context usage as a colored grid': '以彩色网格方式可视化当前上下文使用情况',
  'Show the total cost and duration of the current session': '显示当前会话的总费用和持续时间',
  'Initialize a new CLAUDE.md file with codebase documentation': '使用代码库文档初始化新的 CLAUDE.md 文件',
  'Get comments from a GitHub pull request': '获取 GitHub Pull Request 的评论',
  'View release notes': '查看发布说明',
  'Review a pull request': '审查 Pull Request',
  'Complete a security review of the pending changes on the current branch': '完成当前分支待处理更改的安全审查',
  'List current todo items': '列出当前待办事项'
}

/**
 * 获取本地化的命令描述
 * @param originalDescription 原始英文描述
 * @returns 中文描述（如果有映射）或原始描述
 */
function getLocalizedDescription(originalDescription: string | undefined): string | undefined {
  if (!originalDescription) return originalDescription
  return COMMAND_DESCRIPTION_ZH[originalDescription] || originalDescription
}

// 带 section 信息的命令
export interface CommandWithSection extends CommandAction {
  section: string
}

/**
 * 获取 slash commands
 *
 * @param query 搜索查询（可选）
 * @param runtime Runtime 实例
 * @returns 命令列表
 */
export function getSlashCommands(
  query: string,
  runtime: RuntimeInstance | undefined,
  _signal?: AbortSignal
): CommandAction[] {
  if (!runtime) return []

  const commandsBySection = runtime.appContext.commandRegistry.getCommandsBySection()
  const allCommands = commandsBySection['Slash Commands'] || []

  // 如果没有查询，返回所有命令
  if (!query || !query.trim()) return allCommands

  // 过滤命令：匹配 label 或 description
  const lowerQuery = query.toLowerCase()
  return allCommands.filter(cmd =>
    cmd.label.toLowerCase().includes(lowerQuery) ||
    cmd.description?.toLowerCase().includes(lowerQuery)
  )
}

/**
 * 获取带分组信息的 slash commands（用于 ButtonArea）
 *
 * @param query 搜索查询（可选）
 * @param runtime Runtime 实例
 * @returns 带分组信息的命令列表
 */
export function getSlashCommandsWithSection(
  query: string,
  runtime: RuntimeInstance | undefined
): CommandWithSection[] {
  if (!runtime) return []

  const commandsBySection = runtime.appContext.commandRegistry.getCommandsBySection()
  const results: CommandWithSection[] = []

  const SECTION_ORDER = ['Slash Commands'] as const

  // 遍历分组
  for (const section of SECTION_ORDER) {
    const commands = commandsBySection[section]
    if (!commands || commands.length === 0) continue

    // 过滤命令
    const lowerQuery = query.toLowerCase()
    const filteredCommands = query
      ? commands.filter(cmd =>
          cmd.label.toLowerCase().includes(lowerQuery) ||
          cmd.description?.toLowerCase().includes(lowerQuery)
        )
      : commands

    // 添加分组信息
    for (const cmd of filteredCommands) {
      results.push({
        ...cmd,
        section
      })
    }
  }

  return results
}

/**
 * 将 CommandAction 转换为 DropdownItemType
 *
 * @param command 命令对象
 * @returns Dropdown 项
 */
export function commandToDropdownItem(command: CommandAction): DropdownItemType {
  return {
    id: command.id,
    label: command.label,
    detail: getLocalizedDescription(command.description),
    icon: 'codicon-symbol-method',
    type: 'command',
    data: { commandId: command.id, command }
  }
}

/**
 * 获取命令的图标
 *
 * @param command 命令对象
 * @returns 图标类名
 */
export function getCommandIcon(command: CommandAction): string | undefined {
  const label = command.label.toLowerCase()

  // Slash commands 使用默认图标
  if (label.startsWith('/')) {
    return 'codicon-symbol-method'
  }

  return undefined
}
