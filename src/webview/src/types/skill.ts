/**
 * Skills Front-end Type Definition
 */

/**
 * Skill Type
 */
export type SkillType = 'file' | 'directory';

/**
 * Skill Scope
 */
export type SkillScope = 'global' | 'local';

/**
 * Skill Configuration
 */
export interface Skill {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Type: file or directory */
  type: SkillType;
  /** Scope: global or local */
  scope: SkillScope;
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
 * Skills Mapping (id -> Skill)
 */
export type SkillsMap = Record<string, Skill>;

/**
 * Skills Configuration
 */
export interface SkillsConfig {
  /** Global Skills */
  global: SkillsMap;
  /** Local Skills */
  local: SkillsMap;
}
