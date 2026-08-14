<script setup lang="ts">
import { RouterLink } from 'vue-router'
import ThemeToggle from './ThemeToggle.vue'
import type { Theme } from '../composables/useTheme'

defineProps<{ canUndo: boolean; canRedo: boolean; theme: Theme }>()
defineEmits<{ new: []; open: []; save: []; print: []; undo: []; redo: []; theme: []; guide: [] }>()
</script>

<template>
  <header class="navbar min-h-14 border-b border-base-300 bg-base-100 px-2 sm:px-4">
    <div class="navbar-start gap-1">
      <span class="text-lg font-semibold tracking-tight">Stitch Witch</span>
    </div>
    <nav class="navbar-center hidden gap-1 lg:flex" aria-label="Project actions">
      <button class="btn btn-ghost btn-sm" type="button" @click="$emit('new')"><span class="mdi mdi-file-plus-outline text-lg" aria-hidden="true"></span>New</button>
      <button class="btn btn-ghost btn-sm" type="button" @click="$emit('open')"><span class="mdi mdi-folder-open-outline text-lg" aria-hidden="true"></span>Open</button>
      <button class="btn btn-ghost btn-sm" type="button" @click="$emit('save')"><span class="mdi mdi-content-save-outline text-lg" aria-hidden="true"></span>Save</button>
      <button class="btn btn-ghost btn-sm" type="button" @click="$emit('print')"><span class="mdi mdi-printer-outline text-lg" aria-hidden="true"></span>Print</button>
      <RouterLink class="btn btn-ghost btn-sm" to="/tracker"><span class="mdi mdi-progress-check text-lg" aria-hidden="true"></span>Tracker</RouterLink>
    </nav>
    <div class="navbar-end gap-1">
      <button class="btn btn-ghost btn-square btn-sm" type="button" :disabled="!canUndo" aria-label="Undo" @click="$emit('undo')"><span class="mdi mdi-undo text-lg" aria-hidden="true"></span></button>
      <button class="btn btn-ghost btn-square btn-sm" type="button" :disabled="!canRedo" aria-label="Redo" @click="$emit('redo')"><span class="mdi mdi-redo text-lg" aria-hidden="true"></span></button>
      <button class="btn btn-ghost btn-square btn-sm" type="button" aria-label="Open user guide" title="User guide" @click="$emit('guide')"><span class="mdi mdi-help-circle-outline text-lg" aria-hidden="true"></span></button>
      <div class="dropdown dropdown-end lg:hidden">
        <button tabindex="0" class="btn btn-ghost btn-square btn-sm" type="button" aria-label="More project actions"><span class="mdi mdi-dots-vertical text-lg" aria-hidden="true"></span></button>
        <ul tabindex="0" class="menu dropdown-content z-50 mt-2 w-44 rounded-box border border-base-300 bg-base-100 p-2">
          <li><button type="button" @click="$emit('new')"><span class="mdi mdi-file-plus-outline" aria-hidden="true"></span>New project</button></li>
          <li><button type="button" @click="$emit('open')"><span class="mdi mdi-folder-open-outline" aria-hidden="true"></span>Open project</button></li>
          <li><button type="button" @click="$emit('save')"><span class="mdi mdi-content-save-outline" aria-hidden="true"></span>Save project</button></li>
           <li><button type="button" @click="$emit('print')"><span class="mdi mdi-printer-outline" aria-hidden="true"></span>Print or PDF</button></li>
          <li><RouterLink to="/tracker"><span class="mdi mdi-progress-check" aria-hidden="true"></span>Open tracker</RouterLink></li>
        </ul>
      </div>
      <ThemeToggle :theme="theme" @toggle="$emit('theme')" />
    </div>
  </header>
</template>
