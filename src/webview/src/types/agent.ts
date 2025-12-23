/**
 * Agents frontend type definitions
 */

/**
 * Agent type
 */
export type AgentType = 'file' | 'directory';

/**
 * Agent scope
 */
export type AgentScope = 'global' | 'local';

/**
 * Agent configuration
 */
export interface Agent {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Type: file or directory */
  type: AgentType;
  /** Scope: global or local */
  scope: AgentScope;
  /** Full path */
  path: string;
  /** Description */
  description?: string;
  /** Created at */
  createdAt?: string;
  /** Modified at */
  modifiedAt?: string;
}

/**
 * Agents mapping (id -> Agent)
 */
export type AgentsMap = Record<string, Agent>;

/**
 * Agents configuration
 */
export interface AgentsConfig {
  /** Global Agents */
  global: AgentsMap;
  /** Local Agents */
  local: AgentsMap;
}
