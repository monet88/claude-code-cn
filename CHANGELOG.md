# Changelog

All notable changes to CCVN (Claude Code VN) will be documented in this file.

## [2.0.1] - 2024-12-23

### 🐛 Bug Fix
- **macOS slash command loading**: Fixed issue where slash commands wouldn't load on macOS
- Changed `process.env.HOME` to `os.homedir()` in `ClaudeSdkService.ts` for cross-platform compatibility
- Used `path.join()` instead of string concatenation for reliable path handling

## [2.0.0] - 2024-12-23

### 🎨 Theme Sync with IDE
- **Background color sync**: Extension background now automatically matches VSCode editor background color
- Updated `theme-variables.css` to use VSCode CSS variables (`--vscode-*`) instead of hardcoded colors
- Both dark and light themes now dynamically sync with IDE theme

### 🖌️ Improved Diff Display
- Code diff now uses VSCode's native diff editor colors:
  - Deleted lines use `--vscode-diffEditor-removedLineBackground` (red background)
  - Added lines use `--vscode-diffEditor-insertedLineBackground` (green background)
- Diff display matches VSCode's built-in diff viewer appearance

### 📦 Files Changed
- `src/webview/src/styles/theme-variables.css` - VSCode variable integration
- `src/webview/src/styles/claude-theme.css` - Body styles update
- `src/webview/src/App.vue` - App wrapper background
- `src/webview/src/pages/ChatPage.vue` - Transparent backgrounds
- `src/webview/src/components/Messages/blocks/tools/Edit.vue` - Diff colors
- `src/webview/src/components/Messages/blocks/tools/MultiEdit.vue` - Diff colors

## [1.6.0] - 2024-12-22

### ✨ UI Refinements
- Dropdown width matches container (full input width)
- Reduced max-height 320px → 200px for cleaner dropdown
- Typography: Added JetBrains Mono, reduced font sizes (13px → 12px)
- ModelSelect refactored to support mainModel + truncate long ID
- Added `.bv/` to gitignore

## [1.5.0] - Previous

- Initial release with core functionality
- Chat interface with Claude AI
- File editing and multi-edit support
- Permission management system
- Session management
