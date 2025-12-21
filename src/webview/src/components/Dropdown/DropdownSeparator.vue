<template>
  <div class="dropdown-separator"></div>
</template>

<style scoped>
.dropdown-separator {
  height: 1px;
  width: calc(100% + 0.25rem); /* Offset the menu-content padding: 0.125rem */
  background: var(--vscode-commandCenter-inactiveBorder, var(--vscode-widget-border));
  opacity: 0.8;
  margin: 2px -0.125rem; /* Negative margin matches the padding */
  position: relative;
}
</style>
