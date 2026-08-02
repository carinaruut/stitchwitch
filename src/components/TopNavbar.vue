<script setup lang="ts">
import ThemeToggle from './ThemeToggle.vue'
import type { Theme } from '../composables/useTheme'

defineProps<{ canUndo: boolean; canRedo: boolean; theme: Theme }>()
defineEmits<{ new: []; open: []; save: []; print: []; undo: []; redo: []; theme: []; menu: [] }>()
</script>

<template>
  <header class="navbar min-h-14 border-b border-base-300 bg-base-100 px-2 sm:px-4">
    <div class="navbar-start gap-1">
      <button class="btn btn-ghost btn-sm lg:hidden" type="button" aria-label="Open editing tools" @click="$emit('menu')">Menu</button>
      <span class="text-lg font-semibold tracking-tight">Stitch Witch</span>
    </div>
    <nav class="navbar-center hidden gap-1 lg:flex" aria-label="Project actions">
      <button class="btn btn-ghost btn-sm" type="button" @click="$emit('new')">New</button>
      <button class="btn btn-ghost btn-sm" type="button" @click="$emit('open')">Open</button>
      <button class="btn btn-ghost btn-sm" type="button" @click="$emit('save')">Save</button>
      <button class="btn btn-ghost btn-sm" type="button" @click="$emit('print')">Print</button>
    </nav>
    <div class="navbar-end gap-1">
      <button class="btn btn-ghost btn-sm" type="button" :disabled="!canUndo" aria-label="Undo" @click="$emit('undo')">Undo</button>
      <button class="btn btn-ghost btn-sm" type="button" :disabled="!canRedo" aria-label="Redo" @click="$emit('redo')">Redo</button>
      <div class="dropdown dropdown-end lg:hidden">
        <button tabindex="0" class="btn btn-ghost btn-sm" type="button">More</button>
        <ul tabindex="0" class="menu dropdown-content z-50 mt-2 w-44 rounded-box border border-base-300 bg-base-100 p-2">
          <li><button type="button" @click="$emit('new')">New project</button></li>
          <li><button type="button" @click="$emit('open')">Open project</button></li>
          <li><button type="button" @click="$emit('save')">Save project</button></li>
          <li><button type="button" @click="$emit('print')">Print or PDF</button></li>
        </ul>
      </div>
      <ThemeToggle :theme="theme" @toggle="$emit('theme')" />
    </div>
  </header>
</template>
