<script setup lang="ts">
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
</script>

<template>
  <nav class="nav-fixed">
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
