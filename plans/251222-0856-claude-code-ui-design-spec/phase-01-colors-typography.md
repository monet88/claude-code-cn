# Phase 1: Color Palette & Typography

> Priority: Reference | Status: Complete

## Color Palette

### Backgrounds
| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-primary` | `#121212` | Main app background |
| `--bg-secondary` | `#1E1E1E` | VS Code standard dark |
| `--bg-surface` | `#1a1a1a` | Code blocks, cards |
| `--bg-elevated` | `#252525` | Component containers |
| `--bg-hover` | `#1e1e1e` | List item hover |

### Text
| Token | Hex | Usage |
|-------|-----|-------|
| `--text-primary` | `#e0e0e0` | Body text |
| `--text-heading` | `#FFFFFF` | Headers, prominent |
| `--text-secondary` | `#a0a0a0` | Labels, metadata |
| `--text-muted` | `#666666` | Path prefixes |
| `--text-disabled` | `#858585` | Descriptions |

### Accents
| Token | Hex | Usage |
|-------|-----|-------|
| `--accent-blue` | `#4fa5f1` | Links, file paths |
| `--accent-blue-hover` | `#60a5fa` | Link hover |
| `--accent-purple` | `#9333ea` | Primary buttons |
| `--accent-green` | `#4ade80` | Success indicators |
| `--accent-amber` | `#E3A008` | Badges, warnings |

### Borders
| Token | Hex | Usage |
|-------|-----|-------|
| `--border-subtle` | `#262626` | Dividers |
| `--border-default` | `#333333` | Component borders |
| `--border-focus` | `#3b82f6` | Focus states |

### Syntax Highlighting
| Token | Hex | Element |
|-------|-----|---------|
| `--syntax-keyword` | `#c678dd` | Keywords |
| `--syntax-string` | `#98c379` | Strings |
| `--syntax-function` | `#61afef` | Functions |
| `--syntax-comment` | `#5c6370` | Comments |

---

## Typography

### Font Families
```css
--font-ui: 'Inter', 'Geist Sans', system-ui, sans-serif;
--font-code: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
```

### Scale
| Level | Size | Weight | Line-height | Usage |
|-------|------|--------|-------------|-------|
| H2 | 18px | 600 | 1.4 | Section headers |
| H3 | 16px | 600 | 1.4 | Subsection headers |
| Body | 14px | 400 | 1.5 (21px) | General text |
| Code | 13px | 400 | 1.5 (20px) | File paths, code |
| Label | 12px | 500 | 1.4 | UI labels |
| Caption | 11px | 400 | 1.3 | Table headers |
| Micro | 10px | 400 | 1.2 | Badges |

### Special Styles
- **Inline code**: Monospace, `#333` background
- **Strikethrough**: `text-decoration: line-through`, muted color
- **Links**: Blue accent, underline on hover
