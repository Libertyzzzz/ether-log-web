<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { User, LayoutDashboard, LogOut, Search, FlaskConical, Sparkles, House, FileText, Info } from 'lucide-vue-next'
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

const isMobile = ref(false)

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768
}

// ── 滚动隐藏导航栏（Twitter/Medium 风格：向下滚隐藏，向上滚显示） ──

const contentPageNames = new Set([
  'posts', 'about', 'guestbook', 'profile',
  'publish', 'publish-edit', 'quant-lab',
  'assessment-home', 'assessment-evaluate',
  'assessment-processing', 'assessment-result', 'assessment-share'
])
const isContentPage = computed(() => contentPageNames.has(String(route.name)))

const allowAutoHide = computed(() => isMobile.value && isContentPage.value)

const isVisible = ref(true)
let lastScrollY = 0
let ticking = false
const MIN_DELTA = 8
const TOP_BUFFER = 120

function getScrollY() {
  return window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0
}

function handleScroll() {
  if (!ticking) {
    window.requestAnimationFrame(() => {
      const currentY = getScrollY()

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
}

// ── 监听器注册 ──

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
    <nav class="nav-standard" :class="{ 'nav-hidden': !isVisible }">
      <div class="nav-content">
      <!-- 1. 左侧：Logo (始终靠左) -->
      <div class="nav-logo" @click="$emit('navigate', 'home')">
        <div class="logo-box">E</div>
        <span class="logo-text">NEXTIFY</span>
      </div>

      <!-- 2. 中间：Home / Posts / About（PC 和移动端都水平显示，移动端缩小字体和间距） -->
      <div class="nav-links">
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

        <div class="status-badge-wrapper">
          <!-- PC 端：带文字的 status badge -->
          <div class="status-badge clickable desktop-only" :class="{ active: showUserMenu }" @click="$emit('toggleStatus')">
            <div class="dot"></div>
            <span>{{ isLoggedIn ? 'IN' : 'SYSTEM READY' }}</span>
          </div>
          <!-- 移动端：仅小圆点（点击区域放大到 44px） -->
          <button
            class="status-dot-btn mobile-only"
            :class="{ active: showUserMenu, logged: isLoggedIn }"
            type="button"
            @click="$emit('toggleStatus')"
            :title="isLoggedIn ? '账户' : '登录'"
          >
            <span class="status-dot-inner"></span>
          </button>

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

    <div class="mobile-tabbar" :class="{ 'tabbar-hidden': !isVisible }" aria-label="移动端主导航">
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
        type="button"
        class="mobile-tabbar-item"
        :class="{ active: route.name === 'about' }"
        @click="$emit('navigate', 'about')"
      >
        <Info :size="17" />
        <span>About</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* ── 基础布局 (PC) ── */
.nav-standard {
  position: fixed; top: 0; left: 0; right: 0; height: 5rem;
  background: var(--nav-bg); backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  z-index: 1000; transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.3s;
  /* 处理 iOS 刘海/灵动岛 safe-area（移动端生效，PC 端 env() 返回 0，无副作用 */
  padding-top: env(safe-area-inset-top);
  box-sizing: border-box;
}
/* 桌面端永远不隐藏（即 nav-hidden 类对桌面端无视觉效果） */
.nav-standard.nav-hidden { transform: translateY(0); }
.nav-content {
  max-width: var(--nav-content-max-width); height: 100%; margin: 0 auto; padding: 0 0.9rem;
  display: flex; align-items: center; justify-content: space-between; gap: 0.2rem;
}
.nav-right { display: flex; align-items: center; gap: 0.12rem; }

/* Logo */
.nav-logo { display: flex; align-items: center; gap: 0.2rem; cursor: pointer; flex-shrink: 0; }
.logo-box {
  width: 1.85rem; height: 1.85rem; background: #0f172a; color: white;
  display: flex; align-items: center; justify-content: center;
  border-radius: 0.45rem; font-weight: 900;
}
.logo-text { font-weight: 800; font-size: 0.88rem; letter-spacing: 0.045em; color: #0f172a; }

/* PC 链接 */
.nav-links { display: flex; gap: 0.35rem; }
.nav-links button {
  background: none; border: none; font-size: 0.8rem; font-weight: 700;
  color: #64748b; cursor: pointer; transition: color 0.2s;
  letter-spacing: 0.08em;
}
.nav-links button:hover { color: #0f172a; }

/* PC 操作 */
.nav-actions { display: flex; gap: 0.08rem; align-items: center; margin-left: 0.02rem; }
.nav-action-button {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.1rem;
  min-height: 2rem;
  padding: 0.28rem 0.38rem; border-radius: 0.62rem; border: none;
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
  gap: 0.12rem;
  width: 6.4rem;
  height: 2rem;
  padding: 0 0.3rem;
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
  border-radius: 0.62rem; background: #f8fafc; border: 1px solid #e2e8f0;
  font-size: 0.62rem; font-weight: 800; color: #64748b; white-space: nowrap;
  flex-shrink: 0; cursor: pointer; transition: all 0.2s ease;
}
.status-badge:hover { border-color: #cbd5e1; background: #f1f5f9; }
.status-badge.active { background: #0f172a; color: white; border-color: #0f172a; }
.status-badge .dot { width: 6px; height: 6px; border-radius: 50%; background: #10b981; }

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
    height: calc(3.25rem + env(safe-area-inset-top));
    background: rgba(248, 250, 252, 0.86);
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
    grid-template-columns: repeat(4, 1fr);
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