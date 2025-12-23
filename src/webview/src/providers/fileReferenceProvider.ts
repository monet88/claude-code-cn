import type { DropdownItemType } from '../types/dropdown'
import type { RuntimeInstance } from '../composables/useRuntime'

/**
* File reference
*/
export interface FileReference {
  path: string
  name: string
  type: 'file' | 'directory'
}

/**
 * Get file list
 * @param query Search query
 * @param runtime Runtime instance
 * @returns File reference array
 */
export async function getFileReferences(
  query: string,
  runtime: RuntimeInstance | undefined,
  signal?: AbortSignal
): Promise<FileReference[]> {
  if (!runtime) {
    console.warn('[fileReferenceProvider] No runtime available')
    return []
  }

  try {
    const connection = await runtime.connectionManager.get()

    // Empty query passes empty string, let backend return top-level content
    const pattern = (query && query.trim()) ? query : ''
    const response = await connection.listFiles(pattern, signal)

    // response.files format: { path, name, type }
    return response.files || []
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return []
    }
    console.error('[fileReferenceProvider] Failed to list files:', error)
    return []
  }
}

/**
 * Convert file reference to DropdownItem format
 */
export function fileToDropdownItem(file: FileReference): DropdownItemType {
  return {
    id: `file-${file.path}`,
    type: 'item',
    label: file.name,
    detail: file.path,
    // Do not set icon, let FileIcon component match isDirectory/folderName
    data: {
      file
    }
  }
}
