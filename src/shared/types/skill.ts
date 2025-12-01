/**
 * Skills 类型定义
 *
 * Skills 是自定义的命令和功能扩展
 * 支持全局和本地两种配置
 */

/**
 * Skill 类型
 */
export type SkillType = 'file' | 'directory';

/**
 * Skill 作用域
 */
export type SkillScope = 'global' | 'local';

/**
 * Skill 配置
 */
export interface Skill {
  /** 唯一标识符 */
  id: string;
  /** 显示名称 */
  name: string;
  /** 类型: 文件或目录 */
  type: SkillType;
  /** 作用域: 全局或本地 */
  scope: SkillScope;
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
 * Skills 映射 (id -> Skill)
 */
export type SkillsMap = Record<string, Skill>;

/**
 * Skills 配置结构
 */
export interface SkillsConfig {
  /** 全局 Skills */
  global: SkillsMap;
  /** 本地 Skills */
  local: SkillsMap;
}
