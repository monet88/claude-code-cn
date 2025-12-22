# Phase 3: Interactive Elements

> Priority: Reference | Status: Complete

## Hover States

### List Row
```css
.row:hover {
  background-color: #1e1e1e;
  cursor: pointer;
}
```

### Links
```css
.link {
  color: #4fa5f1;
  text-decoration: none;
}
.link:hover {
  color: #60a5fa;
  text-decoration: underline;
}
```

---

## Buttons

### Primary
```css
.btn-primary {
  background: linear-gradient(135deg, #9333ea, #3b82f6);
  color: white;
  border-radius: 20px; /* Pill shape */
  padding: 8px 16px;
  font-weight: 500;
}
.btn-primary:hover {
  filter: brightness(1.1);
}
```

### Secondary
```css
.btn-secondary {
  background: transparent;
  border: 1px solid #333333;
  color: #e0e0e0;
  border-radius: 4px;
}
```

---

## Expandable Sections

### Thinking Block
```css
.thinking-header {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 0;
}
.thinking-header .icon {
  transition: transform 0.2s;
}
.thinking-header.expanded .icon {
  transform: rotate(90deg);
}
```

---

## Scrollbars

```css
::-webkit-scrollbar {
  width: 8px;
}
::-webkit-scrollbar-thumb {
  background: #424242;
  border-radius: 4px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
```

---

## Focus States

```css
:focus-visible {
  outline: 1px dotted var(--border-focus);
  outline-offset: -1px;
}
```

---

## TODO List (Strikethrough)

```css
.todo-completed {
  text-decoration: line-through;
  color: var(--text-muted);
}
.todo-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 0;
}
.todo-checkbox {
  color: #4ade80;
}
```

---

## Animations

### Fade In
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
.fade-in {
  animation: fadeIn 0.1s linear;
}
```

### Expand/Collapse
```css
.expandable-content {
  overflow: hidden;
  transition: max-height 0.2s ease-out;
}
```

---

## Keyboard Navigation

- Arrow Up/Down: Navigate items
- Enter/Tab: Select item
- Escape: Close dropdown
- Hover in keyboard mode: No highlight change
