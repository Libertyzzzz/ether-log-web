import type { App, Directive, DirectiveBinding } from 'vue'
import { hasPermission, hasRole } from '../composables/useAuth'

function checkPermission(el: HTMLElement, binding: DirectiveBinding<string | string[]>) {
  const { value } = binding
  if (!value) return

  const hasAuth = hasPermission(value)
  if (!hasAuth) {
    el.style.display = 'none'
    if (el.parentNode) {
      el.parentNode.removeChild(el)
    }
  }
}

function checkRole(el: HTMLElement, binding: DirectiveBinding<string | string[]>) {
  const { value } = binding
  if (!value) return

  const hasAuth = hasRole(value)
  if (!hasAuth) {
    el.style.display = 'none'
    if (el.parentNode) {
      el.parentNode.removeChild(el)
    }
  }
}

export const permissionDirective: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding<string | string[]>) {
    checkPermission(el, binding)
  },
  updated(el: HTMLElement, binding: DirectiveBinding<string | string[]>) {
    checkPermission(el, binding)
  },
}

export const roleDirective: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding<string | string[]>) {
    checkRole(el, binding)
  },
  updated(el: HTMLElement, binding: DirectiveBinding<string | string[]>) {
    checkRole(el, binding)
  },
}

export function setupPermissionDirectives(app: App) {
  app.directive('permission', permissionDirective)
  app.directive('role', roleDirective)
}
