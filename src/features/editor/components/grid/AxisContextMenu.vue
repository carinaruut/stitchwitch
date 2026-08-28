<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ColumnAction, RowAction } from '../../composables/useGridContextMenus'

const props = defineProps<{
  axis: 'row' | 'column'
  index: number
  x: number
  y: number
  selectedCount: number
  sourceCount: number
}>()
const multipleCount = defineModel<number>('multipleCount', { required: true })
const emit = defineEmits<{ rowAction: [action: RowAction]; columnAction: [action: ColumnAction] }>()
const { t } = useI18n({ useScope: 'global' })

const config = computed(() => props.axis === 'row'
  ? {
      singularActions: 'controls.patternGrid.rowActions', selectedActions: 'controls.patternGrid.selectedRowActions',
      heading: 'controls.patternGrid.rowHeading', selectedHeading: 'controls.patternGrid.rowsSelected',
      addLabel: 'controls.patternGrid.addRows', addMultipleLabel: 'controls.patternGrid.addMultipleRows', inputId: 'multiple-rows',
      fillLabel: 'controls.patternGrid.fillRows', eraseLabel: 'controls.patternGrid.eraseRows', deleteLabel: 'controls.patternGrid.deleteRows',
      insertActions: [
        { action: 'above' as const, icon: 'mdi-arrow-up', label: 'controls.patternGrid.addRowAbove' },
        { action: 'below' as const, icon: 'mdi-arrow-down', label: 'controls.patternGrid.addRowBelow' },
      ],
    }
  : {
      singularActions: 'controls.patternGrid.columnActions', selectedActions: 'controls.patternGrid.selectedColumnActions',
      heading: 'controls.patternGrid.columnHeading', selectedHeading: 'controls.patternGrid.columnsSelected',
      addLabel: 'controls.patternGrid.addColumns', addMultipleLabel: 'controls.patternGrid.addMultipleColumns', inputId: 'multiple-columns',
      fillLabel: 'controls.patternGrid.fillColumns', eraseLabel: 'controls.patternGrid.eraseColumns', deleteLabel: 'controls.patternGrid.deleteColumns',
      insertActions: [
        { action: 'before' as const, icon: 'mdi-arrow-left', label: 'controls.patternGrid.addColumnBefore' },
        { action: 'after' as const, icon: 'mdi-arrow-right', label: 'controls.patternGrid.addColumnAfter' },
      ],
    })

function runAction(action: RowAction | ColumnAction) {
  if (props.axis === 'row') emit('rowAction', action as RowAction)
  else emit('columnAction', action as ColumnAction)
}
</script>

<template>
  <div
    class="fixed z-80 w-56 rounded-box border border-base-300 bg-base-100 p-2"
    :style="{ left: `${x}px`, top: `${y}px` }"
    role="menu"
    :aria-label="selectedCount === 1 ? t(config.singularActions, { number: index + 1 }) : t(config.selectedActions, selectedCount)"
    @click.stop
  >
    <p class="px-3 py-2 text-xs font-semibold text-base-content/60">
      {{ selectedCount === 1 ? t(config.heading, { number: index + 1 }) : t(config.selectedHeading, selectedCount) }}
    </p>
    <ul class="menu menu-sm w-full p-0">
      <li
        v-for="item in config.insertActions"
        :key="item.action"
      >
        <button
          type="button"
          role="menuitem"
          @click="runAction(item.action)"
        >
          <span
            class="mdi"
            :class="item.icon"
            aria-hidden="true"
          />{{ t(item.label) }}
        </button>
      </li>
    </ul>
    <div class="my-1 flex items-center gap-2 border-y border-base-300 px-3 py-2">
      <label
        class="text-xs"
        :for="config.inputId"
      >{{ t(config.addLabel) }}</label>
      <input
        :id="config.inputId"
        v-model.number="multipleCount"
        class="input input-bordered input-xs min-w-0 flex-1"
        type="number"
        min="1"
        max="50"
      >
      <button
        class="btn btn-primary btn-xs btn-square"
        type="button"
        :aria-label="t(config.addMultipleLabel)"
        @click="runAction('multiple')"
      >
        <span
          class="mdi mdi-plus"
          aria-hidden="true"
        />
      </button>
    </div>
    <ul class="menu menu-sm w-full p-0">
      <li>
        <button
          type="button"
          role="menuitem"
          @click="runAction('fill')"
        >
          <span
            class="mdi mdi-format-color-fill"
            aria-hidden="true"
          />{{ t(config.fillLabel, selectedCount) }}
        </button>
      </li>
      <li>
        <button
          type="button"
          role="menuitem"
          @click="runAction('erase')"
        >
          <span
            class="mdi mdi-eraser"
            aria-hidden="true"
          />{{ t(config.eraseLabel, selectedCount) }}
        </button>
      </li>
      <li>
        <button
          class="text-error"
          type="button"
          role="menuitem"
          :disabled="sourceCount <= 1"
          @click="runAction('delete')"
        >
          <span
            class="mdi mdi-delete-outline"
            aria-hidden="true"
          />{{ t(config.deleteLabel, selectedCount) }}
        </button>
      </li>
    </ul>
  </div>
</template>
