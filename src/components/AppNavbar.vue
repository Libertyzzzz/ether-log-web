<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  User, LayoutDashboard, LogOut, Search, FlaskConical, Sparkles, House, FileText, Settings,
  Folder, Tag, MessageSquare, Users, Shield, Key, ChevronDown
} from 'lucide-vue-next'
import type { LoginUser } from '../types/blog'
import { getLoginUserName } from '../utils/article'
import { hasPermission, hasRole, isSuperAdmin } from '../composables/useAuth'

const route = useRoute()
const router = useRouter()

const canAccessQuantLab = computed(() => {
  return isSuperAdmin.value || hasPermission('quant-lab') || hasRole(['ROLE_SUPER_ADMIN', 'ROLE_ADMIN'])
})

const canAccessDashboard = computed(() => {
  return (
    isSuperAdmin.value ||
    hasPermission('dashboard') ||
    hasRole(['ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_EDITOR'])
  )
})

const canAccessDashboardArticle = computed(() => hasPermission('dashboard:article') || hasRole(['ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_EDITOR']))
const canAccessDashboardCategory = computed(() => hasPermission('dashboard:category') || hasRole(['ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_EDITOR']))
const canAccessDashboardTag = computed(() => hasPermission('dashboard:tag') || hasRole(['ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_EDITOR']))
const canAccessDashboardComment = computed(() => hasPermission('dashboard:comment') || hasRole(['ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_EDITOR']))

const canAccessProfile = computed(() => {
  return isSuperAdmin.value || hasPermission('profile') || props.isLoggedIn
})

const canAccessSystem = computed(() => {
  return (
    isSuperAdmin.value ||
    hasPermission('system') ||
    hasPermission('system:role') ||
    hasPermission('system:permission') ||
    hasPermission('system:user') ||
    hasRole(['ROLE_ADMIN', 'ROLE_SUPER_ADMIN'])
  )
})
const canAccessSystemUser = computed(() => isSuperAdmin.value || hasPermission('system:user') || hasRole(['ROLE_SUPER_ADMIN', 'ROLE_ADMIN']))
const canAccessSystemRole = computed(() => isSuperAdmin.value || hasPermission('system:role') || hasRole(['ROLE_SUPER_ADMIN', 'ROLE_ADMIN']))
const canAccessSystemPermission = computed(() => isSuperAdmin.value || hasPermission('system:permission') || hasRole(['ROLE_SUPER_ADMIN', 'ROLE_ADMIN']))

const props = defineProps<{
  isLoggedIn: boolean
  loginUser: Partial<LoginUser>
  showUserMenu: boolean
  isDark: boolean
}>()

const emit = defineEmits<{
  navigate: [sectionId: string]
  openProfile: []
  openDashboard: []
  openQuantLab: []
  openSystem: []
  openLogin: []
  toggleStatus: []
  openSearch: []
  openAiAssistant: []
  logout: []
  toggleDark: []
  closeUserMenu: []
}>()

const isMobile = ref(false)
const showSystemDropdown = ref(false)
const userMenuFromTabbar = ref(false)
const systemDropdownRef = ref<HTMLElement | null>(null)
let systemCloseTimer: ReturnType<typeof setTimeout> | null = null

function clearSystemCloseTimer() {
  if (systemCloseTimer) {
    clearTimeout(systemCloseTimer)
    systemCloseTimer = null
  }
}

function toggleSystemDropdown(e?: Event) {
  if (e) e.stopPropagation()
  showSystemDropdown.value = !showSystemDropdown.value
  if (showSystemDropdown.value) {
    emit('closeUserMenu')
  }
}
function openSystemDropdown(e?: Event) {
  if (e) e.stopPropagation()
  if (!isMobile.value) {
    clearSystemCloseTimer()
    showSystemDropdown.value = true
    emit('closeUserMenu')
  }
}
function closeSystemDropdown() { clearSystemCloseTimer(); showSystemDropdown.value = false }
function handleSystemMouseLeave() {
  if (!isMobile.value) {
    clearSystemCloseTimer()
    systemCloseTimer = setTimeout(() => {
      closeSystemDropdown()
    }, 160)
  }
}

function handleDocumentClick(e: MouseEvent) {
  if (systemDropdownRef.value && !systemDropdownRef.value.contains(e.target as Node)) {
    closeSystemDropdown()
  }
}

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768
  if (isMobile.value) closeSystemDropdown()
}

const contentPageNames = new Set([
  'posts', 'guestbook', 'profile',
  'publish', 'publish-edit', 'quant-lab',
  'assessment-home', 'assessment-evaluate',
  'assessment-processing', 'assessment-result', 'assessment-share'
])
const isContentPage = computed(() => contentPageNames.has(String(route.name)))

const allowAutoHide = computed(() => isMobile.value && isContentPage.value)

const isVisible = ref(true)
const scrollDepth = ref(0)
let lastScrollY = 0
let ticking = false
const MIN_DELTA = 8
const TOP_BUFFER = 120
const HERO_DEPTH_START = 160
const HERO_DEPTH_END = 420

function getScrollY() {
  return window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0
}

function updateScrollDepth(y: number) {
  if (y <= HERO_DEPTH_START) { scrollDepth.value = 0; return }
  if (y >= HERO_DEPTH_END)   { scrollDepth.value = 1; return }
  scrollDepth.value = (y - HERO_DEPTH_START) / (HERO_DEPTH_END - HERO_DEPTH_START)
}

function handleScroll() {
  if (!ticking) {
    window.requestAnimationFrame(() => {
      const currentY = getScrollY()

      updateScrollDepth(currentY)

      if (!allowAutoHide.value) {
        isVisible.value = true
        lastScrollY = currentY
        ticking = false
        return
      }

      if (currentY < TOP_BUFFER) {
        isVisible.value = true
        lastScrollY = currentY
        ticking = false
        return
      }

      const delta = currentY - lastScrollY
      if (Math.abs(delta) < MIN_DELTA) {
        ticking = false
        return
      }

      if (delta > 0) {
        isVisible.value = false
      } else {
        isVisible.value = true
      }

      lastScrollY = currentY
      ticking = false
    })
    ticking = true
  }
}

function resetNavState() {
  isVisible.value = true
  lastScrollY = getScrollY()
  updateScrollDepth(lastScrollY)
}

watch(
  () => route.fullPath,
  () => {
    setTimeout(resetNavState, 50)
    closeSystemDropdown()
  }
)

watch(isMobile, () => {
  setTimeout(resetNavState, 50)
})

watch(
  () => props.showUserMenu,
  (v) => { if (v) closeSystemDropdown() }
)

onMounted(() => {
  checkMobile()
  lastScrollY = getScrollY()
  updateScrollDepth(lastScrollY)
  window.addEventListener('resize', checkMobile)
  window.addEventListener('scroll', handleScroll, { passive: true })
  document.addEventListener('click', handleDocumentClick)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
  window.removeEventListener('scroll', handleScroll)
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<template>
  <div class="nav-shell">
    <nav
      class="nav-standard"
      :class="{ 'nav-hidden': !isVisible }"
      :style="{ '--nav-scroll-depth': scrollDepth }"
    >
      <div class="nav-content">
      <!-- 1. 左侧：Logo (始终靠左) -->
      <div class="nav-logo" @click="$emit('navigate', 'home')">
        <div class="logo-box">E</div>
        <span class="logo-text">NEXTIFY</span>
      </div>

      <!-- 2. 中间：Home / Posts（PC 和移动端都水平显示，移动端缩小字体和间距） -->
      <div class="nav-links">
        <button type="button" @click="$emit('navigate', 'home')">Home</button>
        <button type="button" @click="$emit('navigate', 'posts')">Posts</button>
      </div>

      <!-- 搜索作为独立工具位，避免挤压右侧操作按钮 -->
      <div class="nav-search-slot desktop-only">
        <button class="nav-search-trigger" type="button" @click="$emit('openSearch')" title="搜索 (⌘K)">
          <Search :size="16" />
          <span>Search...</span>
          <kbd>⌘K</kbd>
        </button>
      </div>

      <!-- 3. 右侧：PC 操作按钮 + 状态标签 (始终靠右) -->
      <div class="nav-right">
        <button
          v-if="isLoggedIn"
          class="nav-ai-toggle desktop-only"
          type="button"
          @click.prevent="$emit('openAiAssistant')"
          title="AI 助手"
        >
          <span class="nav-ai-glow"></span>
          <span class="nav-ai-logo">
            <span class="nav-ai-logo-inner">✦</span>
          </span>
          <span class="nav-ai-label">ETHER</span>
        </button>

        <div class="nav-actions desktop-only">
          <div
            v-if="isLoggedIn && canAccessSystem"
            class="nav-action-wrapper system-dropdown-wrap"
            ref="systemDropdownRef"
            @mouseenter="openSystemDropdown"
            @mouseleave="handleSystemMouseLeave"
          >
            <button
              class="nav-action-button secondary has-dropdown"
              :class="{ active: showSystemDropdown }"
              type="button"
              @click.prevent="toggleSystemDropdown"
            >
              <Settings :size="12" style="margin-right:4px" />
              系统管理
              <ChevronDown :size="12" class="nav-action-chevron" :class="{ 'is-open': showSystemDropdown }" />
            </button>
            <Transition name="dropdown-fade">
              <div
                v-if="showSystemDropdown"
                class="nav-dropdown system-dropdown right-menu"
                @click.stop
                @mouseenter="clearSystemCloseTimer"
                @mouseleave="handleSystemMouseLeave"
              >
                <div class="dropdown-submenu-title" style="padding: 0.5rem 0.85rem 0.3rem">系统管理</div>
                <div v-if="canAccessSystemUser" style="padding:0 0.4rem">
                  <button class="dropdown-item sub" type="button" @click="closeSystemDropdown(); router.push({ name: 'system-user' })">
                    <Users :size="13" /> 用户管理
                  </button>
                </div>
                <div v-if="canAccessSystemRole" style="padding:0 0.4rem">
                  <button class="dropdown-item sub" type="button" @click="closeSystemDropdown(); router.push({ name: 'system-role' })">
                    <Shield :size="13" /> 角色管理
                  </button>
                </div>
                <div v-if="canAccessSystemPermission" style="padding:0 0.4rem 0.3rem">
                  <button class="dropdown-item sub" type="button" @click="closeSystemDropdown(); router.push({ name: 'system-permission' })">
                    <Key :size="13" /> 权限管理
                  </button>
                </div>
              </div>
            </Transition>
          </div>
          <button v-if="isLoggedIn && canAccessQuantLab" class="nav-action-button lab" type="button" @click.prevent="$emit('openQuantLab')">Quant Lab</button>
          <button v-if="isLoggedIn && canAccessProfile" class="nav-action-button secondary" type="button" @click.prevent="$emit('openProfile')">个人主页</button>
          <button v-if="isLoggedIn && canAccessDashboard" class="nav-action-button secondary" type="button" @click.prevent="$emit('openDashboard')">数据面板</button>
        </div>

        <!-- 移动端：AI 助手图标 -->
        <button
          class="nav-icon-btn nav-icon-ai mobile-only"
          type="button"
          @click.prevent="$emit('openAiAssistant')"
          title="AI 助手"
        >
          <Sparkles :size="16" />
        </button>

        <!-- 移动端：搜索图标按钮 -->
        <button
          class="nav-icon-btn mobile-only"
          type="button"
          @click.prevent="$emit('openSearch')"
          title="搜索"
        >
          <Search :size="18" />
        </button>

        <div v-if="isLoggedIn && canAccessSystem" class="nav-mobile-tools mobile-only">
          <div class="nav-action-wrapper system-dropdown-wrap" ref="systemDropdownRef" @mouseleave="handleSystemMouseLeave">
            <button
              class="nav-mobile-slot system has-dropdown"
              :class="{ active: showSystemDropdown }"
              type="button"
              @click.prevent="toggleSystemDropdown"
            >
              <span class="nav-mobile-slot-label">系统管理</span>
              <ChevronDown :size="12" class="nav-mobile-slot-chevron" :class="{ 'is-open': showSystemDropdown }" />
            </button>
            <Transition name="dropdown-fade">
              <div v-if="showSystemDropdown" class="nav-dropdown system-dropdown right-menu mobile-system-dropdown" @click.stop>
                <div class="dropdown-submenu-title" style="padding: 0.5rem 0.85rem 0.3rem">系统管理</div>
                <div v-if="canAccessSystemUser" style="padding:0 0.4rem">
                  <button class="dropdown-item sub" type="button" @click="closeSystemDropdown(); router.push({ name: 'system-user' })">
                    <Users :size="13" /> 用户管理
                  </button>
                </div>
                <div v-if="canAccessSystemRole" style="padding:0 0.4rem">
                  <button class="dropdown-item sub" type="button" @click="closeSystemDropdown(); router.push({ name: 'system-role' })">
                    <Shield :size="13" /> 角色管理
                  </button>
                </div>
                <div v-if="canAccessSystemPermission" style="padding:0 0.4rem 0.3rem">
                  <button class="dropdown-item sub" type="button" @click="closeSystemDropdown(); router.push({ name: 'system-permission' })">
                    <Key :size="13" /> 权限管理
                  </button>
                </div>
              </div>
            </Transition>
          </div>
          <button v-if="canAccessProfile" class="nav-mobile-slot" type="button" @click.prevent="$emit('openProfile')">个人主页</button>
          <button v-if="canAccessDashboard" class="nav-mobile-slot" type="button" @click.prevent="$emit('openDashboard')">数据面板</button>
        </div>

        <div class="status-badge-wrapper">
          <!-- PC 端：带文字的 status badge -->
          <div class="status-badge clickable desktop-only" :class="{ active: showUserMenu }" @click="$emit('toggleStatus')">
            <div class="dot"></div>
            <span>{{ isLoggedIn ? 'IN' : 'SYSTEM READY' }}</span>
          </div>
          <!-- 移动端：仅小圆点（点击区域放大到 44px）- 登录后隐藏，由底部 My 替代 -->
          <button
            v-if="!isLoggedIn"
            class="status-dot-btn mobile-only"
            :class="{ active: showUserMenu, logged: isLoggedIn }"
            type="button"
            @click.stop="userMenuFromTabbar = false; $emit('toggleStatus')"
            :title="isLoggedIn ? '账户' : '登录'"
          >
            <span class="status-dot-inner"></span>
          </button>

          <Transition name="dropdown-fade">
            <div
              v-if="showUserMenu && !(isMobile && isLoggedIn && userMenuFromTabbar)"
              class="user-dropdown-menu right-menu"
              @click.stop
            >
              <div v-if="isLoggedIn" class="dropdown-header">
                <img class="dropdown-avatar" :src="loginUser.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Scribe'" alt="avatar" />
                <div class="dropdown-user-info">
                  <strong>{{ getLoginUserName(loginUser) }}</strong>
                  <span>{{ loginUser.email || 'Admin' }}</span>
                </div>
              </div>
              <div class="dropdown-divider" v-if="isLoggedIn"></div>

              <template v-if="isLoggedIn">
                <template v-if="isMobile">
                  <button class="dropdown-item" type="button" @click="$emit('closeUserMenu'); $emit('openAiAssistant')"><Sparkles :size="14" /> AI 助手</button>
                  <button v-if="canAccessQuantLab" class="dropdown-item" type="button" @click="$emit('closeUserMenu'); $emit('openQuantLab')"><FlaskConical :size="14" /> Quant Lab</button>
                  <div class="dropdown-divider"></div>
                  <button v-if="canAccessProfile" class="dropdown-item" type="button" @click="$emit('closeUserMenu'); $emit('openProfile')"><User :size="14" /> 个人主页</button>
                  <button v-if="canAccessDashboard" class="dropdown-item" type="button" @click="$emit('closeUserMenu'); $emit('openDashboard')"><LayoutDashboard :size="14" /> 数据面板</button>
                </template>
                <div v-if="!isMobile" class="dropdown-submenu-group">
                  <div class="dropdown-submenu-title">数据面板</div>
                  <button v-if="canAccessDashboardArticle" class="dropdown-item sub" type="button" @click="$emit('closeUserMenu'); router.push({ name: 'dashboard-article' })"><FileText :size="12" /> 文章管理</button>
                  <button v-if="canAccessDashboardCategory" class="dropdown-item sub" type="button" @click="$emit('closeUserMenu'); router.push({ name: 'dashboard-category' })"><Folder :size="12" /> 分类管理</button>
                  <button v-if="canAccessDashboardTag" class="dropdown-item sub" type="button" @click="$emit('closeUserMenu'); router.push({ name: 'dashboard-tag' })"><Tag :size="12" /> 标签管理</button>
                  <button v-if="canAccessDashboardComment" class="dropdown-item sub" type="button" @click="$emit('closeUserMenu'); router.push({ name: 'dashboard-comment' })"><MessageSquare :size="12" /> 评论管理</button>
                </div>
                <button class="dropdown-item danger" type="button" @click="$emit('closeUserMenu'); $emit('logout')"><LogOut :size="14" /> 退出登录</button>
              </template>
              <button v-else class="dropdown-item" type="button" @click="$emit('closeUserMenu'); $emit('openLogin')">登录账户</button>
            </div>
          </Transition>
        </div>
      </div>
      </div>
    </nav>

    <div
      class="mobile-tabbar"
      :class="[{ 'tabbar-hidden': !isVisible, 'tabbar-4col': isLoggedIn }]"
      :style="isLoggedIn ? { gridTemplateColumns: 'repeat(4, 1fr)' } : {}"
      aria-label="移动端主导航"
    >
      <!-- 移动端 My 弹出菜单：直接在 tabbar 内用 absolute 定位，从上方弹出 -->
      <Transition name="tabbar-menu-fade">
        <div
          v-if="isLoggedIn && showUserMenu && userMenuFromTabbar"
          class="tabbar-user-menu"
          @click.stop
        >
          <div class="dropdown-header">
            <img class="dropdown-avatar" :src="loginUser.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Scribe'" alt="avatar" />
            <div class="dropdown-user-info">
              <strong>{{ getLoginUserName(loginUser) }}</strong>
              <span>{{ loginUser.email || 'Admin' }}</span>
            </div>
          </div>
          <div class="dropdown-divider"></div>
          <button v-if="canAccessDashboardArticle" class="dropdown-item" type="button" @click="$emit('closeUserMenu'); router.push({ name: 'dashboard-article' })"><FileText :size="14" /> 文章管理</button>
          <button v-if="canAccessDashboardCategory" class="dropdown-item" type="button" @click="$emit('closeUserMenu'); router.push({ name: 'dashboard-category' })"><Folder :size="14" /> 分类管理</button>
          <button v-if="canAccessDashboardTag" class="dropdown-item" type="button" @click="$emit('closeUserMenu'); router.push({ name: 'dashboard-tag' })"><Tag :size="14" /> 标签管理</button>
          <button v-if="canAccessDashboardComment" class="dropdown-item" type="button" @click="$emit('closeUserMenu'); router.push({ name: 'dashboard-comment' })"><MessageSquare :size="14" /> 评论管理</button>
          <div v-if="canAccessDashboardArticle || canAccessDashboardCategory || canAccessDashboardTag || canAccessDashboardComment" class="dropdown-divider"></div>
          <button class="dropdown-item danger" type="button" @click="$emit('closeUserMenu'); $emit('logout')"><LogOut :size="14" /> 退出登录</button>
        </div>
      </Transition>

      <button
        type="button"
        class="mobile-tabbar-item"
        :class="{ active: route.name === 'home' }"
        @click="$emit('navigate', 'home')"
      >
        <House :size="17" />
        <span>Home</span>
      </button>
      <button
        type="button"
        class="mobile-tabbar-item"
        :class="{ active: route.name === 'posts' }"
        @click="$emit('navigate', 'posts')"
      >
        <FileText :size="17" />
        <span>Posts</span>
      </button>
      <button
        type="button"
        class="mobile-tabbar-item"
        :class="{ active: route.name === 'quant-lab' }"
        @click="$emit('openQuantLab')"
      >
        <FlaskConical :size="17" />
        <span>Lab</span>
      </button>
      <button
        v-if="isLoggedIn"
        type="button"
        class="mobile-tabbar-item"
        :class="{ active: showUserMenu }"
        @click.stop="userMenuFromTabbar = true; $emit('toggleStatus')"
      >
        <User :size="17" />
        <span>My</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* ── 基础布局 (PC) ── */
.nav-standard {
  position: fixed; top: 0; left: 0; right: 0; height: 5rem;
  background: rgba(255, 255, 255, calc(0.48 + var(--nav-scroll-depth, 0) * 0.34));
  backdrop-filter: blur(calc(24px - var(--nav-scroll-depth, 0) * 4px)) saturate(calc(160% + var(--nav-scroll-depth, 0) * 40%));
  -webkit-backdrop-filter: blur(calc(24px - var(--nav-scroll-depth, 0) * 4px)) saturate(calc(160% + var(--nav-scroll-depth, 0) * 40%));
  z-index: 1000;
  transition:
    transform 0.4s cubic-bezier(0.16, 1, 0.3, 1),
    background-color 0.35s ease,
    box-shadow 0.35s ease;
  padding-top: env(safe-area-inset-top);
  box-sizing: border-box;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, calc(0.7 + var(--nav-scroll-depth, 0) * 0.2)) inset,
    0 -1px 0 rgba(226, 232, 240, calc(0.25 + var(--nav-scroll-depth, 0) * 0.25)) inset,
    0 calc(var(--nav-scroll-depth, 0) * 10px) calc(var(--nav-scroll-depth, 0) * 28px) rgba(15, 23, 42, calc(var(--nav-scroll-depth, 0) * 0.07));
}
.nav-standard::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: 70%;
  height: 1px;
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(148, 163, 184, 0.12) 20%,
    rgba(99, 102, 241, 0.18) 50%,
    rgba(148, 163, 184, 0.12) 80%,
    transparent 100%
  );
  opacity: calc(0.02 + var(--nav-scroll-depth, 0) * 0.98);
  transition: opacity 0.35s ease;
  pointer-events: none;
}
/* 桌面端永远不隐藏（即 nav-hidden 类对桌面端无视觉效果） */
.nav-standard.nav-hidden { transform: translateY(0); }
.nav-content {
  max-width: var(--nav-content-max-width); height: 100%; margin: 0 auto; padding: 0 0.9rem;
  display: flex; align-items: center; justify-content: space-between; gap: 0.2rem;
}
.nav-right { display: flex; align-items: center; gap: 0.12rem; }
.nav-action-wrapper { position: relative; }

/* Logo */
.nav-logo { display: flex; align-items: center; gap: 0.2rem; cursor: pointer; flex-shrink: 0; }
.logo-box {
  width: 1.85rem; height: 1.85rem; background: #0f172a; color: white;
  display: flex; align-items: center; justify-content: center;
  border-radius: 0.45rem; font-weight: 900;
}
.logo-text { font-weight: 800; font-size: 0.88rem; letter-spacing: 0.045em; color: #0f172a; }

/* PC 链接 */
.nav-links { display: flex; gap: 1.75rem; align-items: center; }
.nav-links button {
  background: none; border: none; font-size: 0.82rem; font-weight: 700;
  color: #64748b; cursor: pointer; transition: all 0.2s ease;
  letter-spacing: 0.08em;
  padding: 0.35rem 0.65rem;
  border-radius: 0.5rem;
  white-space: nowrap;
}
.nav-links button:hover { color: #0f172a; background: rgba(255, 255, 255, 0.55); }

/* PC 操作 */
.nav-actions { display: flex; gap: 0.08rem; align-items: center; margin-left: 0.02rem; }
.nav-action-button {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.1rem;
  min-height: 2rem;
  padding: 0.28rem 0.38rem; border-radius: 0.62rem; border: none;
  background: rgba(15, 23, 42, 0.72);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: white; font-size: 0.7rem; font-weight: 750;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer; transition: all 0.2s ease;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.18) inset;
}
.nav-action-button:hover { transform: translateY(-1px); background: rgba(15, 23, 42, 0.82); }
.nav-action-button.lab {
  background: rgba(219, 234, 254, 0.55);
  color: #1d4ed8;
  border: 1px solid rgba(37, 99, 235, 0.14);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: none;
}
.nav-action-button.secondary {
  background: rgba(241, 245, 249, 0.55);
  color: #475569;
  border: 1px solid rgba(226, 232, 240, 0.5);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: none;
}
.nav-action-button.has-dropdown {
  padding-right: 0.55rem;
}
.nav-action-button.active {
  background: rgba(255, 255, 255, 0.75);
  color: #0f172a;
  box-shadow: inset 0 2px 6px rgba(15, 23, 42, 0.06), 0 0 0 1px rgba(255, 255, 255, 0.6) inset;
}
.nav-action-chevron {
  margin-left: 2px;
  color: currentColor;
  opacity: 0.65;
  transition: transform 0.18s ease;
}
.nav-action-chevron.is-open { transform: rotate(180deg); opacity: 1; }
.nav-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  min-width: 12rem;
  background: white;
  border-radius: 0.85rem;
  box-shadow: 0 10px 30px rgba(15,23,42,0.12), 0 2px 6px rgba(15,23,42,0.05);
  border: 1px solid rgba(226, 232, 240, 0.9);
  padding: 0.3rem 0;
  z-index: 100;
  animation: dropdownSlideDown 0.18s ease-out;
}
.nav-dropdown::before {
  content: '';
  position: absolute;
  top: -5px; right: 1.1rem;
  width: 10px; height: 10px;
  background: white;
  border-left: 1px solid rgba(226, 232, 240, 0.9);
  border-top: 1px solid rgba(226, 232, 240, 0.9);
  transform: rotate(45deg);
}
.nav-dropdown.right-menu { right: 0; }
@keyframes dropdownSlideDown {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
}
.dropdown-submenu-title {
  font-size: 0.62rem;
  font-weight: 750;
  letter-spacing: 0.04em;
  color: #94a3b8;
  text-transform: uppercase;
}

/* 搜索触发器样式 */
.nav-search-trigger {
  display: flex;
  align-items: center;
  gap: 0.12rem;
  width: 6.4rem;
  height: 2rem;
  padding: 0 0.3rem;
  border: 1px solid rgba(226, 232, 240, 0.55);
  border-radius: 0.6rem;
  background: rgba(255, 255, 255, 0.48);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.35) inset;
}
.nav-search-trigger span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.nav-search-trigger:hover {
  border-color: rgba(148, 163, 184, 0.5);
  background: rgba(255, 255, 255, 0.65);
  color: #64748b;
}
kbd {
  font-family: inherit;
  font-size: 0.65rem;
  font-weight: 800;
  opacity: 0.6;
}

/* AI 助手按钮 — 胶囊渐变风格 */
.nav-ai-toggle {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.12rem;
  height: 2rem;
  padding: 0 0.45rem 0 0.2rem;
  border: none;
  border-radius: 9999px;
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 55%, #4f46e5 100%);
  box-shadow:
    0 1px 3px rgba(79, 70, 229, 0.25),
    0 2px 10px rgba(139, 92, 246, 0.35),
    0 0 0 1px rgba(255, 255, 255, 0.18) inset;
  color: white;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
  overflow: hidden;
  font-family: inherit;
}
.nav-ai-glow {
  position: absolute;
  inset: -4px;
  border-radius: 9999px;
  background: radial-gradient(circle, rgba(196, 181, 253, 0.6) 0%, transparent 70%);
  filter: blur(6px);
  opacity: 0;
  transition: opacity 0.3s ease;
  animation: navAiBreath 2.8s ease-in-out infinite;
  pointer-events: none;
  z-index: 0;
}
.nav-ai-logo {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.45rem;
  height: 1.45rem;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.22);
  backdrop-filter: blur(4px);
  flex-shrink: 0;
}
.nav-ai-logo-inner {
  font-size: 0.72rem;
  line-height: 1;
  color: white;
  text-shadow: 0 0 6px rgba(224, 231, 255, 0.6);
  transform: translateY(-0.5px);
}
.nav-ai-label {
  position: relative;
  z-index: 1;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  line-height: 1;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
  font-variant-numeric: tabular-nums;
}
.nav-ai-toggle:hover {
  transform: translateY(-1.5px) scale(1.03);
  box-shadow:
    0 4px 14px rgba(139, 92, 246, 0.55),
    0 0 0 1px rgba(255, 255, 255, 0.3) inset;
}
.nav-ai-toggle:hover .nav-ai-glow { opacity: 0.55; }
.nav-ai-toggle:active { transform: translateY(0) scale(0.97); }

@keyframes navAiBreath {
  0%, 100% { opacity: 0; transform: scale(0.85); }
  50% { opacity: 0.3; transform: scale(1.05); }
}

/* 系统状态栏 (Badge) */
.status-badge-wrapper { position: relative; }
.status-badge {
  display: flex; align-items: center; gap: 0.38rem; min-height: 2rem; padding: 0 0.58rem;
  border-radius: 0.62rem;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(226, 232, 240, 0.55);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  font-size: 0.62rem; font-weight: 800; color: #64748b; white-space: nowrap;
  flex-shrink: 0; cursor: pointer; transition: all 0.2s ease;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.35) inset;
}
.status-badge:hover { border-color: rgba(148, 163, 184, 0.5); background: rgba(255, 255, 255, 0.65); }
.status-badge.active { background: rgba(15, 23, 42, 0.78); color: white; border-color: rgba(15, 23, 42, 0.4); box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.15) inset; }
.status-badge .dot { width: 6px; height: 6px; border-radius: 50%; background: #10b981; }

/* ── 移动端快捷入口 */
.nav-mobile-tools {
  display: flex;
  align-items: center;
  gap: 0.28rem;
  overflow: visible;
  position: relative;
}
.nav-mobile-slot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2rem;
  padding: 0.28rem 0.55rem;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.72);
  color: #334155;
  font-size: 0.62rem;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: 0.02em;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s ease;
}
.nav-mobile-slot:hover {
  border-color: rgba(99, 102, 241, 0.3);
  background: rgba(99, 102, 241, 0.05);
  color: #4f46e5;
}
.nav-mobile-slot.has-dropdown {
  gap: 0.22rem;
}
.nav-mobile-slot-label {
  display: inline-flex;
  align-items: center;
}
.nav-mobile-slot-chevron {
  transition: transform 0.2s ease;
  opacity: 0.8;
}
.nav-mobile-slot-chevron.is-open {
  transform: rotate(180deg);
  opacity: 1;
}
.nav-mobile-slot.system {
  background: rgba(255, 255, 255, 0.72);
  border-color: rgba(148, 163, 184, 0.3);
  color: #334155;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.4);
}
.nav-mobile-slot.system.active {
  background: rgba(255, 255, 255, 0.9);
  border-color: rgba(148, 163, 184, 0.42);
  color: #1f2937;
}

/* ── 移动端：图标按钮（搜索/用户） */
.nav-icon-btn {
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 0.55rem;
  color: #0f172a;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s ease;
}
.nav-icon-btn:active {
  background: #e2e8f0;
}

/* ── 移动端：status 小圆点按钮（44x44px 点击热区 */
.status-dot-btn {
  width: 2.75rem;
  height: 2.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s ease;
}
.status-dot-btn:active {
  background: #e2e8f0;
}
.status-dot-btn.active {
  background: #0f172a;
}
.status-dot-btn.active .status-dot-inner {
  background: #ffffff;
}
.status-dot-inner {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #94a3b8;
}
.status-dot-btn.logged .status-dot-inner {
  background: #10b981;
}

/* 移动端汉堡与菜单 */
.mobile-nav-wrapper { position: relative; }
.mobile-menu-btn {
  width: 2.2rem; height: 2.2rem; display: flex; align-items: center; justify-content: center;
  background: #f1f5f9; border: none; border-radius: 0.55rem; color: #0f172a;
  cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.mobile-menu-btn:active { transform: scale(0.9); }
.mobile-menu-btn.active { background: #4f46e5; color: white; }

/* 下拉菜单通用样式 */
.user-dropdown-menu {
  position: absolute; top: calc(100% + 0.75rem); width: 12rem;
  background: white; border-radius: 1rem; border: 1px solid #e2e8f0;
  box-shadow: 0 15px 35px rgba(0,0,0,0.1); padding: 0.6rem; z-index: 100;
}
.user-dropdown-menu.right-menu { right: 0; }
.user-dropdown-menu.center-menu { left: 50%; transform: translateX(-50%); }

.dropdown-header { display: flex; align-items: center; gap: 0.65rem; padding: 0.4rem 0.5rem; }
.dropdown-avatar { width: 2.5rem; height: 2.5rem; border-radius: 50%; object-fit: cover; }
.dropdown-user-info { display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; }
.dropdown-user-info strong { font-size: 0.85rem; color: #0f172a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dropdown-user-info span { font-size: 0.7rem; color: #94a3b8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dropdown-divider { height: 1px; background: #f1f5f9; margin: 0.4rem 0; }
.dropdown-item {
  width: 100%; text-align: left; padding: 0.55rem 0.75rem; border: none;
  background: none; border-radius: 0.45rem; font-size: 0.78rem; font-weight: 650;
  color: #475569; cursor: pointer; display: flex; align-items: center; gap: 0.6rem; transition: all 0.15s;
}
.dropdown-item:hover { background: #f8fafc; color: #0f172a; }
.dropdown-item.danger { color: #ef4444; }
.dropdown-item.sub { padding-left: 0.85rem; font-size: 0.74rem; font-weight: 600; color: #64748b; }
.dropdown-item.sub:hover { color: #4f46e5; }
.dropdown-submenu-group {
  padding: 0.35rem 0.25rem;
  margin-bottom: 0.2rem;
  border-radius: 0.5rem;
  background: linear-gradient(180deg, #f8fafc 0%, rgba(248,250,252,0) 100%);
  border: 1px solid #f1f5f9;
}
.dropdown-submenu-title {
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #94a3b8;
  padding: 0.15rem 0.45rem 0.35rem;
}

/* 动画 */
.dropdown-fade-enter-active, .dropdown-fade-leave-active { transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
.dropdown-fade-enter-from, .dropdown-fade-leave-to { opacity: 0; transform: translateY(-10px) scale(0.95); }
.center-menu.dropdown-fade-enter-from, .center-menu.dropdown-fade-leave-to { transform: translateX(-50%) translateY(-10px) scale(0.95); }

.desktop-only { display: flex; }
.mobile-only { display: none; }
.mobile-tabbar { display: none; }

@media (max-width: 1080px) {
  .nav-search-trigger {
    width: 7.4rem;
  }
  .nav-search-trigger kbd {
    display: none;
  }
}

@media (max-width: 980px) {
  .nav-content {
    padding: 0 1rem;
  }
  .nav-links {
    gap: 1.5rem;
  }
  .nav-search-trigger {
    width: 2rem;
    justify-content: center;
    padding: 0;
  }
  .nav-search-trigger span,
  .nav-search-trigger kbd {
    display: none;
  }
}

/* ── 移动端适配 (Safari/Chrome/iOS) ─ */
@media (max-width: 768px) {
  .nav-standard {
    height: calc(3.25rem + env(safe-area-inset-top));
    background: rgba(255, 255, 255, 0.58);
    backdrop-filter: blur(20px) saturate(150%);
    -webkit-backdrop-filter: blur(20px) saturate(150%);
    will-change: transform;
    -webkit-transform: translate3d(0, 0, 0);
    transform: translate3d(0, 0, 0);
  }
  /* 移动端：滚动时隐藏 */
  .nav-standard.nav-hidden {
    -webkit-transform: translate3d(0, -100%, 0);
    transform: translate3d(0, -100%, 0);
  }
  .nav-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 0.9rem;
    gap: 0.5rem;
  }
  .desktop-only { display: none !important; }
  .mobile-only { display: flex !important; }

  .nav-logo { gap: 0.45rem; flex-shrink: 0; }
  .logo-box { width: 1.65rem; height: 1.65rem; border-radius: 0.48rem; font-size: 0.75rem; }
  .logo-text { font-size: 0.78rem; letter-spacing: 0.08em; }

  .nav-links {
    display: none;
  }

  .nav-right { gap: 0.35rem; }
  .nav-mobile-tools {
    max-width: calc(100vw - 8.5rem);
    justify-content: flex-end;
    overflow: visible;
    z-index: 30;
  }
  .nav-action-wrapper.system-dropdown-wrap {
    position: relative;
    z-index: 40;
  }
  .nav-dropdown.system-dropdown.mobile-system-dropdown {
    right: 0;
    left: auto;
    min-width: 10.5rem;
  }
  .nav-mobile-slot {
    padding: 0.24rem 0.42rem;
    font-size: 0.56rem;
  }
  .nav-icon-btn,
  .status-dot-btn {
    width: 2.15rem;
    height: 2.15rem;
    border-radius: 0.72rem;
    background: rgba(255, 255, 255, 0.74);
    border: 1px solid rgba(203, 213, 225, 0.52);
  }
  .nav-icon-btn svg { width: 17px; height: 17px; }
  .nav-icon-ai {
    color: #7c3aed;
    background: rgba(245, 243, 255, 0.84);
    border-color: rgba(196, 181, 253, 0.55);
  }
  .nav-icon-ai:hover {
    color: #a78bfa;
  }
  .mobile-tabbar {
    position: fixed;
    top: auto !important;
    left: 50%;
    bottom: max(0.75rem, env(safe-area-inset-bottom));
    transform: translateX(-50%);
    width: min(calc(100vw - 1.5rem), 25rem);
    padding: 0.35rem;
    border-radius: 1.2rem;
    background: rgba(255, 255, 255, 0.86);
    border: 1px solid rgba(203, 213, 225, 0.62);
    box-shadow: 0 16px 42px rgba(15, 23, 42, 0.16);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    z-index: 1001;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.25rem;
  }
  .mobile-tabbar-item {
    min-width: 0;
    height: 2.75rem;
    border: none;
    border-radius: 0.9rem;
    background: transparent;
    color: #64748b;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.12rem;
    font-family: inherit;
    font-size: 0.62rem;
    font-weight: 850;
    letter-spacing: 0.02em;
    cursor: pointer;
    transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
  }
  .mobile-tabbar-item.active {
    background: #0f172a;
    color: #ffffff;
    box-shadow: 0 8px 18px rgba(15, 23, 42, 0.16);
  }
  .mobile-tabbar.tabbar-hidden {
    transform: translateX(-50%) translateY(calc(100% + 1.5rem));
  }
  .mobile-tabbar-item:active {
    transform: scale(0.96);
  }

  /* 移动端 My 菜单：在 tabbar 内部上方弹出 */
  .tabbar-user-menu {
    position: absolute;
    right: 0;
    bottom: calc(100% + 0.6rem);
    width: 13rem;
    background: white;
    border-radius: 1rem;
    border: 1px solid #e2e8f0;
    box-shadow: 0 -10px 35px rgba(15, 23, 42, 0.18);
    padding: 0.6rem;
    z-index: 1002;
  }
  .tabbar-menu-fade-enter-active,
  .tabbar-menu-fade-leave-active {
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .tabbar-menu-fade-enter-from,
  .tabbar-menu-fade-leave-to {
    opacity: 0;
    transform: translateY(12px) scale(0.96);
  }
}
@media (max-width: 480px) {
  .nav-standard {
    height: calc(3.1rem + env(safe-area-inset-top));
  }
  .nav-content { padding: 0 0.8rem; gap: 0.5rem; }

  .logo-box { width: 1.55rem; height: 1.55rem; font-size: 0.7rem; }
  .logo-text { font-size: 0.74rem; letter-spacing: 0.07em; }
  .nav-right { gap: 0.25rem; }
  .nav-icon-btn,
  .status-dot-btn { width: 2rem; height: 2rem; border-radius: 0.68rem; }
  .nav-icon-btn svg { width: 16px; height: 16px; }
  .mobile-tabbar {
    width: min(calc(100vw - 1rem), 23.5rem);
    border-radius: 1rem;
  }
  .mobile-tabbar-item {
    height: 2.55rem;
    border-radius: 0.78rem;
    font-size: 0.58rem;
  }
}

/* 暗色模式 */
</style>