// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import App from '../App.vue'
import Assessment from '../views/Assessment.vue'
import { hasAuthToken } from '../api'
import { hasPermission, hasRole } from '../composables/useAuth'

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
      path: '/guestbook',
      name: 'guestbook',
      component: App,
      meta: { page: 'guestbook' }
    },
    {
      path: '/profile',
      name: 'profile',
      component: App,
      meta: { page: 'profile', requiresAuth: true, permission: 'profile' }
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: App,
      meta: {
        page: 'dashboard',
        requiresAuth: true,
        permission: 'dashboard',
        roles: ['ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_EDITOR'],
      }
    },
    {
      path: '/dashboard/article',
      name: 'dashboard-article',
      component: App,
      meta: {
        page: 'dashboard-article',
        requiresAuth: true,
        permission: 'dashboard:article',
        roles: ['ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_EDITOR'],
      }
    },
    {
      path: '/dashboard/category',
      name: 'dashboard-category',
      component: App,
      meta: {
        page: 'dashboard-category',
        requiresAuth: true,
        permission: 'dashboard:category',
        roles: ['ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_EDITOR'],
      }
    },
    {
      path: '/dashboard/tag',
      name: 'dashboard-tag',
      component: App,
      meta: {
        page: 'dashboard-tag',
        requiresAuth: true,
        permission: 'dashboard:tag',
        roles: ['ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_EDITOR'],
      }
    },
    {
      path: '/dashboard/comment',
      name: 'dashboard-comment',
      component: App,
      meta: {
        page: 'dashboard-comment',
        requiresAuth: true,
        permission: 'dashboard:comment',
        roles: ['ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_EDITOR'],
      }
    },
    {
      path: '/dashboard/media',
      name: 'dashboard-media',
      component: App,
      meta: {
        page: 'dashboard-media',
        requiresAuth: true,
        permission: 'dashboard:media',
        roles: ['ROLE_SUPER_ADMIN', 'ROLE_ADMIN'],
      }
    },
    {
      path: '/dashboard/sensitive-words',
      name: 'dashboard-sensitive-words',
      component: App,
      meta: {
        page: 'dashboard-sensitive-words',
        requiresAuth: true,
        permission: 'dashboard:sensitive',
        roles: ['ROLE_SUPER_ADMIN', 'ROLE_ADMIN'],
      }
    },
    {
      path: '/system/user',
      name: 'system-user',
      component: App,
      meta: {
        page: 'system-user',
        requiresAuth: true,
        permission: 'system:user',
        roles: ['ROLE_SUPER_ADMIN', 'ROLE_ADMIN'],
      }
    },
    {
      path: '/system/role',
      name: 'system-role',
      component: App,
      meta: {
        page: 'system-role',
        requiresAuth: true,
        permission: 'system:role',
        roles: ['ROLE_SUPER_ADMIN', 'ROLE_ADMIN'],
      }
    },
    {
      path: '/system/permission',
      name: 'system-permission',
      component: App,
      meta: {
        page: 'system-permission',
        requiresAuth: true,
        permission: 'system:permission',
        roles: ['ROLE_SUPER_ADMIN', 'ROLE_ADMIN'],
      }
    },
    {
      path: '/publish',
      name: 'publish',
      component: App,
      meta: { page: 'publish', requiresAuth: true, permission: 'dashboard:article:add' }
    },
    {
      path: '/publish/:articleId',
      name: 'publish-edit',
      component: App,
      meta: { page: 'publish', requiresAuth: true, permission: 'dashboard:article:edit' }
    },
    {
      path: '/post/:articleSlug',
      name: 'post-detail',
      component: App,
      meta: { page: 'post-detail' }
    },
    {
      path: '/quant-lab',
      name: 'quant-lab',
      component: App,
      meta: { page: 'quant-lab' }
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

router.beforeEach((to, _from, next) => {
  const requiresAuth = to.meta?.requiresAuth
  const requiredRole = to.meta?.role as string | string[] | undefined
  const requiredRoles = to.meta?.roles as string[] | undefined
  const requiredPermission = to.meta?.permission as string | string[] | undefined

  if (requiresAuth && !hasAuthToken()) {
    window.dispatchEvent(new CustomEvent('auth:need-login', { detail: { message: '请先登录后再访问该页面' } }))
    return next({ path: '/' })
  }

  // 校验指定角色
  if (requiredRole && !hasRole(requiredRole)) {
    return next({ path: '/' })
  }
  if (requiredRoles && !hasRole(requiredRoles)) {
    return next({ path: '/' })
  }

  // 校验指定权限编码
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return next({ path: '/' })
  }

  next()
})

export default router