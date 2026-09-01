import { createApp } from 'vue'
import './style.css'
import './app.css'
import Root from './Root.vue'
import router from './router'
import { setupPermissionDirectives } from './directives/permission'

const app = createApp(Root)
setupPermissionDirectives(app)
app.use(router).mount('#app')

