<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { PrintMode, WrittenInstructionFormat } from '../../../types/pattern'

defineProps<{
  includeAnnotations: boolean
  showTitle?: boolean
  divider?: boolean
}>()

const emit = defineEmits<{
  png: []
  print: [mode: PrintMode]
  instructions: [format: WrittenInstructionFormat]
  'update:includeAnnotations': [value: boolean]
}>()
const { t } = useI18n({ useScope: 'global' })
</script>

<template>
  <li
    v-if="showTitle"
    class="menu-title"
  >
    {{ t('editor.nav.download') }}
  </li>
  <li>
    <label class="flex-row justify-between gap-3">
      <span>{{ t('editor.print.includeAnnotations') }}</span>
      <input
        class="checkbox checkbox-primary checkbox-sm"
        type="checkbox"
        :checked="includeAnnotations"
        @change="emit('update:includeAnnotations', ($event.target as HTMLInputElement).checked)"
      >
    </label>
  </li>
  <li
    v-if="divider"
    class="my-1 border-t border-base-300"
  />
  <li>
    <button
      type="button"
      @click="emit('png')"
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
      @click="emit('print', 'color')"
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
      @click="emit('print', 'symbols')"
    >
      <span
        class="mdi mdi-shape-outline"
        aria-hidden="true"
      />{{ t('editor.print.symbolChart') }}
    </button>
  </li>
  <li class="menu-title mt-1">
    {{ t('editor.print.instructionsTitle') }}
  </li>
  <li>
    <button
      type="button"
      @click="emit('instructions', 'pdf')"
    >
      <span
        class="mdi mdi-file-pdf-box"
        aria-hidden="true"
      />{{ t('editor.print.instructionsPdf') }}
    </button>
  </li>
  <li>
    <button
      type="button"
      @click="emit('instructions', 'text')"
    >
      <span
        class="mdi mdi-text-box-outline"
        aria-hidden="true"
      />{{ t('editor.print.instructionsText') }}
    </button>
  </li>
</template>
