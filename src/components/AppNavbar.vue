<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { Menu, X, User, LayoutDashboard, LogOut, Home, BookOpen, Info, Search, FlaskConical, Sparkles } from 'lucide-vue-next'
import type { LoginUser } from '../types/blog'
import { getLoginUserName } from '../utils/article'

const route = useRoute()

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
  openLogin: []
  toggleStatus: []
  openSearch: []
  openAiAssistant: []
  logout: []
  toggleDark: []
  closeUserMenu: []
}>()

// 移动端中间汉堡菜单的本地状态
const showMobileNav = ref(false)
const isMobile = ref(false)

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768
}

function toggleMobileNav() {
  showMobileNav.value = !showMobileNav.value
  // 互斥逻辑：打开中间菜单时，尝试关闭右侧菜单（如果已打开）
  if (showMobileNav.value && props.showUserMenu) {
    emit('toggleStatus')
  }
}

// ── 滚动隐藏导航栏（Twitter/Medium 风格：向下滚隐藏，向上滚显示） ──

// 内容阅读页（移动端需要滚动隐藏，让出阅读空间）
const contentPageNames = new Set([
  'posts', 'about', 'guestbook', 'profile',
  'publish', 'publish-edit', 'quant-lab',
  'assessment-home', 'assessment-evaluate',
  'assessment-processing', 'assessment-result', 'assessment-share'
])
const isContentPage = computed(() => contentPageNames.has(String(route.name)))

// 是否允许滚动隐藏导航栏：仅「移动端 + 内容阅读页」才启用
const allowAutoHide = computed(() => isMobile.value && isContentPage.value)

// 导航栏可见性
const isVisible = ref(true)
let lastScrollY = 0
let ticking = false
const MIN_DELTA = 8     // 最小滚动位移（避免抖动）
const TOP_BUFFER = 120  // 在页面顶部区域始终显示

// 获取当前滚动位置（兼容性处理）
function getScrollY() {
  return window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0
}

// 滚动处理（核心：向下滚隐藏，向上滚显示）
function handleScroll() {
  if (!ticking) {
    window.requestAnimationFrame(() => {
      const currentY = getScrollY()

      // 场景1：当前不允许自动隐藏 → 强制显示，不做滚动计算
      if (!allowAutoHide.value) {
        isVisible.value = true
        lastScrollY = currentY
        ticking = false
        return
      }

      // 场景2：在页面顶部区域 → 始终显示
      if (currentY < TOP_BUFFER) {
        isVisible.value = true
        lastScrollY = currentY
        ticking = false
        return
      }

      // 场景3：滚动位移过小 → 忽略（防抖）
      const delta = currentY - lastScrollY
      if (Math.abs(delta) < MIN_DELTA) {
        ticking = false
        return
      }

      // 场景4：核心判断
      // 向下滚 (delta > 0) → 隐藏导航栏，让出阅读空间
      // 向上滚 (delta < 0) → 显示导航栏，方便用户导航
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

// 重置导航栏状态（路由切换 / 窗口大小变化）
function resetNavState() {
  isVisible.value = true
  lastScrollY = getScrollY()
}

// ── 监听器注册 ──

// 监听路由变化：每次切页都重置为显示，并更新基准滚动位置
watch(
  () => route.fullPath,
  () => {
    // 稍等页面内容渲染完成后再重置，避免滚动值跳动
    setTimeout(resetNavState, 50)
  }
)

// 窗口大小变化：切换桌面/移动模式时重置
watch(isMobile, () => {
  setTimeout(resetNavState, 50)
})

onMounted(() => {
  checkMobile()
  lastScrollY = getScrollY()
  window.addEventListener('resize', checkMobile)
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <nav class="nav-standard" :class="{ 'nav-hidden': !isVisible }">
    <div class="nav-content">
      <!-- 1. 左侧：Logo (始终靠左) -->
      <div class="nav-logo" @click="$emit('navigate', 'home')">
        <div class="logo-box">E</div>
        <span class="logo-text">NEXTIFY</span>
      </div>

      <!-- 2. 中间：PC 链接 / 移动端汉堡 (绝对居中) -->
      <div class="nav-links desktop-only">
        <button type="button" @click="$emit('navigate', 'home')">Home</button>
        <button type="button" @click="$emit('navigate', 'posts')">Posts</button>
        <button type="button" @click="$emit('navigate', 'about')">About</button>
      </div>

      <!-- 搜索作为独立工具位，避免挤压右侧操作按钮 -->
      <div class="nav-search-slot desktop-only">
        <button class="nav-search-trigger" type="button" @click="$emit('openSearch')" title="搜索 (⌘K)">
          <Search :size="16" />
          <span>Search...</span>
          <kbd>⌘K</kbd>
        </button>
      </div>

      <div class="mobile-nav-wrapper mobile-only">
        <button
          class="mobile-menu-btn"
          :class="{ active: showMobileNav }"
          @click="toggleMobileNav"
          type="button"
        >
          <Menu v-if="!showMobileNav" :size="20" />
          <X v-else :size="20" />
        </button>

        <!-- 汉堡菜单：仅包含 Home, Posts, About -->
        <Transition name="dropdown-fade">
          <div v-if="showMobileNav" class="user-dropdown-menu center-menu" @click.stop>
            <button class="dropdown-item" type="button" @click="showMobileNav = false; $emit('navigate', 'home')">
              <Home :size="14" /> Home
            </button>
            <button class="dropdown-item" type="button" @click="showMobileNav = false; $emit('navigate', 'posts')">
              <BookOpen :size="14" /> Posts
            </button>
            <button class="dropdown-item" type="button" @click="showMobileNav = false; $emit('navigate', 'about')">
              <Info :size="14" /> About
            </button>
          </div>
        </Transition>
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
          <button v-if="isLoggedIn" class="nav-action-button lab" type="button" @click.prevent="$emit('openQuantLab')">Quant Lab</button>
          <button v-if="isLoggedIn" class="nav-action-button secondary" type="button" @click.prevent="$emit('openProfile')">个人主页</button>
          <button v-if="isLoggedIn" class="nav-action-button secondary" type="button" @click.prevent="$emit('openDashboard')">控制面板</button>
        </div>

        <div class="status-badge-wrapper">
          <div class="status-badge clickable" :class="{ active: showUserMenu }" @click="$emit('toggleStatus')">
            <div class="dot"></div>
            <span>{{ isLoggedIn ? 'IN' : 'SYSTEM READY' }}</span>
          </div>

          <Transition name="dropdown-fade">
            <div v-if="showUserMenu" class="user-dropdown-menu right-menu" @click.stop>
              <div v-if="isLoggedIn" class="dropdown-header">
                <img class="dropdown-avatar" :src="loginUser.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Scribe'" alt="avatar" />
                <div class="dropdown-user-info">
                  <strong>{{ getLoginUserName(loginUser) }}</strong>
                  <span>{{ loginUser.email || 'Admin' }}</span>
                </div>
              </div>
              <div class="dropdown-divider" v-if="isLoggedIn"></div>
              
              <template v-if="isLoggedIn">
                <!-- 仅在移动端显示这些链接，因为 PC 端它们已经直接摆在导航栏上了 -->
                <template v-if="isMobile">
                  <button class="dropdown-item" type="button" @click="$emit('closeUserMenu'); $emit('openAiAssistant')"><Sparkles :size="14" /> AI 助手</button>
                  <button class="dropdown-item" type="button" @click="$emit('closeUserMenu'); $emit('openQuantLab')"><FlaskConical :size="14" /> Quant Lab</button>
                  <button class="dropdown-item" type="button" @click="$emit('closeUserMenu'); $emit('openProfile')"><User :size="14" /> 个人主页</button>
                  <button class="dropdown-item" type="button" @click="$emit('closeUserMenu'); $emit('openDashboard')"><LayoutDashboard :size="14" /> 控制面板</button>
                  <div class="dropdown-divider"></div>
                </template>
                <button class="dropdown-item danger" type="button" @click="$emit('closeUserMenu'); $emit('logout')"><LogOut :size="14" /> 退出登录</button>
              </template>
              <button v-else class="dropdown-item" type="button" @click="$emit('closeUserMenu'); $emit('openLogin')">登录账户</button>
            </div>
          </Transition>
        </div>
      </div>
    </div>
  </nav>
</template>

<style scoped>
/* ── 基础布局 (PC) ── */
.nav-standard {
  position: fixed; top: 0; left: 0; right: 0; height: 5rem;
  background: var(--nav-bg); backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px); border-bottom: 1px solid var(--nav-border);
  z-index: 1000; transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.3s;
  box-shadow: 0 1px 0 rgba(15, 23, 42, 0.04);
}
/* 桌面端永远不隐藏（即 nav-hidden 类对桌面端无视觉效果） */
.nav-standard.nav-hidden { transform: translateY(0); }
.nav-content {
  max-width: 64rem; height: 100%; margin: 0 auto; padding: 0 1.5rem;
  display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;
}
.nav-right { display: flex; align-items: center; gap: 0.4rem; }

/* Logo */
.nav-logo { display: flex; align-items: center; gap: 0.65rem; cursor: pointer; flex-shrink: 0; }
.logo-box {
  width: 1.85rem; height: 1.85rem; background: #0f172a; color: white;
  display: flex; align-items: center; justify-content: center;
  border-radius: 0.45rem; font-weight: 900;
}
.logo-text { font-weight: 800; font-size: 0.88rem; letter-spacing: 0.045em; color: #0f172a; }

/* PC 链接 */
.nav-links { display: flex; gap: 1.25rem; }
.nav-links button {
  background: none; border: none; font-size: 0.8rem; font-weight: 700;
  color: #64748b; cursor: pointer; transition: color 0.2s;
  letter-spacing: 0.08em;
}
.nav-links button:hover { color: #0f172a; }

/* PC 操作 */
.nav-actions { display: flex; gap: 0.35rem; align-items: center; margin-left: 0.1rem; }
.nav-action-button {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem;
  min-height: 2rem;
  padding: 0.36rem 0.58rem; border-radius: 0.62rem; border: none;
  background: #0f172a; color: white; font-size: 0.7rem; font-weight: 750;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer; transition: all 0.2s ease;
}
.nav-action-button:hover { transform: translateY(-1px); }
.nav-action-button.lab { background: #eff6ff; color: #2563eb; border: 1px solid rgba(37, 99, 235, 0.18); }
.nav-action-button.secondary { background: #f1f5f9; color: #475569; }

/* 搜索触发器样式 */
.nav-search-trigger {
  display: flex;
  align-items: center;
  gap: 0.38rem;
  width: 8.6rem;
  height: 2rem;
  padding: 0 0.55rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.6rem;
  background: #f8fafc;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s ease;
}
.nav-search-trigger span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.nav-search-trigger:hover {
  border-color: #cbd5e1;
  background: #f1f5f9;
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
  gap: 0.45rem;
  height: 2rem;
  padding: 0 0.75rem 0 0.3rem;
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
  border-radius: 0.62rem; background: #f8fafc; border: 1px solid #e2e8f0;
  font-size: 0.62rem; font-weight: 800; color: #64748b; white-space: nowrap;
  flex-shrink: 0; cursor: pointer; transition: all 0.2s ease;
}
.status-badge:hover { border-color: #cbd5e1; background: #f1f5f9; }
.status-badge.active { background: #0f172a; color: white; border-color: #0f172a; }
.status-badge .dot { width: 6px; height: 6px; border-radius: 50%; background: #10b981; }

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

/* 动画 */
.dropdown-fade-enter-active, .dropdown-fade-leave-active { transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
.dropdown-fade-enter-from, .dropdown-fade-leave-to { opacity: 0; transform: translateY(-10px) scale(0.95); }
.center-menu.dropdown-fade-enter-from, .center-menu.dropdown-fade-leave-to { transform: translateX(-50%) translateY(-10px) scale(0.95); }

.desktop-only { display: flex; }
.mobile-only { display: none; }

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
    gap: 0.9rem;
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
    height: 3.75rem;
    will-change: transform;
    -webkit-transform: translate3d(0, 0, 0);
    transform: translate3d(0, 0, 0);
  }
  /* 移动端：滚动时隐藏 */
  .nav-standard.nav-hidden {
    -webkit-transform: translate3d(0, -100%, 0);
    transform: translate3d(0, -100%, 0);
    box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.1);
  }
  .nav-content { display: grid; grid-template-columns: auto auto 1fr; padding: 0 0.75rem; gap: 0.5rem; }
  .desktop-only { display: none !important; }
  .mobile-only { display: flex !important; }
  .nav-logo { grid-column: 1; gap: 0.5rem; }
  .logo-box { width: 1.55rem; height: 1.55rem; border-radius: 0.4rem; font-size: 0.75rem; }
  .logo-text { font-size: 0.78rem; letter-spacing: 0.04em; }
  .mobile-nav-wrapper { grid-column: 2; justify-self: center; }
  .nav-right { grid-column: 3; justify-self: end; gap: 0.35rem; }
  .status-badge { padding: 0.25rem 0.5rem; font-size: 0.55rem; gap: 0.3rem; }
  .status-badge .label-text { display: none; }
  .nav-search-trigger { padding: 0.3rem 0.4rem; }
  .nav-search-trigger .search-label { display: none; }
  .mobile-menu-btn { width: 2rem; height: 2rem; border-radius: 0.5rem; }
}
@media (max-width: 480px) {
  .nav-standard { height: 3.5rem; }
  .nav-content { padding: 0 0.6rem; gap: 0.35rem; }
  .nav-logo { gap: 0.35rem; }
  .logo-text { font-size: 0.72rem; }
  .nav-right { gap: 0.3rem; }
}

/* 暗色模式 */
</style>