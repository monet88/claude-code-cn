import { onMounted, onUnmounted, watch } from 'vue';
import { signal, effect } from 'alien-signals';
import { EventEmitter } from '../utils/events';
import { ConnectionManager } from '../core/ConnectionManager';
import { VSCodeTransport } from '../transport/VSCodeTransport';
import { AppContext } from '../core/AppContext';
import { SessionStore } from '../core/SessionStore';
import type { SelectionRange } from '../core/Session';

export interface RuntimeInstance {
  connectionManager: ConnectionManager;
  appContext: AppContext;
  sessionStore: SessionStore;
  atMentionEvents: EventEmitter<string>;
  selectionEvents: EventEmitter<any>;
}

export function useRuntime(): RuntimeInstance {
  const atMentionEvents = new EventEmitter<string>();
  const selectionEvents = new EventEmitter<any>();

  const connectionManager = new ConnectionManager(() => new VSCodeTransport(atMentionEvents, selectionEvents));
  const appContext = new AppContext(connectionManager);

  // Tạo alien-signal cho SessionContext
  // AppContext.currentSelection là Vue Ref, nhưng SessionContext cần alien-signal
  const currentSelectionSignal = signal<SelectionRange | undefined>(undefined);

  // Đồng bộ hai chiều Vue Ref ↔ Alien Signal
  // Vue Ref → Alien Signal
  watch(
    () => appContext.currentSelection(),
    (newValue) => {
      currentSelectionSignal(newValue);
    },
    { immediate: true }
  );

  const sessionStore = new SessionStore(connectionManager, {
    commandRegistry: appContext.commandRegistry,
    currentSelection: currentSelectionSignal,
    fileOpener: appContext.fileOpener,
    showNotification: appContext.showNotification?.bind(appContext),
    startNewConversationTab: appContext.startNewConversationTab?.bind(appContext),
    renameTab: appContext.renameTab?.bind(appContext),
    openURL: appContext.openURL.bind(appContext)
  });

  selectionEvents.add((selection) => {
    appContext.currentSelection(selection);
  });

  // Effect bên trong SessionStore sẽ tự động theo dõi việc thiết lập connection và kéo danh sách session

  // Theo dõi thay đổi claudeConfig và đăng ký Slash Commands
  let slashCommandDisposers: Array<() => void> = [];

  const cleanupSlashCommands = effect(() => {
    const connection = connectionManager.connection();
    const claudeConfig = connection?.claudeConfig();

    // Dọn dẹp Slash Commands cũ
    slashCommandDisposers.forEach(dispose => dispose());
    slashCommandDisposers = [];

    // Đăng ký Slash Commands mới
    if (claudeConfig?.slashCommands && Array.isArray(claudeConfig.slashCommands)) {
      // Filter valid commands - must have name as non-empty string
      // CLI returns both Commands AND Skills, we need to filter out Skills
      // Skills: model-invoked, long descriptions (>150 chars), end with (user)/(project)
      // Commands: user-invoked, short descriptions, have ⚡, or are built-in/plugins
      const validCommands = claudeConfig.slashCommands.filter((cmd: any) => {
        // Basic validation
        if (typeof cmd?.name !== 'string' || !cmd.name.trim()) {
          if (cmd) console.warn('[Runtime] Skipping invalid command:', cmd);
          return false;
        }

        const desc = cmd.description || '';

        // Check patterns
        const endsWithUserOrProject = /\((user|project(?::[^)]+)?)\)\s*$/.test(desc);
        const hasActionEmoji = desc.includes('⚡');
        const isPluginCommand = desc.includes('(plugin:');
        const isLongDescription = desc.length > 150;

        // Built-in commands: no (user)/(project)/(plugin:) suffix - always keep
        const isBuiltInCommand = !endsWithUserOrProject && !isPluginCommand;
        if (isBuiltInCommand) return true;

        // Plugin commands - always keep
        if (isPluginCommand) return true;

        // Commands with ⚡ - always keep
        if (hasActionEmoji) return true;

        // Filter out: Skills (ends with user/project, long description, no ⚡)
        // Keep short descriptions (likely commands), filter long ones (likely skills)
        if (endsWithUserOrProject && isLongDescription) {
          return false; // This is a Skill
        }

        return true; // Short descriptions are commands
      });

      slashCommandDisposers = validCommands.map((cmd: any) => {
        return appContext.commandRegistry.registerAction(
          {
            id: `slash-command-${cmd.name}`,
            label: `/${cmd.name}`,
            description: typeof cmd?.description === 'string' ? cmd.description : undefined
          },
          'Slash Commands',
          () => {
            console.log('[Runtime] Execute slash command:', cmd.name);
            const activeSession = sessionStore.activeSession();
            if (activeSession) {
              void activeSession.send(`/${cmd.name}`, [], false);
            } else {
              console.warn('[Runtime] No active session to execute slash command');
            }
          }
        );
      });

      const totalFromCLI = claudeConfig.slashCommands.length;
      const filteredSkills = totalFromCLI - validCommands.length;
      console.log(`[Runtime] Registered ${validCommands.length} slash commands (filtered ${filteredSkills} skills from ${totalFromCLI} total)`);
    }
  });

  onMounted(() => {
    let disposed = false;

    (async () => {
      const connection = await connectionManager.get();
      try { await connection.opened; } catch (e) { console.error('[runtime] open failed', e); return; }

      if (disposed) return;

      try {
        const selection = await connection.getCurrentSelection();
        if (!disposed) appContext.currentSelection(selection?.selection ?? undefined);
      } catch (e) { console.warn('[runtime] selection fetch failed', e); }

      try {
        const assets = await connection.getAssetUris();
        if (!disposed) appContext.assetUris(assets.assetUris);
      } catch (e) { console.warn('[runtime] assets fetch failed', e); }

      await sessionStore.listSessions();
      if (!disposed && !sessionStore.activeSession()) {
        await sessionStore.createSession({ isExplicit: false });
      }
    })();

    onUnmounted(() => {
      disposed = true;

      // Dọn dẹp đăng ký lệnh
      slashCommandDisposers.forEach(dispose => dispose());
      cleanupSlashCommands();

      connectionManager.close();
    });
  });

  return { connectionManager, appContext, sessionStore, atMentionEvents, selectionEvents };
}

