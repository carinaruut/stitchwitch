import { createRouter, createWebHashHistory } from 'vue-router'
import EditorView from './views/EditorView.vue'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'editor', component: EditorView },
    { path: '/tracker', redirect: '/' },
  ],
})
