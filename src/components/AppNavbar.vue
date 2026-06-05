<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Menu, X, User, LayoutDashboard, LogOut, Home, BookOpen, Info, Search, FlaskConical } from 'lucide-vue-next'
import type { LoginUser } from '../types/blog'
import { getLoginUserName } from '../utils/article'

const props = defineProps<{
  isLoggedIn: boolean
  loginUser: Partial<LoginUser>
  showUserMenu: boolean
}>()

const emit = defineEmits<{
  navigate: [sectionId: string]
  openProfile: []
  openDashboard: []
  openQuantLab: []
  openLogin: []
  toggleStatus: []
  openSearch: []
  logout: []
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

const isVisible = ref(true)
const lastScrollPosition = ref(0)
const scrollThreshold = 10 // 滚动阈值，避免过度灵敏
const topOffset = 80       // 页面顶部的缓冲区，在此范围内不隐藏

const handleScroll = () => {
  const currentScroll = window.pageYOffset || document.documentElement.scrollTop

  // 忽略 iOS 等系统的回弹负值
  if (currentScroll < 0) return

  // 在顶部区域始终显示
  if (currentScroll < topOffset) {
    isVisible.value = true
    lastScrollPosition.value = currentScroll
    return
  }

  // 检查滚动距离是否超过阈值
  if (Math.abs(currentScroll - lastScrollPosition.value) < scrollThreshold) return

  // 核心逻辑：向上滚显示，向下滚隐藏
  isVisible.value = currentScroll < lastScrollPosition.value
  lastScrollPosition.value = currentScroll
}

onMounted(() => {
  checkMobile()
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
        <span class="logo-text">ETHERLOG</span>
      </div>

      <!-- 2. 中间：PC 链接 / 移动端汉堡 (绝对居中) -->
      <div class="nav-links desktop-only">
        <button type="button" @click="$emit('navigate', 'home')">Home</button>
        <button type="button" @click="$emit('navigate', 'posts')">Posts</button>
        <button type="button" @click="$emit('navigate', 'about')">About</button>
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
        <!-- 搜索触发按钮 -->
        <button class="nav-search-trigger" type="button" @click="$emit('openSearch')" title="搜索 (⌘K)">
          <Search :size="16" />
          <span class="desktop-only">Search...</span>
          <kbd class="desktop-only">⌘K</kbd>
        </button>

        <div class="nav-actions desktop-only">
          <button v-if="isLoggedIn" class="nav-action-button lab" type="button" @click.prevent="$emit('openQuantLab')">Quant Lab</button>
          <button v-if="isLoggedIn" class="nav-action-button" type="button" @click.prevent="$emit('openProfile')">个人主页</button>
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
                  <button class="dropdown-item" type="button" @click="$emit('openQuantLab')"><FlaskConical :size="14" /> Quant Lab</button>
                  <button class="dropdown-item" type="button" @click="$emit('openProfile')"><User :size="14" /> 个人主页</button>
                  <button class="dropdown-item" type="button" @click="$emit('openDashboard')"><LayoutDashboard :size="14" /> 控制面板</button>
                  <div class="dropdown-divider"></div>
                </template>
                <button class="dropdown-item danger" type="button" @click="$emit('logout')"><LogOut :size="14" /> 退出登录</button>
              </template>
              <button v-else class="dropdown-item" type="button" @click="$emit('openLogin')">登录账户</button>
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
  background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px); border-bottom: 1px solid rgba(226, 232, 240, 0.8);
  z-index: 1000; transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.3s;
}
.nav-standard.nav-hidden { transform: translateY(-100%); }
.nav-content {
  max-width: 64rem; height: 100%; margin: 0 auto; padding: 0 1.5rem;
  display: flex; align-items: center; justify-content: space-between; gap: 1rem;
}
.nav-right { display: flex; align-items: center; gap: 0.75rem; }

/* Logo */
.nav-logo { display: flex; align-items: center; gap: 0.75rem; cursor: pointer; flex-shrink: 0; }
.logo-box {
  width: 1.85rem; height: 1.85rem; background: #0f172a; color: white;
  display: flex; align-items: center; justify-content: center;
  border-radius: 0.45rem; font-weight: 900;
}
.logo-text { font-weight: 800; font-size: 0.9rem; letter-spacing: 0.05em; color: #0f172a; }

/* PC 链接 */
.nav-links { display: flex; gap: 2rem; }
.nav-links button {
  background: none; border: none; font-size: 0.85rem; font-weight: 600;
  color: #64748b; cursor: pointer; transition: color 0.2s;
}
.nav-links button:hover { color: #0f172a; }

/* PC 操作 */
.nav-actions { display: flex; gap: 0.75rem; align-items: center; }
.nav-action-button {
  padding: 0.45rem 1rem; border-radius: 9999px; border: none;
  background: #0f172a; color: white; font-size: 0.75rem; font-weight: 700;
  cursor: pointer; transition: opacity 0.2s;
}
.nav-action-button.lab { background: #eff6ff; color: #2563eb; border: 1px solid rgba(37, 99, 235, 0.18); }
.nav-action-button.secondary { background: #f1f5f9; color: #475569; }

/* 搜索触发器样式 */
.nav-search-trigger {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.6rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.6rem;
  background: #f8fafc;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s ease;
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

/* 系统状态栏 (Badge) */
.status-badge-wrapper { position: relative; }
.status-badge {
  display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0.75rem;
  border-radius: 9999px; background: #f8fafc; border: 1px solid #e2e8f0;
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

/* ── 移动端适配 (Safari/Chrome/iOS) ── */
@media (max-width: 768px) {
  .nav-content { display: grid; grid-template-columns: 1fr auto 1fr; padding: 0 1rem; }
  .desktop-only { display: none !important; }
  .mobile-only { display: flex !important; }
  .nav-logo { grid-column: 1; }
  .mobile-nav-wrapper { grid-column: 2; justify-self: center; }
  .nav-right { grid-column: 3; justify-self: end; }
  .logo-text { display: none; }
}
</style>
