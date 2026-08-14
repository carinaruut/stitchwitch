import { createApp } from 'vue'
import '@mdi/font/css/materialdesignicons.css'
import App from './App.vue'
import { router } from './router'
import './style.css'

createApp(App).use(router).mount('#app')
