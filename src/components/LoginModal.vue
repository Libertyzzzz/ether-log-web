<script setup lang="ts">
import type { LoginUser } from '../types/blog'
import { getLoginUserName } from '../utils/article'

defineProps<{
  email: string
  password: string
  loginError: string
  isLoggedIn: boolean
  isLoggingIn: boolean
  loginUser: Partial<LoginUser>
}>()

defineEmits<{
  close: []
  login: []
  logout: []
  'update:email': [value: string]
  'update:password': [value: string]
}>()
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-card">
      <button class="modal-close" type="button" @click="$emit('close')">×</button>
      <div class="login-panel compact">
        <div class="login-intro">
          <span class="section-label">登录</span>
          <h2>进入数据面板</h2>
          <p>登录后即可访问文章管理、草稿与个人后台功能。</p>
        </div>

        <form class="login-form" @submit.prevent="$emit('login')">
          <label class="login-field">
            <span>邮箱</span>
            <input class="form-input" type="email" placeholder="example@nextify.cn" :value="email" @input="$emit('update:email', ($event.target as HTMLInputElement).value)" />
          </label>

          <label class="login-field">
            <span>密码</span>
            <input class="form-input" type="password" placeholder="请输入密码" :value="password" @input="$emit('update:password', ($event.target as HTMLInputElement).value)" />
          </label>

          <button class="contact-button login-submit" type="submit" :disabled="isLoggingIn">
            {{ isLoggingIn ? '登录中...' : '登录' }}
          </button>

          <p v-if="loginError" class="form-error">{{ loginError }}</p>
          <p v-if="isLoggedIn" class="form-success">
            已登录为 <strong>{{ getLoginUserName(loginUser) }}</strong>。
            <button class="logout-link" @click.prevent="$emit('logout')">退出登录</button>
          </p>
        </form>
      </div>
    </div>
  </div>
</template>