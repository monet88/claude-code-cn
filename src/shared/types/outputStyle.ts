/**
 * Output Style types for output styles management
 */

export type OutputStyleType = 'file' | 'directory';
export type OutputStyleScope = 'global' | 'local';

export interface OutputStyle {
  id: string;
  name: string;
  type: OutputStyleType;
  scope: OutputStyleScope;
  path: string;
  description?: string;
  createdAt: string;
  modifiedAt: string;
}

export interface OutputStylesMap {
  [id: string]: OutputStyle;
}

export interface OutputStylesConfig {
  global: OutputStylesMap;
  local: OutputStylesMap;
}
