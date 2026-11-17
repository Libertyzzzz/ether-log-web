import { createApp } from 'vue'
import { createHead } from '@unhead/vue/client'
import './style.css'
import './app.css'
import Root from './Root.vue'
import router from './router'
import { setupPermissionDirectives } from './directives/permission'

const app = createApp(Root)
const head = createHead()

setupPermissionDirectives(app)
app.use(router)
app.use(head)
app.mount('#app')

