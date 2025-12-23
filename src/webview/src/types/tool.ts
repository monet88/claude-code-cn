/**
 * Tool UI Context Interface
 * Used for Tool rendering to access file operations and other functions
 */
export interface ToolContext {
  fileOpener: {
    open: (filePath: string, location?: { startLine?: number; endLine?: number }) => void;
    openContent: (content: string, fileName: string, editable: boolean) => void;
  };
}

/**
 * Tool Permission Request Renderer Interface
 * Different Tools can implement custom permission request UI
 */
export interface ToolPermissionRenderer {
  /**
   * Render permission request UI
   * @param context Tool Context
   * @param inputs Tool Input Parameters
   * @param onModify Modify Input Callback
   */
  renderPermissionRequest(
    context: ToolContext,
    inputs: any,
    onModify?: (newInputs: any) => void
  ): any;
}
