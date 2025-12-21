/**
 * useSessionStore - Vue Composable cho SessionStore
 *
 * Tính năng chính:
 * 1. Chuyển đổi alien-signals của lớp SessionStore thành Vue refs
 * 2. Chuyển đổi alien computed thành Vue computed
 * 3. Cung cấp API thân thiện với Vue
 *
 * Cách sử dụng:
 * ```typescript
 * const store = new SessionStore(...);
 * const storeAPI = useSessionStore(store);
 * // storeAPI.sessions là Vue Ref<Session[]>
 * // storeAPI.activeSession là Vue Ref<Session | undefined>
 * ```
 */

import type { ComputedRef, Ref } from 'vue';
import { useSignal } from '@gn8/alien-signals-vue';
import type { SessionStore, PermissionEvent } from '../core/SessionStore';
import type { Session, SessionOptions } from '../core/Session';
import type { BaseTransport } from '../transport/BaseTransport';

/**
 * useSessionStore kiểu trả về
 */
export interface UseSessionStoreReturn {
  // Trạng thái
  sessions: Ref<Session[]>;
  activeSession: Ref<Session | undefined>;

  // Thuộc tính tính toán
  sessionsByLastModified: ComputedRef<Session[]>;
  connectionState: ComputedRef<string>;

  // Phương thức
  onPermissionRequested: (callback: (event: PermissionEvent) => void) => () => void;
  getConnection: () => Promise<BaseTransport>;
  createSession: (options?: SessionOptions) => Promise<Session>;
  listSessions: () => Promise<void>;
  setActiveSession: (session: Session | undefined) => void;
  dispose: () => void;

  // Thể hiện gốc (dùng cho các trường hợp nâng cao)
  __store: SessionStore;
}

/**
 * useSessionStore - Bọc thể hiện SessionStore thành API Vue Composable
 *
 * @param store Thể hiện SessionStore
 * @returns API thân thiện với Vue
 */
export function useSessionStore(store: SessionStore): UseSessionStoreReturn {
  // 🔥 Sử dụng useSignal chính thức để cầu nối
  const sessions = useSignal(store.sessions);
  const activeSession = useSignal(store.activeSession);

  // 🔥 Sử dụng useSignal để bọc alien computed
  const sessionsByLastModified = useSignal(store.sessionsByLastModified) as unknown as ComputedRef<Session[]>;
  const connectionState = useSignal(store.connectionState) as unknown as ComputedRef<string>;

  // 🔥 Liên kết tất cả phương thức (đảm bảo this trỏ đúng)
  const onPermissionRequested = store.onPermissionRequested.bind(store);
  const getConnection = store.getConnection.bind(store);
  const createSession = store.createSession.bind(store);
  const listSessions = store.listSessions.bind(store);
  const setActiveSession = store.setActiveSession.bind(store);
  const dispose = store.dispose.bind(store);

  return {
    // Trạng thái
    sessions,
    activeSession,

    // Thuộc tính tính toán
    sessionsByLastModified,
    connectionState,

    // Phương thức
    onPermissionRequested,
    getConnection,
    createSession,
    listSessions,
    setActiveSession,
    dispose,

    // Thể hiện gốc
    __store: store,
  };
}
