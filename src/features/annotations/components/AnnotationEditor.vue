<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { PatternAnnotation } from '../../../types/pattern'
import { normalizeColor } from '../../../utils/colors'

defineProps<{ annotation: PatternAnnotation; selectedColor: string }>()
const emit = defineEmits<{
  update: [updates: { text?: string; color?: string }]
  delete: []
}>()
const { t } = useI18n({ useScope: 'global' })

function updateText(event: Event) {
  emit('update', { text: (event.target as HTMLInputElement).value })
}

function updateColor(event: Event) {
  const input = event.target as HTMLInputElement
  const color = normalizeColor(input.value)
  if (color) emit('update', { color })
  else input.value = input.defaultValue
}
</script>

<template>
  <div class="app-settings-panel rounded-box border border-primary/30 bg-primary/5">
    <div class="flex flex-wrap items-end gap-3">
      <div class="min-w-32">
        <p class="text-[10px] font-semibold uppercase tracking-widest text-base-content/50">
          {{ t('controls.annotations.selected') }}
        </p>
        <p class="font-semibold">
          {{ t(`controls.annotations.types.${annotation.type}`) }}
        </p>
      </div>
      <label
        v-if="annotation.type === 'text'"
        class="app-field min-w-48 flex-1"
      >
        <span class="app-field-label">{{ t('controls.annotations.text') }}</span>
        <input
          class="input input-bordered input-sm w-full"
          type="text"
          maxlength="500"
          :value="annotation.text"
          @change="updateText"
        >
      </label>
      <label class="app-field w-36">
        <span class="app-field-label">{{ t('controls.annotations.color') }}</span>
        <input
          class="input input-bordered input-sm w-full font-mono uppercase"
          type="text"
          maxlength="7"
          :value="annotation.color"
          @change="updateColor"
        >
      </label>
      <button
        class="btn btn-ghost btn-sm"
        type="button"
        @click="$emit('update', { color: selectedColor })"
      >
        {{ t('controls.annotations.useSelectedColor') }}
      </button>
      <button
        class="btn btn-error btn-outline btn-sm"
        type="button"
        @click="$emit('delete')"
      >
        <span
          class="mdi mdi-delete-outline"
          aria-hidden="true"
        />{{ t('controls.common.delete') }}
      </button>
    </div>
  </div>
</template>
