<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { LoginUser } from '../types/blog'
import { getLoginUserName } from '../utils/article'

defineProps<{
  isLoggedIn: boolean
  loginUser: Partial<LoginUser>
  showUserMenu: boolean
}>()

defineEmits<{
  navigate: [sectionId: string]
  openProfile: []
  openDashboard: []
  openLogin: []
  toggleStatus: []
  logout: []
}>()

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
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <nav class="nav-standard" :class="{ 'nav-hidden': !isVisible }">
    <div class="nav-content">
      <div class="nav-logo">
        <div class="logo-box">E</div>
        <span class="logo-text">ETHERLOG</span>
      </div>

      <div class="nav-links">
        <button type="button" @click="$emit('navigate', 'home')">Home</button>
        <button type="button" @click="$emit('navigate', 'posts')">Posts</button>
        <button type="button" @click="$emit('navigate', 'about')">About</button>
      </div>

      <div class="nav-actions">
        <button v-if="isLoggedIn" class="nav-action-button" type="button" @click.prevent="$emit('openProfile')">个人主页</button>
        <button v-if="isLoggedIn" class="nav-action-button secondary" type="button" @click.prevent="$emit('openDashboard')">控制面板</button>
        <!-- <button v-else class="nav-action-button" type="button" @click.prevent="$emit('openLogin')">Login</button> -->
      </div>

      <div class="status-badge-wrapper">
        <div class="status-badge" :class="{ clickable: isLoggedIn, active: showUserMenu }" @click="$emit('toggleStatus')">
          <div class="dot"></div>
          <span>{{ isLoggedIn ? 'SIGNED IN' : 'SYSTEM READY' }}</span>
        </div>

        <div v-if="isLoggedIn && showUserMenu" class="user-dropdown-menu" @click.stop>
          <div class="dropdown-header">
            <img class="dropdown-avatar" :src="loginUser.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Scribe'" alt="avatar" />
            <div class="dropdown-user-info">
              <strong>{{ getLoginUserName(loginUser) }}</strong>
              <span>{{ loginUser.email || '未设置邮箱' }}</span>
            </div>
          </div>
          <div class="dropdown-divider"></div>
          <button class="dropdown-item danger" type="button" @click="$emit('logout')">
            <span>退出登录</span>
          </button>
        </div>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.nav-standard {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 5rem;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
  z-index: 1000;
  /* 关键：使用 transform 实现流畅动画 */
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.3s;
}

.nav-standard.nav-hidden {
  transform: translateY(-100%);
}

.nav-content {
  max-width: 64rem;
  height: 100%;
  margin: 0 auto;
  padding: 0 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* 基础样式对齐 */
.nav-logo { display: flex; align-items: center; gap: 0.75rem; cursor: pointer; }
.logo-box {
  width: 2rem; height: 2rem; background: #0f172a; color: white;
  display: flex; align-items: center; justify-content: center;
  border-radius: 0.5rem; font-weight: 900;
}
.logo-text { font-weight: 800; font-size: 0.9rem; letter-spacing: 0.05em; color: #0f172a; }

.nav-links { display: flex; gap: 2rem; }
.nav-links button {
  background: none; border: none; font-size: 0.85rem; font-weight: 600;
  color: #64748b; cursor: pointer; transition: color 0.2s;
}
.nav-links button:hover { color: #0f172a; }

.nav-actions { display: flex; gap: 0.75rem; align-items: center; }
.nav-action-button {
  padding: 0.5rem 1rem; border-radius: 9999px; border: none;
  background: #0f172a; color: white; font-size: 0.75rem; font-weight: 700;
  cursor: pointer; transition: opacity 0.2s;
}
.nav-action-button.secondary { background: #f1f5f9; color: #475569; }

.status-badge-wrapper { position: relative; }
.status-badge {
  display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0.75rem;
  border-radius: 9999px; background: #f8fafc; border: 1px solid #e2e8f0;
  font-size: 0.65rem; font-weight: 800; color: #64748b;
}
.status-badge.clickable { cursor: pointer; }
.status-badge .dot { width: 6px; height: 6px; border-radius: 50%; background: #10b981; }

.user-dropdown-menu {
  position: absolute; top: calc(100% + 0.5rem); right: 0; width: 14rem;
  background: white; border-radius: 1rem; border: 1px solid #e2e8f0;
  box-shadow: 0 10px 25px rgba(0,0,0,0.05); padding: 0.75rem; z-index: 100;
}
.dropdown-header { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem; }
.dropdown-avatar { width: 2.5rem; height: 2.5rem; border-radius: 50%; }
.dropdown-user-info { display: flex; flex-direction: column; gap: 0.1rem; }
.dropdown-user-info strong { font-size: 0.85rem; color: #0f172a; }
.dropdown-user-info span { font-size: 0.7rem; color: #94a3b8; }
.dropdown-divider { height: 1px; background: #f1f5f9; margin: 0.5rem 0; }
.dropdown-item {
  width: 100%; text-align: left; padding: 0.6rem 0.75rem; border: none;
  background: none; border-radius: 0.5rem; font-size: 0.8rem; font-weight: 600; cursor: pointer;
}
.dropdown-item.danger { color: #ef4444; }
</style>
