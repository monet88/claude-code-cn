/**
 * Agents 前端类型定义
 */

/**
 * Agent 类型
 */
export type AgentType = 'file' | 'directory';

/**
 * Agent 作用域
 */
export type AgentScope = 'global' | 'local';

/**
 * Agent 配置
 */
export interface Agent {
  /** 唯一标识符 */
  id: string;
  /** 显示名称 */
  name: string;
  /** 类型: 文件或目录 */
  type: AgentType;
  /** 作用域: 全局或本地 */
  scope: AgentScope;
  /** 完整路径 */
  path: string;
  /** 描述 */
  description?: string;
  /** 创建时间 */
  createdAt?: string;
  /** 修改时间 */
  modifiedAt?: string;
}

/**
 * Agents 映射 (id -> Agent)
 */
export type AgentsMap = Record<string, Agent>;

/**
 * Agents 配置结构
 */
export interface AgentsConfig {
  /** 全局 Agents */
  global: AgentsMap;
  /** 本地 Agents */
  local: AgentsMap;
}
