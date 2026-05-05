// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import App from '../App.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: App,
      meta: { page: 'home' }
    },
    {
      path: '/posts',
      name: 'posts',
      component: App,
      meta: { page: 'posts' }
    },
    {
      path: '/about',
      name: 'about',
      component: App,
      meta: { page: 'about' }
    },
    {
      path: '/profile',
      name: 'profile',
      component: App,
      meta: { page: 'profile' }
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: App,
      meta: { page: 'dashboard' }
    }
  ]
})

export default router