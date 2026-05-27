<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import AboutSection from './components/AboutSection.vue'
import AppFooter from './components/AppFooter.vue'
import AppNavbar from './components/AppNavbar.vue'
import ArticleDetailView from './components/ArticleDetailView.vue'
import ContactSection from './components/ContactSection.vue'
import DashboardPage from './components/DashboardPage.vue'
import HomePage from './components/HomePage.vue'
import LoginModal from './components/LoginModal.vue'
import AppToast from './components/AppToast.vue' // Import the new Toast component
import ProfilePage from './components/ProfilePage.vue'
import PublishModal from './components/PublishModal.vue'
import type {
  ArticleDetail,
  ArticleListItem,
  ArticlePublishRequest,
  Category,
  CommentItem,
  LoginData,
  LoginUser,
  PageResponse,
  ResultResponse,
  UploadImageData
} from './types/blog'
import { renderMarkdown } from './utils/markdown'

const route = useRoute()
const router = useRouter()

const categories = ref<Category[]>([
  { id: 1, label: 'Thought' },
  { id: 2, label: 'Code' },
  { id: 3, label: 'Design' },
  { id: 4, label: 'Guide' }
])

const loginForm = reactive({
  email: '',
  password: ''
})

const emptyLoginUser: Partial<LoginUser> = {
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
const showFeaturedOnly = ref(false)
const isLoadingArticleDetail = ref(false)
const showPublishModal = ref(false)
const publishError = ref('')
const isPublishing = ref(false)
const editingArticleId = ref<number | null>(null)
const isDeletingArticle = ref(false)
const coverImageInput = ref<HTMLInputElement | null>(null) // 新增：封面图文件输入框的引用
const contentTextarea = ref<HTMLTextAreaElement | null>(null)
const imageInput = ref<HTMLInputElement | null>(null)
const isPreviewingMarkdown = ref(false)
const isUploadingImage = ref(false)
const showUserMenu = ref(false)
const accessCodeInput = ref('')
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref<'success' | 'error' | 'info'>('info')
let toastTimeout: number | undefined
const accessCodeError = ref('')
const accessGranted = ref(sessionStorage.getItem('mainSiteAccessGranted') === 'true')
// const mainAccessCode = import.meta.env.VITE_MAIN_ACCESS_CODE || 'nextify-private'
const isVerifyingAccessCode = ref(false)
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

const myComments = ref<CommentItem[]>([
  { id: 1, author: 'Alice', articleTitle: '深度学习与架构优化', content: '这篇文章很有洞见，尤其是最后的性能建议。', status: '已审核', createTime: '2026-04-28 14:12' },
  { id: 2, author: 'Bob', articleTitle: '前端性能优化技巧', content: '图例部分可以加一个真实案例。', status: '待审核', createTime: '2026-04-29 09:23' },
  { id: 3, author: 'Carol', articleTitle: '系统设计与扩展性', content: '很喜欢这种模块化的落地方式。', status: '已审核', createTime: '2026-04-30 20:05' }
])

const filteredArticles = computed(() => {
  let list = articles.value

  if (showFeaturedOnly.value) {
    list = list.filter(a => a.isTop === 1)
  }

  if (!activeCategoryId.value) {
    return list
  }

  const activeCategory = categories.value.find(category => category.id === activeCategoryId.value)
  return list.filter(article => article.categoryName === activeCategory?.label)
})

const articleForDetail = computed(() => selectedArticle.value || selectedArticlePreview.value)
const isArticleDetailOpen = computed(() => Boolean(articleForDetail.value))
const isEditMode = computed(() => editingArticleId.value !== null)
const currentPage = computed(() => (route.meta.page as string) || 'home')
const showActionsInCurrentView = computed(() => currentPage.value === 'profile' || currentPage.value === 'dashboard')
const recentArticles = computed(() => articles.value.slice(0, 5))
const totalViews = computed(() => articles.value.reduce((sum, item) => sum + (item.viewCount || 0), 0))
const commentCount = computed(() => myComments.value.length)
const markdownPreviewHtml = computed(() => renderMarkdown(publishForm.content))

function showAppToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  if (toastTimeout) clearTimeout(toastTimeout)
  toastMessage.value = message
  toastType.value = type
  showToast.value = true
  toastTimeout = setTimeout(() => {
    showToast.value = false
  }, 3000) as unknown as number // Cast to number for consistency
}

async function validateMainAccessCode(code: string) {
  const response = await axios.get<ResultResponse<boolean>>('/api/access-code/verify', { 
    params: { 
      id: 1,
      accessCode: code
    } 
  })
  if(response.data.code !== 200)
    throw new Error(response.data.message || "access code 验证失败")
  return response.data.data == true
}

async function verifyMainAccess() {
  accessCodeError.value = ''
  const code = accessCodeInput.value.trim()

  if (!code) {
    accessCodeError.value = '请输入 access code。'
    return
  }

  isVerifyingAccessCode.value = true

  try {
    const isValid = await validateMainAccessCode(code)
    if (!isValid) {
      accessCodeError.value = 'access code 不正确，请重新输入。'
      return
    }

    accessGranted.value = true
    accessCodeInput.value = ''
    sessionStorage.setItem('mainSiteAccessGranted', 'true')
  } catch (error) {
    accessCodeError.value = error instanceof Error ? error.message : 'Access code 校验失败，请稍后重试。'
  } finally {
    isVerifyingAccessCode.value = false
  }
}

function toggleCategory(categoryId: number) {
  activeCategoryId.value = activeCategoryId.value === categoryId ? null : categoryId
}

function getAuthHeaders() {
  const token = localStorage.getItem('authToken')
  return token ? { Authorization: token } : {}
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

/**
 * 从后端获取最新的用户信息，确保数据真实性
 * 复用你提供的获取资料接口 /api/user/info
 */
async function fetchUserProfile() {
  if (!localStorage.getItem('authToken')) return

  try {
    // 根据用户提供的最新接口定义，获取用户信息的接口为 /api/user/{id}
    const response = await axios.get<ResultResponse<LoginUser>>(`/api/user/${loginUser.value.id}`, {
      headers: getAuthHeaders()
    })

    if (response.data.code === 200 && response.data.data) {
      const freshUser = response.data.data
      // 更新本地响应式状态并同步到 localStorage，确保全站展示最新资料
      loginUser.value = freshUser
      localStorage.setItem('authUser', JSON.stringify(freshUser))
    }
  } catch (error) {
    console.error('无法同步最新用户信息:', error)
  }
}

/**
 * 调用后端保存更新用户数据接口 api/user/save
 * 用于同步修改昵称、格言、邮箱、头像等个人信息
 */
async function updateUserProfile(data: any) {
  if (!isLoggedIn.value || !loginUser.value.id) {
    showAppToast('请登录后再修改个人信息', 'error')
    return
  }

  try {
    // 根据后端 SysUserSaveDto 定义构造请求体
    const payload = {
      id: loginUser.value.id,
      nickname: data.nickname !== undefined ? data.nickname : loginUser.value.nickname,
      motto: data.motto !== undefined ? data.motto : loginUser.value.motto,
      email: data.email !== undefined ? data.email : loginUser.value.email,
      avatar: data.avatar !== undefined ? data.avatar : loginUser.value.avatar,
      username: loginUser.value.username // 保持用户名不变
    }

    const response = await axios.post<ResultResponse<any>>('/api/user/save', payload, {
      headers: getAuthHeaders()
    })

    if (response.data.code === 200) {
      // 保存成功后，直接重新获取最新资料，确保前后台完全一致
      await fetchUserProfile()
      showAppToast('个人信息已同步至云端', 'success')
    } else {
      showAppToast(response.data.message || '信息更新失败', 'error')
    }
  } catch (error) {
    showAppToast('网络异常，无法保存个人信息', 'error')
  }
}

function triggerImageUpload(type: 'markdown' | 'cover' | 'avatar') {
  if (!localStorage.getItem('authToken')) {
    publishError.value = '登录状态已失效，请重新登录后再上传图片。'
    openLoginModal()
    return
  }
  if (type === 'markdown') {
    imageInput.value?.click()
  } else {
    coverImageInput.value?.click()
  }
}

async function uploadImage(event: Event, type: 'markdown' | 'cover' | 'avatar') {
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

    if (type === 'markdown') {
      await insertMarkdown('!', ``, response.data.data.name || '图片')
    } else if (type === 'cover') {
      publishForm.coverImg = response.data.data.url
    } else {
      // 头像上传：图片服务器返回 URL 后，调用 save 接口持久化到用户表
      await updateUserProfile({ avatar: response.data.data.url })
    }
  } catch (error) {
    publishError.value = axios.isAxiosError(error) && error.response?.data?.message
      ? error.response.data.message
      : '图片上传接口暂时不可用，请稍后再试。'
  } finally {
    if (type === 'markdown') {
      isUploadingImage.value = false
    } else {
      // 如果需要，可以为封面图添加一个独立的上传中状态
    }
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
  window.scrollTo({ top: 0, behavior: 'smooth' })
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
  publishForm.coverImg = '' // 新增：重置封面图
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
  router.push({ name: 'profile' })
  selectedArticle.value = null
  selectedArticlePreview.value = null
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function openDashboard() {
  router.push({ name: 'dashboard' })
  selectedArticle.value = null
  selectedArticlePreview.value = null
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function navigateToSection(sectionId: string) {
  router.push({ name: sectionId })
  selectedArticle.value = null
  selectedArticlePreview.value = null

  if (sectionId === 'home') {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }

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
    showAppToast(savedArticleId ? '文章保存成功！' : '文章发布成功！', 'success')
    await fetchArticles()
    if (savedArticleId && selectedArticle.value?.id === savedArticleId) {
      await openArticleDetail(selectedArticle.value)
    }
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      publishError.value = editingArticleId.value
        ? '编辑接口被权限拦截，请确认 token 和后端认证配置。'
        : '发布接口被权限拦截，请确认 token 和后端认证配置。'
      showAppToast(publishError.value, 'error')
      return
    }

    publishError.value = axios.isAxiosError(error) && error.response?.data?.message
      ? error.response.data.message
      : (editingArticleId.value ? '保存接口暂时不可用，请稍后再试。' : '发布接口暂时不可用，请稍后再试。')
    showAppToast(publishError.value, 'error')
  } finally {
    isPublishing.value = false
  }
}

async function deleteArticle(articleId: number) {
  if (!isLoggedIn.value || !localStorage.getItem('authToken')) {
    openLoginModal()
    return
  }

  const confirmed = window.confirm('确认删除这篇文章？此操作不可恢复。') // Still using confirm for now
  if (!confirmed) {
    return
  }

  isDeletingArticle.value = true
  showAppToast('正在删除文章...', 'info')
  publishError.value = ''

  try {
    const response = await axios.delete<ResultResponse<null>>(`/api/admin/articles/${articleId}`, {
      headers: getAuthHeaders()
    })

    if (response.data.code !== 200) {
      showAppToast(response.data.message || '删除失败，请稍后重试。', 'error')
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
    showAppToast('文章删除成功！', 'success')
    await fetchArticles()
  } catch (error) {
    showAppToast('删除失败，请稍后重试。', 'error')
    publishError.value = axios.isAxiosError(error) && error.response?.data?.message
      ? error.response.data.message
      : '删除接口暂时不可用，请稍后再试。'
    showAppToast(publishError.value, 'error')
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
    showAppToast('登录成功！', 'success')
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
    showAppToast(loginError.value, 'error')
  } 
}

function logout() {
  isLoggedIn.value = false
  loginUser.value = emptyLoginUser
  loginForm.email = ''
  loginForm.password = ''
  loginError.value = ''
  router.push({ name: 'home' })
  selectedArticle.value = null
  selectedArticlePreview.value = null
  localStorage.removeItem('authToken')
  showAppToast('已退出登录。', 'info')
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
  document.title = 'ETHERLOG'
  const storedUser = localStorage.getItem('authUser')
  const storedToken = localStorage.getItem('authToken')
  if (storedUser && storedToken) {
    loginUser.value = JSON.parse(storedUser)
    isLoggedIn.value = true
    // 应用启动时，立即从服务器拉取最新数据，防止 localStorage 缓存过期
    fetchUserProfile()
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
  <div class="app-container">
    <div class="main-site-shell" :class="{ locked: !accessGranted }" :aria-hidden="!accessGranted">
      <AppNavbar
        :is-logged-in="isLoggedIn"
        :login-user="loginUser"
        :show-user-menu="showUserMenu"
        @navigate="navigateToSection"
        @open-profile="openProfile"
        @open-dashboard="openDashboard"
        @open-login="openLoginModal"
        @toggle-status="handleStatusClick"
        @logout="handleLogout"
      />

      <Transition name="page-fade" mode="out-in">
        <ArticleDetailView
          v-if="isArticleDetailOpen && !showPublishModal"
          :article="articleForDetail"
          :selected-article="selectedArticle"
          :is-loading="isLoadingArticleDetail"
          :show-actions="showActionsInCurrentView"
          @close="closeArticleDetail"
          @edit="openPublishModal"
          @delete="deleteArticle"
        />
        <div v-else-if="!showPublishModal" class="main-content-wrapper">
          <HomePage
            v-if="currentPage === 'home' || currentPage === 'posts' || currentPage === 'about'"
            :categories="categories"
            :active-category-id="activeCategoryId"
            :filtered-articles="filteredArticles"
            :article-error="articleError"
            :is-loading-articles="isLoadingArticles"
            :show-actions="showActionsInCurrentView"
            :show-featured-only="showFeaturedOnly"
            @toggle-category="toggleCategory"
            @open-article="openArticleDetail"
            @edit-article="openPublishModal"
            @delete-article="deleteArticle"
            @scroll-to-posts="navigateToSection('posts')"
            @toggle-featured="showFeaturedOnly = $event"
          />

          <ProfilePage
            v-if="currentPage === 'profile'"
            :login-user="loginUser"
            @upload-avatar="uploadImage($event, 'avatar')"
            @update-profile="updateUserProfile"
          />

          <DashboardPage
            v-if="currentPage === 'dashboard'"
            :articles="articles"
            :my-comments="myComments"
            :comment-count="commentCount"
            :total-views="totalViews"
            @new-article="openPublishModal"
            @edit-article="openPublishModal"
            @delete-article="deleteArticle"
            @open-article="openArticleDetail"
          />

          <AboutSection v-if="currentPage === 'home' || currentPage === 'about'" />
          <ContactSection v-if="currentPage === 'home'" />
          <AppFooter v-if="currentPage === 'home'" />
        </div>
      </Transition>

      <LoginModal
        v-if="showLoginModal"
        v-model:email="loginForm.email"
        v-model:password="loginForm.password"
        :login-error="loginError"
        :is-logged-in="isLoggedIn"
        :is-logging-in="isLoggingIn"
        :login-user="loginUser"
        @close="closeLoginModal"
        @login="login"
        @logout="logout"
      />

      <PublishModal
        v-if="showPublishModal"
        v-model:is-previewing-markdown="isPreviewingMarkdown"
        :publish-form="publishForm"
        :categories="categories"
        :publish-error="publishError"
        :is-publishing="isPublishing"
        :is-edit-mode="isEditMode"
        :is-uploading-image="isUploadingImage"
        :markdown-preview-html="markdownPreviewHtml"
        @close="closePublishModal"
        @publish="publishArticle"
        @insert-markdown="insertMarkdown"
        @trigger-image-upload="triggerImageUpload('markdown')"
        @upload-markdown-image="uploadImage($event, 'markdown')"
        @upload-cover-image="uploadImage($event, 'cover')" 
        @remove-cover-image="publishForm.coverImg = ''" 
        @content-textarea-ready="contentTextarea = $event"
        @image-input-ready="imageInput = $event"
      />

      <AppToast :message="toastMessage" :type="toastType" :show="showToast" />
    </div>

    <div v-if="!accessGranted" class="access-gate" role="dialog" aria-modal="true" aria-label="主站访问校验">
      <form class="access-card" @submit.prevent="verifyMainAccess">
        <span>PRIVATE AREA</span>
        <h1>Access Code</h1>
        <p>主站内容已被临时遮罩。输入 access code 后继续访问。</p>
        <input
          v-model="accessCodeInput"
          type="password"
          autocomplete="off"
          placeholder="Enter access code"
          :disabled="isVerifyingAccessCode"
          autofocus
        />
        <button type="submit" :disabled="isVerifyingAccessCode">
          {{ isVerifyingAccessCode ? '校验中...' : '进入主站' }}
        </button>
        <small v-if="accessCodeError">{{ accessCodeError }}</small>
      </form>
    </div>
  </div>
</template>

<style>
/* Global page transition styles */
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.page-fade-enter-from,
.page-fade-leave-to {
  opacity: 0;
  transform: translateY(10px); /* Slight slide effect */
}

/* Wrapper for content when ArticleDetailView is not open */
.main-content-wrapper {
  /* This ensures the wrapper takes up space and allows transitions */
  min-height: 1px; /* Or some other minimal height */
  display: flex;
  flex-direction: column;
}
</style>
