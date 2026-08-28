<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PatternAnnotation, TextAnnotation } from '../../../types/pattern'
import type { RenderedAnnotation } from '../../../utils/annotations'
import AppDropdown from '../../../shared/ui/AppDropdown.vue'

type RenderedTextAnnotation = Extract<RenderedAnnotation, { type: 'text' }>

const props = withDefaults(defineProps<{
  annotations: PatternAnnotation[]
  renderedAnnotations: RenderedAnnotation[]
  rowHeaders: number[]
  columnHeaders: number[]
  cellSize: number
  selectedId?: string | null
  headerSize?: number
  disabled?: boolean
}>(), { selectedId: null, headerSize: 32, disabled: false })
const emit = defineEmits<{
  select: [id: string]
  add: [row: number, column: number]
  update: [id: string, text: string]
  remove: [id: string]
}>()
const { t } = useI18n({ useScope: 'global' })
const dropdown = ref<InstanceType<typeof AppDropdown> | null>(null)
const selectedComment = ref<RenderedTextAnnotation | null>(null)
let lastAutoOpenedId: string | null = null

const renderedComments = computed(() => {
  const groupedComments = new Map<string, RenderedTextAnnotation>()
  const rendered: RenderedTextAnnotation[] = []
  for (const annotation of props.renderedAnnotations) {
    if (annotation.type !== 'text') continue
    const key = `${annotation.displayRow}:${annotation.displayColumn}`
    const existing = groupedComments.get(key)
    if (existing) existing.commentCount = (existing.commentCount ?? 1) + 1
    else {
      const grouped: RenderedTextAnnotation = { ...annotation, commentCount: 1 }
      groupedComments.set(key, grouped)
      rendered.push(grouped)
    }
  }
  return rendered
})
const openComments = computed(() => {
  const selected = selectedComment.value
  if (!selected) return []
  return props.annotations.filter((annotation): annotation is TextAnnotation => annotation.type === 'text' && annotation.row === selected.row && annotation.column === selected.column)
})

function buttonStyle(annotation: RenderedTextAnnotation) {
  const size = Math.max(14, Math.min(24, props.cellSize * 0.65))
  return {
    left: `${props.headerSize + (annotation.displayColumn + 1) * props.cellSize - size - 1}px`,
    top: `${props.headerSize + annotation.displayRow * props.cellSize + 1}px`,
    width: `${size}px`,
    height: `${size}px`,
    color: annotation.color,
    fontSize: `${Math.max(12, size * 0.75)}px`,
  }
}

function selectComment(annotation: RenderedTextAnnotation) {
  if (props.disabled) return
  selectedComment.value = annotation
  emit('select', annotation.id)
}

async function openSelectedComment(id: string) {
  await nextTick()
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  const rendered = props.renderedAnnotations.find((annotation) => annotation.type === 'text' && annotation.id === id)
  if (!rendered) return false
  const comment = renderedComments.value.find((candidate) => candidate.displayRow === rendered.displayRow && candidate.displayColumn === rendered.displayColumn)
  const button = document.querySelector<HTMLElement>(`[data-comment-row="${rendered.displayRow}"][data-comment-column="${rendered.displayColumn}"]`)
  if (!comment || !button) return false
  selectedComment.value = comment
  dropdown.value?.openAt(button)
  return true
}

function closeComment(focusAnchor = false) {
  dropdown.value?.close(focusAnchor)
  selectedComment.value = null
}

function handleDropdown(open: boolean) {
  if (!open) selectedComment.value = null
}

function updateComment(id: string, event: Event) {
  emit('update', id, (event.target as HTMLTextAreaElement).value)
}

watch(() => props.annotations, (annotations) => {
  const selected = selectedComment.value
  if (!selected) return
  if (!annotations.some((annotation) => annotation.type === 'text' && annotation.row === selected.row && annotation.column === selected.column)) closeComment()
})
watch([() => props.selectedId, () => props.renderedAnnotations], async ([id]) => {
  if (!id || id === lastAutoOpenedId || !props.renderedAnnotations.some((annotation) => annotation.type === 'text' && annotation.id === id)) return
  if (await openSelectedComment(id)) lastAutoOpenedId = id
}, { flush: 'post' })
</script>

<template>
  <AppDropdown
    ref="dropdown"
    class="contents"
    :label="t('tracker.comments.title')"
    panel-class="annotation-comment-panel w-[min(20rem,calc(100vw-1.5rem))] p-4 shadow-2xl"
    panel-role="dialog"
    @update:open="handleDropdown"
  >
    <template #trigger="{ open, panelId }">
      <button
        v-for="comment in renderedComments"
        :key="comment.renderId"
        :data-comment-row="comment.displayRow"
        :data-comment-column="comment.displayColumn"
        class="absolute z-7 flex items-center justify-center rounded-md border border-current bg-white shadow-sm hover:scale-110 focus-visible:outline-2 focus-visible:outline-primary"
        :class="{ 'pointer-events-none': disabled, 'ring-2 ring-primary ring-offset-1': selectedComment?.renderId === comment.renderId }"
        :style="buttonStyle(comment)"
        type="button"
        :aria-label="t('controls.annotations.commentLabel', { text: comment.text })"
        :aria-controls="panelId"
        :aria-expanded="open && selectedComment?.renderId === comment.renderId"
        @pointerdown.stop="selectComment(comment)"
        @click="selectComment(comment)"
      >
        <span
          class="mdi mdi-comment-outline"
          aria-hidden="true"
        />
        <span
          v-if="(comment.commentCount ?? 0) > 1"
          class="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-content"
        >{{ comment.commentCount }}</span>
      </button>
    </template>
    <template v-if="selectedComment">
      <header class="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 class="font-semibold">
            {{ t(openComments.length === 1 ? 'tracker.comments.title' : 'tracker.comments.multiple', { count: openComments.length }) }}
          </h2>
          <p class="text-xs text-base-content/60">
            {{ t('tracker.comments.coordinates', { row: rowHeaders[selectedComment.displayRow] + 1, column: columnHeaders[selectedComment.displayColumn] + 1 }) }}
          </p>
        </div>
        <button
          class="btn btn-ghost btn-square btn-xs"
          type="button"
          :aria-label="t('tracker.comments.close')"
          @click="closeComment(true)"
        >
          <span
            class="mdi mdi-close text-lg"
            aria-hidden="true"
          />
        </button>
      </header>
      <div class="space-y-3">
        <div
          v-for="comment in openComments"
          :key="comment.id"
          class="rounded-lg bg-base-200/70 p-2"
        >
          <textarea
            class="textarea textarea-bordered textarea-sm min-h-20 w-full resize-y text-sm leading-relaxed"
            maxlength="500"
            :aria-label="t('tracker.comments.edit')"
            :value="comment.text"
            @change="updateComment(comment.id, $event)"
          />
          <div class="flex justify-end">
            <button
              class="btn btn-ghost btn-xs text-error mt-4"
              type="button"
              @click="$emit('remove', comment.id)"
            >
              <span
                class="mdi mdi-delete-outline"
                aria-hidden="true"
              />{{ t('tracker.comments.remove') }}
            </button>
          </div>
        </div>
        <button
          class="btn btn-outline btn-sm w-full"
          type="button"
          @click="$emit('add', selectedComment.row, selectedComment.column)"
        >
          <span
            class="mdi mdi-comment-plus-outline"
            aria-hidden="true"
          />{{ t('tracker.comments.addAnother') }}
        </button>
      </div>
    </template>
  </AppDropdown>
</template>

<style scoped>
@media (max-width: 39.999rem) {
  :deep(.annotation-comment-panel) {
    bottom: 0.75rem;
    left: 0.75rem;
    margin: 0;
    max-height: calc(100dvh - 1.5rem);
    overflow-y: auto;
    position: fixed;
    right: 0.75rem;
    top: auto;
    width: auto;
  }
}
</style>
