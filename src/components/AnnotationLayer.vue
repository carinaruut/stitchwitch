<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import type { RenderedAnnotation } from '../utils/annotations'

const props = withDefaults(defineProps<{
  annotations: RenderedAnnotation[]
  rows: number
  columns: number
  selectedId?: string | null
  editable?: boolean
  headerSize?: number
  headerUnit?: 'px' | 'mm'
}>(), { selectedId: null, editable: false, headerSize: 28, headerUnit: 'px' })
const emit = defineEmits<{
  select: [id: string]
  move: [id: string, rowDelta: number, columnDelta: number]
  moveEndpoint: [id: string, rowDelta: number, columnDelta: number]
}>()
const { t } = useI18n({ useScope: 'global' })
const svg = ref<SVGSVGElement | null>(null)
const arrowheadId = `annotation-arrowhead-${useId().replaceAll(':', '')}`
const drag = ref<{ id: string; endpoint: boolean; startX: number; startY: number; rowDelta: number; columnDelta: number } | null>(null)

const cursorClass = computed(() => props.editable ? 'pointer-events-none [&_.annotation-hit]:pointer-events-auto' : 'pointer-events-none')

function annotationLabel(annotation: RenderedAnnotation) {
  return annotation.type === 'text'
    ? t('controls.annotations.commentLabel', { text: annotation.text })
    : t(`controls.annotations.types.${annotation.type}`)
}

function commentBounds(annotation: RenderedAnnotation) {
  return {
    left: annotation.displayColumn + 0.18,
    top: annotation.displayRow + 0.2,
    right: annotation.displayColumn + 0.82,
    bottom: annotation.displayRow + 0.68,
  }
}

function commentPath(annotation: RenderedAnnotation) {
  const { left, top, right, bottom } = commentBounds(annotation)
  return `M ${left + 0.1} ${top} H ${right - 0.1} Q ${right} ${top} ${right} ${top + 0.1} V ${bottom - 0.1} Q ${right} ${bottom} ${right - 0.1} ${bottom} H ${left + 0.3} L ${left + 0.12} ${bottom + 0.16} V ${bottom} H ${left + 0.1} Q ${left} ${bottom} ${left} ${bottom - 0.1} V ${top + 0.1} Q ${left} ${top} ${left + 0.1} ${top} Z`
}

function commentCenter(annotation: RenderedAnnotation) {
  const bounds = commentBounds(annotation)
  return { x: (bounds.left + bounds.right) / 2, y: (bounds.top + bounds.bottom) / 2 }
}

function transform(annotation: RenderedAnnotation) {
  if (drag.value?.id !== annotation.id || drag.value.endpoint) return undefined
  return `translate(${drag.value.columnDelta} ${drag.value.rowDelta})`
}

function startDrag(id: string, endpoint: boolean, event: PointerEvent) {
  if (!props.editable || event.button !== 0) return
  event.preventDefault()
  event.stopPropagation()
  emit('select', id)
  drag.value = { id, endpoint, startX: event.clientX, startY: event.clientY, rowDelta: 0, columnDelta: 0 }
  window.addEventListener('pointermove', continueDrag)
  window.addEventListener('pointerup', finishDrag, { once: true })
  window.addEventListener('pointercancel', cancelDrag, { once: true })
}

function continueDrag(event: PointerEvent) {
  if (!drag.value || !svg.value) return
  const rect = svg.value.getBoundingClientRect()
  drag.value.columnDelta = Math.round((event.clientX - drag.value.startX) / rect.width * props.columns)
  drag.value.rowDelta = Math.round((event.clientY - drag.value.startY) / rect.height * props.rows)
}

function finishDrag() {
  const current = drag.value
  cancelDrag()
  if (!current || (!current.rowDelta && !current.columnDelta)) return
  if (current.endpoint) emit('moveEndpoint', current.id, current.rowDelta, current.columnDelta)
  else emit('move', current.id, current.rowDelta, current.columnDelta)
}

function cancelDrag() {
  drag.value = null
  window.removeEventListener('pointermove', continueDrag)
  window.removeEventListener('pointerup', finishDrag)
  window.removeEventListener('pointercancel', cancelDrag)
}

onBeforeUnmount(cancelDrag)
</script>

<template>
  <svg
    ref="svg"
    class="annotation-layer absolute z-6 overflow-visible"
    :class="cursorClass"
    :viewBox="`0 0 ${columns} ${rows}`"
    :style="{ left: `${headerSize}${headerUnit}`, top: `${headerSize}${headerUnit}`, width: `calc(100% - ${headerSize}${headerUnit})`, height: `calc(100% - ${headerSize}${headerUnit})` }"
    :aria-label="t('controls.annotations.layerLabel')"
  >
    <defs>
      <marker
        :id="arrowheadId"
        markerWidth="0.55"
        markerHeight="0.55"
        refX="0.48"
        refY="0.275"
        orient="auto-start-reverse"
        markerUnits="userSpaceOnUse"
      >
        <path
          d="M0,0 L0.55,0.275 L0,0.55 Z"
          fill="context-stroke"
        />
      </marker>
    </defs>
    <g
      v-for="annotation in annotations"
      :key="annotation.renderId"
      :transform="transform(annotation)"
      class="annotation-hit"
      :class="editable ? 'cursor-move' : ''"
      :aria-label="annotationLabel(annotation)"
      role="img"
      @pointerdown="startDrag(annotation.id, false, $event)"
    >
      <template v-if="annotation.type === 'text'">
        <rect
          :x="commentBounds(annotation).left - 0.08"
          :y="commentBounds(annotation).top - 0.06"
          :width="commentBounds(annotation).right - commentBounds(annotation).left + 0.16"
          :height="commentBounds(annotation).bottom - commentBounds(annotation).top + 0.28"
          fill="transparent"
          pointer-events="all"
        />
        <path
          :d="commentPath(annotation)"
          fill="white"
          stroke="white"
          stroke-width="0.28"
          stroke-linejoin="round"
        />
        <path
          :d="commentPath(annotation)"
          fill="white"
          :stroke="annotation.color"
          stroke-width="0.12"
          stroke-linejoin="round"
        />
        <circle
          v-if="selectedId === annotation.id"
          :cx="commentCenter(annotation).x"
          :cy="commentCenter(annotation).y"
          r="0.46"
          fill="none"
          stroke="var(--color-primary)"
          stroke-width="0.1"
        />
      </template>
      <template v-else-if="annotation.type === 'marker'">
        <circle
          :cx="annotation.displayColumn + 0.5"
          :cy="annotation.displayRow + 0.5"
          r="0.3"
          :fill="annotation.color"
          stroke="white"
          stroke-width="0.12"
        />
        <circle
          :cx="annotation.displayColumn + 0.5"
          :cy="annotation.displayRow + 0.5"
          r="0.09"
          fill="white"
        />
        <circle
          v-if="selectedId === annotation.id"
          :cx="annotation.displayColumn + 0.5"
          :cy="annotation.displayRow + 0.5"
          r="0.4"
          fill="none"
          stroke="var(--color-primary)"
          stroke-width="0.1"
        />
      </template>
      <template v-else>
        <line
          :x1="annotation.displayColumn + 0.5"
          :y1="annotation.displayRow + 0.5"
          :x2="(annotation.displayEndColumn ?? annotation.displayColumn) + 0.5"
          :y2="(annotation.displayEndRow ?? annotation.displayRow) + 0.5"
          stroke="white"
          stroke-width="0.28"
          stroke-linecap="round"
        />
        <line
          :x1="annotation.displayColumn + 0.5"
          :y1="annotation.displayRow + 0.5"
          :x2="(annotation.displayEndColumn ?? annotation.displayColumn) + 0.5"
          :y2="(annotation.displayEndRow ?? annotation.displayRow) + 0.5"
          :stroke="annotation.color"
          stroke-width="0.14"
          stroke-linecap="round"
          :marker-end="`url(#${arrowheadId})`"
        />
        <template v-if="selectedId === annotation.id">
          <circle
            :cx="annotation.displayColumn + 0.5"
            :cy="annotation.displayRow + 0.5"
            r="0.18"
            fill="white"
            stroke="var(--color-primary)"
            stroke-width="0.1"
          />
          <circle
            class="cursor-crosshair"
            :cx="(annotation.displayEndColumn ?? annotation.displayColumn) + 0.5"
            :cy="(annotation.displayEndRow ?? annotation.displayRow) + 0.5"
            r="0.22"
            fill="white"
            stroke="var(--color-primary)"
            stroke-width="0.1"
            @pointerdown.stop="startDrag(annotation.id, true, $event)"
          />
        </template>
      </template>
    </g>
  </svg>
</template>
