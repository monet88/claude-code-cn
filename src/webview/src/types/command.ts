/**
 * Command types for frontend
 */

export type CommandType = 'file' | 'directory';
export type CommandScope = 'global' | 'local';

export interface Command {
  id: string;
  name: string;
  type: CommandType;
  scope: CommandScope;
  path: string;
  description?: string;
  argumentHint?: string;
  createdAt: string;
  modifiedAt: string;
}

export interface CommandsMap {
  [id: string]: Command;
}

export interface CommandsConfig {
  global: CommandsMap;
  local: CommandsMap;
}
