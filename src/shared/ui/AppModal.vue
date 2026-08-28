<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'

const props = withDefaults(defineProps<{
  open: boolean
  title: string
  description?: string
  closeLabel: string
  backdropLabel?: string
  size?: 'sm' | 'base' | 'md' | 'lg' | 'wide' | 'xl'
  closeOnBackdrop?: boolean
  showCloseButton?: boolean
  rootClass?: string
  panelClass?: string
  contentClass?: string
}>(), {
  description: '',
  backdropLabel: undefined,
  size: 'md',
  closeOnBackdrop: true,
  showCloseButton: true,
  rootClass: '',
  panelClass: '',
  contentClass: '',
})

const emit = defineEmits<{ close: [] }>()
const panel = ref<HTMLElement | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)
const titleId = `modal-title-${useId()}`
const descriptionId = `modal-description-${useId()}`
let previousFocus: HTMLElement | null = null

const sizeClasses = {
  sm: 'max-w-md',
  base: 'max-w-lg',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  wide: 'max-w-5xl',
  xl: 'max-w-6xl',
} as const

function close() {
  emit('close')
}

function focusableElements() {
  return [...(panel.value?.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  ) ?? [])].filter((element) => !element.hidden && element.getClientRects().length > 0)
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
    return
  }
  if (event.key !== 'Tab') return
  const focusable = focusableElements()
  if (focusable.length === 0) {
    event.preventDefault()
    panel.value?.focus()
    return
  }
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

watch(() => props.open, async (open) => {
  if (open) {
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    await nextTick()
    const autofocusTarget = panel.value?.querySelector<HTMLElement>('[autofocus]')
    if (autofocusTarget) autofocusTarget.focus()
    else closeButton.value?.focus()
    return
  }
  await nextTick()
  previousFocus?.focus()
  previousFocus = null
})

onBeforeUnmount(() => previousFocus?.focus())
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="modal modal-open z-80"
      :class="rootClass"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      :aria-describedby="description ? descriptionId : undefined"
      @keydown="handleKeydown"
    >
      <section
        ref="panel"
        class="modal-box flex max-h-[calc(100dvh-2rem)] w-11/12 flex-col overflow-hidden p-0"
        :class="[sizeClasses[size], panelClass]"
        tabindex="-1"
      >
        <slot
          v-if="$slots.header"
          name="header"
          :close="close"
          :title-id="titleId"
        />
        <header
          v-else
          class="flex shrink-0 items-start justify-between gap-4 border-b border-base-300 px-5 py-4 sm:px-6"
        >
          <div>
            <h2
              :id="titleId"
              class="text-xl font-bold"
            >
              {{ title }}
            </h2>
            <p
              v-if="description"
              :id="descriptionId"
              class="mt-1 text-sm text-base-content/65"
            >
              {{ description }}
            </p>
          </div>
          <button
            v-if="showCloseButton"
            ref="closeButton"
            class="btn btn-ghost btn-square btn-sm shrink-0"
            type="button"
            :aria-label="closeLabel"
            @click="close"
          >
            <span
              class="mdi mdi-close text-xl"
              aria-hidden="true"
            />
          </button>
        </header>

        <div
          class="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6"
          :class="contentClass"
        >
          <slot />
        </div>

        <footer
          v-if="$slots.actions"
          class="flex shrink-0 justify-end gap-2 border-t border-base-300 px-5 py-4 sm:px-6"
        >
          <slot
            name="actions"
            :close="close"
          />
        </footer>
      </section>
      <button
        class="modal-backdrop"
        type="button"
        :aria-label="closeLabel"
        @click="closeOnBackdrop && close()"
      >
        {{ backdropLabel ?? closeLabel }}
      </button>
    </div>
  </Teleport>
</template>
