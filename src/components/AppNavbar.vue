<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  User, LogOut, FlaskConical, House, FileText,
  Folder, Tag, MessageSquare, ChevronDown, Twitter, Instagram, Github,
  Settings, Users, Shield, KeyRound, Search
} from 'lucide-vue-next'
import type { LoginUser } from '../types/blog'
import { getLoginUserName } from '../utils/article'
import { hasPermission, hasRole } from '../composables/useAuth'

const route = useRoute()
const router = useRouter()

const canAccessDashboardArticle = computed(() => hasPermission('dashboard:article') || hasRole(['ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_EDITOR']))
const canAccessDashboardCategory = computed(() => hasPermission('dashboard:category') || hasRole(['ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_EDITOR']))
const canAccessDashboardTag = computed(() => hasPermission('dashboard:tag') || hasRole(['ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_EDITOR']))
const canAccessDashboardComment = computed(() => hasPermission('dashboard:comment') || hasRole(['ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_EDITOR']))

const canAccessDashboard = computed(() =>
  canAccessDashboardArticle.value || canAccessDashboardCategory.value || canAccessDashboardTag.value || canAccessDashboardComment.value
)

const canAccessSystemUser = computed(() => hasPermission('system:user') || hasRole(['ROLE_SUPER_ADMIN', 'ROLE_ADMIN']))
const canAccessSystemRole = computed(() => hasPermission('system:role') || hasRole(['ROLE_SUPER_ADMIN', 'ROLE_ADMIN']))
const canAccessSystemPermission = computed(() => hasPermission('system:permission') || hasRole(['ROLE_SUPER_ADMIN', 'ROLE_ADMIN']))
const canAccessSystem = computed(() => canAccessSystemUser.value || canAccessSystemRole.value || canAccessSystemPermission.value)

const showAdminEntries = computed(() => isBlogContext.value && props.isLoggedIn)
const showSystemDropdown = ref(false)

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

const isPortfolioHome = computed(() => route.name === 'home')
const isBlogContext = computed(() => {
  const name = String(route.name)
  const blogPageNames = ['blog', 'blog-guestbook', 'blog-post-detail', 'post-detail', 'profile', 'publish', 'publish-edit']
  return blogPageNames.includes(name) || name.startsWith('dashboard') || name.startsWith('system')
})

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function goTo(page: string) {
  showSystemDropdown.value = false
  const routeMap: Record<string, string> = {
    'profile': '/profile',
    'dashboard': '/dashboard',
    'dashboard-article': '/dashboard/article',
    'dashboard-category': '/dashboard/category',
    'dashboard-tag': '/dashboard/tag',
    'dashboard-comment': '/dashboard/comment',
    'dashboard-media': '/dashboard/media',
    'dashboard-sensitive-words': '/dashboard/sensitive-words',
    'system-user': '/system/user',
    'system-role': '/system/role',
    'system-permission': '/system/permission',
    'system': '/system/user',
  }
  const path = routeMap[page]
  if (path) router.push(path)
}

function scrollToPosts() {
  const el = document.getElementById('posts')
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}
const isMobile = ref(false)
const showPortfolioPatterns = ref(false)
const showPortfolioTemplates = ref(false)
const userMenuFromTabbar = ref(false)

function closePortfolioDropdowns() {
  showPortfolioPatterns.value = false
  showPortfolioTemplates.value = false
}

function closeAllDropdowns() {
  closePortfolioDropdowns()
  showSystemDropdown.value = false
  emit('closeUserMenu')
}

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768
}

const contentPageNames = new Set([
  'blog', 'guestbook', 'profile',
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

function scrollPortfolioSection(sectionId: string) {
  const target = document.getElementById(sectionId)
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

watch(
  () => route.fullPath,
  () => {
    setTimeout(resetNavState, 50)
  }
)

watch(isMobile, () => {
  setTimeout(resetNavState, 50)
})

onMounted(() => {
  checkMobile()
  lastScrollY = getScrollY()
  updateScrollDepth(lastScrollY)
  window.addEventListener('resize', checkMobile)
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <div class="nav-shell">
    <nav
      class="portfolio-nav"
      :class="{ 'nav-hidden': !isVisible }"
      :style="{ '--nav-scroll-depth': scrollDepth }"
      @mouseleave="closeAllDropdowns"
    >
      <div class="portfolio-nav-inner">
        <button class="portfolio-brand" type="button" @click="$emit('navigate', 'home')">
          <span class="portfolio-brand-mark">N</span>
          <span class="portfolio-brand-name">NEXTIFY<br><small>个人主页</small></span>
        </button>

        <div class="portfolio-links">
          <button
            type="button"
            :class="{ active: route.name === 'home' }"
            @click="$emit('navigate', 'home')"
          >Home</button>
          <button
            type="button"
            :class="{ active: isBlogContext }"
            @click="$emit('navigate', 'blog')"
          >Blog</button>
          <button
            type="button"
            :class="{ active: String(route.name).startsWith('assessment') }"
            @click="$emit('navigate', 'assessment')"
          >Aether</button>
          <button
            type="button"
            :class="{ active: route.name === 'quant-lab' }"
            @click="$emit('navigate', 'quant-lab')"
          >Quant</button>
          <button
            type="button"
            :class="{ active: route.name === 'blog-guestbook' }"
            @click="$emit('navigate', 'guestbook')"
          >Guestbook</button>

          <button v-if="isBlogContext" class="portfolio-search-btn" type="button" title="搜索" @click="$emit('openSearch')">
            <Search :size="15" />
            <span class="portfolio-search-placeholder">搜索文章...</span>
          </button>

          <div
            v-if="isPortfolioHome"
            class="portfolio-dropdown-wrap"
            @mouseenter="showPortfolioPatterns = true; showPortfolioTemplates = false"
          >
            <button type="button" class="has-dropdown">
              Patterns
              <ChevronDown :size="12" class="portfolio-chevron" :class="{ 'is-open': showPortfolioPatterns }" />
            </button>
            <Transition name="dropdown-fade">
              <div v-if="showPortfolioPatterns" class="portfolio-dropdown" @click.stop>
                <button class="portfolio-dropdown-item" type="button" @click="scrollPortfolioSection('works')">Selected Works</button>
                <button class="portfolio-dropdown-item" type="button" @click="scrollPortfolioSection('about')">About</button>
                <button class="portfolio-dropdown-item" type="button" @click="scrollPortfolioSection('now')">Now</button>
                <button class="portfolio-dropdown-item" type="button" @click="scrollPortfolioSection('writing')">Selected Writing</button>
              </div>
            </Transition>
          </div>

          <div
            v-if="!isBlogContext"
            class="portfolio-dropdown-wrap"
            @mouseenter="showPortfolioTemplates = true; showPortfolioPatterns = false"
          >
            <button type="button" class="has-dropdown">
              Templates
              <ChevronDown :size="12" class="portfolio-chevron" :class="{ 'is-open': showPortfolioTemplates }" />
            </button>
            <Transition name="dropdown-fade">
              <div v-if="showPortfolioTemplates" class="portfolio-dropdown" @click.stop>
                <button class="portfolio-dropdown-item" type="button" @click="$emit('navigate', 'home')">Portfolio Home</button>
                <button class="portfolio-dropdown-item" type="button" @click="$emit('navigate', 'blog')">Posts Home</button>
                <button class="portfolio-dropdown-item" type="button" @click="$emit('navigate', 'assessment')">Aether Valuation</button>
                <button class="portfolio-dropdown-item" type="button" @click="$emit('navigate', 'quant-lab')">Quant Lab</button>
              </div>
            </Transition>
          </div>
        </div>

        <div class="portfolio-actions">
          <!-- 博客页面：管理入口（取代社交图标位置） -->
          <template v-if="showAdminEntries">
            <button class="portfolio-admin-entry" type="button" @click="goTo('profile')">
              <User :size="15" />
              个人主页
            </button>
            <button v-if="canAccessDashboard" class="portfolio-admin-entry" type="button" @click="goTo('dashboard')">
              <FileText :size="15" />
              数据面板
            </button>
            <div v-if="canAccessSystem" class="portfolio-system-wrap" @click.stop>
              <button
                class="portfolio-admin-entry has-chevron"
                type="button"
                @click="showSystemDropdown = !showSystemDropdown; emit('closeUserMenu')"
              >
                <Settings :size="15" />
                系统管理
                <ChevronDown :size="12" class="portfolio-chevron" :class="{ 'is-open': showSystemDropdown }" />
              </button>
              <Transition name="dropdown-fade">
                <div v-if="showSystemDropdown" class="portfolio-system-menu">
                  <button v-if="canAccessSystemUser" class="portfolio-system-item" type="button" @click="goTo('system-user')">
                    <Users :size="14" /> 用户管理
                  </button>
                  <button v-if="canAccessSystemRole" class="portfolio-system-item" type="button" @click="goTo('system-role')">
                    <Shield :size="14" /> 角色管理
                  </button>
                  <button v-if="canAccessSystemPermission" class="portfolio-system-item" type="button" @click="goTo('system-permission')">
                    <KeyRound :size="14" /> 权限管理
                  </button>
                </div>
              </Transition>
            </div>
          </template>

          <!-- 非博客页面：社交图标 -->
          <template v-else>
            <a class="portfolio-social" href="https://x.com/ether" target="_blank" rel="noopener" title="X">
              <Twitter :size="16" />
            </a>
            <a class="portfolio-social" href="https://instagram.com/ether" target="_blank" rel="noopener" title="Instagram">
              <Instagram :size="16" />
            </a>
            <a class="portfolio-social" href="https://github.com/ether" target="_blank" rel="noopener" title="GitHub">
              <Github :size="16" />
            </a>
          </template>

          <button class="portfolio-main-action" type="button" @click="$emit('navigate', 'downloads')">
            Download
          </button>

          <div class="portfolio-status-wrap">
            <button
              class="portfolio-status-dot"
              type="button"
              :class="{ logged: isLoggedIn }"
              :title="isLoggedIn ? `已登录 · ${getLoginUserName(loginUser)}` : '点击登录'"
              @click="isLoggedIn ? $emit('toggleStatus') : $emit('openLogin')"
            >
              <span class="portfolio-dot-inner"></span>
            </button>
            <Transition name="dropdown-fade">
              <div v-if="isLoggedIn && showUserMenu && !isMobile" class="portfolio-user-menu" @click.stop>
                <div class="dropdown-header">
                  <img class="dropdown-avatar" :src="loginUser.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Scribe'" alt="avatar" />
                  <div class="dropdown-user-info">
                    <strong>{{ getLoginUserName(loginUser) }}</strong>
                    <span>{{ loginUser.email || 'Admin' }}</span>
                  </div>
                </div>
                <div class="dropdown-divider"></div>
                <button class="dropdown-item" type="button" @click="$emit('closeUserMenu'); $emit('openProfile')"><User :size="14" /> 个人主页</button>
                <button v-if="canAccessDashboardArticle || canAccessDashboardCategory || canAccessDashboardTag || canAccessDashboardComment" class="dropdown-item" type="button" @click="$emit('closeUserMenu'); $emit('openDashboard')"><FileText :size="14" /> 数据面板</button>
                <button class="dropdown-item" type="button" @click="$emit('closeUserMenu'); $emit('openQuantLab')"><FlaskConical :size="14" /> Quant Lab</button>
                <div class="dropdown-divider"></div>
                <button class="dropdown-item danger" type="button" @click="$emit('closeUserMenu'); $emit('logout')"><LogOut :size="14" /> 退出登录</button>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </nav>


    <div
      v-if="!isPortfolioHome"
      class="mobile-tabbar"
      :class="[{ 'tabbar-hidden': !isVisible, 'tabbar-4col': isLoggedIn }]"
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
        :class="{ active: route.name === 'home' || isBlogContext }"
        @click="isBlogContext ? scrollToTop() : $emit('navigate', 'home')"
      >
        <House :size="17" />
        <span>Home</span>
      </button>
      <button
        type="button"
        class="mobile-tabbar-item"
        :class="{ active: route.name === 'blog' && !isBlogContext }"
        @click="isBlogContext ? scrollToPosts() : $emit('navigate', 'blog')"
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

  .nav-right { gap: 0.35rem; min-width: 0; flex: 0 1 auto; }
  .nav-mobile-tools {
    justify-content: flex-end;
    overflow: visible;
    z-index: 30;
    flex: 0 0 auto;
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
    left: 0.75rem;
    right: 0.75rem;
    bottom: max(0.75rem, env(safe-area-inset-bottom));
    transform: none;
    max-width: 25rem;
    margin-left: auto;
    margin-right: auto;
    padding: 0.35rem;
    border-radius: 1.2rem;
    background: rgba(255, 255, 255, 0.86);
    border: 1px solid rgba(203, 213, 225, 0.62);
    box-shadow: 0 16px 42px rgba(15, 23, 42, 0.16);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    z-index: 1001;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.25rem;
  }
  .mobile-tabbar.tabbar-4col {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
  .mobile-tabbar-item {
    min-width: 0;
    height: 3rem;
    border: none;
    border-radius: 0.95rem;
    background: transparent;
    color: #64748b;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.15rem;
    font-family: inherit;
    font-size: 0.65rem;
    font-weight: 850;
    letter-spacing: 0.01em;
    cursor: pointer;
    transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
    -webkit-tap-highlight-color: transparent;
  }
  .mobile-tabbar-item.active {
    background: #0f172a;
    color: #ffffff;
    box-shadow: 0 8px 18px rgba(15, 23, 42, 0.16);
  }
  .mobile-tabbar.tabbar-hidden {
    transform: translateY(calc(100% + 1.5rem));
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
    left: 0.5rem;
    right: 0.5rem;
    max-width: 23.5rem;
    border-radius: 1.1rem;
  }
  .mobile-tabbar-item {
    height: 2.8rem;
    border-radius: 0.82rem;
    font-size: 0.62rem;
  }
}

/* 暗色模式 */

/* ===== Portfolio Nav (Light) ===== */
.portfolio-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: rgba(255, 255, 255, calc(var(--nav-scroll-depth, 0) * 0.82));
  backdrop-filter: blur(calc(var(--nav-scroll-depth, 0) * 12px));
  -webkit-backdrop-filter: blur(calc(var(--nav-scroll-depth, 0) * 12px));
  border-bottom: 1px solid rgba(0, 0, 0, calc(var(--nav-scroll-depth, 0) * 0.08));
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1),
    background 0.3s ease, border-color 0.3s ease, backdrop-filter 0.3s ease;
}

.portfolio-nav.nav-hidden {
  transform: translateY(-100%);
}

.portfolio-nav-inner {
  width: min(1110px, 100%);
  margin: 0 auto;
  height: 64px;
  padding: 0 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
}

.portfolio-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0;
  background: transparent;
  border: 0;
  color: #111111;
  font: inherit;
  cursor: pointer;
  text-align: left;
  line-height: 1.1;
}

.portfolio-brand-name {
  display: inline-block;
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.portfolio-brand-name small {
  display: block;
  font-size: 0.7rem;
  font-weight: 500;
  letter-spacing: 0.04em;
  color: rgba(0, 0, 0, 0.45);
  margin-top: 2px;
}

.portfolio-brand-mark {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  background: #111111;
  color: #FDF800;
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.4rem;
  font-weight: 400;
  flex-shrink: 0;
  border-radius: 8px;
}

.portfolio-brand-mark::after {
  content: '';
  position: absolute;
  bottom: 5px;
  right: 5px;
  width: 6px;
  height: 6px;
  background: #FDF800;
}

.portfolio-links {
  display: flex;
  align-items: center;
  gap: 0.1rem;
}

.portfolio-links > button,
.portfolio-dropdown-wrap > button {
  padding: 0.5rem 0.65rem;
  background: transparent;
  border: 0;
  color: #111111;
  font: inherit;
  font-size: 0.88rem;
  font-weight: 500;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition: color 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  white-space: nowrap;
}

.portfolio-links > button:hover,
.portfolio-dropdown-wrap > button:hover {
  color: #666666;
}

.portfolio-links > button.active {
  color: #111111;
  font-weight: 700;
}

.portfolio-links > button.active::after {
  content: '';
  position: absolute;
  bottom: 0.35rem;
  left: 50%;
  transform: translateX(-50%);
  width: 18px;
  height: 2px;
  background: #111111;
  border-radius: 2px;
}

.portfolio-links > button {
  position: relative;
}

/* 搜索按钮 */
.portfolio-search-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.7rem;
  background: rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 999px;
  color: #94a3b8;
  font: inherit;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.18s ease;
  white-space: nowrap;
  flex-shrink: 0;
}
.portfolio-search-btn:hover {
  background: rgba(0, 0, 0, 0.07);
  border-color: rgba(0, 0, 0, 0.15);
  color: #475569;
}
.portfolio-search-placeholder {
  font-size: 0.76rem;
}

.portfolio-chevron {
  transition: transform 0.2s ease;
}

.portfolio-chevron.is-open {
  transform: rotate(180deg);
}

.portfolio-dropdown-wrap {
  position: relative;
}

.portfolio-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  min-width: 200px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
  padding: 0.4rem;
  z-index: 1001;
}

.portfolio-dropdown-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 0.55rem 0.75rem;
  background: transparent;
  border: 0;
  color: #111111;
  font: inherit;
  font-size: 0.85rem;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.portfolio-dropdown-item:hover {
  background: #FDF800;
  color: #111111;
}

.portfolio-actions {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.portfolio-social {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  color: #111111;
  text-decoration: none;
  border-radius: 6px;
  transition: background 0.2s ease, color 0.2s ease;
}

.portfolio-social:hover {
  background: rgba(0, 0, 0, 0.06);
  color: #111111;
}

.portfolio-main-action {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 1.25rem;
  background: #FDF800;
  color: #111111;
  border: 0;
  border-radius: 999px;
  font: inherit;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
  box-shadow: 0 2px 8px rgba(253, 248, 0, 0.4);
}

.portfolio-main-action:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(253, 248, 0, 0.55);
  background: #f5f000;
}

/* 博客页面管理入口按钮 */
.portfolio-admin-entry {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.4rem 0.65rem;
  background: #ffffff;
  color: #111827;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  font: inherit;
  font-size: 0.76rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s ease;
  white-space: nowrap;
}
.portfolio-admin-entry:hover {
  background: #111827;
  color: #ffffff;
  border-color: #111827;
}
.portfolio-admin-entry.has-chevron {
  padding-right: 0.6rem;
}
.portfolio-admin-entry .portfolio-chevron {
  margin-left: 0.1rem;
  transition: transform 0.2s ease;
}
.portfolio-admin-entry .portfolio-chevron.is-open {
  transform: rotate(180deg);
}

/* 系统管理下拉 */
.portfolio-system-wrap {
  position: relative;
}
.portfolio-system-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 150px;
  padding: 0.4rem;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.portfolio-system-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.7rem;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #334155;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
}
.portfolio-system-item:hover {
  background: #f1f5f9;
  color: #111827;
}

/* 半隐藏登录状态图标 */
.portfolio-status-dot {
  position: relative;
  width: 18px;
  height: 18px;
  margin-left: 2px;
  padding: 0;
  border: none;
  background: transparent;
  border-radius: 50%;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.portfolio-dot-inner {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #d1d5db;
  transition: all 0.2s ease;
}

.portfolio-status-dot:hover {
  background: rgba(0, 0, 0, 0.06);
}

.portfolio-status-dot:hover .portfolio-dot-inner {
  width: 10px;
  height: 10px;
  background: #111111;
}

.portfolio-status-dot.logged .portfolio-dot-inner {
  background: #10b981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.15);
}

.portfolio-status-dot.logged:hover .portfolio-dot-inner {
  background: #059669;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
}

.portfolio-status-dot.logged::after {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 50%;
  border: 1px solid rgba(16, 185, 129, 0.25);
  animation: dotPulse 2.4s ease-in-out infinite;
}

@keyframes dotPulse {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 0; transform: scale(1.4); }
}

@media (max-width: 1024px) {
  .portfolio-dropdown-wrap {
    display: none;
  }
}

/* ════════════════════════════════
   iOS 移动端 Portfolio 导航重设计
   ════════════════════════════════ */
@media (max-width: 768px) {
  .portfolio-nav-inner {
    flex-wrap: nowrap;
    height: 52px;
    padding: 0 0.6rem;
    gap: 0.35rem;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .portfolio-nav-inner::-webkit-scrollbar {
    display: none;
  }

  .portfolio-brand {
    gap: 0.35rem;
    flex-shrink: 0;
  }
  .portfolio-brand-mark {
    width: 28px;
    height: 28px;
    font-size: 1.1rem;
    border-radius: 6px;
  }
  .portfolio-brand-name {
    font-size: 0.82rem;
    line-height: 1.1;
  }
  .portfolio-brand-name small {
    display: none;
  }

  .portfolio-social {
    display: none !important;
  }

  .portfolio-main-action {
    padding: 0.35rem 0.7rem;
    font-size: 0.72rem;
    min-height: 28px;
    flex-shrink: 0;
    border-radius: 8px;
  }

  .portfolio-admin-entry {
    padding: 0.3rem 0.55rem;
    font-size: 0.68rem;
    gap: 0.25rem;
    flex-shrink: 0;
    min-height: 28px;
  }
  .portfolio-admin-entry.has-chevron {
    padding-right: 0.4rem;
  }
  .portfolio-admin-entry svg:first-child {
    width: 13px;
    height: 13px;
  }
  .portfolio-admin-entry .portfolio-chevron {
    width: 10px;
    height: 10px;
  }
  .portfolio-system-menu {
    right: 0;
    left: auto;
    min-width: 130px;
  }

  .portfolio-actions {
    flex-shrink: 0;
  }

  .portfolio-links {
    order: initial;
    width: auto;
    flex: 0 0 auto;
    min-width: 0;
    display: flex;
    gap: 0.25rem;
    overflow: visible;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    justify-content: flex-start;
  }
  .portfolio-links::-webkit-scrollbar {
    display: none;
  }

  .portfolio-links > button {
    flex-shrink: 0;
    padding: 0.3rem 0.65rem;
    font-size: 0.72rem;
    font-weight: 600;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.05);
    color: #111111;
    min-height: 28px;
    transition: background 0.2s ease, color 0.2s ease;
    -webkit-tap-highlight-color: transparent;
  }
  .portfolio-links > button:active {
    background: rgba(0, 0, 0, 0.12);
  }
  .portfolio-links > button.active {
    background: #111111;
    color: #FDF800;
    font-weight: 700;
  }
  .portfolio-links > button.active::after {
    display: none;
  }
}

@media (max-width: 420px) {
  .portfolio-nav-inner {
    padding: 0 0.45rem;
    gap: 0.25rem;
    height: 48px;
  }
  .portfolio-brand-mark {
    width: 26px;
    height: 26px;
    font-size: 1rem;
    border-radius: 5px;
  }
  .portfolio-brand-name {
    font-size: 0.76rem;
  }
  .portfolio-main-action {
    padding: 0.3rem 0.55rem;
    font-size: 0.68rem;
    min-height: 26px;
  }
  .portfolio-links {
    gap: 0.18rem;
  }
  .portfolio-links > button {
    padding: 0.25rem 0.55rem;
    font-size: 0.68rem;
    min-height: 26px;
  }
}

</style>