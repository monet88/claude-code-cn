import type { CommandAction } from '../core/AppContext'
import type { RuntimeInstance } from '../composables/useRuntime'
import type { DropdownItemType } from '../types/dropdown'

/**
 * Slash Command data provider
 *
 * Get and filter slash commands from CommandRegistry
 */



// Command with section
export interface CommandWithSection extends CommandAction {
  section: string
}

/**
 * Get slash commands
 *
 * @param query Search query
 * @param runtime Runtime instance
 * @returns Command list
 */
export function getSlashCommands(
  query: string,
  runtime: RuntimeInstance | undefined,
  _signal?: AbortSignal
): CommandAction[] {
  if (!runtime) return []

  const commandsBySection = runtime.appContext.commandRegistry.getCommandsBySection()
  const allCommands = commandsBySection['Slash Commands'] || []

  // If no query, return all commands
  if (!query || !query.trim()) return allCommands

  // Filter commands: match label or description
  const lowerQuery = query.toLowerCase()
  return allCommands.filter(cmd =>
    cmd.label.toLowerCase().includes(lowerQuery) ||
    cmd.description?.toLowerCase().includes(lowerQuery)
  )
}

/**
 * Get slash commands with section information (for ButtonArea)
 *
 * @param query Search query
 * @param runtime Runtime instance
 * @returns Command list with section information
 */
export function getSlashCommandsWithSection(
  query: string,
  runtime: RuntimeInstance | undefined
): CommandWithSection[] {
  if (!runtime) return []

  const commandsBySection = runtime.appContext.commandRegistry.getCommandsBySection()
  const results: CommandWithSection[] = []

  const SECTION_ORDER = ['Slash Commands'] as const

  // Iterate through sections
  for (const section of SECTION_ORDER) {
    const commands = commandsBySection[section]
    if (!commands || commands.length === 0) continue

    // Filter commands
    const lowerQuery = query.toLowerCase()
    const filteredCommands = query
      ? commands.filter(cmd =>
        cmd.label.toLowerCase().includes(lowerQuery) ||
        cmd.description?.toLowerCase().includes(lowerQuery)
      )
      : commands

    // Add section information
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
 * Convert CommandAction to DropdownItemType
 *
 * @param command Command object
 * @returns Dropdown item
 */
export function commandToDropdownItem(command: CommandAction): DropdownItemType {
  return {
    id: command.id,
    label: command.label,
    detail: command.description,
    icon: 'codicon-symbol-method',
    type: 'command',
    data: { commandId: command.id, command }
  }
}

/**
 * Get command icon
 *
 * @param command Command object
 * @returns Icon class name
 */
export function getCommandIcon(command: CommandAction): string | undefined {
  const label = command.label.toLowerCase()

  // Slash commands use default icon
  if (label.startsWith('/')) {
    return 'codicon-symbol-method'
  }

  return undefined
}
