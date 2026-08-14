<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()
const closeButton = ref<HTMLButtonElement | null>(null)

function handleEscape(event: KeyboardEvent) {
  if (props.open && event.key === 'Escape') emit('close')
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
  <div v-if="open" class="modal modal-open z-[90]" role="dialog" aria-modal="true" aria-labelledby="user-guide-title">
    <article class="modal-box flex max-h-[88dvh] w-11/12 max-w-5xl flex-col overflow-hidden p-0">
      <header class="flex shrink-0 items-start justify-between gap-4 border-b border-base-300 bg-base-100 px-5 py-4 sm:px-7">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Stitch Witch</p>
          <h1 id="user-guide-title" class="mt-1 text-2xl font-bold">User guide</h1>
          <p class="mt-1 text-sm text-base-content/60">Design, repeat, preview, and save color charts entirely in your browser.</p>
        </div>
        <button ref="closeButton" class="btn btn-ghost btn-sm btn-square" type="button" aria-label="Close user guide" @click="$emit('close')">
          <span class="mdi mdi-close text-xl" aria-hidden="true"></span>
        </button>
      </header>

      <nav class="flex shrink-0 gap-1 overflow-x-auto border-b border-base-300 bg-base-200/60 px-5 py-2 sm:px-7" aria-label="User guide sections">
        <a v-for="item in ['Start', 'Tools', 'Selection', 'Mirrors', 'Repeats', 'Canvas', 'Tracker', 'Saving', 'Output']" :key="item" class="btn btn-ghost btn-xs shrink-0" :href="`#guide-${item.toLowerCase()}`">{{ item }}</a>
      </nav>

      <div class="overflow-y-auto bg-base-100 px-5 py-5 sm:px-7 sm:py-6">
        <section id="guide-start" class="scroll-mt-4">
          <div class="rounded-box bg-primary px-5 py-5 text-primary-content">
            <div class="flex items-center gap-3">
              <span class="mdi mdi-creation text-3xl" aria-hidden="true"></span>
              <div>
                <h2 class="text-lg font-bold">Quick start</h2>
                <p class="text-sm opacity-80">Create a chart and place your first colors in four steps.</p>
              </div>
            </div>
            <ol class="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <li class="rounded-box bg-primary-content/10 p-3"><strong class="block">1. New</strong>Choose a project name, rows, columns, cell size, and background.</li>
              <li class="rounded-box bg-primary-content/10 p-3"><strong class="block">2. Color</strong>Pick a color in the left panel or enter its hex value.</li>
              <li class="rounded-box bg-primary-content/10 p-3"><strong class="block">3. Draw</strong>Use Pencil, Fill, or the live mirror lines on the canvas.</li>
              <li class="rounded-box bg-primary-content/10 p-3"><strong class="block">4. Export</strong>Download the project, or print the preview and chart as PDF.</li>
            </ol>
          </div>
        </section>

        <section id="guide-tools" class="mt-8 scroll-mt-4">
          <div class="mb-3 flex items-center gap-2">
            <span class="mdi mdi-tools text-xl text-primary" aria-hidden="true"></span>
            <h2 class="text-xl font-bold">Drawing and colors</h2>
          </div>
           <div class="grid gap-3 md:grid-cols-2">
            <article class="rounded-box border border-base-300 p-4">
              <h3 class="font-bold">Color controls</h3>
              <p class="mt-1 text-sm text-base-content/70">Click the color swatch to open the browser picker. You can also enter a hex color, reuse a recent color, or choose Eyedropper and sample a cell. Colors used by Pencil and Fill are added to Recent colors.</p>
            </article>
            <article class="rounded-box border border-base-300 p-4">
              <h3 class="font-bold">Pencil and Eraser</h3>
              <p class="mt-1 text-sm text-base-content/70"><span class="font-semibold">Pencil</span> paints the selected color. <span class="font-semibold">Eraser</span> restores the project background. Press and drag across cells for a continuous stroke; the whole stroke is one undo action.</p>
            </article>
            <article class="rounded-box border border-base-300 p-4">
              <h3 class="font-bold">Fill</h3>
              <p class="mt-1 text-sm text-base-content/70">Fill changes a connected area of matching color. With no selection, it can flow through the full canvas. With a selection, click inside to restrict fill inside it, or click outside to preserve the selected area and fill outside.</p>
            </article>
             <article class="rounded-box border border-base-300 p-4">
               <h3 class="font-bold">Eyedropper, Pan, and Clear</h3>
               <p class="mt-1 text-sm text-base-content/70">Eyedropper samples one cell and returns to Pencil. Pan lets you drag the viewport without changing cells. Clear returns every cell to the background after confirmation and can be undone.</p>
             </article>
           </div>
           <p class="mt-3 text-xs text-base-content/55">Tool shortcuts: <kbd class="kbd kbd-xs">P</kbd> Pencil, <kbd class="kbd kbd-xs">E</kbd> Eraser, <kbd class="kbd kbd-xs">F</kbd> Fill, <kbd class="kbd kbd-xs">I</kbd> Eyedropper, <kbd class="kbd kbd-xs">S</kbd> Select, and <kbd class="kbd kbd-xs">H</kbd> Pan.</p>
         </section>

        <section id="guide-selection" class="mt-8 scroll-mt-4">
          <div class="mb-3 flex items-center gap-2">
            <span class="mdi mdi-select-drag text-xl text-primary" aria-hidden="true"></span>
            <h2 class="text-xl font-bold">Selection tools</h2>
          </div>
          <div class="rounded-box border border-base-300 p-4">
             <p class="text-sm text-base-content/70">Choose Select and drag a rectangle. Drag from inside the selection to move it directly, or choose Move and then click a destination. Clicking outside with Select cancels the selection.</p>
            <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div class="rounded-box bg-base-200 p-3 text-sm"><strong class="block">Copy</strong>Stores the selected cells in the internal clipboard.</div>
              <div class="rounded-box bg-base-200 p-3 text-sm"><strong class="block">Paste</strong>Places the clipboard at the selection's top-left cell and expands the canvas if needed.</div>
              <div class="rounded-box bg-base-200 p-3 text-sm"><strong class="block">Flip horizontally</strong>Reverses the selection left to right.</div>
              <div class="rounded-box bg-base-200 p-3 text-sm"><strong class="block">Flip vertically</strong>Reverses the selection top to bottom.</div>
            </div>
            <p class="mt-3 text-xs text-base-content/55">Copy, paste, move, and flip respect repeat-box source cells. Paste and move are limited to 500 rows or columns.</p>
          </div>
        </section>

        <section id="guide-mirrors" class="mt-8 scroll-mt-4">
          <div class="mb-3 flex items-center gap-2">
            <span class="mdi mdi-reflect-horizontal text-xl text-primary" aria-hidden="true"></span>
            <h2 class="text-xl font-bold">Live mirror lines</h2>
          </div>
          <div class="grid gap-3 md:grid-cols-2">
            <article class="rounded-box border border-base-300 p-4">
              <h3 class="font-bold">Vertical line</h3>
              <p class="mt-1 text-sm text-base-content/70">Reflects each Pencil, Eraser, or Fill action between the left and right sides. The active center line appears on the canvas.</p>
            </article>
            <article class="rounded-box border border-base-300 p-4">
              <h3 class="font-bold">Horizontal line</h3>
              <p class="mt-1 text-sm text-base-content/70">Reflects actions between the top and bottom. Enable both lines for four-way symmetry. These controls mirror new drawing; they do not flip existing work.</p>
            </article>
          </div>
        </section>

        <section id="guide-repeats" class="mt-8 scroll-mt-4">
          <div class="mb-3 flex items-center gap-2">
            <span class="mdi mdi-repeat text-xl text-primary" aria-hidden="true"></span>
            <h2 class="text-xl font-bold">Repeat boxes</h2>
          </div>
          <div class="rounded-box border border-base-300 p-4">
            <p class="text-sm text-base-content/70">A repeat box divides one rectangular area into equal sections. The first section is the source; editing any displayed copy updates every section. Choose <strong>Across</strong> for side-by-side sections or <strong>Down</strong> for stacked sections.</p>
            <div class="mt-4 grid gap-3 md:grid-cols-2">
              <div class="rounded-box bg-base-200 p-3 text-sm"><strong class="block">End boundary</strong>Provide the box range, the boundary where repetition stops, and the total number of sections. The available length must divide evenly.</div>
              <div class="rounded-box bg-base-200 p-3 text-sm"><strong class="block">Section size</strong>Provide the start, one section's width or height, and the total number of sections. The ending boundary is calculated for you.</div>
            </div>
            <div class="alert mt-4 text-sm">
              <span class="mdi mdi-lightbulb-outline" aria-hidden="true"></span>
              <span>Example: rows 5-10, start column 10, end before column 20, and 5 sections creates columns <strong>10-11 | 12-13 | 14-15 | 16-17 | 18-19</strong>.</span>
            </div>
            <p class="mt-3 text-sm text-base-content/70">The canvas grows automatically when a box extends beyond it. Saved boxes can be edited, disabled, re-enabled, or deleted. Compatible non-overlapping boxes can coexist. The Whole-pattern fallback repeats the complete chart only when no repeat boxes exist.</p>
          </div>
        </section>

        <section id="guide-canvas" class="mt-8 scroll-mt-4">
          <div class="mb-3 flex items-center gap-2">
            <span class="mdi mdi-grid text-xl text-primary" aria-hidden="true"></span>
            <h2 class="text-xl font-bold">Canvas structure</h2>
          </div>
          <div class="grid gap-3 md:grid-cols-2">
            <article class="rounded-box border border-base-300 p-4">
              <h3 class="font-bold">Rows and columns</h3>
              <p class="mt-1 text-sm text-base-content/70">The Rows and Columns tools fill, erase, insert around, or delete the current item. Their deletion sections also accept multiple items such as <strong>1;2;3</strong> or <strong>1-3;6</strong>. Click a numbered header to select it and click it again to deselect it; selecting a row clears the column selection and vice versa. Shift-click extends the selection to a contiguous range. Structural changes preserve repeat boxes outside the edited area.</p>
            </article>
            <article class="rounded-box border border-base-300 p-4">
              <h3 class="font-bold">Display and history</h3>
               <p class="mt-1 text-sm text-base-content/70">Grid settings change the displayed cell size without changing the pattern. Undo and Redo restore drawing, structural edits, and repeat-box changes.</p>
            </article>
          </div>
        </section>

        <section id="guide-tracker" class="mt-8 scroll-mt-4">
          <div class="mb-3 flex items-center gap-2">
            <span class="mdi mdi-progress-check text-xl text-primary" aria-hidden="true"></span>
            <h2 class="text-xl font-bold">Progress tracker</h2>
          </div>
          <div class="rounded-box border border-base-300 p-4">
            <p class="text-sm text-base-content/70">Open Tracker from the top menu, then open a saved design or tracker file. Choose the starting row and stitch direction before beginning. Clicking a stitch completes every earlier row and each stitch through that point; clicking a row number completes or reopens the whole row.</p>
            <p class="mt-3 text-sm text-base-content/70">Progress is recovered in the current browser, but browser data can be cleared. Download a <code>.stitch-tracker</code> file regularly and use it to continue on another browser or device.</p>
          </div>
        </section>

        <section id="guide-saving" class="mt-8 scroll-mt-4">
          <div class="mb-3 flex items-center gap-2">
            <span class="mdi mdi-content-save-check-outline text-xl text-primary" aria-hidden="true"></span>
            <h2 class="text-xl font-bold">Saving and recovery</h2>
          </div>
          <div class="grid gap-3 md:grid-cols-3">
             <article class="rounded-box border border-base-300 p-4"><h3 class="font-bold">Local autosave</h3><p class="mt-1 text-sm text-base-content/70">Changes are saved in this browser and restored when you reopen the app.</p></article>
             <article class="rounded-box border border-base-300 p-4"><h3 class="font-bold">Save</h3><p class="mt-1 text-sm text-base-content/70">Downloads a <code>.stitch-pattern</code> backup. Keep downloaded backups because browser data can be cleared.</p></article>
            <article class="rounded-box border border-base-300 p-4"><h3 class="font-bold">Open</h3><p class="mt-1 text-sm text-base-content/70">Validates a downloaded project, asks before replacing current work, and then resets undo history for the imported design.</p></article>
          </div>
        </section>

        <section id="guide-output" class="mt-8 scroll-mt-4">
          <div class="mb-3 flex items-center gap-2">
            <span class="mdi mdi-printer-outline text-xl text-primary" aria-hidden="true"></span>
            <h2 class="text-xl font-bold">Preview, printing, and PDF</h2>
          </div>
          <div class="rounded-box border border-base-300 p-4">
             <p class="text-sm text-base-content/70">Complete pattern preview shows the rendered chart, including whole-pattern repeats or active repeat boxes. Before printing, choose Color or B&amp;W symbols beside the print button. Symbol PDFs include a color key. Print or Save as PDF creates a numbered overview, detail pages for large charts, and source charts for enabled repeat boxes.</p>
             <p class="mt-3 text-sm text-base-content/70">The light/dark theme changes the editor only and does not affect printed output.</p>
          </div>
        </section>

        <section class="mt-8 border-t border-base-300 pt-5">
          <h2 class="text-lg font-bold">Keyboard and accessibility</h2>
          <div class="mt-3 flex flex-wrap gap-2 text-sm">
            <span class="rounded-box bg-base-200 px-3 py-2"><kbd class="kbd kbd-sm">Ctrl/Cmd</kbd> + <kbd class="kbd kbd-sm">C</kbd> Copy selection</span>
            <span class="rounded-box bg-base-200 px-3 py-2"><kbd class="kbd kbd-sm">Ctrl/Cmd</kbd> + <kbd class="kbd kbd-sm">V</kbd> Paste selection</span>
            <span class="rounded-box bg-base-200 px-3 py-2"><kbd class="kbd kbd-sm">Esc</kbd> Cancel move placement or close this guide</span>
            <span class="rounded-box bg-base-200 px-3 py-2"><kbd class="kbd kbd-sm">Enter</kbd> / <kbd class="kbd kbd-sm">Space</kbd> Activate a focused grid cell or header</span>
          </div>
        </section>
      </div>
    </article>
    <button class="modal-backdrop" type="button" aria-label="Close user guide" @click="$emit('close')">close</button>
  </div>
</template>
