# Dropdown Component System

This dropdown component collection follows a clear **container vs. content** separation so it can be reused in menus, pick lists, autocompletion UIs, and more.

## 🎯 Design Principles
### Core principles
- **Dropdown**: The pure container responsible for positioning, toggling visibility, and handling global events.
- **DropdownItem**: A data-driven leaf component that adapts to various business needs via a shared interface.
- **Business logic**: Implemented entirely on the consumer side (e.g., `ChatInputBox`), keeping the core components generic.

### Reusability advantages
- ✓ Works for any dropdown scenario (menus, selectors, autocomplete, etc.).
- ✓ Data-driven API, no hard-coded business behaviors.
- ✓ Supports custom icons, styles, and behaviors.
- ✓ Built with type-safe TypeScript interfaces.

## 📋 Data Interfaces
Each dropdown item uses the following structure:

```ts
interface DropdownItemData {
  id: string;           // Unique identifier
  label?: string;       // Primary display text
  name?: string;        // Fallback text
  detail?: string;      // Secondary info (e.g., path or description)
  icon?: string;        // Left icon CSS class
  rightIcon?: string;   // Right icon CSS class
  checked?: boolean;    // Selection state
  disabled?: boolean;   // Disabled state
  type?: string;        // Business type identifier
  data?: any;           // Additional business payload
  [key: string]: any;   // Extension fields
}
```

## 🔧 Usage Example

### Basic usage

```vue
<Dropdown :items="items" />
```

### Custom icons

```vue
<Dropdown :items="items" v-slot="{ item }">
  <span :class="item.icon"></span>
  {{ item.label }}
</Dropdown>
```

### Business payloads

Attach extra metadata to `item.data` and react inside the consumer.

## 🏗️ Component Architecture

```
Dropdown (container)
├── ScrollableElement (scrollable region)
│   └── Business content (slot)
│       ├── DropdownItem (generic rows)
│       ├── DropdownSeparator (dividers)
│       └── Custom content
└── Footer (bottom information)
```

## 🎨 Styling System
- Leverages global CSS variables for consistency.
- Supports VS Code theme alignment.
- Matches Monaco editor-style scrollbars.
- Responsive by default.

## 📝 Best Practices
1. **Data-driven**: Let the data backend control the UI.
2. **Type-safe**: Use the TypeScript interfaces for compile-time checks.
3. **Business separation**: Keep logic in the consumer so the components stay generic.
4. **Extensible**: Use slots and the data payload to tailor display scenarios.

## 🔄 Migration Guide
Switching from a hard-coded dropdown to this generic system:
1. Move business data into the consumer.
2. Type the payload using `DropdownItemData`.
3. Drive behavior from `item.type` and `item.data`.
4. Customize special display needs through slots.

This architecture maximizes reuse and maintainability while retaining strong extensibility.
