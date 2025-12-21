# Code Standards and Conventions - CCVN

## Table of Contents
1. [General Principles](#general-principles)
2. [TypeScript Standards](#typescript-standards)
3. [Vue.js Standards](#vuejs-standards)
4. [Architecture Patterns](#architecture-patterns)
5. [Naming Conventions](#naming-conventions)
6. [File Organization](#file-organization)
7. [Error Handling](#error-handling)
8. [Testing Standards](#testing-standards)
9. [Documentation Standards](#documentation-standards)
10. [Git Workflow](#git-workflow)

## General Principles

### 1. Code Quality Principles
- **Readability First**: Code should be self-documenting and easy to understand
- **Consistency**: Follow established patterns throughout the codebase
- **Simplicity**: Favor simple solutions over complex ones
- **Type Safety**: Leverage TypeScript's type system fully
- **Performance**: Write efficient code without premature optimization

### 2. Development Philosophy
- **YAGNI (You Aren't Gonna Need It)**: Don't add features until they're needed
- **DRY (Don't Repeat Yourself)**: Abstract common patterns after 3+ repetitions
- **SOLID Principles**: Follow SOLID design principles
- **Test-Driven Development**: Write tests before or alongside implementation
- **Incremental Development**: Build features in small, testable increments

## TypeScript Standards

### 1. Language Configuration
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitReturns": true,
    "noImplicitThis": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### 2. Type Definitions

#### Interface Naming
```typescript
// ✅ Good - Use I prefix for interfaces
export interface ILogService {
  info(message: string): void;
  error(message: string): void;
}

// ✅ Good - Service interfaces follow I[Name]Service pattern
export interface IClaudeAgentService {
  sendMessage(message: string): Promise<void>;
}
```

#### Type Definitions
```typescript
// ✅ Good - Use union types for enumerations
export type MessageType = 'user' | 'assistant' | 'system';

// ✅ Good - Use generic types with constraints
export interface ApiResponse<T> {
  data: T;
  status: 'success' | 'error';
  message?: string;
}

// ✅ Good - Define specific types over generic ones
export type ClaudeProviderId = string; // More specific than string
```

#### Enum Usage
```typescript
// ✅ Good - Use string enums for better debugging
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

// ✅ Good - Use const enums for compile-time constants
export const enum KeyCode {
  ESC = 27,
  ENTER = 13,
  TAB = 9
}
```

### 3. Function and Method Standards

#### Function Signatures
```typescript
// ✅ Good - Explicit return types
function calculateTokens(input: string): number {
  return input.length / 4; // Simplified calculation
}

// ✅ Good - Async functions with explicit return types
async function fetchProviderConfig(id: string): Promise<ProviderConfig> {
  const response = await api.get(`/providers/${id}`);
  return response.data;
}

// ✅ Good - Generic functions with constraints
function createService<T extends IService>(
  ServiceClass: new (...args: any[]) => T,
  ...args: any[]
): T {
  return new ServiceClass(...args);
}
```

#### Parameter Handling
```typescript
// ✅ Good - Use interfaces for complex parameters
interface SendMessageOptions {
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
}

function sendMessage(
  message: string,
  options: SendMessageOptions = {}
): Promise<void> {
  // Implementation
}

// ✅ Good - Use rest parameters for variable arguments
function logMultiple(level: LogLevel, ...messages: string[]): void {
  messages.forEach(msg => log(level, msg));
}
```

### 4. Class and Interface Standards

#### Class Definition
```typescript
// ✅ Good - Service class with dependency injection
export class ClaudeAgentService implements IClaudeAgentService {
  private readonly transport: ITransport;
  private readonly sessionService: IClaudeSessionService;

  constructor(
    @inject(ITransport) transport: ITransport,
    @inject(IClaudeSessionService) sessionService: IClaudeSessionService
  ) {
    this.transport = transport;
    this.sessionService = sessionService;
  }

  // Public methods
  public async sendMessage(message: string): Promise<void> {
    // Implementation
  }

  // Private methods
  private validateMessage(message: string): void {
    if (!message.trim()) {
      throw new Error('Message cannot be empty');
    }
  }
}
```

#### Interface Definition
```typescript
// ✅ Good - Comprehensive interface documentation
export interface IWebViewService extends vscode.Disposable {
  /**
   * Sets the message handler for webview communication
   * @param handler - Function to handle incoming messages
   */
  setMessageHandler(handler: MessageHandler): void;

  /**
   * Sends a message to the webview
   * @param message - Message to send
   */
  postMessage(message: WebviewMessage): void;

  /**
   * Shows the webview panel
   */
  show(): void;
}
```

## Vue.js Standards

### 1. Component Structure

#### Single File Components
```vue
<template>
  <!-- Use semantic HTML and accessibility attributes -->
  <main class="chat-container" role="main" aria-label="Chat interface">
    <section class="messages" ref="messagesContainer">
      <MessageItem
        v-for="message in messages"
        :key="message.id"
        :message="message"
        @action="handleMessageAction"
      />
    </section>

    <footer class="input-container">
      <MessageInput
        v-model="currentMessage"
        @send="handleSendMessage"
        :disabled="isSending"
      />
    </footer>
  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import type { Ref } from 'vue';

// Props and emits
interface Props {
  sessionId: string;
  initialMessages?: Message[];
}

interface Emits {
  (e: 'message-sent', message: string): void;
  (e: 'session-updated', sessionId: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  initialMessages: () => []
});

const emit = defineEmits<Emits>();

// Reactive state
const messages: Ref<Message[]> = ref([...props.initialMessages]);
const currentMessage = ref('');
const isSending = ref(false);
const messagesContainer = ref<HTMLElement>();

// Computed properties
const hasMessages = computed(() => messages.value.length > 0);

// Methods
const handleSendMessage = async (message: string): Promise<void> => {
  if (!message.trim() || isSending.value) return;

  isSending.value = true;
  try {
    const userMessage: Message = {
      id: generateId(),
      type: 'user',
      content: message,
      timestamp: Date.now()
    };

    messages.value.push(userMessage);
    emit('message-sent', message);

    currentMessage.value = '';
    await scrollToBottom();
  } finally {
    isSending.value = false;
  }
};

const scrollToBottom = async (): Promise<void> => {
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

// Lifecycle
onMounted(() => {
  scrollToBottom();
});
</script>

<style scoped>
.chat-container {
  @apply flex flex-col h-full;
}

.messages {
  @apply flex-1 overflow-y-auto p-4 space-y-4;
}

.input-container {
  @apply border-t p-4;
}
</style>
```

### 2. Composition API Standards

#### Composables
```typescript
// composables/useChat.ts
import { ref, computed } from 'vue';
import type { Ref } from 'vue';
import { useService } from './useService';

export interface UseChatOptions {
  sessionId?: string;
  autoConnect?: boolean;
}

export interface UseChatReturn {
  // State
  isConnected: Ref<boolean>;
  isLoading: Ref<boolean>;
  messages: Ref<Message[]>;
  currentMessage: Ref<string>;

  // Computed
  hasMessages: Ref<boolean>;
  canSend: Ref<boolean>;

  // Methods
  sendMessage: (message: string) => Promise<void>;
  clearMessages: () => void;
  reconnect: () => Promise<void>;
}

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const chatService = useService('IChatService');

  // State
  const isConnected = ref(false);
  const isLoading = ref(false);
  const messages = ref<Message[]>([]);
  const currentMessage = ref('');

  // Computed
  const hasMessages = computed(() => messages.value.length > 0);
  const canSend = computed(() => isConnected.value && !isLoading.value);

  // Methods
  const sendMessage = async (message: string): Promise<void> => {
    if (!canSend.value || !message.trim()) return;

    isLoading.value = true;
    try {
      await chatService.sendMessage(options.sessionId, message);
      currentMessage.value = '';
    } finally {
      isLoading.value = false;
    }
  };

  const clearMessages = (): void => {
    messages.value = [];
  };

  const reconnect = async (): Promise<void> => {
    if (options.sessionId) {
      await chatService.reconnect(options.sessionId);
    }
  };

  return {
    isConnected,
    isLoading,
    messages,
    currentMessage,
    hasMessages,
    canSend,
    sendMessage,
    clearMessages,
    reconnect
  };
}
```

## Architecture Patterns

### 1. Service Pattern

#### Service Interface
```typescript
// interfaces/IConfigService.ts
export interface IConfigService {
  // Configuration methods
  get<T>(key: string, defaultValue?: T): T;
  set<T>(key: string, value: T): void;
  has(key: string): boolean;
  delete(key: string): void;

  // Event handling
  onDidChange(key: string, callback: (value: any) => void): vscode.Disposable;

  // Persistence
  save(): Promise<void>;
  reload(): Promise<void>;
}
```

#### Service Implementation
```typescript
// services/ConfigService.ts
export class ConfigService implements IConfigService {
  private readonly configuration: vscode.WorkspaceConfiguration;
  private readonly changeEmitter = new vscode.EventEmitter<vscode.ConfigurationChangeEvent>();

  constructor(private readonly section: string) {
    this.configuration = vscode.workspace.getConfiguration(section);
  }

  public get<T>(key: string, defaultValue?: T): T {
    return this.configuration.get<T>(key, defaultValue as T);
  }

  public set<T>(key: string, value: T): void {
    this.configuration.update(key, value, vscode.ConfigurationTarget.Global);
  }

  public has(key: string): boolean {
    return this.configuration.has(key);
  }

  public delete(key: string): void {
    this.configuration.update(key, undefined, vscode.ConfigurationTarget.Global);
  }

  public onDidChange = this.changeEmitter.event;

  public async save(): Promise<void> {
    // VS Code handles saving automatically
  }

  public async reload(): Promise<void> {
    // VS Code handles reloading automatically
  }
}
```

### 2. Dependency Injection Pattern

#### Service Registration
```typescript
// di/serviceRegistry.ts
export function registerServices(builder: IInstantiationServiceBuilder): void {
  // Core services
  builder.define(ILogService, new SyncDescriptor(LogService));
  builder.define(IConfigurationService, new SyncDescriptor(ConfigurationService));

  // Claude services
  builder.define(IClaudeAgentService, new SyncDescriptor(ClaudeAgentService));
  builder.define(IClaudeSessionService, new SyncDescriptor(ClaudeSessionService));
}
```

#### Service Usage
```typescript
// Using injected services
export class ChatController {
  constructor(
    @inject(ILogService) private readonly logService: ILogService,
    @inject(IClaudeAgentService) private readonly agentService: IClaudeAgentService,
    @inject(IWebViewService) private readonly webViewService: IWebViewService
  ) {}

  public async handleUserMessage(message: string): Promise<void> {
    this.logService.info(`Processing message: ${message.substring(0, 50)}...`);

    try {
      await this.agentService.sendMessage(message);
    } catch (error) {
      this.logService.error(`Failed to send message: ${error}`);
      this.webViewService.postMessage({
        type: 'error',
        payload: { message: 'Failed to send message' }
      });
    }
  }
}
```

## Naming Conventions

### 1. File and Directory Naming
```
src/
├── services/                    # PascalCase for directories
│   ├── ClaudeAgentService.ts    # PascalCase for classes
│   ├── logService.ts           # camelCase for utilities
│   └── interfaces/             # PascalCase for interface directories
│       └── IConfigService.ts   # I prefix for interfaces
├── components/                 # PascalCase for component directories
│   ├── MessageItem.vue         # PascalCase for components
│   └── ChatInput.vue
├── types/                      # PascalCase for type directories
│   ├── message.ts             # camelCase for type files
│   └── provider.ts
├── utils/                      # camelCase for utility directories
│   ├── dateUtils.ts           # camelCase for utility files
│   └── stringHelpers.ts
└── constants/                  # PascalCase for constant directories
    └── apiEndpoints.ts        # camelCase for constant files
```

### 2. Variable and Function Naming
```typescript
// ✅ Good - camelCase for variables and functions
const currentUserSession = ref<Session | null>(null);
const isSendingMessage = ref(false);

const handleUserInput = (input: string): void => {
  // Implementation
};

const calculateTokenCount = (text: string): number => {
  return text.length / 4;
};

// ✅ Good - PascalCase for classes and interfaces
class MessageProcessor {
  // Implementation
}

interface IApiResponse<T> {
  data: T;
  status: string;
}

// ✅ Good - UPPER_SNAKE_CASE for constants
const MAX_MESSAGE_LENGTH = 4000;
const DEFAULT_TEMPERATURE = 0.7;
const API_ENDPOINTS = {
  CHAT: '/api/chat',
  PROVIDERS: '/api/providers'
} as const;

// ✅ Good - descriptive boolean properties
const isLoading = ref(false);
const hasError = ref(false);
const canSendMessage = computed(() => !isLoading.value && !hasError.value);
```

### 3. Type and Interface Naming
```typescript
// ✅ Good - Specific type names
type MessageId = string;
type ProviderId = string;
type SessionStatus = 'active' | 'inactive' | 'error';

// ✅ Good - Interface naming with I prefix
interface IChatService {
  sendMessage(sessionId: string, message: string): Promise<void>;
}

// ✅ Good - Generic type parameters with meaningful names
interface Repository<T, K = string> {
  findById(id: K): Promise<T | null>;
  save(entity: T): Promise<T>;
}

// ✅ Good - Union types with descriptive names
type ThemeMode = 'light' | 'dark' | 'auto';
type MessageRole = 'user' | 'assistant' | 'system';
```

## File Organization

### 1. Module Structure
```typescript
// Standard file structure
/**
 * Brief description of the module purpose
 *
 * @author Your Name
 * @since 1.0.0
 */

// 1. Imports (external first, then internal)
import { ref, computed } from 'vue';
import type { Ref, ComputedRef } from 'vue';
import vscode from 'vscode';
import { ILogService } from '../interfaces/ILogService';
import { Message } from '../types/message';

// 2. Type definitions and interfaces
interface SendMessageOptions {
  stream?: boolean;
  temperature?: number;
}

type MessageStatus = 'pending' | 'sent' | 'error';

// 3. Constants
const DEFAULT_TEMPERATURE = 0.7;
const MAX_RETRIES = 3;

// 4. Class or function implementation
export class ChatService implements IChatService {
  private readonly logService: ILogService;

  constructor(logService: ILogService) {
    this.logService = logService;
  }

  public async sendMessage(message: string): Promise<void> {
    // Implementation
  }
}

// 5. Exports
export type { SendMessageOptions, MessageStatus };
export { ChatService };
```

### 2. Component File Organization
```vue
<template>
  <!-- Template content -->
</template>

<script setup lang="ts">
// 1. Imports
import { ref, computed, onMounted } from 'vue';
import type { Ref } from 'vue';

// 2. Props and emits interface definitions
interface Props {
  modelValue: string;
  placeholder?: string;
  disabled?: boolean;
}

interface Emits {
  (e: 'update:modelValue', value: string): void;
  (e: 'submit', value: string): void;
}

// 3. Props and emits
const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Type a message...',
  disabled: false
});

const emit = defineEmits<Emits>();

// 4. Reactive state
const internalValue = ref(props.modelValue);
const isFocused = ref(false);

// 5. Computed properties
const canSubmit = computed(() => internalValue.value.trim().length > 0 && !props.disabled);

// 6. Methods
const handleSubmit = (): void => {
  if (canSubmit.value) {
    emit('submit', internalValue.value);
    internalValue.value = '';
  }
};

// 7. Lifecycle hooks
onMounted(() => {
  internalValue.value = props.modelValue;
});
</script>

<style scoped>
/* Component styles */
</style>
```

## Error Handling

### 1. Error Types
```typescript
// Define specific error types
export class ClaudeApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly response?: any
  ) {
    super(message);
    this.name = 'ClaudeApiError';
  }
}

export class ConfigurationError extends Error {
  constructor(message: string, public readonly configKey: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public readonly field: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
```

### 2. Error Handling Patterns
```typescript
// Service layer error handling
export class ClaudeAgentService {
  public async sendMessage(message: string): Promise<void> {
    try {
      await this.validateMessage(message);
      await this.transport.send(message);
    } catch (error) {
      // Transform and re-throw with context
      if (error instanceof ValidationError) {
        throw new ValidationError(`Invalid message: ${error.message}`, 'content');
      }

      if (error instanceof NetworkError) {
        throw new ClaudeApiError('Network connection failed', 0, error);
      }

      // Log unexpected errors
      this.logService.error('Unexpected error in sendMessage', error);
      throw new ClaudeApiError('Failed to send message', 500, error);
    }
  }

  private async validateMessage(message: string): Promise<void> {
    if (!message?.trim()) {
      throw new ValidationError('Message cannot be empty', 'content');
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      throw new ValidationError('Message too long', 'content');
    }
  }
}

// Component error handling
export default defineComponent({
  setup() {
    const error = ref<string | null>(null);
    const isLoading = ref(false);

    const sendMessage = async (message: string): Promise<void> => {
      error.value = null;
      isLoading.value = true;

      try {
        await chatService.sendMessage(message);
      } catch (err) {
        // Handle specific error types
        if (err instanceof ValidationError) {
          error.value = `Validation error: ${err.message}`;
        } else if (err instanceof ClaudeApiError) {
          error.value = `API error: ${err.message}`;
        } else {
          error.value = 'An unexpected error occurred';
        }
      } finally {
        isLoading.value = false;
      }
    };

    return { error, isLoading, sendMessage };
  }
});
```

### 3. Logging Standards
```typescript
// Structured logging
export class LogService implements ILogService {
  public info(message: string, context?: Record<string, any>): void {
    const logEntry = {
      level: 'info',
      message,
      context,
      timestamp: new Date().toISOString()
    };

    console.log(JSON.stringify(logEntry));
  }

  public error(message: string, error?: Error | unknown): void {
    const logEntry = {
      level: 'error',
      message,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error,
      timestamp: new Date().toISOString()
    };

    console.error(JSON.stringify(logEntry));
  }

  public debug(message: string, context?: Record<string, any>): void {
    if (process.env.NODE_ENV === 'development') {
      this.info(`[DEBUG] ${message}`, context);
    }
  }
}
```

## Testing Standards

### 1. Unit Testing
```typescript
// services/__tests__/ConfigService.test.ts
import { ConfigService } from '../ConfigService';
import { ILogService } from '../../interfaces/ILogService';

describe('ConfigService', () => {
  let configService: ConfigService;
  let mockLogService: jest.Mocked<ILogService>;

  beforeEach(() => {
    mockLogService = {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn()
    };

    configService = new ConfigService(mockLogService);
  });

  describe('get', () => {
    it('should return the correct value for existing key', () => {
      // Arrange
      const expectedValue = 'test-value';
      jest.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue({
        get: jest.fn().mockReturnValue(expectedValue),
        has: jest.fn().mockReturnValue(true),
        update: jest.fn()
      } as any);

      // Act
      const result = configService.get('test.key');

      // Assert
      expect(result).toBe(expectedValue);
    });

    it('should return default value for non-existing key', () => {
      // Arrange
      const defaultValue = 'default-value';
      jest.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue({
        get: jest.fn().mockReturnValue(undefined),
        has: jest.fn().mockReturnValue(false),
        update: jest.fn()
      } as any);

      // Act
      const result = configService.get('nonexistent.key', defaultValue);

      // Assert
      expect(result).toBe(defaultValue);
    });
  });
});
```

### 2. Component Testing
```typescript
// components/__tests__/MessageInput.test.ts
import { mount } from '@vue/test-utils';
import MessageInput from '../MessageInput.vue';

describe('MessageInput', () => {
  it('should emit submit event when send button is clicked', async () => {
    // Arrange
    const wrapper = mount(MessageInput, {
      props: {
        modelValue: 'Test message'
      }
    });

    // Act
    await wrapper.find('[data-testid="send-button"]').trigger('click');

    // Assert
    expect(wrapper.emitted('submit')).toBeTruthy();
    expect(wrapper.emitted('submit')?.[0]).toEqual(['Test message']);
  });

  it('should be disabled when disabled prop is true', () => {
    // Arrange
    const wrapper = mount(MessageInput, {
      props: {
        modelValue: '',
        disabled: true
      }
    });

    // Assert
    const input = wrapper.find('input');
    const button = wrapper.find('button');
    expect(input.attributes('disabled')).toBeDefined();
    expect(button.attributes('disabled')).toBeDefined();
  });
});
```

### 3. Integration Testing
```typescript
// integration/chatService.test.ts
import { ChatService } from '../../services/ChatService';
import { MockTransport } from '../mocks/MockTransport';

describe('ChatService Integration', () => {
  let chatService: ChatService;
  let mockTransport: MockTransport;

  beforeEach(async () => {
    mockTransport = new MockTransport();
    chatService = new ChatService(mockTransport);
    await chatService.initialize();
  });

  afterEach(async () => {
    await chatService.dispose();
  });

  it('should send message and receive response', async () => {
    // Arrange
    const message = 'Hello, Claude!';
    const expectedResponse = 'Hello! How can I help you?';
    mockTransport.setMockResponse(expectedResponse);

    // Act
    const response = await chatService.sendMessage(message);

    // Assert
    expect(response).toBe(expectedResponse);
    expect(mockTransport.lastSentMessage).toBe(message);
  });
});
```

## Documentation Standards

### 1. Code Documentation
```typescript
/**
 * Manages Claude API communication and session handling
 *
 * This service provides a high-level interface for interacting with Claude AI,
 * including message sending, session management, and error handling.
 *
 * @example
 * ```typescript
 * const agentService = new ClaudeAgentService(transport, sessionService);
 * await agentService.sendMessage('Hello, Claude!');
 * ```
 *
 * @since 1.0.0
 * @version 1.2.0
 */
export class ClaudeAgentService implements IClaudeAgentService {
  /**
   * Creates a new instance of ClaudeAgentService
   *
   * @param transport - Transport layer for API communication
   * @param sessionService - Service for managing chat sessions
   * @param logService - Service for logging operations
   */
  constructor(
    private readonly transport: ITransport,
    private readonly sessionService: IClaudeSessionService,
    private readonly logService: ILogService
  ) {}

  /**
   * Sends a message to Claude and returns the response
   *
   * @param message - The message content to send
   * @param options - Optional parameters for message sending
   * @param options.stream - Whether to stream the response
   * @param options.temperature - Sampling temperature (0.0 to 1.0)
   * @param options.maxTokens - Maximum number of tokens to generate
   *
   * @returns Promise that resolves to Claude's response
   *
   * @throws {ValidationError} When the message is invalid
   * @throws {ClaudeApiError} When the API request fails
   * @throws {NetworkError} When there's a network connectivity issue
   *
   * @example
   * ```typescript
   * const response = await agentService.sendMessage('Explain TypeScript', {
   *   temperature: 0.7,
   *   maxTokens: 1000
   * });
   * ```
   */
  public async sendMessage(
    message: string,
    options: SendMessageOptions = {}
  ): Promise<string> {
    // Implementation
  }
}
```

### 2. Interface Documentation
```typescript
/**
 * Defines the contract for configuration management services
 *
 * This interface provides methods for reading, writing, and monitoring
 * configuration values with type safety and event handling.
 *
 * @template T - Type of configuration values (defaults to any)
 */
export interface IConfigurationService<T = any> {
  /**
   * Retrieves a configuration value by key
   *
   * @param key - Configuration key (supports dot notation)
   * @param defaultValue - Value to return if key doesn't exist
   * @returns Configuration value or default
   *
   * @example
   * ```typescript
   * const apiKey = configService.get('claude.apiKey', '');
   * const temperature = configService.get('claude.temperature', 0.7);
   * ```
   */
  get<K extends keyof T>(key: K, defaultValue?: T[K]): T[K];

  /**
   * Sets a configuration value
   *
   * @param key - Configuration key (supports dot notation)
   * @param value - Value to set
   * @returns Promise that resolves when the value is persisted
   *
   * @example
   * ```typescript
   * await configService.set('claude.apiKey', 'sk-ant-api...');
   * await configService.set('user.preferences.theme', 'dark');
   * ```
   */
  set<K extends keyof T>(key: K, value: T[K]): Promise<void>;

  /**
   * Event that fires when a configuration value changes
   *
   * @param key - The key that changed
   * @param listener - Callback function
   * @returns Disposable to remove the listener
   *
   * @example
   * ```typescript
   * const disposable = configService.onDidChange('claude.apiKey', (newValue) => {
   *   console.log('API key changed:', newValue);
   * });
   *
   * // Later, to remove the listener:
   * disposable.dispose();
   * ```
   */
  onDidChange<K extends keyof T>(
    key: K,
    listener: (value: T[K]) => void
  ): vscode.Disposable;
}
```

## Git Workflow

### 1. Branch Naming
```bash
# Feature branches
feature/chat-interface-redesign
feature/mcp-integration
feature/multi-provider-support

# Bug fix branches
fix/message-history-not-loading
fix/api-key-validation-error

# Release branches
release/v1.2.0
release/v1.2.1

# Hotfix branches
hotfix/critical-security-patch
hotfix/api-breakage-fix
```

### 2. Commit Message Format
```bash
# Format: <type>(<scope>): <description>

# Types: feat, fix, docs, style, refactor, test, chore

# Examples
feat(chat): add message streaming support
fix(config): resolve API key validation issue
docs(readme): update installation instructions
test(services): add integration tests for chat service
refactor(di): simplify service registration
style(components): fix linting errors
chore(deps): update vue to v3.5.0
```

### 3. Pull Request Template
```markdown
## Description
Brief description of the changes made

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project standards
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated

## Screenshots (if applicable)
Add screenshots to help explain your changes

## Additional Notes
Any additional context or considerations
```

These code standards ensure consistency, maintainability, and quality across the CCVN codebase. Following these standards helps new developers understand the codebase quickly and maintain high-quality code throughout the project's lifecycle.