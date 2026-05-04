<script setup lang="ts">
/**
 * EtherLog - 核心首页组件 (Vue 3 最终修复版)
 * 专注点：Bento Grid 响应式布局 + 消除全局样式干扰
 */
import { computed, nextTick, ref, reactive, onMounted, onUnmounted} from 'vue'
import axios from 'axios'
import { 
  Bold,
  Code2,
  Eye,
  Zap, 
  Heading,
  Image,
  Italic,
  List,
  ArrowUpRight, 
  Cpu, 
  Globe, 
  Quote,
  Terminal 
} from 'lucide-vue-next'

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
interface ResultResponse<T> {
  code: number
  message: string
  data: T
  timestamp: number
}

interface PageResponse<T> {
  records: T[]
  total: number
  size: number
  current: number
  pages: number
}

interface ArticleListItem {
  id: number
  title: string
  subtitle: string | null
  summary: string | null
  coverImg: string | null
  viewCount: number
  isTop: number
  categoryName: string | null
  tagNames: string[]
  createTime: string
}

interface ArticleDetail extends ArticleListItem {
  content: string
  contentHtml: string | null
  renderContent: string | null
  tagIds: number[]
  categoryId: number
  cardStyle: number
  status: number
  isTop: number
}

interface ArticlePublishRequest {
  title: string
  subtitle: string
  summary: string
  content: string
  contentHtml: string
  coverImg: string
  cardStyle: number
  status: number
  isTop: number
  categoryId: number
  tagIds: number[]
}

interface LoginUser {
  id: number
  username: string
  nickname: string | null
  avatar: string | null
  email: string | null
  motto: string | null
  createTime: string
  updateTime: string
  lastLoginTime: string | null
}

interface LoginData {
  token: string
  user: LoginUser
}

interface UploadImageData {
  url: string
  path: string
  name: string
}

const emptyLoginUser = {
  nickname: '',
  username: '',
  email: ''
}
const loginError = ref('')
const isLoggedIn = ref(false)
const loginUser = ref<Partial<LoginUser>>(emptyLoginUser)
const showLoginModal = ref(false)
const isLoggingIn = ref(false)
const articles = ref<ArticleListItem[]>([])
const activeCategoryId = ref<number | null>(null)
const articleError = ref('')
const isLoadingArticles = ref(false)
const selectedArticle = ref<ArticleDetail | null>(null)
const selectedArticlePreview = ref<ArticleListItem | null>(null)
const isLoadingArticleDetail = ref(false)
const showPublishModal = ref(false)
const publishError = ref('')
const isPublishing = ref(false)
const editingArticleId = ref<number | null>(null)
const isDeletingArticle = ref(false)
const contentTextarea = ref<HTMLTextAreaElement | null>(null)
const imageInput = ref<HTMLInputElement | null>(null)
const isPreviewingMarkdown = ref(false)
const isUploadingImage = ref(false)
const showUserMenu = ref(false)
const publishForm = reactive<ArticlePublishRequest>({
  title: '',
  subtitle: '',
  summary: '',
  content: '',
  contentHtml: '',
  coverImg: '',
  cardStyle: 1,
  status: 1,
  isTop: 0,
  categoryId: 1,
  tagIds: []
})

const filteredArticles = computed(() => {
  if (!activeCategoryId.value) {
    return articles.value
  }

  const activeCategory = categories.value.find(category => category.id === activeCategoryId.value)
  return articles.value.filter(article => article.categoryName === activeCategory?.label)
})

const articleForDetail = computed(() => selectedArticle.value || selectedArticlePreview.value)
const isEditMode = computed(() => editingArticleId.value !== null)
const currentPage = ref<'home'|'posts'|'about'|'profile'|'dashboard'>('home')
const showActionsInCurrentView = computed(() => currentPage.value === 'profile' || currentPage.value === 'dashboard')
const myComments = ref<Array<{ id: number; author: string; articleTitle: string; content: string; status: string; createTime: string }>>([
  { id: 1, author: 'Alice', articleTitle: '深度学习与架构优化', content: '这篇文章很有洞见，尤其是最后的性能建议。', status: '已审核', createTime: '2026-04-28 14:12' },
  { id: 2, author: 'Bob', articleTitle: '前端性能优化技巧', content: '图例部分可以加一个真实案例。', status: '待审核', createTime: '2026-04-29 09:23' },
  { id: 3, author: 'Carol', articleTitle: '系统设计与扩展性', content: '很喜欢这种模块化的落地方式。', status: '已审核', createTime: '2026-04-30 20:05' }
])

const recentArticles = computed(() => articles.value.slice(0, 5))
const totalViews = computed(() => articles.value.reduce((sum, item) => sum + (item.viewCount || 0), 0))
const commentCount = computed(() => myComments.value.length)

const markdownPreviewHtml = computed(() => renderMarkdown(publishForm.content))

function getLoginUserName() {
  return loginUser.value.nickname || loginUser.value.username || loginUser.value.email || 'User'
}

function getArticleCategory(article: ArticleListItem | ArticleDetail | null) {
  return article?.categoryName || 'Article'
}

function getArticleSummary(article: ArticleListItem) {
  return article.summary || article.subtitle || '暂无摘要'
}

function toggleCategory(categoryId: number) {
  activeCategoryId.value = activeCategoryId.value === categoryId ? null : categoryId
}

function getAuthHeaders() {
  const token = localStorage.getItem('authToken')
  return token ? { Authorization: token } : {}
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function renderInlineMarkdown(value: string) {
  return value
    .replace(/!\[([^\]]*)\]\((https?:\/\/[^)\s]+|\/[^)\s]+)\)/g, '<img src="$2" alt="$1" />')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
}

function renderMarkdown(markdown: string) {
  const escaped = escapeHtml(markdown.trim())

  if (!escaped) {
    return '<p class="markdown-empty">开始输入 Markdown 内容后，这里会显示预览。</p>'
  }

  return escaped
    .replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${code.trim()}</code></pre>`)
    .split(/\n{2,}/)
    .map(block => {
      if (/^###\s+/.test(block)) {
        return `<h3>${renderInlineMarkdown(block.replace(/^###\s+/, ''))}</h3>`
      }

      if (/^##\s+/.test(block)) {
        return `<h2>${renderInlineMarkdown(block.replace(/^##\s+/, ''))}</h2>`
      }

      if (/^#\s+/.test(block)) {
        return `<h1>${renderInlineMarkdown(block.replace(/^#\s+/, ''))}</h1>`
      }

      if (/^&gt;\s+/m.test(block)) {
        return `<blockquote>${renderInlineMarkdown(block.replace(/^&gt;\s+/gm, '').replace(/\n/g, '<br />'))}</blockquote>`
      }

      if (block.startsWith('<pre><code>')) {
        return block
      }

      if (/^[-*]\s+/m.test(block)) {
        const items = block
          .split('\n')
          .filter(line => /^[-*]\s+/.test(line))
          .map(line => `<li>${renderInlineMarkdown(line.replace(/^[-*]\s+/, ''))}</li>`)
          .join('')
        return `<ul>${items}</ul>`
      }

      return `<p>${renderInlineMarkdown(block).replace(/\n/g, '<br />')}</p>`
    })
    .join('')
}

async function insertMarkdown(before: string, after = '', placeholder = '文本') {
  const textarea = contentTextarea.value
  const start = textarea?.selectionStart ?? publishForm.content.length
  const end = textarea?.selectionEnd ?? publishForm.content.length
  const selectedText = publishForm.content.slice(start, end) || placeholder
  const nextValue = `${publishForm.content.slice(0, start)}${before}${selectedText}${after}${publishForm.content.slice(end)}`
  publishForm.content = nextValue

  await nextTick()
  contentTextarea.value?.focus()
  const cursor = start + before.length + selectedText.length + after.length
  contentTextarea.value?.setSelectionRange(cursor, cursor)
}

function triggerImageUpload() {
  if (!localStorage.getItem('authToken')) {
    publishError.value = '登录状态已失效，请重新登录后再上传图片。'
    openLoginModal()
    return
  }

  imageInput.value?.click()
}

async function uploadMarkdownImage(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = ''

  if (!file) {
    return
  }

  publishError.value = ''
  isUploadingImage.value = true

  try {
    const formData = new FormData()
    formData.append('file', file)

    const response = await axios.post<ResultResponse<UploadImageData>>('/api/admin/upload/image', formData, {
      headers: getAuthHeaders()
    })

    if (response.data.code !== 200 || !response.data.data?.url) {
      publishError.value = response.data.message || '图片上传失败，请稍后重试。'
      return
    }

    await insertMarkdown(`![${response.data.data.name || file.name}](`, ')', response.data.data.url)
  } catch (error) {
    publishError.value = axios.isAxiosError(error) && error.response?.data?.message
      ? error.response.data.message
      : '图片上传接口暂时不可用，请稍后再试。'
  } finally {
    isUploadingImage.value = false
  }
}

function openLoginModal() {
  showLoginModal.value = true
}

function closeLoginModal() {
  showLoginModal.value = false
  loginError.value = ''
}

function openPublishModal(article?: ArticleListItem | ArticleDetail) {
  if (!isLoggedIn.value || !localStorage.getItem('authToken')) {
    openLoginModal()
    return
  }

  if (!article) {
    resetPublishForm()
    editingArticleId.value = null
    showPublishModal.value = true
    return
  }

  editingArticleId.value = article.id
  loadArticleForEdit(article.id)
}

function closePublishModal() {
  showPublishModal.value = false
  publishError.value = ''
}

function resetPublishForm() {
  publishForm.title = ''
  publishForm.subtitle = ''
  publishForm.summary = ''
  publishForm.content = ''
  publishForm.contentHtml = ''
  publishForm.coverImg = ''
  publishForm.cardStyle = 1
  publishForm.status = 1
  publishForm.isTop = 0
  publishForm.categoryId = 1
  publishForm.tagIds = []
  isPreviewingMarkdown.value = false
  editingArticleId.value = null
}

function fillPublishForm(article: ArticleDetail) {
  publishForm.title = article.title || ''
  publishForm.subtitle = article.subtitle || ''
  publishForm.summary = article.summary || ''
  publishForm.content = article.content || ''
  publishForm.contentHtml = article.contentHtml || ''
  publishForm.coverImg = article.coverImg || ''
  publishForm.cardStyle = article.cardStyle || 1
  publishForm.status = article.status || 1
  publishForm.isTop = article.isTop || 0
  publishForm.categoryId = article.categoryId || 1
  publishForm.tagIds = article.tagIds || []
}

async function loadArticleForEdit(articleId: number) {
  publishError.value = ''
  showPublishModal.value = true

  try {
    const response = await axios.get<ResultResponse<ArticleDetail>>(`/api/articles/${articleId}`)
    if (response.data.code === 200 && response.data.data) {
      fillPublishForm(response.data.data)
      return
    }

    publishError.value = response.data.message || '文章读取失败，无法进入编辑模式。'
    editingArticleId.value = null
  } catch (error) {
    publishError.value = axios.isAxiosError(error) && error.response?.data?.message
      ? error.response.data.message
      : '文章详情接口暂时不可用，请稍后重试。'
    editingArticleId.value = null
  }
}

async function fetchArticles() {
  articleError.value = ''
  isLoadingArticles.value = true

  try {
    const response = await axios.get<ResultResponse<PageResponse<ArticleListItem>>>('/api/articles', {
      params: {
        pageNum: 1,
        pageSize: 10
      }
    })

    if (response.data.code !== 200) {
      articleError.value = response.data.message || '文章列表加载失败。'
      return
    }

    articles.value = response.data.data?.records || []
  } catch (error) {
    articleError.value = axios.isAxiosError(error) && error.response?.data?.message
      ? error.response.data.message
      : '文章列表暂时不可用，请确认后端文章接口是否正常。'
  } finally {
    isLoadingArticles.value = false
  }
}

async function openArticleDetail(article: ArticleListItem) {
  selectedArticlePreview.value = article
  selectedArticle.value = null
  isLoadingArticleDetail.value = true
  window.scrollTo({ top: 0, behavior: 'smooth' })

  try {
    const response = await axios.get<ResultResponse<ArticleDetail>>(`/api/articles/${article.id}`)

    if (response.data.code === 200 && response.data.data) {
      selectedArticle.value = response.data.data
    }
  } finally {
    isLoadingArticleDetail.value = false
  }
}

function closeArticleDetail() {
  selectedArticle.value = null
  selectedArticlePreview.value = null
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function openProfile() {
  currentPage.value = 'profile'
  selectedArticle.value = null
  selectedArticlePreview.value = null
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function openDashboard() {
  currentPage.value = 'dashboard'
  selectedArticle.value = null
  selectedArticlePreview.value = null
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function navigateToSection(sectionId: string) {
  currentPage.value = 'home'
  selectedArticle.value = null
  selectedArticlePreview.value = null

  requestAnimationFrame(() => {
    const target = document.getElementById(sectionId)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  })
}

async function publishArticle() {
  publishError.value = ''

  if (!localStorage.getItem('authToken')) {
    publishError.value = '登录状态已失效，请重新登录后再发布。'
    openLoginModal()
    return
  }

  if (!publishForm.title || !publishForm.content || !publishForm.categoryId) {
    publishError.value = '请至少填写标题、正文和分类。'
    return
  }

  isPublishing.value = true
  publishForm.contentHtml = markdownPreviewHtml.value

  try {
    let response
    if (editingArticleId.value) {
      response = await axios.put<ResultResponse<number>>(`/api/admin/articles/${editingArticleId.value}`, publishForm, {
        headers: getAuthHeaders()
      })
    } else {
      response = await axios.post<ResultResponse<number>>('/api/admin/articles', publishForm, {
        headers: getAuthHeaders()
      })
    }

    if (response.data.code !== 200) {
      publishError.value = response.data.message || (editingArticleId.value ? '保存失败，请稍后重试。' : '发布失败，请稍后重试。')
      return
    }

    const savedArticleId = editingArticleId.value
    resetPublishForm()
    closePublishModal()
    await fetchArticles()
    if (savedArticleId && selectedArticle.value?.id === savedArticleId) {
      await openArticleDetail(selectedArticle.value)
    }
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      publishError.value = editingArticleId.value
        ? '编辑接口被权限拦截，请确认 token 和后端认证配置。'
        : '发布接口被权限拦截，请确认 token 和后端认证配置。'
      return
    }

    publishError.value = axios.isAxiosError(error) && error.response?.data?.message
      ? error.response.data.message
      : (editingArticleId.value ? '保存接口暂时不可用，请稍后再试。' : '发布接口暂时不可用，请稍后再试。')
  } finally {
    isPublishing.value = false
  }
}

async function deleteArticle(articleId: number) {
  if (!isLoggedIn.value || !localStorage.getItem('authToken')) {
    openLoginModal()
    return
  }

  const confirmed = window.confirm('确认删除这篇文章？此操作不可恢复。')
  if (!confirmed) {
    return
  }

  isDeletingArticle.value = true
  publishError.value = ''

  try {
    const response = await axios.delete<ResultResponse<null>>(`/api/admin/articles/${articleId}`, {
      headers: getAuthHeaders()
    })

    if (response.data.code !== 200) {
      publishError.value = response.data.message || '删除失败，请稍后重试。'
      return
    }

    if (editingArticleId.value === articleId) {
      resetPublishForm()
      closePublishModal()
    }

    if (selectedArticle.value?.id === articleId) {
      closeArticleDetail()
    }

    await fetchArticles()
  } catch (error) {
    publishError.value = axios.isAxiosError(error) && error.response?.data?.message
      ? error.response.data.message
      : '删除接口暂时不可用，请稍后再试。'
  } finally {
    isDeletingArticle.value = false
  }
}

async function login() {
  loginError.value = ''

  if (!loginForm.email || !loginForm.password) {
    loginError.value = '请输入邮箱和密码后再尝试登录。'
    return
  }

  isLoggingIn.value = true

  try {
    const response = await axios.post<ResultResponse<LoginData>>('/api/auth/login', {
      username: loginForm.email,
      password: loginForm.password
    })

    if (response.data.code !== 200) {
      loginError.value = response.data.message || '登录失败，请稍后重试。'
      return
    }

    const loginData = response.data.data
    if (!loginData?.token || !loginData.user) {
      loginError.value = '登录返回数据格式不正确，请检查后端接口。'
      return
    }

    localStorage.setItem('authToken', loginData.token)
    localStorage.setItem('authUser', JSON.stringify(loginData.user))
    loginUser.value = loginData.user
    isLoggedIn.value = true
    showLoginModal.value = false
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      loginError.value = '账号或密码错误，请重新检查。'
      return
    }

    if (axios.isAxiosError(error) && error.response?.status === 403) {
      loginError.value = '登录请求被后端权限配置拦截，请确认登录接口已放行并检查 CSRF 配置。'
      return
    }

    if (axios.isAxiosError(error) && error.response?.data?.message) {
      loginError.value = error.response.data.message
      return
    }

    loginError.value = '登录接口暂不可用，请确认后端服务和代理配置是否正常。'
  } finally {
    isLoggingIn.value = false
  }
}

function logout() {
  isLoggedIn.value = false
  loginUser.value = emptyLoginUser
  loginForm.email = ''
  loginForm.password = ''
  loginError.value = ''
  currentPage.value = 'home'
  selectedArticle.value = null
  selectedArticlePreview.value = null
  localStorage.removeItem('authToken')
  localStorage.removeItem('authUser')
}

function handleStatusClick() {
  if (!isLoggedIn.value) {
    openLoginModal()
    return
  }

  showUserMenu.value = !showUserMenu.value

}

function closeUserMenu() {
  showUserMenu.value = false
}

function handleLogout() {
  closeUserMenu()
  logout()
}

function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!target.closest('.status-badge-wrapper')) {
    closeUserMenu()
  }
}

onMounted(() => {
  const storedUser = localStorage.getItem('authUser')
  const storedToken = localStorage.getItem('authToken')
  if (storedUser && storedToken) {
    loginUser.value = JSON.parse(storedUser)
    isLoggedIn.value = true
  } else {
    localStorage.removeItem('authToken')
    localStorage.removeItem('authUser')
  }

  fetchArticles()
  document.addEventListener('click', handleClickOutside)

})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
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
          <button type="button" @click="navigateToSection('home')">Home</button>
          <button type="button" @click="navigateToSection('posts')">Posts</button>
          <button type="button" @click="navigateToSection('about')">About</button>
        </div>

        <div class="nav-actions">
          <button v-if="isLoggedIn" class="nav-action-button" type="button" @click.prevent="openProfile">个人主页</button>
          <button v-if="isLoggedIn" class="nav-action-button secondary" type="button" @click.prevent="openDashboard">控制面板</button>
          <button v-else class="nav-action-button" type="button" @click.prevent="openLoginModal">Login</button>
        </div>

        <div class="status-badge-wrapper"> 
          <div class="status-badge" :class="{ 'clickable': isLoggedIn, 'active': showUserMenu }" @click="handleStatusClick">
            <div class="dot"></div>
            <span>{{ isLoggedIn ? 'SIGNED IN' : 'SYSTEM READY' }}</span>
          </div>

          <div v-if="isLoggedIn && showUserMenu" class="user-dropdown-menu" @click.stop>
            <div class="dropdown-header">
              <img class="dropdown-avatar" :src="loginUser.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Scribe'" alt="avatar" />
              <div class="dropdown-user-info">
                <strong>{{ getLoginUserName() }}</strong>
                <span>{{ loginUser.email || '未设置邮箱' }}</span>
              </div>
            </div>
            <div class="dropdown-divider"></div>
            <button class="dropdown-item danger" type="button" @click="handleLogout">
              <span>退出登录</span>
            </button>
          </div>
        </div>
      </div>
    </nav>

    <article v-if="articleForDetail" class="article-page">
      <button class="back-button" type="button" @click="closeArticleDetail">← 返回文章列表</button>
      <div class="article-page-shell">
        <div class="article-page-meta">
          <div>
            <span class="section-label">{{ getArticleCategory(articleForDetail) }}</span>
            <span>{{ articleForDetail.createTime }} · {{ articleForDetail.viewCount || 0 }} views</span>
          </div>
          <div v-if="showActionsInCurrentView" class="article-detail-actions">
            <button type="button" class="action-pill" @click="openPublishModal(articleForDetail)">编辑</button>
            <button type="button" class="action-pill danger" @click="deleteArticle(articleForDetail.id)">删除</button>
          </div>
        </div>
        <h1>{{ articleForDetail.title }}</h1>
        <p v-if="articleForDetail.subtitle" class="article-page-subtitle">{{ articleForDetail.subtitle }}</p>
        <div v-if="articleForDetail.tagNames?.length" class="article-tags detail-tags">
          <span v-for="tag in articleForDetail.tagNames" :key="tag">{{ tag }}</span>
        </div>
        <div v-if="isLoadingArticleDetail" class="article-content article-plain">正在读取文章正文...</div>
        <div v-else-if="selectedArticle?.renderContent" class="article-content markdown-body" v-html="selectedArticle.renderContent"></div>
        <div v-else class="article-content article-plain">{{ selectedArticle?.content || '文章正文为空。' }}</div>
      </div>
    </article>

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

            <button class="contact-button login-submit" type="submit" :disabled="isLoggingIn">
              {{ isLoggingIn ? '登录中...' : '登录' }}
            </button>

            <p v-if="loginError" class="form-error">{{ loginError }}</p>
            <p v-if="isLoggedIn" class="form-success">
              已登录为 <strong>{{ getLoginUserName() }}</strong>。
              <button class="logout-link" @click.prevent="logout">退出登录</button>
            </p>
          </form>
        </div>
      </div>
    </div>

    <section v-else-if="currentPage === 'home'" class="home-page">
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
          欢迎回到 EtherLog。淬炼理性逻辑,筑造数字美学。
        </p>
      </div>
      <div class="hero-visual" aria-hidden="true">
        <div class="hero-core">
          <div class="hero-core-icon">
            <Terminal :size="42" />
          </div>
          <div class="hero-core-copy">
            <span>EtherLog Core</span>
            <strong>Vue · Spring · JWT</strong>
          </div>
        </div>
        <div class="hero-code-card">
          <div class="code-dot-row">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <p><span>const</span> thought = logic.render()</p>
          <p><span>await</span> publish.markdown()</p>
          <p><span>return</span> digitalArt</p>
        </div>
        <div class="hero-orbit">
          <div class="orbit-node node-a"><Zap :size="20" /></div>
          <div class="orbit-node node-b"><Cpu :size="20" /></div>
          <div class="orbit-node node-c"><Globe :size="20" /></div>
        </div>
      </div>
    </header>

      <section class="section-intro">
        <div class="section-meta">
          <div class="section-meta-left">
            <span class="section-label">JOURNAL / DUST</span>
            <h2 class="section-title">Tracing Thoughts, Shaping Logic.</h2>
          </div>
          <div class="section-meta-right">
            <p class="section-copy">
              万物起于微末，亦如尘埃。<br />
              在繁杂的世界里，捕捉转瞬即逝的审美，固化永恒的逻辑。
            </p>
          </div>
        </div>
        <div class="category-list">
          <button
            v-for="cat in categories"
            :key="cat.id"
            class="category-pill"
            :class="{ active: activeCategoryId === cat.id }"
            type="button"
            @click="toggleCategory(cat.id)"
          >
            {{ cat.label }}
          </button>
        </div>
      </section>

      <main id="posts" class="grid-container">
        <div v-if="articleError" class="card-large bg-white border-white shadow-sm">
          <div class="card-footer">
            <span class="tag">Error</span>
            <h3 class="text-2xl font-bold">文章加载失败</h3>
            <p class="text-gray-400 mt-2 font-light text-sm">{{ articleError }}</p>
          </div>
        </div>

        <div v-else-if="isLoadingArticles" class="card-large bg-white border-white shadow-sm">
          <div class="card-footer">
            <span class="tag">Loading</span>
            <h3 class="text-2xl font-bold">正在加载文章</h3>
            <p class="text-gray-400 mt-2 font-light text-sm">从后端文章接口读取最新内容。</p>
          </div>
        </div>

        <div v-else-if="!filteredArticles.length" class="card-large bg-white border-white shadow-sm">
          <div class="card-footer">
            <span class="tag">Empty</span>
            <h3 class="text-2xl font-bold">没有匹配的文章</h3>
            <p class="text-gray-400 mt-2 font-light text-sm">换一个分类看看，或者登录后发布一篇新文章。</p>
          </div>
        </div>

        <!-- 动态文章 -->
        <template v-else>
          <div
            v-for="post in filteredArticles"
            :key="post.id"
            class="card-large bg-white border-white shadow-sm hover:bg-gray-50 transition-all cursor-pointer"
            @click="openArticleDetail(post)"
          >
            <div class="card-header">
              <span class="tag">{{ getArticleCategory(post) }}</span>
              <ArrowUpRight class="text-gray-300" />
            </div>
            <div class="card-footer">
              <h3 class="text-2xl font-bold">{{ post.title }}</h3>
              <p class="text-gray-400 mt-2 font-light text-sm">{{ getArticleSummary(post) }}</p>
              <div v-if="post.tagNames?.length" class="article-tags">
                <span v-for="tag in post.tagNames" :key="tag">{{ tag }}</span>
              </div>
              <div v-if="showActionsInCurrentView" class="card-actions">
                <button type="button" class="action-pill" @click.stop="openPublishModal(post)">编辑</button>
                <button type="button" class="action-pill danger" @click.stop="deleteArticle(post.id)">删除</button>
              </div>
            </div>
          </div>
        </template>

        <!-- 底部 Slogan -->
        <div class="card-full bg-blue-600 text-white shadow-lg">
          <div class="slogan-text">"Simplicity is the ultimate sophistication."</div>
          <div class="slogan-footer">
             <Globe :size="14" />
             <span>ETHERLOG NETWORK</span>
          </div>
        </div>

      
    </main>
    </section>

    <section v-if="currentPage === 'profile'" class="profile-page">
      

      

      <div class="profile-grid">
        <div class="profile-card profile-summary">
          <div class="profile-card-header">
            <div class="profile-avatar-shell">
              <img class="profile-avatar" :src="loginUser.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Scribe'" alt="avatar" />
            </div>
            <div class="profile-user-meta">
              <h3>{{ getLoginUserName() }}</h3>
              <p class="text-muted">{{ loginUser.email || '未设置邮箱' }}</p>
              <p class="text-muted">{{ loginUser.motto || '个人简介尚未设置。' }}</p>
            </div>
          </div>

          

          <div class="profile-stats">
            <div>
              <strong>{{ articles.length }}</strong>
              <span>文章</span>
            </div>
            <div>
              <strong>{{ commentCount }}</strong>
              <span>评论</span>
            </div>
            <div>
              <strong>{{ totalViews }}</strong>
              <span>总浏览</span>
            </div>
            <div>
              <strong>0</strong>
              <span>草稿</span>
            </div>
          </div>
        </div>

        <div class="profile-card profile-list-card">
          <div class="card-grid-header">
            <h3>最近文章</h3>
            <button class="action-pill" @click="openPublishModal()">写新文章</button>
          </div>
          <div class="list-card">
            <div v-for="post in recentArticles" :key="post.id" class="list-item">
              <div>
                <strong>{{ post.title }}</strong>
                <p class="text-muted">{{ post.categoryName }} · {{ post.createTime }}</p>
              </div>
              <div class="list-actions">
                <button type="button" class="action-pill" @click="openArticleDetail(post)">查看</button>
                <button type="button" class="action-pill secondary" @click="openPublishModal(post)">编辑</button>
              </div>
            </div>
          </div>
        </div>

        <div class="profile-card profile-list-card">
          <div class="card-grid-header">
            <h3>近期评论</h3>
          </div>
          <div class="list-card">
            <div v-for="comment in myComments" :key="comment.id" class="comment-item">
              <p class="comment-text">{{ comment.content }}</p>
              <p class="text-muted">{{ comment.author }} · {{ comment.articleTitle }} · {{ comment.createTime }}</p>
              <span class="comment-status">{{ comment.status }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section v-if="currentPage === 'dashboard'" class="dashboard-page">
     

      <div class="stats-grid">
        <div class="stat-card">
          <span>文章总数</span>
          <strong>{{ articles.length }}</strong>
        </div>
        <div class="stat-card">
          <span>评论总数</span>
          <strong>{{ commentCount }}</strong>
        </div>
        <div class="stat-card">
          <span>总浏览</span>
          <strong>{{ totalViews }}</strong>
        </div>
        <div class="stat-card">
          <span>草稿</span>
          <strong>0</strong>
        </div>
      </div>

      <div class="dashboard-table">
        <div class="dashboard-card">
          <div class="card-grid-header">
            <h3>我的文章</h3>
            <button class="action-pill" @click="openPublishModal()">新建文章</button>
          </div>
          <div class="table-header">
            <span>标题</span>
            <span>分类</span>
            <span>状态</span>
            <span>操作</span>
          </div>
          <div v-for="post in articles" :key="post.id" class="table-row">
            <span>{{ post.title }}</span>
            <span>{{ post.categoryName }}</span>
            <span>{{ post.isTop ? '置顶' : '公开' }}</span>
            <span class="table-actions">
              <button type="button" class="action-pill" @click="openPublishModal(post)">编辑</button>
              <button type="button" class="action-pill danger" @click="deleteArticle(post.id)">删除</button>
            </span>
          </div>
        </div>

        <div class="dashboard-card">
          <div class="card-grid-header">
            <h3>评论管理</h3>
          </div>
          <div class="list-card">
            <div v-for="comment in myComments" :key="comment.id" class="comment-item">
              <p class="comment-text">{{ comment.content }}</p>
              <p class="text-muted">{{ comment.author }} · {{ comment.articleTitle }}</p>
              <div class="list-actions">
                <button type="button" class="action-pill" @click="openArticleDetail({ ...articles.find(a => a.title === comment.articleTitle) ?? articles[0] })">查看文章</button>
                <button type="button" class="action-pill secondary">审核</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div v-if="showPublishModal" class="modal-overlay" @click.self="closePublishModal">
      <div class="modal-card publish-modal">
        <button class="modal-close" type="button" @click="closePublishModal">×</button>
        <div class="login-intro publish-header">
          <span class="section-label">发布</span>
          <h2>{{ isEditMode ? '编辑文章' : '新建文章' }}</h2>
          <p>
            {{ isEditMode ? '保存后会更新当前文章内容。' : '发布后状态为公开，会出现在首页文章列表中。' }}
          </p>
        </div>

        <form class="login-form publish-form" @submit.prevent="publishArticle">
          <div class="publish-body">
            <div class="publish-grid">
              <label class="login-field">
                <span>{{ isEditMode ? '标题（编辑）' : '标题' }}</span>
                <input class="form-input" v-model="publishForm.title" placeholder="文章标题" />
              </label>

              <label class="login-field">
                <span>副标题</span>
                <input class="form-input" v-model="publishForm.subtitle" placeholder="可选" />
              </label>
            </div>

            <label class="login-field">
              <span>摘要</span>
              <textarea class="form-input form-textarea summary-textarea" v-model="publishForm.summary" placeholder="首页卡片摘要"></textarea>
            </label>

            <div class="publish-meta-row">
              <label class="login-field">
                <span>分类</span>
                <select class="form-input" v-model.number="publishForm.categoryId">
                  <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.label }}</option>
                </select>
              </label>

              <label class="checkbox-field">
                <input type="checkbox" v-model="publishForm.isTop" :true-value="1" :false-value="0" />
                <span>置顶文章</span>
              </label>
            </div>

            <label class="login-field">
              <span>正文</span>
              <div class="markdown-editor">
                <div class="markdown-toolbar">
                  <div class="markdown-tool-group">
                    <button type="button" title="标题" @click="insertMarkdown('## ', '', '标题')"><Heading :size="16" /></button>
                    <button type="button" title="加粗" @click="insertMarkdown('**', '**', '加粗文本')"><Bold :size="16" /></button>
                    <button type="button" title="斜体" @click="insertMarkdown('*', '*', '斜体文本')"><Italic :size="16" /></button>
                    <button type="button" title="引用" @click="insertMarkdown('> ', '', '引用内容')"><Quote :size="16" /></button>
                    <button type="button" title="列表" @click="insertMarkdown('- ', '', '列表项')"><List :size="16" /></button>
                    <button type="button" title="代码块" @click="insertMarkdown('```\\n', '\\n```', 'code')"><Code2 :size="16" /></button>
                    <button type="button" title="插入图片" :disabled="isUploadingImage" @click="triggerImageUpload"><Image :size="16" /></button>
                  </div>
                  <button class="preview-toggle" type="button" @click="isPreviewingMarkdown = !isPreviewingMarkdown">
                    <Eye :size="16" />
                    <span>{{ isPreviewingMarkdown ? '编辑' : '预览' }}</span>
                  </button>
                  <input ref="imageInput" type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden @change="uploadMarkdownImage" />
                </div>
                <textarea
                  v-if="!isPreviewingMarkdown"
                  ref="contentTextarea"
                  class="form-input form-textarea content-textarea markdown-textarea"
                  v-model="publishForm.content"
                  placeholder="支持 Markdown：标题、列表、引用、代码块，以及图片上传。"
                ></textarea>
                <div v-else class="markdown-preview markdown-body" v-html="markdownPreviewHtml"></div>
              </div>
            </label>
          </div>

          <div class="publish-actions">
            <p v-if="publishError" class="form-error">{{ publishError }}</p>
            <div class="publish-action-buttons">
              <button class="action-pill secondary" type="button" @click="closePublishModal">取消</button>
              <button class="contact-button login-submit" type="submit" :disabled="isPublishing">
                {{ isPublishing ? (isEditMode ? '保存中...' : '发布中...') : (isEditMode ? '保存文章' : '发布文章') }}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>

    <section v-if="currentPage === 'home'" id="about" class="about-section">
      <div class="about-card">
        <span class="section-label">关于 EtherLog</span>
        <h3>极简而不简单的技术博客</h3>
        <p>EtherLog 专注于记录架构思考、开发实践与系统设计。首页展示导航、最新文章、信息与行动入口，让读者快速获取价值。</p>
      </div>
      <div class="about-card">
        <span class="section-label">核心模块</span>
        <h3>最新更新 / 分类 / 关注</h3>
        <p>以文章为核心，辅以分类、介绍与订阅入口，支持未来拓展需求。同时保留简洁视觉与沉浸式阅读体验。</p>
      </div>
      <div class="about-card">
        <span class="section-label">下一步</span>
        <h3>持续更新与归档</h3>
        <p>未来可继续相关档案、标签云、精选专题和邮件订阅，让博客从首页变成长期积累的知识枢纽。</p>
      </div>
    </section>

    <section v-if="currentPage === 'home'" id="contact" class="contact-section">
      <h2>想要更多更新？</h2>
      <p>在 EtherLog，首页不仅是展示，更是入口。未来会逐步加上订阅、社交、站内搜索等动作，帮助读者快速进入下一个内容。</p>
      <a class="contact-button" href="mailto:cyril.xu.work@gmail.com">联系我 / 订阅</a>
    </section>

    <!-- 4. 页脚 -->
    <footer v-if="currentPage === 'home'" class="footer">
      <div class="footer-brand">
        <span class="footer-company">NEXTIFY</span>
        <span class="footer-copy">© 2026 NEXTIFY. All rights reserved.</span>
      </div>
      <div class="footer-meta">
        <span>Minimal web publishing for modern creators.</span>
        <span>EtherLog by NEXTIFY</span>
      </div>
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
  z-index: 1000;
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

.nav-logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo-box {
  width: 2rem;
  height: 2rem;
  background: #111827;
  color: #f8fafc;
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-style: normal;
  font-size: 0.85rem;
  letter-spacing: -0.04em;
}

.logo-text {
  display: inline-flex;
  align-items: center;
  line-height: 1;
  font-weight: 700;
  letter-spacing: -0.05em;
  text-transform: uppercase;
  margin: 0;
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
.nav-links button {
  border: 0;
  background: transparent;
  padding: 0;
  color: inherit;
  cursor: pointer;
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  transition: color 0.2s ease;
}
.nav-links button:hover {
  color: #111827;
}
.nav-actions {
  display: flex;
  align-items: center;
}
.status-badge-wrapper {
  position: relative;
}
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: 1rem;
  color: #475569;
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  transition: all 0.2s ease;
}
.status-badge.clickable {
  cursor: pointer;
  padding: 0.5rem 0.85rem;
  border-radius: 9999px;
}
.status-badge.clickable:hover,
.status-badge.active {
  background: rgba(37, 99, 235, 0.08);
  color: #2563eb;
}
.user-dropdown-menu {
  position: absolute;
  top: calc(100% + 0.75rem);
  right: 0;
  min-width: 240px;
  background: white;
  border-radius: 1.25rem;
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.15);
  border: 1px solid rgba(226, 232, 240, 0.8);
  padding: 0.75rem;
  z-index: 1001;
  animation: dropdownFadeIn 0.2s ease;
}
@keyframes dropdownFadeIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.dropdown-header {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.75rem;
}
.dropdown-avatar {
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 0.85rem;
  object-fit: cover;
  border: 1px solid rgba(37, 99, 235, 0.12);
}
.dropdown-user-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.dropdown-user-info strong {
  font-size: 0.95rem;
  color: #0f172a;
}
.dropdown-user-info span {
  font-size: 0.78rem;
  color: #64748b;
}
.dropdown-divider {
  height: 1px;
  background: rgba(226, 232, 240, 0.8);
  margin: 0.5rem 0;
}
.dropdown-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.75rem 0.85rem;
  border: none;
  background: transparent;
  border-radius: 0.85rem;
  color: #334155;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}
.dropdown-item:hover {
  background: rgba(37, 99, 235, 0.08);
  color: #2563eb;
}
.dropdown-item.danger {
  color: #dc2626;
}
.dropdown-item.danger:hover {
  background: rgba(239, 68, 68, 0.08);
  color: #b91c1c;
}
.status-badge .dot {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 9999px;
  background: #34d399;
  box-shadow: 0 0 0 4px rgba(52, 211, 153, 0.12);
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
.nav-action-button.secondary {
  background: white;
  color: #2563eb;
  border: 1px solid rgba(37, 99, 235, 0.18);
}
.nav-action-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 30px rgba(37, 99, 235, 0.22);
}
@media (min-width: 768px) { .nav-links { display: flex; } }

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  z-index: 100;
  backdrop-filter: blur(6px);
}
.modal-card {
  width: min(100%, 1000px);
  border-radius: 2rem;
  background: rgba(248, 250, 252, 0.98);
  box-shadow: 0 38px 110px rgba(15, 23, 42, 0.2);
  border: 1px solid rgba(148, 163, 184, 0.18);
  position: relative;
  overflow: hidden;
  display: grid;
  gap: 1.5rem;
  padding: 0;
}
.modal-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 2.75rem;
  height: 2.75rem;
  border: none;
  border-radius: 9999px;
  background: rgba(15, 23, 42, 0.08);
  color: #334155;
  font-size: 1.45rem;
  cursor: pointer;
  line-height: 1;
  transition: background 0.2s ease;
}
.modal-close:hover {
  background: rgba(15, 23, 42, 0.15);
}

.publish-modal {
  padding: 2rem;
  display: grid;
  gap: 1.75rem;
  max-height: calc(100vh - 3rem);
  overflow: auto;
}
.publish-modal .login-intro {
  padding: 1.25rem 1.5rem;
  border-radius: 1.5rem;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(99, 102, 241, 0.08));
  border: 1px solid rgba(59, 130, 246, 0.14);
}
.publish-modal .login-intro h2 {
  margin: 0.5rem 0 0;
  font-size: clamp(1.75rem, 2vw, 2.4rem);
}
.publish-modal .login-intro p {
  margin: 0.75rem 0 0;
  color: #475569;
  line-height: 1.75;
}
.publish-form {
  margin-top: 0;
  display: grid;
  gap: 1.2rem;
}
.login-field {
  display: grid;
  gap: 0.6rem;
  font-size: 0.95rem;
  color: #334155;
}
.form-input {
  width: 100%;
  min-height: 3.25rem;
  border-radius: 1.25rem;
  border: 1px solid #d1d5db;
  padding: 0.95rem 1.1rem;
  font-size: 1rem;
  color: #0f172a;
  background: white;
  box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.04);
}
.form-input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
}
.form-textarea {
  min-height: 5.5rem;
  resize: vertical;
  line-height: 1.7;
}
.content-textarea {
  min-height: 16rem;
  border-radius: 0 0 1.25rem 1.25rem;
}
.markdown-editor {
  border-radius: 1.25rem;
  background: #f8fafc;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}
.markdown-toolbar {
  min-height: 3.3rem;
  padding: 0.65rem 0.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(255, 255, 255, 0.94);
}
.markdown-tool-group {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-wrap: wrap;
}
.markdown-toolbar button {
  width: 2.4rem;
  height: 2.4rem;
  border: none;
  border-radius: 0.95rem;
  background: rgba(15, 23, 42, 0.04);
  color: #475569;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease, color 0.2s ease;
}
.markdown-toolbar button:hover {
  background: #eff6ff;
  color: #2563eb;
}
.markdown-toolbar button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
.markdown-toolbar .preview-toggle {
  width: auto;
  padding: 0.55rem 1rem;
  gap: 0.4rem;
  color: #2563eb;
  font-size: 0.82rem;
  font-weight: 800;
  background: rgba(37, 99, 235, 0.1);
  border-radius: 9999px;
}
.markdown-textarea {
  min-height: 18rem;
  border: 0;
  border-radius: 0;
  background: transparent;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  line-height: 1.7;
  padding: 1rem 0.75rem 1.2rem;
}
.markdown-preview {
  min-height: 18rem;
  padding: 1rem;
  background: white;
}
.checkbox-field {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #334155;
  font-size: 0.95rem;
  font-weight: 700;
}
.login-submit {
  width: 100%;
  padding: 1rem 1.2rem;
  border-radius: 1.25rem;
}
.form-error {
  margin: 0;
  color: #dc2626;
  font-size: 0.95rem;
}
.section-intro {
  max-width: 72rem;
  margin: 0 auto 5.5rem;
  padding: 1rem 1.5rem 0;
  display: grid;
  gap: 2.75rem;
}
.section-meta {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(18rem, 0.9fr);
  gap: 3rem;
  align-items: stretch;
  max-width: 100%;
}
.section-meta-left,
.section-meta-right {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}
.section-meta-left {
  justify-content: flex-start;
}
.section-meta-right {
  justify-content: center;
  padding-left: 2rem;
  border-left: 1px solid rgba(148, 163, 184, 0.18);
}
.section-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.28em;
  color: #2563eb;
}
.section-title {
  margin: 0;
  font-size: clamp(2.4rem, 3.8vw, 3.6rem);
  font-weight: 700;
  line-height: 1.04;
  letter-spacing: -0.03em;
  color: #0f172a;
}
.section-copy {
  margin: 0;
  color: #334155;
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.9;
  max-width: 100%;
}
.section-copy br {
  content: '';
  display: block;
  margin-bottom: 0.45rem;
}
.category-list {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 1.25rem 0 0.25rem;
}
.category-pill {
  flex: 1 1 10rem;
  min-width: 10rem;
  max-width: 13rem;
  min-height: 4.25rem;
  padding: 0 2.25rem;
  border: 1px solid rgba(203, 213, 225, 0.72);
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.82);
  color: #344054;
  font-size: 1rem;
  font-weight: 850;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 12px 34px rgba(15, 23, 42, 0.06);
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, color 0.2s ease;
}
.category-pill:hover {
  transform: translateY(-2px);
  border-color: rgba(96, 165, 250, 0.6);
  box-shadow: 0 18px 44px rgba(37, 99, 235, 0.1);
}
.category-pill.active {
  color: #ffffff;
  background: #2563eb;
  border-color: #2563eb;
  box-shadow: 0 22px 54px rgba(37, 99, 235, 0.24);
}
@media (max-width: 640px) {
  .section-intro {
    margin-bottom: 3.5rem;
    gap: 2rem;
  }
  .section-meta {
    grid-template-columns: 1fr;
  }
  .section-meta-right {
    border-left: none;
    padding-left: 0;
  }
  .section-title {
    font-size: 2.2rem;
  }
  .section-copy {
    font-size: 1rem;
    line-height: 1.75;
  }
  .category-list {
    gap: 0.9rem;
    padding-top: 0.25rem;
    justify-content: flex-start;
  }
  .category-pill {
    flex: 0 1 auto;
    min-width: auto;
    max-width: none;
    min-height: 3rem;
    padding: 0 1.15rem;
    font-size: 0.9rem;
  }
}
.content-heading {
  max-width: 64rem;
  margin: 0 auto 1.5rem;
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
.heading-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.article-count {
  color: #94a3b8;
  font-size: 0.8rem;
  font-weight: 800;
}
.view-all {
  color: #2563eb;
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.16em;
}
.action-link {
  border: 0;
  background: transparent;
  cursor: pointer;
  padding: 0;
}
.action-pill {
  border: 1px solid rgba(37, 99, 235, 0.2);
  background: rgba(37, 99, 235, 0.08);
  color: #2563eb;
  border-radius: 9999px;
  padding: 0.55rem 1rem;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease;
}
.action-pill:hover {
  background: rgba(37, 99, 235, 0.16);
  transform: translateY(-1px);
}
.action-pill.danger {
  border-color: rgba(239, 68, 68, 0.18);
  background: rgba(254, 202, 202, 0.16);
  color: #b91c1c;
}
.action-pill.danger:hover {
  background: rgba(248, 113, 113, 0.16);
}
.card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
}
.article-detail-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}
.profile-page,
.dashboard-page {
  max-width: 64rem;
  margin: 10rem auto;
  padding: 0 1.5rem;
}
.section-header {
  max-width: 64rem;
  margin: 0 auto 2rem;
  display: grid;
  gap: 0.75rem;
}
.section-header h2 {
  margin: 0;
  font-size: 2rem;
}
.profile-banner,
.dashboard-banner {
  max-width: 64rem;
  margin: 0 auto 1.75rem;
  padding: 1.35rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-radius: 1.5rem;
  background: #eff6ff;
  border: 1px solid rgba(59, 130, 246, 0.18);
}
.profile-banner-actions,
.dashboard-banner-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.profile-banner p,
.dashboard-banner p {
  margin: 0;
  color: #475569;
  line-height: 1.75;
}
.profile-grid {
  display: grid;
  gap: 1.5rem;
}
@media (min-width: 1024px) { .profile-grid { grid-template-columns: 1.4fr 1fr; } }
.profile-card {
  background: white;
  border-radius: 2rem;
  padding: 1.75rem;
  box-shadow: 0 35px 80px rgba(15, 23, 42, 0.08);
  border: 1px solid rgba(148, 163, 184, 0.18);
}
.profile-summary {
  display: grid;
  gap: 1.5rem;
}
.profile-card-header {
  display: grid;
  gap: 1rem;
}
.profile-avatar-shell {
  width: 6rem;
  height: 6rem;
  border-radius: 1.75rem;
  padding: 0.55rem;
  background: linear-gradient(180deg, rgba(59, 130, 246, 0.12), rgba(37, 99, 235, 0.06));
  display: grid;
  place-items: center;
}
.profile-avatar {
  width: 100%;
  height: 100%;
  border-radius: 1.35rem;
  object-fit: cover;
  border: 1px solid rgba(37, 99, 235, 0.12);
}
.profile-user-meta h3 {
  margin: 0;
  font-size: 1.5rem;
}
.profile-user-meta p {
  margin: 0.35rem 0 0;
  color: #64748b;
  line-height: 1.6;
}
.profile-quick-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem;
}
.profile-action-button {
  border: 1px solid rgba(37, 99, 235, 0.18);
  background: rgba(59, 130, 246, 0.08);
  color: #1d4ed8;
  border-radius: 9999px;
  padding: 0.95rem 1.1rem;
  font-weight: 800;
  transition: transform 0.2s ease, background 0.2s ease;
}
.profile-action-button:hover {
  transform: translateY(-1px);
  background: rgba(37, 99, 235, 0.14);
}
.profile-action-button.danger {
  background: rgba(248, 113, 113, 0.14);
  border-color: rgba(248, 113, 113, 0.24);
  color: #b91c1c;
}
.profile-action-button.danger:hover {
  background: rgba(248, 113, 113, 0.2);
}
.profile-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}
.profile-stats div {
  background: rgba(37, 99, 235, 0.08);
  border-radius: 1.25rem;
  padding: 1rem;
}
.profile-stats strong {
  display: block;
  font-size: 1.5rem;
}
.profile-list-card h3,
.dashboard-card h3 {
  margin: 0;
  font-size: 1.1rem;
}
.card-grid-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}
.list-card {
  display: grid;
  gap: 1rem;
}
.list-item,
.comment-item,
.table-row {
  display: grid;
  gap: 0.55rem;
  padding: 1rem;
  border-radius: 1.2rem;
  background: #f8fafc;
}
.list-item {
  grid-template-columns: 1fr auto;
  align-items: center;
}
.comment-item {
  position: relative;
}
.comment-status {
  position: absolute;
  right: 1rem;
  top: 1rem;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  color: #0f172a;
  background: rgba(37, 99, 235, 0.1);
}
.comment-status::before {
  content: '';
  display: inline-block;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  margin-right: 0.45rem;
  background: rgba(37, 99, 235, 0.8);
}
.list-actions,
.table-actions {
  display: flex;
  gap: 0.65rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.dashboard-table {
  display: grid;
  gap: 1.5rem;
}
@media (min-width: 900px) { .dashboard-table { grid-template-columns: 1.2fr 0.8fr; } }
.dashboard-card {
  background: white;
  border-radius: 1.75rem;
  padding: 1.5rem;
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.07);
}
.stats-grid {
  display: grid;
  gap: 1rem;
  margin-bottom: 1.5rem;
}
@media (min-width: 900px) { .stats-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
.stat-card {
  background: white;
  border-radius: 1.5rem;
  padding: 1.35rem;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
}
.stat-card span {
  display: block;
  color: #64748b;
  margin-bottom: 0.75rem;
}
.stat-card strong {
  font-size: 1.75rem;
}
.table-header {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1.5fr;
  gap: 1rem;
  padding: 1rem 0;
  font-size: 0.85rem;
  color: #64748b;
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
}
.table-row {
  grid-template-columns: 2fr 1fr 1fr 1.5fr;
  align-items: center;
}
@media (max-width: 900px) {
  .table-header,
  .table-row {
    grid-template-columns: 1fr;
  }
  .table-actions {
    justify-content: flex-start;
  }
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
.form-textarea {
  min-height: 6rem;
  resize: vertical;
  line-height: 1.6;
}
.content-textarea {
  min-height: 12rem;
}
.markdown-editor {
  border: 1px solid #d1d5db;
  border-radius: 1.2rem;
  background: #fafafa;
  overflow: hidden;
}
.markdown-toolbar {
  min-height: 3.25rem;
  padding: 0.55rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border-bottom: 1px solid #e5e7eb;
  background: rgba(255, 255, 255, 0.86);
}
.markdown-tool-group {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}
.markdown-toolbar button {
  width: 2.35rem;
  height: 2.35rem;
  border: 0;
  border-radius: 0.75rem;
  background: transparent;
  color: #475569;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.markdown-toolbar button:hover {
  background: #eff6ff;
  color: #2563eb;
}
.markdown-toolbar button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
.markdown-toolbar .preview-toggle {
  width: auto;
  padding: 0 0.85rem;
  gap: 0.4rem;
  color: #2563eb;
  font-size: 0.78rem;
  font-weight: 850;
}
.markdown-textarea {
  min-height: 18rem;
  border: 0;
  border-radius: 0;
  background: transparent;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  line-height: 1.75;
}
.markdown-textarea:focus {
  box-shadow: none;
}
.markdown-preview {
  min-height: 18rem;
  padding: 1rem;
  background: white;
}
.checkbox-field {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  color: #475569;
  font-size: 0.9rem;
  font-weight: 700;
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
.publish-modal {
  max-width: 900px;
  width: min(900px, calc(100vw - 2rem));
  max-height: calc(100vh - 3rem);
  overflow: auto;
}
.publish-form {
  margin-top: 1.5rem;
}
.article-page {
  max-width: 74rem;
  margin: 7rem auto 5rem;
  padding: 0 1.5rem;
}
.back-button {
  border: 0;
  background: transparent;
  color: #2563eb;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0;
  margin-bottom: 2rem;
}
.article-page-shell {
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(226, 232, 240, 0.86);
  border-radius: 2rem;
  box-shadow: 0 38px 120px rgba(15, 23, 42, 0.12);
  padding: clamp(2rem, 5vw, 5rem);
}
.article-page-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  color: #94a3b8;
  font-size: 0.85rem;
  font-weight: 800;
  flex-wrap: wrap;
}
.article-page h1 {
  margin: 1.35rem 0 0;
  color: #111827;
  font-size: clamp(2.4rem, 6vw, 5rem);
  line-height: 1.05;
  font-weight: 950;
  max-width: 62rem;
}
.article-page-subtitle {
  max-width: 48rem;
  margin: 1.5rem 0 0;
  color: #475569;
  font-size: clamp(1.1rem, 2vw, 1.45rem);
  line-height: 1.7;
  font-weight: 650;
}
.article-meta {
  color: #94a3b8;
  font-size: 0.85rem;
  font-weight: 700;
}
.article-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
}
.article-tags span {
  display: inline-flex;
  align-items: center;
  min-height: 1.8rem;
  padding: 0 0.7rem;
  border-radius: 9999px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 0.72rem;
  font-weight: 850;
}
.detail-tags {
  margin-top: 1.25rem;
}
.article-content {
  margin-top: 3rem;
  max-width: 54rem;
  color: #1f2937;
  font-size: 1.08rem;
  line-height: 2;
}
.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3) {
  color: #111827;
  line-height: 1.2;
  margin: 1.6rem 0 0.8rem;
  font-weight: 900;
}
.markdown-body :deep(p) {
  margin: 0 0 1.1rem;
}
.markdown-body :deep(a) {
  color: #2563eb;
  font-weight: 800;
}
.markdown-body :deep(img) {
  display: block;
  max-width: 100%;
  max-height: 34rem;
  object-fit: contain;
  border-radius: 1.1rem;
  margin: 1.5rem 0;
  box-shadow: 0 20px 70px rgba(15, 23, 42, 0.12);
}
.markdown-body :deep(blockquote) {
  margin: 1.5rem 0;
  padding: 1rem 1.25rem;
  border-left: 4px solid #2563eb;
  background: #eff6ff;
  border-radius: 0 1rem 1rem 0;
  color: #475569;
}
.markdown-body :deep(pre) {
  overflow: auto;
  padding: 1rem;
  border-radius: 1rem;
  background: #111827;
  color: #e5e7eb;
  line-height: 1.7;
}
.markdown-body :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
.markdown-body :deep(p code),
.markdown-body :deep(li code) {
  padding: 0.15rem 0.35rem;
  border-radius: 0.4rem;
  background: #f1f5f9;
  color: #2563eb;
}
.markdown-body :deep(ul) {
  padding-left: 1.4rem;
  margin: 1rem 0;
}
.markdown-empty {
  color: #94a3b8;
}
.article-plain {
  white-space: pre-wrap;
}
@media (max-width: 640px) {
  .article-page {
    margin-top: 6rem;
    padding: 0 1rem;
  }
  .article-page-shell {
    border-radius: 1.5rem;
    padding: 1.5rem;
  }
  .article-content {
    margin-top: 2rem;
    font-size: 1rem;
    line-height: 1.85;
  }
}
.hero-section {
  max-width: 72rem;
  margin: 3rem auto 2rem;
  padding: 3.5rem 2rem 3rem;
  border-radius: 3rem;
  background: rgba(255,255,255,0.92);
  box-shadow: 0 40px 120px rgba(15, 23, 42, 0.12);
  border: 1px solid rgba(226,232,240,0.8);
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.65fr);
  gap: 2.5rem;
  align-items: center;
  overflow: hidden;
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
.hero-visual {
  min-height: 26rem;
  position: relative;
  display: grid;
  place-items: center;
}
.hero-visual::before {
  content: '';
  position: absolute;
  width: 21rem;
  height: 21rem;
  border-radius: 9999px;
  border: 1px solid rgba(37, 99, 235, 0.14);
  background: radial-gradient(circle, rgba(239, 246, 255, 0.94) 0%, rgba(255, 255, 255, 0.2) 68%);
}
.hero-core {
  position: relative;
  z-index: 2;
  width: 15rem;
  min-height: 15rem;
  border-radius: 2.25rem;
  background: #111827;
  color: white;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: 0 34px 90px rgba(17, 24, 39, 0.24);
}
.hero-core-icon {
  width: 4.5rem;
  height: 4.5rem;
  border-radius: 1.35rem;
  background: #2563eb;
  display: grid;
  place-items: center;
}
.hero-core-copy {
  display: grid;
  gap: 0.35rem;
}
.hero-core-copy span {
  color: #93c5fd;
  font-size: 0.78rem;
  font-weight: 850;
  text-transform: uppercase;
  letter-spacing: 0.18em;
}
.hero-core-copy strong {
  font-size: 1.2rem;
  line-height: 1.25;
}
.hero-code-card {
  position: absolute;
  z-index: 3;
  right: 0.5rem;
  bottom: 1.6rem;
  width: 16rem;
  border-radius: 1.4rem;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(203, 213, 225, 0.72);
  box-shadow: 0 22px 60px rgba(15, 23, 42, 0.12);
  padding: 1rem;
  backdrop-filter: blur(16px);
}
.code-dot-row {
  display: flex;
  gap: 0.35rem;
  margin-bottom: 0.85rem;
}
.code-dot-row span {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 9999px;
  background: #cbd5e1;
}
.hero-code-card p {
  margin: 0.4rem 0;
  color: #475569;
  font-size: 0.78rem;
  font-weight: 800;
}
.hero-code-card p span {
  color: #2563eb;
}
.hero-orbit {
  position: absolute;
  inset: 1.2rem;
  border: 1px dashed rgba(148, 163, 184, 0.48);
  border-radius: 9999px;
}
.orbit-node {
  position: absolute;
  width: 3.25rem;
  height: 3.25rem;
  border-radius: 1rem;
  background: white;
  color: #2563eb;
  display: grid;
  place-items: center;
  box-shadow: 0 16px 42px rgba(15, 23, 42, 0.1);
}
.node-a {
  top: 1.4rem;
  right: 3.3rem;
}
.node-b {
  left: 0.8rem;
  top: 45%;
}
.node-c {
  right: 2.3rem;
  top: 49%;
}
@media (max-width: 980px) {
  .hero-section {
    grid-template-columns: 1fr;
  }
  .hero-visual {
    min-height: 22rem;
  }
}
@media (max-width: 640px) {
  .hero-section {
    padding: 2.5rem 1.25rem;
  }
  .hero-visual {
    display: none;
  }
}

.grid-container {
  max-width: 64rem;
  margin: 0 auto;
  padding: 0 1.5rem 5rem;
  display: grid;
  gap: 1.5rem;
  grid-template-columns: 1fr;
}
@media (min-width: 768px) {
  .grid-container {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
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
  color: #6b7280;
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  gap: 1.25rem;
}
.footer-brand,
.footer-meta {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  text-align: center;
}
.footer-company {
  font-size: 0.95rem;
  font-weight: 800;
  letter-spacing: 0.25em;
  color: #111827;
  text-transform: uppercase;
}
.footer-copy,
.footer-meta span {
  color: #6b7280;
  font-weight: 500;
}
@media (min-width: 768px) {
  .footer {
    flex-direction: row;
    align-items: flex-start;
  }
  .footer-brand,
  .footer-meta {
    align-items: flex-start;
    text-align: left;
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
