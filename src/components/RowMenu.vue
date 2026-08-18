<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import ClickPopover from './ClickPopover.vue'
import RowControls from './RowControls.vue'

defineProps<{ selected: number; count: number }>()
defineEmits<{ before: []; after: []; beginning: []; end: []; fill: []; erase: []; removeCurrent: []; removeRows: [value: string] }>()
const { t } = useI18n({ useScope: 'global' })
</script>

<template>
  <ClickPopover
    :label="t('controls.menus.rowControls')"
    align="right"
  >
    <template #trigger="{ open, panelId }">
      <button
        class="btn btn-sm"
        :class="open ? 'btn-primary' : 'btn-ghost'"
        type="button"
        :aria-label="t('controls.menus.rowControls')"
        :title="t('controls.menus.rowControls')"
        aria-haspopup="true"
        :aria-controls="panelId"
        :aria-expanded="open"
      >
        <span
          class="mdi mdi-table-row-plus-before text-xl"
          aria-hidden="true"
        />
      </button>
    </template>
    <RowControls
      :selected="selected"
      :count="count"
      @before="$emit('before')"
      @after="$emit('after')"
      @beginning="$emit('beginning')"
      @end="$emit('end')"
      @fill="$emit('fill')"
      @erase="$emit('erase')"
      @remove-current="$emit('removeCurrent')"
      @remove-rows="$emit('removeRows', $event)"
    />
  </ClickPopover>
</template>
