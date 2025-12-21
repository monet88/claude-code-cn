# Codebase Summary - CCVN (Claude Code Vietnam)

## Project Overview

CCVN is a comprehensive Visual Studio Code extension that integrates Claude Code directly into the VS Code environment. The project provides a native chat interface, multi-provider support, and extensive configuration options for Claude AI interaction.

## Technology Stack

### Backend (Extension Core)
- **TypeScript** - Main language with strict mode enabled
- **VS Code Extension API** - Core VS Code integration
- **Dependency Injection** - Custom DI framework for service management
- **Anthropic SDK** - Official Claude API integration
- **MCP SDK** - Model Context Protocol support

### Frontend (WebView UI)
- **Vue 3** - Reactive UI framework
- **Pinia** - State management
- **Tailwind CSS** - Utility-first styling
- **Lexical** - Rich text editor
- **Motion-V** - Animation library

### Development Tools
- **Vite** - Build tool and dev server
- **ESBuild** - Fast TypeScript compilation
- **Vitest** - Testing framework
- **ESLint/Prettier** - Code formatting and linting

## Architecture Overview

### 1. Entry Point
- **`src/extension.ts`** - Main extension activation and service orchestration

### 2. Dependency Injection Framework
- **`src/di/`** - Custom DI implementation
  - `instantiationService.ts` - Core DI container
  - `instantiationServiceBuilder.ts` - Builder pattern for service registration
  - `descriptors.ts` - Service descriptors and lifecycle management
  - `serviceCollection.ts` - Service collection management

### 3. Services Layer (`src/services/`)
#### Core Services
- **`logService.ts`** - Centralized logging
- **`configurationService.ts`** - VS Code settings management
- **`fileSystemService.ts`** - File system operations
- **`workspaceService.ts`** - Workspace management
- **`terminalService.ts`** - Terminal integration
- **`notificationService.ts`** - User notifications
- **`dialogService.ts`** - Modal dialogs
- **`webViewService.ts`** - WebView lifecycle management

#### Claude Integration Services (`src/services/claude/`)
- **`ClaudeAgentService.ts`** - Main Claude interaction service
- **`ClaudeSdkService.ts`** - SDK wrapper service
- **`ClaudeSessionService.ts`** - Session management
- **`transport/`** - Communication layer
  - `BaseTransport.ts` - Abstract transport interface
  - `VSCodeTransport.ts` - VS Code specific transport
  - `AsyncStream.ts` - Async stream handling
- **`handlers/`** - Claude response handlers

#### Configuration Management Services
- **`claudeSettingsService.ts`** - Claude-specific settings
- **`ccSwitchSettingsService.ts`** - Multi-provider configuration
- **`agentConfigService.ts`** - Agent configuration management
- **`skillService.ts`** - Skills management
- **`commandConfigService.ts`** - Commands management
- **`outputStyleConfigService.ts`** - Output style configuration
- **`mcpService.ts`** - MCP server management
- **`usageStatisticsService.ts`** - Usage tracking

### 4. WebView Application (`src/webview/`)
#### Main Application
- **`src/App.vue`** - Root component with page routing
- **`src/main.ts`** - Vue application bootstrap
- **`src/index.html`** - WebView HTML template

#### Pages (`src/webview/src/pages/`)
- **`ChatPage.vue`** - Main chat interface
- **`SessionsPage.vue`** - Session management
- **`SettingsPage.vue`** - Configuration interface

#### Components (`src/webview/src/components/`)
- **`Messages/`** - Chat message components
- **`Dropdown/`** - Reusable dropdown components
- **Forms and dialogs** - Various UI components
- **File handling** - File preview and editing

#### State Management (`src/webview/src/stores/`)
- **`themeStore.ts`** - Theme management
- **`providerStore.ts`** - Provider configuration
- **`skillStore.ts`** - Skills state
- **`mcpStore.ts`** - MCP server state
- **`usageStore.ts`** - Usage statistics
- **`toastStore.ts`** - Notification management

#### Utilities (`src/webview/src/utils/`)
- **`vscodeApi.ts`** - VS Code API wrapper
- **`messageUtils.ts`** - Message handling utilities
- **`events.ts`** - Event management
- **`KeybindingManager.ts`** - Keyboard shortcuts

### 5. Shared Types (`src/shared/`)
- **`messages.ts`** - Message type definitions
- **`types/`** - Shared TypeScript interfaces
  - `skill.ts` - Skill types
  - `agent.ts` - Agent types
  - `command.ts` - Command types
  - `outputStyle.ts` - Output style types
  - `mcp.ts` - MCP types

### 6. Base Utilities (`src/base/`)
- **Utility functions** - Common utilities (arrays, collections, async, etc.)
- **Event handling** - Event system utilities
- **Lifecycle management** - Disposable pattern implementation

## Key Features Implementation

### 1. Multi-Provider Support
- Dynamic provider configuration
- Runtime provider switching
- Environment variable overlay system
- Connection testing and validation

### 2. MCP Integration
- MCP server discovery and management
- Tool integration and execution
- Permission management
- Server health monitoring

### 3. Rich Chat Interface
- Real-time streaming responses
- File attachment support
- Code block syntax highlighting
- Tool execution visualization
- Message history management

### 4. Configuration Management
- Hierarchical settings (global/workspace)
- Agent configuration system
- Skills and commands management
- Output style customization
- Import/export functionality

### 5. Session Management
- Persistent chat sessions
- Session metadata tracking
- Multi-session support
- Session search and filtering

### 6. Usage Statistics
- Token usage tracking
- Cost calculation
- Project-based statistics
- Historical usage data

## Build and Development Workflow

### Development Commands
```bash
# Start development with hot reload
pnpm run dev

# Build for production
pnpm run build

# Type checking
pnpm run typecheck:all

# Testing
pnpm run test

# Linting and formatting
pnpm run lint
pnpm run format

# Package extension
pnpm run pack
```

### Build Process
1. **Webview Build** - Vue application compiled to static assets
2. **Extension Build** - TypeScript compiled with ESBuild
3. **Package** - VSIX package generation

### File Structure After Build
```
dist/
├── extension.cjs          # Compiled extension
├── webview/               # Vue application assets
│   ├── assets/           # CSS and JS bundles
│   └── index.html        # WebView HTML
└── media/                # Static assets (icons, etc.)
```

## Configuration System

### Extension Settings
- **Selected Model** - Default AI model
- **Environment Variables** - Claude environment settings
- **Providers** - Multi-provider configuration

### Internal Configuration
- **Workspace-specific settings** - Project-level configuration
- **Global settings** - User-level configuration
- **Session data** - Chat history and metadata
- **Statistics data** - Usage tracking

## Security Considerations

### API Key Management
- Encrypted storage for API keys
- Environment variable isolation
- Provider-specific credential handling

### Permission System
- Tool execution permissions
- File access controls
- MCP server sandboxing

### Data Privacy
- Local-only configuration storage
- No telemetry data collection (opt-in)
- User data encryption

## Performance Optimizations

### Streaming Architecture
- Real-time response streaming
- Chunk-based message processing
- Back-pressure handling

### Resource Management
- Lazy loading of components
- Efficient DI container usage
- Memory leak prevention

### UI Performance
- Virtual scrolling for long chat histories
- Debounced input handling
- Optimistic UI updates

This codebase represents a sophisticated VS Code extension with enterprise-grade architecture, comprehensive configuration management, and a modern web-based user interface.