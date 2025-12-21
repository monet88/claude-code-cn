/**
 * useSession - Vue Composable cho Session
 *
 * Tính năng chính:
 * 1. Chuyển đổi alien-signals của lớp Session thành Vue refs
 * 2. Chuyển đổi alien computed thành Vue computed
 * 3. Cung cấp API thân thiện với Vue
 *
 * Cách sử dụng:
 * ```typescript
 * const session = new Session(...);
 * const sessionAPI = useSession(session);
 * // sessionAPI.messages là Vue Ref<any[]>
 * // sessionAPI.busy là Vue Ref<boolean>
 * ```
 */

import { computed } from 'vue';
import type { ComputedRef, Ref } from 'vue';
import { useSignal } from '@gn8/alien-signals-vue';
import type { PermissionMode } from '@anthropic-ai/claude-agent-sdk';
import type { Session, SelectionRange } from '../core/Session';
import type { PermissionRequest } from '../core/PermissionRequest';
import type { BaseTransport } from '../transport/BaseTransport';
import type { ModelOption } from '../../../shared/messages';

/**
 * useSession kiểu trả về
 */
export interface UseSessionReturn {
  // Trạng thái cơ bản
  connection: Ref<BaseTransport | undefined>;
  busy: Ref<boolean>;
  isLoading: Ref<boolean>;
  error: Ref<string | undefined>;
  sessionId: Ref<string | undefined>;
  isExplicit: Ref<boolean>;
  lastModifiedTime: Ref<number>;

  // Dữ liệu cốt lõi
  messages: Ref<any[]>;
  messageCount: Ref<number>;
  cwd: Ref<string | undefined>;
  permissionMode: Ref<PermissionMode>;
  summary: Ref<string | undefined>;
  modelSelection: Ref<string | undefined>;
  thinkingLevel: Ref<string>;
  todos: Ref<any[]>;
  worktree: Ref<{ name: string; path: string } | undefined>;
  selection: Ref<SelectionRange | undefined>;

  // Thống kê sử dụng
  usageData: Ref<{
    totalTokens: number;
    totalCost: number;
    contextWindow: number;
  }>;

  // Thuộc tính tính toán
  claudeConfig: ComputedRef<any>;
  config: ComputedRef<any>;
  permissionRequests: ComputedRef<PermissionRequest[]>;

  // Trạng thái dẫn xuất
  isOffline: ComputedRef<boolean>;

  // Phương thức
  getConnection: () => Promise<BaseTransport>;
  preloadConnection: () => Promise<void>;
  loadFromServer: () => Promise<void>;
  send: (
    input: string,
    attachments?: Array<{ fileName: string; mediaType: string; data: string }>,
    includeSelection?: boolean
  ) => Promise<void>;
  launchClaude: () => Promise<string>;
  interrupt: () => Promise<void>;
  restartClaude: () => Promise<void>;
  listFiles: (pattern?: string) => Promise<any>;
  setPermissionMode: (mode: PermissionMode, applyToConnection?: boolean) => Promise<boolean>;
  setModel: (model: ModelOption) => Promise<boolean>;
  setThinkingLevel: (level: string) => Promise<void>;
  getMcpServers: () => Promise<any>;
  openConfigFile: (configType: string) => Promise<void>;
  onPermissionRequested: (callback: (request: PermissionRequest) => void) => () => void;
  dispose: () => void;

  // Thể hiện gốc (dùng cho các trường hợp nâng cao)
  __session: Session;
}

/**
 * useSession - Bọc thể hiện Session thành API Vue Composable
 *
 * @param session Thể hiện Session
 * @returns API thân thiện với Vue
 */
export function useSession(session: Session): UseSessionReturn {
  //  Sử dụng useSignal chính thức để cầu nối signals/computed
  const connection = useSignal(session.connection);
  const busy = useSignal(session.busy);
  const isLoading = useSignal(session.isLoading);
  const error = useSignal(session.error);
  const sessionId = useSignal(session.sessionId);
  const isExplicit = useSignal(session.isExplicit);
  const lastModifiedTime = useSignal(session.lastModifiedTime);
  const messages = useSignal(session.messages);
  const messageCount = useSignal(session.messageCount);
  const cwd = useSignal(session.cwd);
  const permissionMode = useSignal(session.permissionMode);
  const summary = useSignal(session.summary);
  const modelSelection = useSignal(session.modelSelection);
  const thinkingLevel = useSignal(session.thinkingLevel);
  const todos = useSignal(session.todos);
  const worktree = useSignal(session.worktree);
  const selection = useSignal(session.selection);
  const usageData = useSignal(session.usageData);

  //  Sử dụng useSignal để bọc alien computed (chỉ đọc, không gọi setter)
  const claudeConfig = useSignal(session.claudeConfig as any);
  const config = useSignal(session.config as any);
  const permissionRequests = useSignal(session.permissionRequests) as unknown as ComputedRef<PermissionRequest[]>;

  //  Trạng thái dẫn xuất (tạm thời giữ Vue computed)
  const isOffline = computed(() => session.isOffline());

  //  Liên kết tất cả phương thức (đảm bảo this trỏ đúng)
  const getConnection = session.getConnection.bind(session);
  const preloadConnection = session.preloadConnection.bind(session);
  const loadFromServer = session.loadFromServer.bind(session);
  const send = session.send.bind(session);
  const launchClaude = session.launchClaude.bind(session);
  const interrupt = session.interrupt.bind(session);
  const restartClaude = session.restartClaude.bind(session);
  const listFiles = session.listFiles.bind(session);
  const setPermissionMode = session.setPermissionMode.bind(session);
  const setModel = session.setModel.bind(session);
  const setThinkingLevel = session.setThinkingLevel.bind(session);
  const getMcpServers = session.getMcpServers.bind(session);
  const openConfigFile = session.openConfigFile.bind(session);
  const onPermissionRequested = session.onPermissionRequested.bind(session);
  const dispose = session.dispose.bind(session);

  return {
    // Trạng thái
    connection,
    busy,
    isLoading,
    error,
    sessionId,
    isExplicit,
    lastModifiedTime,
    messages,
    messageCount,
    cwd,
    permissionMode,
    summary,
    modelSelection,
    thinkingLevel,
    todos,
    worktree,
    selection,
    usageData,

    // Thuộc tính tính toán
    claudeConfig,
    config,
    permissionRequests,
    isOffline,

    // Phương thức
    getConnection,
    preloadConnection,
    loadFromServer,
    send,
    launchClaude,
    interrupt,
    restartClaude,
    listFiles,
    setPermissionMode,
    setModel,
    setThinkingLevel,
    getMcpServers,
    openConfigFile,
    onPermissionRequested,
    dispose,

    // Thể hiện gốc
    __session: session,
  };
}
