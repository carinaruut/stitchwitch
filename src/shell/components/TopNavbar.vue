<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import ThemeToggle from './ThemeToggle.vue'
import LanguageSwitcher from './LanguageSwitcher.vue'
import MobileProjectActionsDropdown from './MobileProjectActionsDropdown.vue'
import ProjectExportDropdown from '../../features/export/components/ProjectExportDropdown.vue'
import type { Theme } from '../../shared/composables/useTheme'
import type { PrintMode, WrittenInstructionFormat } from '../../types/pattern'

withDefaults(defineProps<{ theme: Theme; includeAnnotations: boolean; shared?: boolean; actionsAvailable?: boolean }>(), {
  shared: false,
  actionsAvailable: true,
})
const emit = defineEmits<{ new: []; open: []; save: []; share: []; png: []; print: [mode: PrintMode]; instructions: [format: WrittenInstructionFormat]; theme: []; guide: []; 'update:includeAnnotations': [value: boolean] }>()
const { t } = useI18n({ useScope: 'global' })
</script>

<template>
  <header class="navbar min-h-14 border-b border-base-300 bg-base-100 px-2 sm:px-4">
    <div class="navbar-start gap-1">
      <span class="text-lg font-semibold tracking-tight">Stitch Witch</span>
    </div>
    <nav
      v-if="actionsAvailable"
      class="navbar-center hidden gap-1 lg:flex"
      :aria-label="t('editor.nav.projectActions')"
    >
      <button
        v-if="!shared"
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
        @click="$emit('share')"
      >
        <span
          class="mdi mdi-share-variant-outline text-lg"
          aria-hidden="true"
        />{{ t('editor.nav.share') }}
      </button>
      <button
        v-if="!shared"
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
      <ProjectExportDropdown
        :include-annotations="includeAnnotations"
        @update:include-annotations="emit('update:includeAnnotations', $event)"
        @png="emit('png')"
        @print="emit('print', $event)"
        @instructions="emit('instructions', $event)"
      />
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
      <MobileProjectActionsDropdown
        v-if="actionsAvailable"
        :include-annotations="includeAnnotations"
        :shared="shared"
        @update:include-annotations="emit('update:includeAnnotations', $event)"
        @new="emit('new')"
        @open="emit('open')"
        @save="emit('save')"
        @share="emit('share')"
        @png="emit('png')"
        @print="emit('print', $event)"
        @instructions="emit('instructions', $event)"
      />
      <LanguageSwitcher />
      <ThemeToggle
        :theme="theme"
        @toggle="$emit('theme')"
      />
    </div>
  </header>
</template>
