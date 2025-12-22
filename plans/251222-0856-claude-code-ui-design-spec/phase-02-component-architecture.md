# Phase 2: Component Architecture

> Priority: Reference | Status: Complete

## Layout System

### Grid
- Base unit: `4px`
- Common multipliers: `8px`, `12px`, `16px`, `24px`

### Containers
```css
.app-container {
  max-width: 800px - 1000px; /* Chat readability */
  margin: 0 auto;
}
```

---

## Component Hierarchy

### 1. Read Tool Row
```
Row (32px height, flex, align-center)
├── Left Section (80px fixed)
│   ├── Eye Icon (14px, #888888)
│   └── "Read" Label (12px, 500 weight)
├── Center Section (flex: 1)
│   ├── File Icon (16px, language-specific)
│   └── File Path (13px monospace, #4fa5f1)
└── Right Section (30px fixed)
    └── Status Dot (8px circle, #4ade80)
```

**Spacing**:
- Icon to label: `8px`
- Label to file icon: `12px`
- File icon to path: `8px`
- Padding: `16px` horizontal

### 2. Tables (Borderless)
```css
.table-borderless {
  border-collapse: collapse;
}
.table-header {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
}
.table-cell {
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-subtle);
}
```

**Column patterns**:
- Phase: `80px` fixed
- Status: `100px` fixed
- Description: `flex: 1`

### 3. Code Blocks
```css
.code-block {
  background: #1a1a1a;
  border: 1px solid #333333;
  border-radius: 6px;
  padding: 12px 16px;
  font-family: var(--font-code);
  font-size: 13px;
}
```

### 4. Status Indicators
| Type | Size | Color | Style |
|------|------|-------|-------|
| Success dot | 8-10px | #4ade80 | Circle, slight glow |
| Checkmark | 14px | #4ade80 | Codicon check |
| Skipped | 14px | #858585 | Codicon dash |

### 5. Badges
```css
.badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
}
.badge-amber {
  background: #E3A008;
  color: #1E1E1E;
}
```

### 6. Message Bubbles
```css
.message-container {
  padding: 16px 24px;
}
.assistant-message {
  padding-left: 24px;
  position: relative;
}
.assistant-message::before {
  content: "●";
  position: absolute;
  left: 8px;
  font-size: 10px;
  color: rgba(255,255,255,0.6);
}
```

---

## File Tree (ASCII Style)
```css
.file-tree {
  font-family: var(--font-code);
  font-size: 13px;
}
.file-tree-line { color: #555555; }
.file-tree-name { color: #D4D4D4; }
.file-tree-meta { color: #858585; }
```

Indent: `24px` per level
