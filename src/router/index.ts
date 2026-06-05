// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import App from '../App.vue'
import Assessment from '../views/Assessment.vue'

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
    },
    {
      path: '/quant-lab',
      name: 'quant-lab',
      component: App,
      meta: { page: 'quant-lab', requiresAuth: true }
    },
    {
      path: '/assessment',
      name: 'assessment-home',
      component: Assessment
    },
    {
      path: '/assessment/evaluate',
      name: 'assessment-evaluate',
      component: Assessment
    },
    {
      path: '/assessment/processing',
      name: 'assessment-processing',
      component: Assessment
    },
    {
      path: '/assessment/result',
      name: 'assessment-result',
      component: Assessment
    },
    {
      path: '/assessment/share/:shareId',
      name: 'assessment-share',
      component: Assessment
    }
  ]
})

export default router
