<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppDropdown from '../../../shared/ui/AppDropdown.vue'
import type { PrintMode } from '../../../types/pattern'
import ProjectExportMenuItems from './ProjectExportMenuItems.vue'

withDefaults(defineProps<{
  includeAnnotations: boolean
  variant?: 'navbar' | 'workspace'
}>(), {
  variant: 'navbar',
})

const emit = defineEmits<{
  png: []
  print: [mode: PrintMode]
  'update:includeAnnotations': [value: boolean]
}>()
const { t } = useI18n({ useScope: 'global' })
const dropdown = ref<InstanceType<typeof AppDropdown> | null>(null)

function requestPng() {
  dropdown.value?.close(true)
  emit('png')
}

function requestPrint(mode: PrintMode) {
  dropdown.value?.close(true)
  emit('print', mode)
}
</script>

<template>
  <AppDropdown
    ref="dropdown"
    :label="t('editor.nav.download')"
    align="right"
    panel-role="menu"
  >
    <template #trigger="{ open, panelId }">
      <button
        v-if="variant === 'navbar'"
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
      <button
        v-else
        class="btn btn-ghost btn-sm"
        type="button"
        :aria-label="t('editor.nav.download')"
        :title="t('editor.nav.download')"
        aria-haspopup="menu"
        :aria-controls="panelId"
        :aria-expanded="open"
      >
        <span
          class="mdi mdi-download-outline text-xl text-info"
          aria-hidden="true"
        />
      </button>
    </template>
    <ul
      class="menu p-2"
      :class="variant === 'navbar' ? 'w-48' : 'w-52'"
    >
      <ProjectExportMenuItems
        :include-annotations="includeAnnotations"
        divider
        @update:include-annotations="emit('update:includeAnnotations', $event)"
        @png="requestPng"
        @print="requestPrint"
      />
    </ul>
  </AppDropdown>
</template>
