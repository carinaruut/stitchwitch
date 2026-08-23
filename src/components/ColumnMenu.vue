<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppDropdown from './AppDropdown.vue'
import ColumnControls from './ColumnControls.vue'

defineProps<{ selected: number; count: number }>()
defineEmits<{ before: []; after: []; beginning: []; end: []; fill: []; erase: []; removeCurrent: []; removeColumns: [value: string] }>()
const { t } = useI18n({ useScope: 'global' })
</script>

<template>
  <AppDropdown
    :label="t('controls.menus.columnControls')"
    align="right"
  >
    <template #trigger="{ open, panelId }">
      <button
        class="btn btn-sm"
        :class="open ? 'btn-primary' : 'btn-ghost'"
        type="button"
        :aria-label="t('controls.menus.columnControls')"
        :title="t('controls.menus.columnControls')"
        aria-haspopup="true"
        :aria-controls="panelId"
        :aria-expanded="open"
      >
        <span
          class="mdi mdi-table-column-plus-before text-xl"
          aria-hidden="true"
        />
      </button>
    </template>
    <ColumnControls
      :selected="selected"
      :count="count"
      @before="$emit('before')"
      @after="$emit('after')"
      @beginning="$emit('beginning')"
      @end="$emit('end')"
      @fill="$emit('fill')"
      @erase="$emit('erase')"
      @remove-current="$emit('removeCurrent')"
      @remove-columns="$emit('removeColumns', $event)"
    />
  </AppDropdown>
</template>
