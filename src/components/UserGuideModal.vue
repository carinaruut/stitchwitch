<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()
const closeButton = ref<HTMLButtonElement | null>(null)
const guideContent = ref<HTMLElement | null>(null)
const { t } = useI18n({ useScope: 'global' })
const sections = [
  { id: 'start', label: 'guide.nav.start' },
  { id: 'tools', label: 'guide.nav.tools' },
  { id: 'selection', label: 'guide.nav.selection' },
  { id: 'mirrors', label: 'guide.nav.mirrors' },
  { id: 'repeats', label: 'guide.nav.repeats' },
  { id: 'canvas', label: 'guide.nav.canvas' },
  { id: 'tracker', label: 'guide.nav.tracker' },
  { id: 'saving', label: 'guide.nav.saving' },
  { id: 'output', label: 'guide.nav.output' },
] as const

function handleEscape(event: KeyboardEvent) {
  if (props.open && event.key === 'Escape') emit('close')
}

function scrollToSection(id: string) {
  const container = guideContent.value
  const section = container?.querySelector<HTMLElement>(`#guide-${id}`)
  if (!container || !section) return
  const top = section.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - 16
  container.scrollTo({ top, behavior: 'smooth' })
}

watch(() => props.open, async (open) => {
  if (!open) return
  await nextTick()
  closeButton.value?.focus()
})

onMounted(() => window.addEventListener('keydown', handleEscape))
onBeforeUnmount(() => window.removeEventListener('keydown', handleEscape))
</script>

<template>
  <div
    v-if="open"
    class="modal modal-open z-[90]"
    role="dialog"
    aria-modal="true"
    aria-labelledby="user-guide-title"
  >
    <article class="modal-box flex max-h-[88dvh] w-11/12 max-w-5xl flex-col overflow-hidden p-0">
      <header class="flex shrink-0 items-start justify-between gap-4 border-b border-base-300 bg-base-100 px-5 py-4 sm:px-7">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-primary-content">
            Stitch Witch
          </p>
          <h1
            id="user-guide-title"
            class="mt-1 text-2xl font-bold"
          >
            {{ t('guide.title') }}
          </h1>
        </div>
        <button
          ref="closeButton"
          class="btn btn-ghost btn-sm btn-square"
          type="button"
          :aria-label="t('guide.close')"
          @click="$emit('close')"
        >
          <span
            class="mdi mdi-close text-xl"
            aria-hidden="true"
          />
        </button>
      </header>

      <nav
        class="flex shrink-0 gap-1 overflow-x-auto border-b border-base-300 bg-base-200/60 px-5 py-2 sm:px-7"
        :aria-label="t('guide.sectionsLabel')"
      >
        <button
          v-for="item in sections"
          :key="item.id"
          class="btn btn-ghost btn-xs shrink-0"
          type="button"
          @click="scrollToSection(item.id)"
        >
          {{ t(item.label) }}
        </button>
      </nav>

      <div
        ref="guideContent"
        class="overflow-y-auto bg-base-100 px-5 py-5 sm:px-7 sm:py-6"
      >
        <section
          id="guide-start"
          class="scroll-mt-4"
        >
          <div class="rounded-box bg-primary px-5 py-5 text-primary-content">
            <div class="flex items-center gap-3">
              <span
                class="mdi mdi-creation text-3xl"
                aria-hidden="true"
              />
              <div>
                <h2 class="text-lg font-bold">
                  {{ t('guide.start.title') }}
                </h2>
                <p class="text-sm opacity-80">
                  {{ t('guide.start.intro') }}
                </p>
              </div>
            </div>
            <ol class="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <li class="rounded-box bg-primary-content/10 p-3">
                <strong class="block">{{ t('guide.start.newTitle') }}</strong>{{ t('guide.start.newText') }}
              </li>
              <li class="rounded-box bg-primary-content/10 p-3">
                <strong class="block">{{ t('guide.start.colorTitle') }}</strong>{{ t('guide.start.colorText') }}
              </li>
              <li class="rounded-box bg-primary-content/10 p-3">
                <strong class="block">{{ t('guide.start.drawTitle') }}</strong>{{ t('guide.start.drawText') }}
              </li>
              <li class="rounded-box bg-primary-content/10 p-3">
                <strong class="block">{{ t('guide.start.exportTitle') }}</strong>{{ t('guide.start.exportText') }}
              </li>
            </ol>
          </div>
        </section>

        <section
          id="guide-tools"
          class="mt-8 scroll-mt-4"
        >
          <div class="mb-3 flex items-center gap-2">
            <span
              class="mdi mdi-tools text-xl text-primary-content"
              aria-hidden="true"
            />
            <h2 class="text-xl font-bold">
              {{ t('guide.tools.title') }}
            </h2>
          </div>
          <div class="grid gap-3 md:grid-cols-2">
            <article class="rounded-box border border-base-300 p-4">
              <h3 class="font-bold">
                {{ t('guide.tools.colorTitle') }}
              </h3>
              <p class="mt-1 text-sm text-base-content/70">
                {{ t('guide.tools.colorText') }}
              </p>
            </article>
            <article class="rounded-box border border-base-300 p-4">
              <h3 class="font-bold">
                {{ t('guide.tools.pencilTitle') }}
              </h3>
              <p class="mt-1 text-sm text-base-content/70">
                <span class="font-semibold">{{ t('guide.tools.pencilName') }}</span> {{ t('guide.tools.pencilBeforeEraser') }} <span class="font-semibold">{{ t('guide.tools.eraserName') }}</span> {{ t('guide.tools.pencilAfterEraser') }}
              </p>
            </article>
            <article class="rounded-box border border-base-300 p-4">
              <h3 class="font-bold">
                {{ t('guide.tools.fillTitle') }}
              </h3>
              <p class="mt-1 text-sm text-base-content/70">
                {{ t('guide.tools.fillText') }}
              </p>
            </article>
            <article class="rounded-box border border-base-300 p-4">
              <h3 class="font-bold">
                {{ t('guide.tools.otherTitle') }}
              </h3>
              <p class="mt-1 text-sm text-base-content/70">
                {{ t('guide.tools.otherText') }}
              </p>
            </article>
          </div>
          <p class="mt-3 text-xs text-base-content/55">
            {{ t('guide.tools.shortcutsLead') }} <kbd class="kbd kbd-xs">P</kbd> {{ t('guide.tools.shortcutPencil') }}, <kbd class="kbd kbd-xs">E</kbd> {{ t('guide.tools.shortcutEraser') }}, <kbd class="kbd kbd-xs">F</kbd> {{ t('guide.tools.shortcutFill') }}, <kbd class="kbd kbd-xs">I</kbd> {{ t('guide.tools.shortcutEyedropper') }}, <kbd class="kbd kbd-xs">S</kbd> {{ t('guide.tools.shortcutSelect') }}, <kbd class="kbd kbd-xs">W</kbd> {{ t('guide.tools.shortcutWand') }}, <kbd class="kbd kbd-xs">H</kbd> {{ t('guide.tools.shortcutPan') }}.
          </p>
          <p class="mt-2 text-xs text-base-content/55">
            {{ t('guide.tools.editingLead') }} <kbd class="kbd kbd-xs">Ctrl/Cmd Z</kbd> {{ t('guide.tools.undo') }}, <kbd class="kbd kbd-xs">Ctrl Y</kbd> / <kbd class="kbd kbd-xs">Ctrl/Cmd Shift Z</kbd> {{ t('guide.tools.redo') }}.
          </p>
        </section>

        <section
          id="guide-selection"
          class="mt-8 scroll-mt-4"
        >
          <div class="mb-3 flex items-center gap-2">
            <span
              class="mdi mdi-select-drag text-xl text-primary-content"
              aria-hidden="true"
            />
            <h2 class="text-xl font-bold">
              {{ t('guide.selection.title') }}
            </h2>
          </div>
          <div class="rounded-box border border-base-300 p-4">
            <p class="text-sm text-base-content/70">
              {{ t('guide.selection.intro') }}
            </p>
            <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div class="rounded-box bg-base-200 p-3 text-sm">
                <strong class="block">{{ t('guide.selection.copyTitle') }}</strong>{{ t('guide.selection.copyText') }}
              </div>
              <div class="rounded-box bg-base-200 p-3 text-sm">
                <strong class="block">{{ t('guide.selection.pasteTitle') }}</strong>{{ t('guide.selection.pasteText') }}
              </div>
              <div class="rounded-box bg-base-200 p-3 text-sm">
                <strong class="block">{{ t('guide.selection.flipHorizontalTitle') }}</strong>{{ t('guide.selection.flipHorizontalText') }}
              </div>
              <div class="rounded-box bg-base-200 p-3 text-sm">
                <strong class="block">{{ t('guide.selection.flipVerticalTitle') }}</strong>{{ t('guide.selection.flipVerticalText') }}
              </div>
            </div>
            <p class="mt-3 text-xs text-base-content/55">
              {{ t('guide.selection.note') }}
            </p>
          </div>
        </section>

        <section
          id="guide-mirrors"
          class="mt-8 scroll-mt-4"
        >
          <div class="mb-3 flex items-center gap-2">
            <span
              class="mdi mdi-reflect-horizontal text-xl text-primary-content"
              aria-hidden="true"
            />
            <h2 class="text-xl font-bold">
              {{ t('guide.mirrors.title') }}
            </h2>
          </div>
          <div class="grid gap-3 md:grid-cols-2">
            <article class="rounded-box border border-base-300 p-4">
              <h3 class="font-bold">
                {{ t('guide.mirrors.verticalTitle') }}
              </h3>
              <p class="mt-1 text-sm text-base-content/70">
                {{ t('guide.mirrors.verticalText') }}
              </p>
            </article>
            <article class="rounded-box border border-base-300 p-4">
              <h3 class="font-bold">
                {{ t('guide.mirrors.horizontalTitle') }}
              </h3>
              <p class="mt-1 text-sm text-base-content/70">
                {{ t('guide.mirrors.horizontalText') }}
              </p>
            </article>
          </div>
        </section>

        <section
          id="guide-repeats"
          class="mt-8 scroll-mt-4"
        >
          <div class="mb-3 flex items-center gap-2">
            <span
              class="mdi mdi-repeat text-xl text-primary-content"
              aria-hidden="true"
            />
            <h2 class="text-xl font-bold">
              {{ t('guide.repeats.title') }}
            </h2>
          </div>
          <div class="rounded-box border border-base-300 p-4">
            <p class="text-sm text-base-content/70">
              {{ t('guide.repeats.introBeforeAcross') }} <strong>{{ t('guide.repeats.across') }}</strong> {{ t('guide.repeats.introBetween') }} <strong>{{ t('guide.repeats.down') }}</strong> {{ t('guide.repeats.introAfterDown') }}
            </p>
            <div class="mt-4 grid gap-3 md:grid-cols-2">
              <div class="rounded-box bg-base-200 p-3 text-sm">
                <strong class="block">{{ t('guide.repeats.countTitle') }}</strong>{{ t('guide.repeats.countText') }}
              </div>
              <div class="rounded-box bg-base-200 p-3 text-sm">
                <strong class="block">{{ t('guide.repeats.boundaryTitle') }}</strong>{{ t('guide.repeats.boundaryText') }}
              </div>
            </div>
            <div class="alert mt-4 border-accent bg-accent text-sm text-accent-content">
              <span
                class="mdi mdi-lightbulb-outline"
                aria-hidden="true"
              />
              <span>{{ t('guide.repeats.exampleBefore') }} <strong>{{ t('guide.repeats.exampleRange') }}</strong>.</span>
            </div>
            <p class="mt-3 text-sm text-base-content/70">
              {{ t('guide.repeats.note') }}
            </p>
          </div>
        </section>

        <section
          id="guide-canvas"
          class="mt-8 scroll-mt-4"
        >
          <div class="mb-3 flex items-center gap-2">
            <span
              class="mdi mdi-grid text-xl text-primary-content"
              aria-hidden="true"
            />
            <h2 class="text-xl font-bold">
              {{ t('guide.canvas.title') }}
            </h2>
          </div>
          <div class="grid gap-3 md:grid-cols-2">
            <article class="rounded-box border border-base-300 p-4">
              <h3 class="font-bold">
                {{ t('guide.canvas.rowsTitle') }}
              </h3>
              <p class="mt-1 text-sm text-base-content/70">
                {{ t('guide.canvas.rowsTextBefore') }} <strong>{{ t('guide.canvas.rowsExampleOne') }}</strong> {{ t('guide.canvas.rowsTextBetween') }} <strong>{{ t('guide.canvas.rowsExampleTwo') }}</strong>{{ t('guide.canvas.rowsTextAfter') }}
              </p>
            </article>
            <article class="rounded-box border border-base-300 p-4">
              <h3 class="font-bold">
                {{ t('guide.canvas.displayTitle') }}
              </h3>
              <p class="mt-1 text-sm text-base-content/70">
                {{ t('guide.canvas.displayText') }}
              </p>
            </article>
            <article class="rounded-box border border-base-300 p-4 md:col-span-2">
              <h3 class="font-bold">
                {{ t('guide.canvas.referenceTitle') }}
              </h3>
              <p class="mt-1 text-sm text-base-content/70">
                {{ t('guide.canvas.referenceText') }}
              </p>
            </article>
          </div>
        </section>

        <section
          id="guide-tracker"
          class="mt-8 scroll-mt-4"
        >
          <div class="mb-3 flex items-center gap-2">
            <span
              class="mdi mdi-progress-check text-xl text-primary-content"
              aria-hidden="true"
            />
            <h2 class="text-xl font-bold">
              {{ t('guide.tracker.title') }}
            </h2>
          </div>
          <div class="rounded-box border border-base-300 p-4">
            <p class="text-sm text-base-content/70">
              {{ t('guide.tracker.intro') }}
            </p>
            <p class="mt-3 text-sm text-base-content/70">
              {{ t('guide.tracker.recoveryBefore') }} <code>.stitch-tracker</code> {{ t('guide.tracker.recoveryAfter') }}
            </p>
          </div>
        </section>

        <section
          id="guide-saving"
          class="mt-8 scroll-mt-4"
        >
          <div class="mb-3 flex items-center gap-2">
            <span
              class="mdi mdi-content-save-check-outline text-xl text-primary-content"
              aria-hidden="true"
            />
            <h2 class="text-xl font-bold">
              {{ t('guide.saving.title') }}
            </h2>
          </div>
          <div class="grid gap-3 md:grid-cols-3">
            <article class="rounded-box border border-base-300 p-4">
              <h3 class="font-bold">
                {{ t('guide.saving.autosaveTitle') }}
              </h3><p class="mt-1 text-sm text-base-content/70">
                {{ t('guide.saving.autosaveText') }}
              </p>
            </article>
            <article class="rounded-box border border-base-300 p-4">
              <h3 class="font-bold">
                {{ t('guide.saving.saveTitle') }}
              </h3><p class="mt-1 text-sm text-base-content/70">
                {{ t('guide.saving.saveBefore') }} <code>.stitch-pattern</code> {{ t('guide.saving.saveAfter') }}
              </p>
            </article>
            <article class="rounded-box border border-base-300 p-4">
              <h3 class="font-bold">
                {{ t('guide.saving.openTitle') }}
              </h3><p class="mt-1 text-sm text-base-content/70">
                {{ t('guide.saving.openText') }}
              </p>
            </article>
          </div>
        </section>

        <section
          id="guide-output"
          class="mt-8 scroll-mt-4"
        >
          <div class="mb-3 flex items-center gap-2">
            <span
              class="mdi mdi-printer-outline text-xl text-primary-content"
              aria-hidden="true"
            />
            <h2 class="text-xl font-bold">
              {{ t('guide.output.title') }}
            </h2>
          </div>
          <div class="rounded-box border border-base-300 p-4">
            <p class="text-sm text-base-content/70">
              {{ t('guide.output.intro') }}
            </p>
            <p class="mt-3 text-sm text-base-content/70">
              {{ t('guide.output.themeNote') }}
            </p>
          </div>
        </section>

        <section class="mt-8 border-t border-base-300 pt-5">
          <h2 class="text-lg font-bold">
            {{ t('guide.accessibility.title') }}
          </h2>
          <div class="mt-3 flex flex-wrap gap-2 text-sm">
            <span class="rounded-box bg-base-200 px-3 py-2"><kbd class="kbd kbd-sm">Ctrl/Cmd</kbd> + <kbd class="kbd kbd-sm">C</kbd> {{ t('guide.accessibility.copy') }}</span>
            <span class="rounded-box bg-base-200 px-3 py-2"><kbd class="kbd kbd-sm">Ctrl/Cmd</kbd> + <kbd class="kbd kbd-sm">V</kbd> {{ t('guide.accessibility.paste') }}</span>
            <span class="rounded-box bg-base-200 px-3 py-2"><kbd class="kbd kbd-sm">Esc</kbd> {{ t('guide.accessibility.escape') }}</span>
            <span class="rounded-box bg-base-200 px-3 py-2"><kbd class="kbd kbd-sm">Enter</kbd> / <kbd class="kbd kbd-sm">Space</kbd> {{ t('guide.accessibility.activate') }}</span>
          </div>
        </section>
      </div>
    </article>
    <button
      class="modal-backdrop"
      type="button"
      :aria-label="t('guide.close')"
      @click="$emit('close')"
    >
      {{ t('guide.close') }}
    </button>
  </div>
</template>
