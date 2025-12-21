# CCVN - Claude Code Vietnam

[![Version](https://img.shields.io/badge/version-1.2.0-blue.svg)](https://github.com/zhukunpenglinyutong/mintlify-docs)
[![License](https://img.shields.io/badge/license-AGPL--3.0-green.svg)](LICENSE)
[![VS Code](https://img.shields.io/badge/VS%20Code-1.98.0+-blue.svg)](https://code.visualstudio.com/)

**CCVN** là một Visual Studio Code extension tích hợp Claude Code trực tiếp vào môi trường phát triển, cung cấp giao diện chat thông minh, hỗ trợ nhiều nhà cung cấp và quản lý cấu hình toàn diện.

> English version available below

## 🌟 Tính năng chính

### 💬 Chat Interface Tích hợp
- Giao diện chat trực tiếp trong VS Code sidebar
- Hỗ trợ streaming response real-time
- Quản lý nhiều phiên chat đồng thời
- Lịch sử trò chuyện tự động

### 🔄 Multi-Provider Support
- Hỗ trợ nhiều nhà cung cấp Claude API
- Chuyển đổi provider ngay lập tức
- Kiểm tra kết nối và xác thực provider
- Quản lý cấu hình riêng cho từng provider

### ⚙️ Quản lý Cấu hình Toàn diện
- Cấu hình phân cấp (global/workspace/project)
- Agent configuration management
- Skills và commands management
- Output style customization
- Import/export functionality

### 🔧 MCP Integration
- Model Context Protocol (MCP) support
- Quản lý MCP server
- Tool execution với permission system
- Server health monitoring

### 📊 Usage Statistics
- Theo dõi token usage
- Tính chi phí API tự động
- Thống kê theo project
- Export usage data

## 🚀 Cài đặt

### Từ VS Code Marketplace
1. Mở VS Code
2. Nhấn `Ctrl+Shift+X` (Windows/Linux) hoặc `Cmd+Shift+X` (macOS)
3. Tìm kiếm "CCVN" hoặc "Claude Code Vietnam"
4. Click Install

### Manual Installation
```bash
# Clone repository
git clone https://github.com/zhukunpenglinyutong/mintlify-docs.git claude-code-cn

# Navigate to directory
cd claude-code-cn

# Install dependencies
npm install

# Build extension
npm run build

# Install extension
code --install-extension *.vsix
```

## 📖 Sử dụng

### Cấu hình ban đầu
1. Mở VS Code
2. Nhấn `Ctrl+Shift+P` và tìm "CCVN: Show Chat"
3. Click icon CCVN trong Activity Bar
4. Configure provider đầu tiên:
   - Nhấn Settings icon
   - Add Provider
   - Nhập API key và base URL
   - Save và switch sang provider mới

### Basic Usage
1. **Chat với Claude**: Gõ câu hỏi vào input box và nhấn Enter
2. **Sessions**: Xem và quản lý các phiên chat cũ
3. **Settings**: Cấu hình providers, agents, skills, và output styles
4. **File Attachment**: Kéo thả file vào chat để tham chiếu

### Keyboard Shortcuts
- `Ctrl/Cmd + Shift + P` → "CCVN: Show Chat": Mở chat interface
- `Ctrl/Cmd + Enter`: Gửi message trong chat
- `Ctrl/Cmd + /`: Toggle command suggestions

## 🛠️ Development

### Requirements
- Node.js 18+
- VS Code 1.98.0+
- pnpm (recommended) hoặc npm/yarn

### Setup Development Environment
```bash
# Clone repository
git clone https://github.com/zhukunpenglinyutong/mintlify-docs.git claude-code-cn
cd claude-code-cn

# Install dependencies
pnpm install

# Start development with hot reload
pnpm run dev

# Build for production
pnpm run build

# Run tests
pnpm run test

# Type checking
pnpm run typecheck:all

# Linting
pnpm run lint
pnpm run lint:fix

# Package extension
pnpm run pack
```

### Project Structure
```
src/
├── extension.ts              # Entry point
├── di/                      # Dependency injection framework
├── services/                # Service layer
│   ├── claude/              # Claude integration services
│   ├── logService.ts        # Logging service
│   ├── configurationService.ts  # Configuration management
│   └── ...
├── shared/                  # Shared types and interfaces
├── webview/                 # Vue 3 frontend application
│   ├── src/
│   │   ├── pages/           # Page components
│   │   ├── components/      # Reusable components
│   │   ├── stores/          # Pinia state management
│   │   └── utils/           # Utility functions
│   └── index.html
└── base/                    # Base utilities and types
```

### Key Technologies
- **Backend**: TypeScript, VS Code Extension API
- **Frontend**: Vue 3, Pinia, Tailwind CSS, Lexical
- **Build**: Vite, ESBuild
- **Testing**: Vitest
- **Linting**: ESLint, Prettier

## 📚 Documentation

- [Project Overview & PDR](./docs/project-overview-pdr.md) - Tổng quan dự án và yêu cầu phát triển
- [Code Standards](./docs/code-standards.md) - Tiêu chuẩn coding và conventions
- [System Architecture](./docs/system-architecture.md) - Kiến trúc hệ thống chi tiết
- [Codebase Summary](./docs/codebase-summary.md) - Tóm tắt cấu trúc codebase

## 🔧 Configuration

### Extension Settings
```json
{
  "claudecodecn.selectedModel": "claude-3-sonnet-20241022",
  "claudecodecn.environmentVariables": [
    {
      "name": "ANTHROPIC_DEFAULT_MODEL",
      "value": "claude-3-sonnet-20241022"
    }
  ],
  "claudecodecn.providers": [
    {
      "id": "anthropic-official",
      "name": "Anthropic Official",
      "apiKey": "your-api-key",
      "baseUrl": "https://api.anthropic.com",
      "isActive": true,
      "mainModel": "claude-3-sonnet-20241022",
      "haikuModel": "claude-3-haiku-20240307"
    }
  ]
}
```

### Claude Settings File
Extension sẽ tự động quản lý file `~/.claude/settings.json` cho provider active.

### Workspace Configuration
Project-specific configuration được lưu trong `.vscode/settings.json`:

```json
{
  "claudecodecn": {
    "projectName": "My Project",
    "agentConfig": "custom-agent",
    "skills": ["frontend", "backend"],
    "outputStyle": "detailed"
  }
}
```

## 🤝 Contributing

Chúng tôi welcome contributions! Hãy follow steps sau:

1. Fork repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes của bạn (`git commit -m 'Add amazing feature'`)
4. Push đến branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Development Guidelines
- Follow [Code Standards](./docs/code-standards.md)
- Add tests cho new features
- Update documentation khi cần
- Ensure all tests pass
- Follow commit message format: `type(scope): description`

## 🐛 Troubleshooting

### Common Issues

#### Extension không load
1. Kiểm tra VS Code version (requires 1.98.0+)
2. Restart VS Code
3. Disable các extensions xung đột
4. Check Developer Console logs

#### API connection issues
1. Verify API key validity
2. Check base URL format
3. Test connection trong settings
4. Check network connectivity

#### Performance issues
1. Clear chat history nếu quá dài
2. Disable unused MCP servers
3. Reduce message history limit
4. Check memory usage trong Task Manager

### Getting Help
- [GitHub Issues](https://github.com/zhukunpenglinyutong/mintlify-docs/issues) - Bug reports và feature requests
- [Discussions](https://github.com/zhukunpenglinyutong/mintlify-docs/discussions) - Questions và discussions
- [Documentation](./docs/) - Detailed documentation

## 📄 License

Project này được licensed dưới AGPL-3.0 License. Xem file [LICENSE](LICENSE) để biết chi tiết.

## 🙏 Acknowledgments

- [Claude Code](https://github.com/anthropics/claude-code) - Original Claude Code project
- [Anthropic](https://anthropic.com/) - Claude API provider
- [VS Code](https://code.visualstudio.com/) - Extension platform
- [Vue.js](https://vuejs.org/) - Frontend framework
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework

---

# English Version

# CCVN - Claude Code Vietnam

[![Version](https://img.shields.io/badge/version-1.2.0-blue.svg)](https://github.com/zhukunpenglinyutong/mintlify-docs)
[![License](https://img.shields.io/badge/license-AGPL--3.0-green.svg)](LICENSE)
[![VS Code](https://img.shields.io/badge/VS%20Code-1.98.0+-blue.svg)](https://code.visualstudio.com/)

**CCVN** is a Visual Studio Code extension that integrates Claude Code directly into the development environment, providing an intelligent chat interface, multi-provider support, and comprehensive configuration management.

## 🌟 Key Features

### 💬 Integrated Chat Interface
- Native chat interface in VS Code sidebar
- Real-time streaming responses
- Multiple concurrent chat sessions
- Automatic chat history

### 🔄 Multi-Provider Support
- Support for multiple Claude API providers
- Instant provider switching
- Connection testing and validation
- Individual provider configuration

### ⚙️ Comprehensive Configuration Management
- Hierarchical configuration (global/workspace/project)
- Agent configuration management
- Skills and commands management
- Output style customization
- Import/export functionality

### 🔧 MCP Integration
- Model Context Protocol (MCP) support
- MCP server management
- Tool execution with permission system
- Server health monitoring

### 📊 Usage Statistics
- Token usage tracking
- Automatic cost calculation
- Project-based statistics
- Usage data export

## 🚀 Installation

### From VS Code Marketplace
1. Open VS Code
2. Press `Ctrl+Shift+X` (Windows/Linux) or `Cmd+Shift+X` (macOS)
3. Search for "CCVN" or "Claude Code Vietnam"
4. Click Install

### Manual Installation
```bash
# Clone repository
git clone https://github.com/zhukunpenglinyutong/mintlify-docs.git claude-code-cn

# Navigate to directory
cd claude-code-cn

# Install dependencies
npm install

# Build extension
npm run build

# Install extension
code --install-extension *.vsix
```

## 📖 Usage

### Initial Setup
1. Open VS Code
2. Press `Ctrl+Shift+P` and search "CCVN: Show Chat"
3. Click the CCVN icon in Activity Bar
4. Configure your first provider:
   - Click Settings icon
   - Add Provider
   - Enter API key and base URL
   - Save and switch to the new provider

### Basic Usage
1. **Chat with Claude**: Type your question in the input box and press Enter
2. **Sessions**: View and manage previous chat sessions
3. **Settings**: Configure providers, agents, skills, and output styles
4. **File Attachment**: Drag and drop files into chat for reference

### Keyboard Shortcuts
- `Ctrl/Cmd + Shift + P` → "CCVN: Show Chat": Open chat interface
- `Ctrl/Cmd + Enter`: Send message in chat
- `Ctrl/Cmd + /`: Toggle command suggestions

## 🛠️ Development

### Requirements
- Node.js 18+
- VS Code 1.98.0+
- pnpm (recommended) or npm/yarn

### Setup Development Environment
```bash
# Clone repository
git clone https://github.com/zhukunpenglinyutong/mintlify-docs.git claude-code-cn
cd claude-code-cn

# Install dependencies
pnpm install

# Start development with hot reload
pnpm run dev

# Build for production
pnpm run build

# Run tests
pnpm run test

# Type checking
pnpm run typecheck:all

# Linting
pnpm run lint
pnpm run lint:fix

# Package extension
pnpm run pack
```

### Project Structure
```
src/
├── extension.ts              # Entry point
├── di/                      # Dependency injection framework
├── services/                # Service layer
│   ├── claude/              # Claude integration services
│   ├── logService.ts        # Logging service
│   ├── configurationService.ts  # Configuration management
│   └── ...
├── shared/                  # Shared types and interfaces
├── webview/                 # Vue 3 frontend application
│   ├── src/
│   │   ├── pages/           # Page components
│   │   ├── components/      # Reusable components
│   │   ├── stores/          # Pinia state management
│   │   └── utils/           # Utility functions
│   └── index.html
└── base/                    # Base utilities and types
```

### Key Technologies
- **Backend**: TypeScript, VS Code Extension API
- **Frontend**: Vue 3, Pinia, Tailwind CSS, Lexical
- **Build**: Vite, ESBuild
- **Testing**: Vitest
- **Linting**: ESLint, Prettier

## 📚 Documentation

- [Project Overview & PDR](./docs/project-overview-pdr.md) - Project overview and development requirements
- [Code Standards](./docs/code-standards.md) - Coding standards and conventions
- [System Architecture](./docs/system-architecture.md) - Detailed system architecture
- [Codebase Summary](./docs/codebase-summary.md) - Codebase structure summary

## 🔧 Configuration

### Extension Settings
```json
{
  "claudecodecn.selectedModel": "claude-3-sonnet-20241022",
  "claudecodecn.environmentVariables": [
    {
      "name": "ANTHROPIC_DEFAULT_MODEL",
      "value": "claude-3-sonnet-20241022"
    }
  ],
  "claudecodecn.providers": [
    {
      "id": "anthropic-official",
      "name": "Anthropic Official",
      "apiKey": "your-api-key",
      "baseUrl": "https://api.anthropic.com",
      "isActive": true,
      "mainModel": "claude-3-sonnet-20241022",
      "haikuModel": "claude-3-haiku-20240307"
    }
  ]
}
```

### Claude Settings File
The extension automatically manages the `~/.claude/settings.json` file for the active provider.

### Workspace Configuration
Project-specific configuration is stored in `.vscode/settings.json`:

```json
{
  "claudecodecn": {
    "projectName": "My Project",
    "agentConfig": "custom-agent",
    "skills": ["frontend", "backend"],
    "outputStyle": "detailed"
  }
}
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow the [Code Standards](./docs/code-standards.md)
- Add tests for new features
- Update documentation when needed
- Ensure all tests pass
- Follow commit message format: `type(scope): description`

## 🐛 Troubleshooting

### Common Issues

#### Extension not loading
1. Check VS Code version (requires 1.98.0+)
2. Restart VS Code
3. Disable conflicting extensions
4. Check Developer Console logs

#### API connection issues
1. Verify API key validity
2. Check base URL format
3. Test connection in settings
4. Check network connectivity

#### Performance issues
1. Clear chat history if too long
2. Disable unused MCP servers
3. Reduce message history limit
4. Check memory usage in Task Manager

### Getting Help
- [GitHub Issues](https://github.com/zhukunpenglinyutong/mintlify-docs/issues) - Bug reports and feature requests
- [Discussions](https://github.com/zhukunpenglinyutong/mintlify-docs/discussions) - Questions and discussions
- [Documentation](./docs/) - Detailed documentation

## 📄 License

This project is licensed under the AGPL-3.0 License. See the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Claude Code](https://github.com/anthropics/claude-code) - Original Claude Code project
- [Anthropic](https://anthropic.com/) - Claude API provider
- [VS Code](https://code.visualstudio.com/) - Extension platform
- [Vue.js](https://vuejs.org/) - Frontend framework
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework