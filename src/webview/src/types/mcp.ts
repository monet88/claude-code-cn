/**
 * MCP (Model Context Protocol) frontend type definitions
 *
 * Support two configuration sources:
 * 1. cc-switch format: ~/.cc-switch/config.json (primary)
 * 2. Claude native format: ~/.claude.json (backward compatibility)
 */

/**
 * MCP server connection specification
 * Support three connection methods: stdio, http, sse
 */
export interface McpServerSpec {
  /** Connection type, default to stdio */
  type?: 'stdio' | 'http' | 'sse';

  // stdio type fields
  /** Command to execute (required for stdio type) */
  command?: string;
  /** Command arguments */
  args?: string[];
  /** Environment variables */
  env?: Record<string, string>;
  /** Working directory */
  cwd?: string;

  // http/sse type fields
  /** Server URL (required for http/sse type) */
  url?: string;
  /** Request headers */
  headers?: Record<string, string>;

  /** Allow extension fields */
  [key: string]: any;
}

/**
 * MCP application enable status (cc-switch v3.7.0 format)
 * Mark which clients the server is applied to
 */
export interface McpApps {
  claude: boolean;
  codex: boolean;
  gemini: boolean;
}

/**
 * MCP server complete configuration
 */
export interface McpServer {
  /** Unique identifier (key in config file) */
  id: string;
  /** Display name */
  name?: string;
  /** Server connection specification */
  server: McpServerSpec;
  /** Application enable status (cc-switch format) */
  apps?: McpApps;
  /** Description */
  description?: string;
  /** Tags */
  tags?: string[];
  /** Homepage link */
  homepage?: string;
  /** Documentation link */
  docs?: string;
  /** Whether enabled (old format compatibility) */
  enabled?: boolean;
  /** Allow extension fields */
  [key: string]: any;
}

/**
 * MCP server mapping (id -> McpServer)
 */
export type McpServersMap = Record<string, McpServer>;

/**
 * MCP preset configuration
 */
export interface McpPreset {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  server: McpServerSpec;
  homepage?: string;
  docs?: string;
}
