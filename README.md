<h2 align="center">
	<img src="https://claudecodecn-1253302184.cos.ap-beijing.myqcloud.com/vscode/claude-logo.png" height="64">
	<br>Claude Code CN
</h2>
<p align="center"><strong>
Unofficial, community‑driven Claude Code experience for VS Code, inspired by VibeCoding.
</strong></p>

This project aims to provide a smooth Claude‑driven coding experience inside VS Code, optimized for Chinese developers but fully usable in any locale. It focuses on practical workflows (chat, edit, refactor, tools) rather than just being a thin chat wrapper, and tries to stay lightweight, hackable, and easy to extend.

## Project Background
This extension is built on top of the open source project [Claudix](https://github.com/Haleclipse/Claudix) and reuses some of its ideas, together with the cc-switch project and the ccr / spec-kit ecosystem.

The project is licensed under AGPL 3.0. Please make sure your usage and redistribution comply with the license.

If you find this useful, please also consider giving a Star to [Claudix](https://github.com/Haleclipse/Claudix) and related upstream projects.

---

## Download & Changelog

> Latest VSIX: [claude-code-cn-1.0.5.vsix (download)](https://claudecodecn-1253302184.cos.ap-beijing.myqcloud.com/vscode/v1.0.5/claude-code-cn-1.0.5.vsix)

- 2025‑12‑01 (v1.0.5)
  - [x] P0: Add Skills view / panel (experimental)
<img width="350px" src="https://claudecodecn-1253302184.cos.ap-beijing.myqcloud.com/vscode/v1.0.5/2.png" />
  - [x] P1: UX polish and small improvements
<img width="350px" src="https://claudecodecn-1253302184.cos.ap-beijing.myqcloud.com/vscode/v1.0.5/1.png" />

- 2025‑11‑25 (v1.0.4)
  - [x] Add MCP support (sequential thinking, web search, local context, etc.)
  - [x] Support @ mentions to quickly call tools / skills
  - [x] Fix several Windows‑specific path and encoding issues
<img width="350px" src="https://claudecodecn-1253302184.cos.ap-beijing.myqcloud.com/vscode/v1.0.4/2.png" />

- 2025‑11‑24 (v1.0.3)
  - [x] Support the claude-opus-4-5 model
  - [x] Improve conversation rendering and context handling, fix several stability bugs
<img width="350px" src="https://claudecodecn-1253302184.cos.ap-beijing.myqcloud.com/vscode/v1.0.3/1.png" />

- 2025‑11‑18 (v1.0.2)
  - Update README and basic documentation, improve onboarding experience

- 2025‑11‑18 (v1.0.1)
  - Add more model / provider options
  - Improve provider configuration and error handling
  - Fix multiple UI and interaction bugs
<img width="350px" src="https://claudecodecn-1253302184.cos.ap-beijing.myqcloud.com/vscode/8.png" />

- v1.0.0 (2025‑11‑18)
  - Initial release

---

## Screenshots

Chat panel

<img width="300px" src="https://claudecodecn-1253302184.cos.ap-beijing.myqcloud.com/vscode/1.png" />

Inline / side‑by‑side code assist

<img width="350px" src="https://claudecodecn-1253302184.cos.ap-beijing.myqcloud.com/vscode/2.png" />

Multi‑step refactor / edit workflow

<img width="350px" src="https://claudecodecn-1253302184.cos.ap-beijing.myqcloud.com/vscode/3.png" />

Provider & model management

<img width="500px" src="https://claudecodecn-1253302184.cos.ap-beijing.myqcloud.com/vscode/4.png" />

Settings & configuration

<img width="500px" src="https://claudecodecn-1253302184.cos.ap-beijing.myqcloud.com/vscode/5.png" />

Skills / tools entry

<img width="350px" src="https://claudecodecn-1253302184.cos.ap-beijing.myqcloud.com/vscode/7.png" />

Additional views

<img width="350px" src="https://claudecodecn-1253302184.cos.ap-beijing.myqcloud.com/vscode/8.png" />

MCP tools

<img width="350px" src="https://claudecodecn-1253302184.cos.ap-beijing.myqcloud.com/vscode/v1.0.4/2.png" />

<img width="350px" src="https://claudecodecn-1253302184.cos.ap-beijing.myqcloud.com/vscode/v1.0.4/1.png" />

---

## Design Goals & Positioning

### 1. Who is this for?

Primarily for developers who like Claude as their main coding assistant and prefer a simple, VS Code‑native workflow with local configuration and flexible providers.

### 2. Relationship to official Claude Code and other tools

The official Claude Code extension for VS Code is great for many users, but this project focuses more on being hackable and provider‑agnostic. If you need a full IDE‑level experience similar to Cursor, Augment, Trae, Copilot, [Claudia](https://claudia.so/), or [Opcode](https://opcode.sh/), those tools may be better fit. This extension instead aims to be a lightweight, open source alternative that you can inspect and customize.

### 3. Multi‑provider & routing

The project is intentionally not bound to a single model. You can route requests to Claude and also to other LLM providers (for example GLM etc.) via the underlying switching layer.

GitHub project: [cc-switch](https://github.com/farion1231/cc-switch) is used as the base for provider switching, routing, and configuration. If you like this capability, please also support [cc-switch](https://github.com/farion1231/cc-switch) with a Star.

<img width="500px" src="https://claudecodecn-1253302184.cos.ap-beijing.myqcloud.com/vscode/6.png" />

### 4. Relationship with Opcode / other Claude‑style projects

Highly recommended: check out [Opcode](https://opcode.sh/), which provides a very polished Claude‑style coding experience. This project borrows ideas from that ecosystem; if you like it, please also give [Opcode](https://opcode.sh/) a Star.

<img width="350px" src="https://claudecodecn-1253302184.cos.ap-beijing.myqcloud.com/vscode/7.png" />

### 5. Roadmap

More skills, better multi‑tool orchestration, deeper editor integration, and more providers are planned. Ideas and PRs are very welcome.

---

## Development

`sh
# Install dependencies
pnpm i

# Build and package .vsix
pnpm run pack
`

---

## Acknowledgements

This project stands on the shoulders of many excellent tools and communities. Huge thanks to (in no particular order):

- [LINUX DO community](https://linux.do/)
- [Claude Code for VS Code](https://marketplace.visualstudio.com/items?itemName=anthropic.claude-code)
- [Cursor](https://cursor.com/cn/features)
- [Augment](https://www.augmentcode.com/)
- [Windsurf](https://windsurf.com/)
- [Claudia](https://claudia.so/)
- [Opcode](https://opcode.sh/)
- [Claudix](https://github.com/Haleclipse/Claudix)
- [Trae](https://www.trae.cn/)
- [Copilot Chat](https://github.com/microsoft/vscode-copilot-chat)
- [Codex Cli](https://developers.openai.com/codex/cli/)
- [cc-switch](https://github.com/farion1231/cc-switch)
