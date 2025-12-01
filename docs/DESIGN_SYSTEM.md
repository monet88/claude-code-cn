# Design System & Style Guide

## ⚠️ Strict Compliance Mandate
**This document is the SINGLE SOURCE OF TRUTH for the project's visual design.**
To avoid "wrong views" (incorrect visual implementation):
1.  **Consult this guide first** before writing any CSS or Tailwind classes.
2.  **Do not invent** new colors, spacings, or components. Use the variables and classes defined here.
3.  **Check `AGENTS.md`** for broader project context, but rely on *this* file for pixel-perfect UI details.
4.  Any UI deviation from this document is considered a bug.

## Overview
The user interface of **Claude Code CN** is built using **Vue 3** and **Tailwind CSS (v4)**. It is designed to feel native to VS Code by leveraging VS Code's CSS variables (theming) while maintaining the distinct "Claude" aesthetic through specific accent colors and component designs.

## Color Palette

### Claude Brand Colors
These colors define the core identity of the extension.

| Variable | Hex / Value | Usage |
| :--- | :--- | :--- |
| `--app-claude-orange` | `#d97757` | Primary accent, spinner foreground |
| `--app-claude-clay-button-orange` | `#c6613f` | Button accents, light mode spinner |
| `--app-claude-ivory` | `#faf9f5` | (Reserved) Light background accents |
| `--app-claude-slate` | `#141413` | (Reserved) Dark background accents |

### VS Code Theme Integration
The UI automatically adapts to the user's VS Code theme (Light/Dark/High Contrast) by using standard VS Code CSS variables.

| UI Element | CSS Variable |
| :--- | :--- |
| **Foreground** | `var(--vscode-foreground)` |
| **Background** | `var(--vscode-sideBar-background)` |
| **Border** | `var(--vscode-sideBarActivityBarTop-border)` |
| **Input Background** | `var(--vscode-input-background)` |
| **Input Foreground** | `var(--vscode-input-foreground)` |
| **Input Border** | `var(--vscode-inlineChatInput-border)` |
| **List Hover** | `var(--vscode-list-hoverBackground)` |
| **List Active** | `var(--vscode-list-activeSelectionBackground)` |
| **Error Text** | `var(--vscode-errorForeground)` |
| **Link Text** | `var(--vscode-textLink-foreground)` |

## Typography

- **Font Family**: `var(--app-monospace-font-family)` (defaults to `var(--vscode-editor-font-family, monospace)`)
- **Font Size**: `var(--app-monospace-font-size)` (defaults to `12px`)
- **Small Font**: `var(--app-monospace-font-size-small)` (defaults to `10px`)

## Component Styles

### Buttons (`.anysphere-icon-button`)
- **Base**: Transparent background, flex centered.
- **Hover**: `rgba(255, 255, 255, 0.1)` background.
- **Disabled**: `opacity: 0.5`, `cursor: not-allowed`.
- **Transition**: `background-color 0.1s ease`.

### Input Box (`.full-input-box`)
- **Style**: Rounded borders (`8px`), blurred backdrop (`backdrop-filter: blur(9px)`).
- **Background**: Mixed transparency `color-mix(in srgb, var(--vscode-input-background) 90%, transparent)`.
- **Focus**: managed via `border-color` transition.

### Todo List Items
- **Container**: `.toolbar-section` with blurred background and rounded top corners.
- **Item**: `.todo-item` flex row with hover effect.
- **Status Indicators**:
  - **Pending**: `.todo-item-indicator` (opacity 0.4 ring).
  - **In Progress**: `.todo-in-progress-circle` (solid fill with icon).
  - **Completed**: Text uses `text-decoration: line-through`.

### Premium Pill (`.premium-pill`)
- Small badge component for context or special status.
- **Default**: Bordered with `var(--vscode-input-border)`.
- **Hover**: Slight background highlight.

## Icons

The project uses two main icon sets:
1.  **Codicons**: Standard VS Code icons (e.g., `.codicon-check`).
2.  **File Icons**: Custom file type icons (SVG) defined in `docs/icons/`.
3.  **SVG Icons**: Located in `assets/icons/` and loaded via `vite-plugin-svg-icons`.

## Tailwind Configuration
Tailwind is configured via `@tailwindcss/vite` in `vite.config.ts`. It scans all HTML, Vue, and TS files in `src/webview`.
Styles are centrally managed in `src/webview/src/styles/claude-theme.css`.
