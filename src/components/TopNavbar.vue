<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import ThemeToggle from './ThemeToggle.vue'
import LanguageSwitcher from './LanguageSwitcher.vue'
import AppDropdown from './AppDropdown.vue'
import type { Theme } from '../composables/useTheme'
import type { PrintMode } from '../types/pattern'

defineProps<{ theme: Theme; includeAnnotations: boolean }>()
const emit = defineEmits<{ new: []; open: []; save: []; png: []; print: [mode: PrintMode]; theme: []; guide: []; 'update:includeAnnotations': [value: boolean] }>()
const { t } = useI18n({ useScope: 'global' })

function requestPrint(mode: PrintMode, close: (focusAnchor?: boolean) => void) {
  close(true)
  emit('print', mode)
}

function requestPng(close: (focusAnchor?: boolean) => void) {
  close(true)
  emit('png')
}
</script>

<template>
  <header class="navbar min-h-14 border-b border-base-300 bg-base-100 px-2 sm:px-4">
    <div class="navbar-start gap-1">
      <span class="text-lg font-semibold tracking-tight">Stitch Witch</span>
    </div>
    <nav
      class="navbar-center hidden gap-1 lg:flex"
      :aria-label="t('editor.nav.projectActions')"
    >
      <button
        class="btn btn-ghost btn-sm"
        type="button"
        @click="$emit('new')"
      >
        <span
          class="mdi mdi-file-plus-outline text-lg"
          aria-hidden="true"
        />{{ t('editor.nav.new') }}
      </button>
      <button
        class="btn btn-ghost btn-sm"
        type="button"
        @click="$emit('open')"
      >
        <span
          class="mdi mdi-folder-open-outline text-lg"
          aria-hidden="true"
        />{{ t('editor.nav.open') }}
      </button>
      <button
        class="btn btn-ghost btn-sm"
        type="button"
        aria-keyshortcuts="Control+S Meta+S"
        @click="$emit('save')"
      >
        <span
          class="mdi mdi-content-save-outline text-lg"
          aria-hidden="true"
        />{{ t('editor.nav.save') }}
      </button>
      <AppDropdown
        :label="t('editor.nav.download')"
        align="right"
        panel-role="menu"
      >
        <template #trigger="{ open, panelId }">
          <button
            class="btn btn-ghost btn-sm"
            type="button"
            aria-haspopup="menu"
            :aria-controls="panelId"
            :aria-expanded="open"
          >
            <span
              class="mdi mdi-download-outline text-lg"
              aria-hidden="true"
            />{{ t('editor.nav.download') }}<span
              class="mdi mdi-chevron-down"
              aria-hidden="true"
            />
          </button>
        </template>
        <template #default="{ close }">
          <ul class="menu w-48 p-2">
            <li>
              <label class="flex-row justify-between gap-3">
                <span>{{ t('editor.print.includeAnnotations') }}</span>
                <input
                  class="checkbox checkbox-primary checkbox-sm"
                  type="checkbox"
                  :checked="includeAnnotations"
                  @change="$emit('update:includeAnnotations', ($event.target as HTMLInputElement).checked)"
                >
              </label>
            </li>
            <li class="my-1 border-t border-base-300" />
            <li>
              <button
                type="button"
                @click="requestPng(close)"
              >
                <span
                  class="mdi mdi-image-outline"
                  aria-hidden="true"
                />{{ t('editor.print.canvasPng') }}
              </button>
            </li>
            <li>
              <button
                type="button"
                @click="requestPrint('color', close)"
              >
                <span
                  class="mdi mdi-palette-outline"
                  aria-hidden="true"
                />{{ t('editor.print.colorChart') }}
              </button>
            </li>
            <li>
              <button
                type="button"
                @click="requestPrint('symbols', close)"
              >
                <span
                  class="mdi mdi-shape-outline"
                  aria-hidden="true"
                />{{ t('editor.print.symbolChart') }}
              </button>
            </li>
          </ul>
        </template>
      </AppDropdown>
      <RouterLink
        class="btn btn-ghost btn-sm"
        to="/tracker"
      >
        <span
          class="mdi mdi-progress-check text-lg"
          aria-hidden="true"
        />{{ t('editor.nav.tracker') }}
      </RouterLink>
    </nav>
    <div class="navbar-end gap-1">
      <button
        class="btn btn-ghost btn-square btn-sm"
        type="button"
        :aria-label="t('editor.nav.openGuide')"
        :title="t('editor.nav.userGuide')"
        @click="$emit('guide')"
      >
        <span
          class="mdi mdi-help-circle-outline text-lg"
          aria-hidden="true"
        />
      </button>
      <AppDropdown
        class="lg:hidden"
        :label="t('editor.nav.moreActions')"
        align="right"
        panel-role="menu"
      >
        <template #trigger="{ open, panelId }">
          <button
            class="btn btn-ghost btn-square btn-sm"
            type="button"
            :aria-label="t('editor.nav.moreActions')"
            aria-haspopup="menu"
            :aria-controls="panelId"
            :aria-expanded="open"
          >
            <span
              class="mdi mdi-dots-vertical text-lg"
              aria-hidden="true"
            />
          </button>
        </template>
        <template #default="{ close }">
          <ul class="menu w-44 p-2">
            <li>
              <button
                type="button"
                @click="close(true); $emit('new')"
              >
                <span
                  class="mdi mdi-file-plus-outline"
                  aria-hidden="true"
                />{{ t('editor.nav.newProject') }}
              </button>
            </li>
            <li>
              <button
                type="button"
                @click="close(true); $emit('open')"
              >
                <span
                  class="mdi mdi-folder-open-outline"
                  aria-hidden="true"
                />{{ t('editor.nav.openProject') }}
              </button>
            </li>
            <li>
              <button
                type="button"
                aria-keyshortcuts="Control+S Meta+S"
                @click="close(true); $emit('save')"
              >
                <span
                  class="mdi mdi-content-save-outline"
                  aria-hidden="true"
                />{{ t('editor.nav.saveProject') }}
              </button>
            </li>
            <li class="menu-title">
              {{ t('editor.nav.download') }}
            </li>
            <li>
              <label class="flex-row justify-between gap-3">
                <span>{{ t('editor.print.includeAnnotations') }}</span>
                <input
                  class="checkbox checkbox-primary checkbox-sm"
                  type="checkbox"
                  :checked="includeAnnotations"
                  @change="$emit('update:includeAnnotations', ($event.target as HTMLInputElement).checked)"
                >
              </label>
            </li>
            <li>
              <button
                type="button"
                @click="requestPng(close)"
              >
                <span
                  class="mdi mdi-image-outline"
                  aria-hidden="true"
                />{{ t('editor.print.canvasPng') }}
              </button>
            </li>
            <li>
              <button
                type="button"
                @click="requestPrint('color', close)"
              >
                <span
                  class="mdi mdi-palette-outline"
                  aria-hidden="true"
                />{{ t('editor.print.colorChart') }}
              </button>
            </li>
            <li>
              <button
                type="button"
                @click="requestPrint('symbols', close)"
              >
                <span
                  class="mdi mdi-shape-outline"
                  aria-hidden="true"
                />{{ t('editor.print.symbolChart') }}
              </button>
            </li>
            <li>
              <RouterLink to="/tracker">
                <span
                  class="mdi mdi-progress-check"
                  aria-hidden="true"
                />{{ t('editor.nav.openTracker') }}
              </RouterLink>
            </li>
          </ul>
        </template>
      </AppDropdown>
      <LanguageSwitcher />
      <ThemeToggle
        :theme="theme"
        @toggle="$emit('theme')"
      />
    </div>
  </header>
</template>
