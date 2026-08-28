<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PrintMode } from '../../types/pattern'
import ProjectExportDropdown from '../../features/export/components/ProjectExportDropdown.vue'

const props = defineProps<{
  context: 'editor' | 'tracker'
  includeAnnotations: boolean
}>()
const emit = defineEmits<{
  switch: []
  save: []
  png: []
  print: [mode: PrintMode]
  'update:includeAnnotations': [value: boolean]
}>()
const { t } = useI18n({ useScope: 'global' })
const switchLabel = computed(() => t(props.context === 'editor' ? 'editor.nav.tracker' : 'tracker.actions.openEditor'))
const switchIcon = computed(() => props.context === 'editor' ? 'mdi-progress-check' : 'mdi-pencil-ruler')
</script>

<template>
  <div
    class="flex w-full shrink-0 items-center justify-start gap-1 border-t border-base-300 pt-1 lg:ml-auto lg:w-auto lg:border-l lg:border-t-0 lg:pl-2 lg:pt-0"
    :aria-label="t('controls.drawing.patternSettings')"
  >
    <div
      class="tooltip"
      :data-tip="switchLabel"
    >
      <button
        class="btn btn-ghost btn-sm"
        type="button"
        :aria-label="switchLabel"
        @click="emit('switch')"
      >
        <span
          class="mdi text-xl"
          :class="switchIcon"
          aria-hidden="true"
        />
      </button>
    </div>
    <slot name="settings" />
    <div
      class="tooltip"
      :data-tip="t('editor.nav.saveProject')"
    >
      <button
        class="btn btn-ghost btn-sm"
        type="button"
        :aria-label="t('editor.nav.saveProject')"
        aria-keyshortcuts="Control+S Meta+S"
        @click="emit('save')"
      >
        <span
          class="mdi mdi-content-save-outline text-xl text-success"
          aria-hidden="true"
        />
      </button>
    </div>
    <ProjectExportDropdown
      variant="workspace"
      :include-annotations="includeAnnotations"
      @update:include-annotations="emit('update:includeAnnotations', $event)"
      @png="emit('png')"
      @print="emit('print', $event)"
    />
  </div>
</template>
