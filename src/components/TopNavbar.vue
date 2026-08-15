<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import ThemeToggle from './ThemeToggle.vue'
import LanguageSwitcher from './LanguageSwitcher.vue'
import type { Theme } from '../composables/useTheme'
import type { PrintMode } from '../types/pattern'

defineProps<{ canUndo: boolean; canRedo: boolean; theme: Theme }>()
const emit = defineEmits<{ new: []; open: []; save: []; print: [mode: PrintMode]; undo: []; redo: []; theme: []; guide: [] }>()
const { t } = useI18n({ useScope: 'global' })

function requestPrint(mode: PrintMode, event: MouseEvent) {
  const target = event.currentTarget as HTMLElement
  target.closest('details')?.removeAttribute('open')
  target.blur()
  emit('print', mode)
}
</script>

<template>
  <header class="navbar min-h-14 border-b border-base-300 bg-base-100 px-2 sm:px-4">
    <div class="navbar-start gap-1">
      <span class="text-lg font-semibold tracking-tight">Stitch Witch</span>
    </div>
    <nav class="navbar-center hidden gap-1 lg:flex" :aria-label="t('editor.nav.projectActions')">
      <button class="btn btn-ghost btn-sm" type="button" @click="$emit('new')"><span class="mdi mdi-file-plus-outline text-lg" aria-hidden="true"></span>{{ t('editor.nav.new') }}</button>
      <button class="btn btn-ghost btn-sm" type="button" @click="$emit('open')"><span class="mdi mdi-folder-open-outline text-lg" aria-hidden="true"></span>{{ t('editor.nav.open') }}</button>
      <button class="btn btn-ghost btn-sm" type="button" aria-keyshortcuts="Control+S Meta+S" @click="$emit('save')"><span class="mdi mdi-content-save-outline text-lg" aria-hidden="true"></span>{{ t('editor.nav.save') }}</button>
      <details class="dropdown dropdown-end">
        <summary class="btn btn-ghost btn-sm"><span class="mdi mdi-printer-outline text-lg" aria-hidden="true"></span>{{ t('editor.nav.print') }}<span class="mdi mdi-chevron-down" aria-hidden="true"></span></summary>
        <ul class="menu dropdown-content z-50 mt-2 w-48 rounded-box border border-base-300 bg-base-100 p-2 shadow-lg">
          <li><button type="button" @click="requestPrint('color', $event)"><span class="mdi mdi-palette-outline" aria-hidden="true"></span>{{ t('editor.print.colorChart') }}</button></li>
          <li><button type="button" @click="requestPrint('symbols', $event)"><span class="mdi mdi-shape-outline" aria-hidden="true"></span>{{ t('editor.print.symbolChart') }}</button></li>
        </ul>
      </details>
      <RouterLink class="btn btn-ghost btn-sm" to="/tracker"><span class="mdi mdi-progress-check text-lg" aria-hidden="true"></span>{{ t('editor.nav.tracker') }}</RouterLink>
    </nav>
    <div class="navbar-end gap-1">
      <button class="btn btn-ghost btn-square btn-sm" type="button" :disabled="!canUndo" :aria-label="t('editor.nav.undo')" aria-keyshortcuts="Control+Z Meta+Z" @click="$emit('undo')"><span class="mdi mdi-undo text-lg" aria-hidden="true"></span></button>
      <button class="btn btn-ghost btn-square btn-sm" type="button" :disabled="!canRedo" :aria-label="t('editor.nav.redo')" aria-keyshortcuts="Control+Y Control+Shift+Z Meta+Shift+Z" @click="$emit('redo')"><span class="mdi mdi-redo text-lg" aria-hidden="true"></span></button>
      <button class="btn btn-ghost btn-square btn-sm" type="button" :aria-label="t('editor.nav.openGuide')" :title="t('editor.nav.userGuide')" @click="$emit('guide')"><span class="mdi mdi-help-circle-outline text-lg" aria-hidden="true"></span></button>
      <div class="dropdown dropdown-end lg:hidden">
        <button tabindex="0" class="btn btn-ghost btn-square btn-sm" type="button" :aria-label="t('editor.nav.moreActions')"><span class="mdi mdi-dots-vertical text-lg" aria-hidden="true"></span></button>
        <ul tabindex="0" class="menu dropdown-content z-50 mt-2 w-44 rounded-box border border-base-300 bg-base-100 p-2">
          <li><button type="button" @click="$emit('new')"><span class="mdi mdi-file-plus-outline" aria-hidden="true"></span>{{ t('editor.nav.newProject') }}</button></li>
          <li><button type="button" @click="$emit('open')"><span class="mdi mdi-folder-open-outline" aria-hidden="true"></span>{{ t('editor.nav.openProject') }}</button></li>
          <li><button type="button" aria-keyshortcuts="Control+S Meta+S" @click="$emit('save')"><span class="mdi mdi-content-save-outline" aria-hidden="true"></span>{{ t('editor.nav.saveProject') }}</button></li>
          <li class="menu-title">{{ t('editor.nav.printOrPdf') }}</li>
          <li><button type="button" @click="requestPrint('color', $event)"><span class="mdi mdi-palette-outline" aria-hidden="true"></span>{{ t('editor.print.colorChart') }}</button></li>
          <li><button type="button" @click="requestPrint('symbols', $event)"><span class="mdi mdi-shape-outline" aria-hidden="true"></span>{{ t('editor.print.symbolChart') }}</button></li>
          <li><RouterLink to="/tracker"><span class="mdi mdi-progress-check" aria-hidden="true"></span>{{ t('editor.nav.openTracker') }}</RouterLink></li>
        </ul>
      </div>
      <LanguageSwitcher />
      <ThemeToggle :theme="theme" @toggle="$emit('theme')" />
    </div>
  </header>
</template>
