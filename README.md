# CCVN - Claude Code Vietnam

[![VS Code](https://img.shields.io/badge/VS%20Code-1.98.0+-blue.svg)](https://code.visualstudio.com/)

**CCVN** là một Visual Studio Code extension tích hợp Claude Code trực tiếp vào môi trường phát triển, cung cấp giao diện chat thông minh, hỗ trợ nhiều nhà cung cấp và quản lý cấu hình toàn diện.

## 🌟 Tính năng chính

### 💬 Chat Interface
- Giao diện chat trực tiếp trong VS Code sidebar
- Streaming response real-time
- Quản lý nhiều phiên chat đồng thời
- Lịch sử trò chuyện tự động lưu

### 🔄 Multi-Provider Support
- Hỗ trợ nhiều nhà cung cấp Claude API (Anthropic, OpenRouter, v.v.)
- Chuyển đổi provider nhanh chóng
- Kiểm tra kết nối và xác thực
- Cấu hình model riêng cho từng provider

### ⚙️ Quản lý Cấu hình
- Agent configuration management
- Skills và Commands management
- Hỗ trợ nested commands (commands trong thư mục con)
- Output style customization
- Import/export settings

### 🔧 MCP Integration
- Model Context Protocol (MCP) support
- Quản lý MCP servers
- Tool execution với permission system

### 📊 Usage Statistics
- Theo dõi token usage
- Tính chi phí API tự động
- Thống kê theo project

---

## 📖 Hướng dẫn sử dụng

### Bắt đầu
1. Mở VS Code
2. Click icon **CCVN** trong Activity Bar (sidebar trái)
3. Hoặc nhấn `Ctrl+Shift+P` → tìm "CCVN: Show Chat"

### Cấu hình Provider
1. Click icon ⚙️ (Settings) trong chat interface
2. Chọn tab **Providers**
3. Click **Add Provider**
4. Nhập thông tin:
   - **Name**: Tên provider (ví dụ: "OpenRouter")
   - **API Key**: API key của bạn
   - **Base URL**: URL của API (ví dụ: `https://openrouter.ai/api/v1`)
   - **Models**: Chọn model cho Opus/Sonnet/Haiku
5. Click **Save** và **Activate**

### Chat với Claude
1. Gõ câu hỏi vào input box
2. Nhấn **Enter** hoặc click nút gửi
3. Chờ response streaming

### Đính kèm file
- Kéo thả file vào chat window
- Hoặc click icon 📎 để chọn file
- Claude sẽ phân tích nội dung file

### Slash Commands
- Gõ `/` để xem danh sách commands
- Commands hỗ trợ nested folders: `/sc:my-command`
- Quản lý commands trong Settings → Commands

### Keyboard Shortcuts
| Phím | Chức năng |
|------|-----------|
| `Ctrl+Shift+P` → "CCVN" | Mở chat |
| `Enter` | Gửi message |
| `Shift+Tab` | Chuyển permission mode |
| `/` | Hiện slash commands |

### Permission Modes
- **Accept Edits**: Tự động chấp nhận file edits
- **Default**: Hỏi xác nhận cho các thao tác quan trọng
- **Plan**: Chỉ lên kế hoạch, không thực thi

### Sessions
- Click icon ☰ (menu) để xem danh sách sessions
- Mỗi conversation được lưu tự động
- Click vào session để tiếp tục cuộc trò chuyện

---

## 🐛 Xử lý sự cố

### Extension không hoạt động
- Kiểm tra VS Code version ≥ 1.98.0
- Restart VS Code
- Kiểm tra Developer Console (`Ctrl+Shift+I`) để xem lỗi

### Không kết nối được API
- Kiểm tra API key còn hợp lệ
- Kiểm tra Base URL đúng format
- Test connection trong Settings → Providers

### Chat không response
- Kiểm tra provider đang active
- Kiểm tra model được chọn
- Xem logs trong Output panel → CCVN

---

## 🙏 Credits

- [Claude Code](https://github.com/anthropics/claude-code) - Original project
- [Anthropic](https://anthropic.com/) - Claude AI

---

# English

**CCVN** is a Visual Studio Code extension that integrates Claude Code directly into your development environment.

## Features
- 💬 Native chat interface in VS Code
- 🔄 Multiple API providers support
- ⚙️ Commands & Skills management
- 🔧 MCP (Model Context Protocol) integration
- 📊 Usage statistics & cost tracking

## Quick Start
1. Click the **CCVN** icon in Activity Bar
2. Configure your provider in Settings
3. Start chatting with Claude

## Usage
- Type your message and press Enter
- Drag & drop files to attach
- Use `/` for slash commands
- Use `Shift+Tab` to toggle permission mode

## Troubleshooting
- Check VS Code version ≥ 1.98.0
- Verify API key and Base URL
- Check Developer Console for errors
