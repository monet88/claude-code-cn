/**
 * VSCode API tools
 * Provide a unified VSCode API access interface, ensuring that the entire application only calls acquireVsCodeApi() once
 */

interface VsCodeApi {
  postMessage(message: any): void;
  getState(): any;
  setState(state: any): void;
}

/**
 * Get the shared VSCode API instance
 * Ensure that the entire application only calls acquireVsCodeApi() once
 */
export function getVsCodeApi(): VsCodeApi | null {
  // Check if there is already an instance
  if ((window as any).__vscodeApi) {
    return (window as any).__vscodeApi;
  }

  // First call, try to get and cache the instance
  if (typeof (window as any).acquireVsCodeApi === 'function') {
    try {
      (window as any).__vscodeApi = (window as any).acquireVsCodeApi();
      console.log('[VSCode API] Successfully acquired VSCode API instance');
      return (window as any).__vscodeApi;
    } catch (error) {
      console.error('[VSCode API] Failed to acquire VSCode API:', error);
      return null;
    }
  }

  console.warn('[VSCode API] acquireVsCodeApi function is not available');
  return null;
}

/**
 * Get the VSCode API instance (throw exception version)
 * If the API instance cannot be obtained, throw an exception
 */
export function requireVsCodeApi(): VsCodeApi {
  const api = getVsCodeApi();
  if (!api) {
    throw new Error('VSCode API is not available');
  }
  return api;
}
