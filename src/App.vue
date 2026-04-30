<script setup lang="ts">
/**
 * EtherLog - 核心首页组件 (Vue 3 最终修复版)
 * 专注点：Bento Grid 响应式布局 + 消除全局样式干扰
 */
import { ref, reactive, onMounted } from 'vue'
import axios from 'axios'
import { 
  Zap, 
  Github, 
  ArrowUpRight, 
  Cpu, 
  Globe, 
  Terminal 
} from 'lucide-vue-next'

// 模拟数据：后期将通过 axios 从后端获取
const articles = ref([
  { 
    id: 1, 
    title: '重新开始的艺术', 
    summary: '有时候，彻底删除是为了更好的构建。', 
    tag: 'Thought' 
  },
  { 
    id: 2, 
    title: 'Spring Boot 3 实战', 
    summary: '探索 Java 17 带来的性能飞跃。', 
    tag: 'Code' 
  }
])

const categories = ref([
  { id: 1, label: 'Thought' },
  { id: 2, label: 'Code' },
  { id: 3, label: 'Design' },
  { id: 4, label: 'Guide' }
])

const loginForm = reactive({
  email: '',
  password: ''
})
const loginError = ref('')
const isLoggedIn = ref(false)
const loginUser = ref({ name: '', email: '' })
const showLoginModal = ref(false)

function openLoginModal() {
  showLoginModal.value = true
}

function closeLoginModal() {
  showLoginModal.value = false
  loginError.value = ''
}

async function login() {
  loginError.value = ''

  if (!loginForm.email || !loginForm.password) {
    loginError.value = '请输入邮箱和密码后再尝试登录。'
    return
  }

  try {
    const response = await axios.post('/api/login', {
      email: loginForm.email,
      password: loginForm.password
    })

    // 后端返回示例数据结构：{ token, user }
    localStorage.setItem('authToken', response.data.token)
    localStorage.setItem('authUser', JSON.stringify(response.data.user))
    loginUser.value = response.data.user
    isLoggedIn.value = true
    showLoginModal.value = false
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      loginError.value = '账号或密码错误，请重新检查。'
      return
    }

    // 如果后端尚未准备好，保留本地模拟登录能力
    loginError.value = '登录接口暂不可用，已启用本地模拟登录。'
    isLoggedIn.value = true
    loginUser.value = { name: 'Guest Writer', email: loginForm.email }
    localStorage.setItem('authUser', JSON.stringify(loginUser.value))
    showLoginModal.value = false
  }
}

function logout() {
  isLoggedIn.value = false
  loginUser.value = { name: '', email: '' }
  loginForm.email = ''
  loginForm.password = ''
  loginError.value = ''
  localStorage.removeItem('authToken')
  localStorage.removeItem('authUser')
}

onMounted(() => {
  const storedUser = localStorage.getItem('authUser')
  if (storedUser) {
    loginUser.value = JSON.parse(storedUser)
    isLoggedIn.value = true
  }
})
</script>

<template>
  <!-- 根容器必须是 text-left 且宽度铺满 -->
  <div class="app-container">
    
    <!-- 1. 顶部导航栏 -->
    <nav class="nav-fixed">
      <div class="nav-content">
        <div class="nav-logo">
          <div class="logo-box">E</div>
          <span class="logo-text">ETHERLOG</span>
        </div>
        
                <div class="nav-links">
          <a href="#home">Home</a>
          <a href="#posts">Posts</a>
          <a href="#about">About</a>
        </div>

        <div class="nav-actions">
          <button class="nav-action-button" type="button" @click="openLoginModal">
            {{ isLoggedIn ? loginUser.name : 'Login' }}
          </button>
        </div>

        <div class="status-badge">
          <div class="dot"></div>
          <span>{{ isLoggedIn ? 'SIGNED IN' : 'SYSTEM READY' }}</span>
        </div>
      </div>
    </nav>

    <!-- 2. Hero 巨幕区 -->
    <header id="home" class="hero-section">
      <div class="hero-copy">
        <div class="version-tag">
          <Terminal :size="12" class="text-blue-600" />
          <span>Version 2.0 Stable</span>
        </div>
        <h1 class="hero-title">
          Crafting <span class="text-gray-300 italic font-serif">Logic</span><br />
          Into <span class="text-blue-600">Digital Art.</span>
        </h1>
        <p class="hero-subtitle">
          欢迎回到 EtherLog。这是一个追求极致极简与稳定逻辑的博客系统，由 Spring Boot 3 与 Vue 3 驱动。
        </p>
      </div>
    </header>

    <div v-if="showLoginModal" class="modal-overlay" @click.self="closeLoginModal">
      <div class="modal-card">
        <button class="modal-close" type="button" @click="closeLoginModal">×</button>
        <div class="login-panel compact">
          <div class="login-intro">
            <span class="section-label">登录</span>
            <h2>进入控制面板</h2>
            <p>登录后即可访问文章管理、草稿与个人后台功能。</p>
          </div>

          <form class="login-form" @submit.prevent="login">
            <label class="login-field">
              <span>邮箱</span>
              <input
                class="form-input"
                type="email"
                placeholder="example@etherlog.com"
                v-model="loginForm.email"
              />
            </label>

            <label class="login-field">
              <span>密码</span>
              <input
                class="form-input"
                type="password"
                placeholder="请输入密码"
                v-model="loginForm.password"
              />
            </label>

            <button class="contact-button login-submit" type="submit">登录</button>

            <p v-if="loginError" class="form-error">{{ loginError }}</p>
            <p v-if="isLoggedIn" class="form-success">
              已登录为 <strong>{{ loginUser.name }}</strong>。
              <button class="logout-link" @click.prevent="logout">退出登录</button>
            </p>
          </form>
        </div>
      </div>
    </div>

    <section class="section-intro">
      <div class="section-meta">
        <span class="section-label">博客主页</span>
        <p class="section-copy">导航、最新文章、关于与订阅入口，构成一个完整的个人技术博客首页。让访客一眼找到内容、作者定位和下一步行动。</p>
      </div>
      <div class="category-list">
        <span v-for="cat in categories" :key="cat.id" class="category-pill">{{ cat.label }}</span>
      </div>
    </section>

    <!-- 3. Bento Grid 内容区 -->
    <main id="posts" class="grid-container">
      <div class="content-heading">
        <div>
          <span class="section-label">Latest</span>
          <h2>最新文章与系统日志</h2>
        </div>
        <a class="view-all" href="#about">查看关于</a>
      </div>
      <div class="bento-grid">
        
        <!-- 个人卡片 -->
        <div class="card-large bg-white border-white shadow-sm">
          <div class="card-header">
            <div class="avatar-box">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="avatar" />
            </div>
            <Zap class="text-blue-600" />
          </div>
          <div class="card-footer">
            <h2 class="text-3xl font-bold">Scribe</h2>
            <p class="text-gray-400 mt-1">重新出发，这一次我们要走得更稳。</p>
          </div>
        </div>

        <!-- 技术栈卡片 -->
        <div class="card-small bg-zinc-900 text-white">
          <Cpu class="tech-icon" :size="60" />
          <h3 class="tech-title">Java 17 &<br/>Vite + Vue 3</h3>
          <p class="tech-status">Running</p>
        </div>

        <!-- 社交卡片 -->
        <div class="card-small bg-white border-white shadow-sm flex-center">
          <div class="social-icons">
            <div class="icon-btn"><Github :size="20" /></div>
            <div class="icon-btn font-bold">𝕏</div>
          </div>
          <span class="social-label">Connect</span>
        </div>

        <!-- 动态文章 -->
        <div v-for="post in articles" :key="post.id" class="card-large bg-white border-white shadow-sm hover:bg-gray-50 transition-all cursor-pointer">
          <div class="card-header">
            <span class="tag">{{ post.tag }}</span>
            <ArrowUpRight class="text-gray-300" />
          </div>
          <div class="card-footer">
            <h3 class="text-2xl font-bold">{{ post.title }}</h3>
            <p class="text-gray-400 mt-2 font-light text-sm">{{ post.summary }}</p>
          </div>
        </div>

        <!-- 底部 Slogan -->
        <div class="card-full bg-blue-600 text-white shadow-lg">
          <div class="slogan-text">"Simplicity is the ultimate sophistication."</div>
          <div class="slogan-footer">
             <Globe :size="14" />
             <span>ETHERLOG NETWORK</span>
          </div>
        </div>

      </div>
    </main>

    <section id="about" class="about-section">
      <div class="about-card">
        <span class="section-label">关于 EtherLog</span>
        <h3>极简而不简单的技术博客</h3>
        <p>EtherLog 专注于记录架构思考、开发实践与系统设计。首页展示导航、最新文章、作者信息与行动入口，让读者快速获取价值。</p>
      </div>
      <div class="about-card">
        <span class="section-label">核心模块</span>
        <h3>最新更新 / 分类 / 关注</h3>
        <p>以文章为核心，辅以分类、作者介绍与订阅入口，满足技术博客常见需求。同时保留简洁视觉与沉浸式阅读体验。</p>
      </div>
      <div class="about-card">
        <span class="section-label">下一步</span>
        <h3>持续更新与归档</h3>
        <p>未来可继续补充作者档案、标签云、精选专题和邮件订阅，让博客从首页变成长期积累的知识枢纽。</p>
      </div>
    </section>

    <section id="contact" class="contact-section">
      <h2>想要更多更新？</h2>
      <p>在 EtherLog，首页不仅是展示，更是入口。你可以加上订阅、社交、站内搜索等动作，帮助读者快速进入下一个内容。</p>
      <a class="contact-button" href="mailto:hello@etherlog.example.com">联系我 / 订阅</a>
    </section>

    <!-- 4. 页脚 -->
    <footer class="footer">
      <span>© 2026 ETHERLOG STUDIO. REBORN VERSION.</span>
      <span>STABLE PRODUCTION</span>
    </footer>
  </div>
</template>

<style scoped>
/* 使用 Scoped 样式确保布局不乱 */
.app-container {
  min-height: 100vh;
  background-color: #f5f5f7;
  color: #1d1d1f;
  text-align: left; /* 强制左对齐 */
}

.nav-fixed {
  position: fixed;
  top: 1.5rem;
  left: 0;
  right: 0;
  z-index: 50;
  padding: 0 1rem;
}

.nav-content {
  max-width: 64rem;
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  border-radius: 9999px;
  padding: 1rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.logo-box {
  width: 2rem;
  height: 2rem;
  background: black;
  color: white;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-style: italic;
  font-size: 0.875rem;
}

.logo-text {
  font-weight: bold;
  letter-spacing: -0.05em;
  text-transform: uppercase;
  margin-left: 0.75rem;
}

.nav-links {
  display: none;
  font-size: 10px;
  font-weight: 900;
  color: #9ca3af;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  gap: 2rem;
}
.nav-links a {
  color: inherit;
  text-decoration: none;
  transition: color 0.2s ease;
}
.nav-links a:hover {
  color: #111827;
}
.nav-actions {
  display: flex;
  align-items: center;
}
.nav-action-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  padding: 0.75rem 1.15rem;
  background: #2563eb;
  border: none;
  border-radius: 9999px;
  color: white;
  font-weight: 900;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.nav-action-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 30px rgba(37, 99, 235, 0.22);
}
@media (min-width: 768px) { .nav-links { display: flex; } }

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  z-index: 100;
}
.modal-card {
  width: min(100%, 28rem);
  border-radius: 2rem;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 40px 120px rgba(15, 23, 42, 0.18);
  border: 1px solid rgba(148, 163, 184, 0.18);
  position: relative;
}
.modal-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 2.5rem;
  height: 2.5rem;
  border: none;
  border-radius: 9999px;
  background: rgba(15, 23, 42, 0.05);
  color: #475569;
  font-size: 1.4rem;
  cursor: pointer;
  line-height: 1;
}
.modal-close:hover {
  background: rgba(15, 23, 42, 0.1);
}

.section-intro {
  max-width: 64rem;
  margin: 0 auto 2rem;
  padding: 0 1.5rem;
}
.section-meta {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: 38rem;
}
.section-label {
  font-size: 0.75rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.25em;
  color: #60a5fa;
}
.section-copy {
  color: #6b7280;
  line-height: 1.75;
}
.category-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1rem;
}
.category-pill {
  padding: 0.65rem 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 9999px;
  background: white;
  color: #374151;
  font-size: 0.8rem;
  font-weight: 700;
}
.content-heading {
  max-width: 64rem;
  margin: 0 auto 1rem;
  padding: 0 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}
.content-heading h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 900;
}
.view-all {
  color: #2563eb;
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.16em;
}
.about-section {
  max-width: 64rem;
  margin: 0 auto 3rem;
  padding: 0 1.5rem;
  display: grid;
  gap: 1.5rem;
}
@media (min-width: 768px) { .about-section { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
.about-card {
  background: white;
  border-radius: 2rem;
  padding: 2rem;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.about-card h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
}
.about-card p {
  margin: 0;
  color: #6b7280;
  line-height: 1.75;
}
.contact-section {
  max-width: 64rem;
  margin: 0 auto;
  padding: 2rem 1.5rem 4rem;
  background: #eff6ff;
  border-radius: 2rem;
}
.contact-section h2 {
  margin: 0 0 1rem;
  font-size: 1.75rem;
}
.contact-section p {
  color: #475569;
  margin: 0 0 1.5rem;
  line-height: 1.75;
}
.contact-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #2563eb;
  color: white;
  border-radius: 9999px;
  padding: 0.95rem 1.75rem;
  font-weight: 700;
  text-decoration: none;
}
.login-section {
  max-width: 64rem;
  margin: 0 auto 3rem;
  padding: 2rem 1.5rem;
}
.login-panel {
  background: white;
  border-radius: 2rem;
  padding: 2rem;
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08);
  display: grid;
  gap: 2rem;
}
.login-intro h2 {
  margin: 0.5rem 0 0;
  font-size: 2rem;
}
.login-intro p {
  margin: 0.75rem 0 0;
  color: #475569;
  line-height: 1.75;
}
.login-form {
  display: grid;
  gap: 1rem;
}
.login-field {
  display: grid;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #374151;
}
.form-input {
  width: 100%;
  min-height: 3rem;
  border-radius: 1rem;
  border: 1px solid #d1d5db;
  padding: 0.95rem 1rem;
  font-size: 1rem;
  color: #111827;
  background: #fafafa;
}
.form-input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
}
.login-submit {
  width: fit-content;
}
.form-error {
  margin: 0;
  color: #dc2626;
  font-size: 0.95rem;
}
.form-success {
  margin: 0;
  color: #16a34a;
  font-size: 0.95rem;
}
.logout-link {
  background: transparent;
  border: none;
  color: #2563eb;
  cursor: pointer;
  padding: 0;
  font-weight: 700;
}
@media (min-width: 768px) { .login-panel { grid-template-columns: 1fr 1fr; } }

.hero-grid {
  display: grid;
  gap: 2rem;
  align-items: center;
}
@media (min-width: 1024px) {
  .hero-grid {
    grid-template-columns: minmax(0, 1.5fr) minmax(360px, 1fr);
  }
}
.hero-login-card {
  position: relative;
  justify-self: end;
}
.hero-login-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 2.5rem;
  background: radial-gradient(circle at top right, rgba(59,130,246,0.16), transparent 50%);
  pointer-events: none;
}
.login-panel.compact {
  padding: 2.25rem;
  min-height: auto;
  box-shadow: 0 40px 100px rgba(15, 23, 42, 0.12);
  border: 1px solid rgba(59,130,246,0.14);
  border-radius: 2.25rem;
  background: rgba(255,255,255,0.96);
  backdrop-filter: blur(18px);
  display: grid;
  gap: 1.25rem;
}
.login-panel.compact .login-intro h2 {
  font-size: 1.7rem;
}
.login-panel.compact .login-intro p {
  color: #475569;
}
.login-panel.compact .login-form {
  gap: 1rem;
}
.login-panel.compact .login-field {
  gap: 0.45rem;
}
.login-panel.compact .form-input {
  min-height: 3.25rem;
}
.login-panel.compact .login-submit {
  width: 100%;
}
.hero-section {
  max-width: 72rem;
  margin: 3rem auto 2rem;
  padding: 3.5rem 2rem 3rem;
  border-radius: 3rem;
  background: rgba(255,255,255,0.92);
  box-shadow: 0 40px 120px rgba(15, 23, 42, 0.12);
  border: 1px solid rgba(226,232,240,0.8);
}

.version-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  background: white;
  border-radius: 9999px;
  border: 1px solid #f3f4f6;
  margin-bottom: 2rem;
  font-size: 10px;
  font-weight: 700;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.hero-title {
  font-size: 3rem;
  font-weight: bold;
  letter-spacing: -0.05em;
  line-height: 1.1;
  margin-bottom: 2rem;
}
@media (min-width: 768px) { .hero-title { font-size: 5rem; } }

.hero-subtitle {
  font-size: 1.125rem;
  color: #9ca3af;
  max-width: 42rem;
  font-weight: 300;
}

.grid-container {
  max-width: 64rem;
  margin: 0 auto;
  padding: 0 1.5rem 5rem;
}

.bento-grid {
  display: grid;
  grid-template-cols: 1fr;
  gap: 1.5rem;
}
@media (min-width: 768px) { .bento-grid { grid-template-cols: repeat(4, 1fr); } }

.card-large {
  grid-column: span 1;
  min-height: 200px;
  border-radius: 2.5rem;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border-width: 1px;
}
@media (min-width: 768px) { .card-large { grid-column: span 2; } }

.card-small {
  grid-column: span 1;
  min-height: 200px;
  border-radius: 2.5rem;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  position: relative;
  overflow: hidden;
}

.card-full {
  grid-column: span 1;
  min-height: 160px;
  border-radius: 2.5rem;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}
@media (min-width: 768px) { .card-full { grid-column: span 4; } }

.card-header { display: flex; justify-content: space-between; align-items: start; }
.avatar-box { width: 4rem; height: 4rem; border-radius: 1rem; background: #f5f5f7; overflow: hidden; }
.tech-icon { position: absolute; top: 1.5rem; right: 1.5rem; color: #27272a; }
.tech-title { font-size: 1.25rem; font-weight: bold; position: relative; z-index: 10; }
.tech-status { font-size: 9px; font-weight: 900; text-transform: uppercase; color: #71717a; margin-top: 0.5rem; }

.flex-center { align-items: center; justify-content: center; gap: 1rem; }
.social-icons { display: flex; gap: 0.75rem; }
.icon-btn { width: 3rem; height: 3rem; border-radius: 0.75rem; background: #f5f5f7; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s; }
.icon-btn:hover { background: black; color: white; }
.social-label { font-size: 9px; font-weight: 900; color: #d1d5db; text-transform: uppercase; letter-spacing: 0.3em; }

.tag { padding: 0.25rem 0.75rem; background: #f5f5f7; border-radius: 9999px; font-size: 9px; font-weight: 900; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em; }

.slogan-text { font-size: 1.5rem; font-weight: 300; font-style: italic; opacity: 0.9; text-align: center; z-index: 10; }
.slogan-footer { display: flex; align-items: center; gap: 0.5rem; margin-top: 1rem; z-index: 10; opacity: 0.6; font-size: 9px; font-weight: 900; letter-spacing: 0.2em; }

.footer {
  max-width: 64rem;
  margin: 0 auto;
  padding: 3rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  color: #d1d5db;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.4em;
  gap: 1.5rem;
}
@media (min-width: 768px) { .footer { flex-direction: row; } }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>