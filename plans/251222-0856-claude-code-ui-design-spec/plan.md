# Claude Code UI Design Specification

> Auto-generated: 2025-12-22 | Source: Screenshot analysis

## Overview

Design specification for Claude Code chat interface. Dark theme, VS Code-inspired, developer-focused.

## Phases

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | Reference | [Color Palette & Typography](phase-01-colors-typography.md) |
| 2 | Reference | [Component Architecture](phase-02-component-architecture.md) |
| 3 | Reference | [Interactive Elements](phase-03-interactive-elements.md) |

## Quick Reference

### Color Palette
- Background: `#121212` / `#1E1E1E`
- Surface: `#1a1a1a` / `#252525`
- Text Primary: `#e0e0e0` / `#FFFFFF`
- Text Secondary: `#a0a0a0` / `#858585`
- Accent Blue: `#4fa5f1` / `#3b82f6`
- Success Green: `#4ade80` / `#3FB950`
- Border: `#262626` / `#333333`

### Typography
- UI Font: `Inter` or `Geist Sans`
- Code Font: `JetBrains Mono` or `Fira Code`
- Body: `13-14px`, weight `400`
- Labels: `12px`, weight `500`
- Headings: `16-18px`, weight `600`

### Spacing (4px grid)
- Row height: `32px`
- Padding horizontal: `16px`
- Component gap: `12-16px`
- Icon-to-text: `8px`

### Key Components
1. **Read Tool Row**: Eye icon + "Read" label + File icon + Path + Status dot
2. **Code Block**: `#1a1a1a` bg, `6-8px` radius, `12-16px` padding
3. **Status Dot**: `8-10px` circle, `#4ade80` color
4. **Tables**: Borderless, header `11px` uppercase
5. **Badges**: `10-12px` font, `2-6px` padding, pill shape

## Files Structure
```
plans/251222-0856-claude-code-ui-design-spec/
├── plan.md (this file)
├── phase-01-colors-typography.md
├── phase-02-component-architecture.md
└── phase-03-interactive-elements.md
```
