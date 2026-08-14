import { createRouter, createWebHashHistory } from 'vue-router'
import EditorView from './views/EditorView.vue'
import TrackerView from './views/TrackerView.vue'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'editor', component: EditorView },
    { path: '/tracker', name: 'tracker', component: TrackerView },
  ],
})
