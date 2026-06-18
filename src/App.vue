<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import QRCode from 'qrcode'
import confetti from 'canvas-confetti'
import AboutSection from './components/AboutSection.vue'
import AppFooter from './components/AppFooter.vue'
import AppNavbar from './components/AppNavbar.vue'
import ArticleDetailView from './components/ArticleDetailView.vue'
import ContactSection from './components/ContactSection.vue'
import DashboardPage from './components/DashboardPage.vue'
import GuestbookView from './components/GuestbookView.vue'
import HomePage from './components/HomePage.vue'
import LoginModal from './components/LoginModal.vue'
import AppToast from './components/AppToast.vue'
import SearchModal from './components/SearchModal.vue'
import ProfilePage from './components/ProfilePage.vue'
import PublishModal from './components/PublishModal.vue'
import QuantLabPage from './components/QuantLabPage.vue'
import type {
  ArticleDetail,
  ArticleListItem,
  ArticlePublishRequest,
  Category,
  ResultResponse,
  UploadImageData,
} from './types/blog'
import { renderMarkdown } from './utils/markdown'
import { getUploadedImageUrl } from './utils/format'
import { useAuth, hasAuthToken, getAuthHeaders } from './composables/useAuth'
import { useArticles } from './composables/useArticles'
import { useGate } from './composables/useGate'
import { useComments } from './composables/useComments'

const route = useRoute()
const router = useRouter()

// ── Composables ──
const {
  isLoggedIn,
  loginUser,
  isLoggingIn,
  loginError: authLoginError,
  initFromLocalStorage,
  clearLoginState,
  login: authLogin,
  logout: authLogout,
  fetchUserProfile,
  updateUserProfile,
} = useAuth()

const {
  articles,
  articleError,
  isLoadingArticles,
  selectedArticle,
  selectedArticlePreview,
  isLoadingArticleDetail,
  fetchArticles,
  openArticleDetail,
  closeArticleDetail,
} = useArticles()

const { accessGranted, isCheckingGate, checkGateStatus, validateAccessCode } = useGate()

const {
  pendingComments,
  isLoadingPending,
  fetchPendingComments,
  reviewComment,
  deleteComment: deleteCommentApi,
} = useComments()

// ── Static categories ──
const categories = ref<Category[]>([
  { id: 1, label: 'Thought' },
  { id: 2, label: 'Code' },
  { id: 3, label: 'Design' },
  { id: 4, label: 'Guide' },
])

// ── Login form state ──
const loginForm = reactive({ email: '', password: '' })

// ── Filter / UI state ──
const activeCategoryId = ref<number | null>(null)
const showFeaturedOnly = ref(false)

const filteredArticles = computed(() => {
  let list = articles.value
  if (showFeaturedOnly.value) list = list.filter((a) => a.isTop === 1)
  if (!activeCategoryId.value) return list
  const activeCategory = categories.value.find((c) => c.id === activeCategoryId.value)
  return list.filter((article) => article.categoryName === activeCategory?.label)
})

function toggleCategory(categoryId: number) {
  activeCategoryId.value = activeCategoryId.value === categoryId ? null : categoryId
}

// ── Derived view state ──
const articleForDetail = computed(() => selectedArticle.value || selectedArticlePreview.value)
const isArticleDetailOpen = computed(() => Boolean(articleForDetail.value))
const currentPage = computed(() => (route.meta.page as string) || 'home')
const showActionsOnPage = computed(() => currentPage.value === 'profile' || currentPage.value === 'dashboard')
const totalViews = computed(() =>
  articles.value.reduce((sum, item) => sum + (item.viewCount || 0), 0)
)

// ── Pending comments (real data from backend) ──
const commentCount = computed(() => pendingComments.value.length)

async function handleApproveComment(commentId: number) {
  const originalList = [...pendingComments.value]
  pendingComments.value = pendingComments.value.filter((c) => c.id !== commentId)
  const success = await reviewComment(commentId, 1)
  if (!success) {
    pendingComments.value = originalList
    showAppToast('审核失败，请稍后重试', 'error')
    return
  }
  showAppToast('评论已通过审核', 'success')
}

async function handleDeleteComment(commentId: number) {
  const confirmed = window.confirm('确认删除这条评论？此操作不可恢复。')
  if (!confirmed) return
  const originalList = [...pendingComments.value]
  pendingComments.value = pendingComments.value.filter((c) => c.id !== commentId)
  const success = await deleteCommentApi(commentId)
  if (!success) {
    pendingComments.value = originalList
    showAppToast('删除失败，请稍后重试', 'error')
    return
  }
  showAppToast('评论已删除', 'success')
}

// ── Publish modal state ──
const showPublishModal = ref(false)
const publishError = ref('')
const isPublishing = ref(false)
const editingArticleId = ref<number | null>(null)
const isEditing = computed(() => editingArticleId.value !== null)
const isPreviewingMarkdown = ref(false)
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
  tagIds: [],
  imageIds: [],
})
const markdownPreviewHtml = computed(() => renderMarkdown(publishForm.content))
const uploadedImageMap = reactive<Map<string, number>>(new Map())

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
  publishForm.imageIds = []
  uploadedImageMap.clear()
  isPreviewingMarkdown.value = true
}

function fillPublishForm(article: ArticleDetail) {
  publishForm.title = article.title || ''
  publishForm.subtitle = article.subtitle || ''
  publishForm.summary = article.summary || ''
  publishForm.content = article.content || ''
  publishForm.contentHtml = article.contentHtml || article.renderContent || ''
  publishForm.coverImg = article.coverImg || ''
  publishForm.cardStyle = article.cardStyle || 1
  publishForm.status = article.status || 1
  publishForm.isTop = article.isTop || 0
  publishForm.categoryId = article.categoryId || 1
  publishForm.tagIds = article.tagIds || []
  publishForm.imageIds = []
  uploadedImageMap.clear()
}

function closePublishModal() {
  showPublishModal.value = false
  publishError.value = ''
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function loadArticleForEdit(articleId: number) {
  publishError.value = ''
  showPublishModal.value = true
  try {
    const response = await axios.get<ResultResponse<ArticleDetail>>(`/api/articles/${articleId}`)
    if (response.data.code === 200 && response.data.data) {
      fillPublishForm(response.data.data)
      isPreviewingMarkdown.value = true
      return
    }
    publishError.value = response.data.message || '文章读取失败，无法进入编辑模式。'
    editingArticleId.value = null
  } catch (error) {
    publishError.value =
      axios.isAxiosError(error) && error.response?.data?.message
        ? error.response.data.message
        : '文章详情接口暂时不可用，请稍后重试。'
    editingArticleId.value = null
  }
}

function openPublishModal(article?: ArticleListItem | ArticleDetail) {
  if (!isLoggedIn.value || !hasAuthToken()) {
    showLoginModal.value = true
    return
  }
  if (!article) {
    resetPublishForm()
    editingArticleId.value = null
    isPreviewingMarkdown.value = true
    showPublishModal.value = true
    return
  }
  editingArticleId.value = article.id
  isPreviewingMarkdown.value = true
  loadArticleForEdit(article.id)
}

async function publishArticle() {
  publishError.value = ''
  if (!hasAuthToken()) {
    publishError.value = '登录状态已失效，请重新登录后再发布。'
    showLoginModal.value = true
    return
  }
  if (!publishForm.title || !publishForm.content || !publishForm.categoryId) {
    publishError.value = '请至少填写标题、正文和分类。'
    return
  }

  isPublishing.value = true
  publishForm.contentHtml = publishForm.contentHtml || markdownPreviewHtml.value

  // 从文章内容中提取已上传图片的 id
  const parser = new DOMParser()
  const doc = parser.parseFromString(publishForm.contentHtml, 'text/html')
  const imgElements = doc.querySelectorAll('img')
  const extractedImageIds: number[] = []
  imgElements.forEach((img) => {
    const src = img.getAttribute('src')
    if (src && uploadedImageMap.has(src)) {
      extractedImageIds.push(uploadedImageMap.get(src)!)
    }
  })
  publishForm.imageIds = extractedImageIds

  try {
    let response
    if (editingArticleId.value) {
      response = await axios.put<ResultResponse<number>>(
        `/api/admin/articles/${editingArticleId.value}`,
        publishForm,
        { headers: getAuthHeaders() }
      )
    } else {
      response = await axios.post<ResultResponse<number>>(
        '/api/admin/articles',
        publishForm,
        { headers: getAuthHeaders() }
      )
    }

    if (response.data.code !== 200) {
      publishError.value =
        response.data.message || (editingArticleId.value ? '保存失败，请稍后重试。' : '发布失败，请稍后重试。')
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
    publishError.value =
      axios.isAxiosError(error) && error.response?.data?.message
        ? error.response.data.message
        : editingArticleId.value
          ? '保存接口暂时不可用，请稍后再试。'
          : '发布接口暂时不可用，请稍后再试。'
    showAppToast(publishError.value, 'error')
  } finally {
    isPublishing.value = false
  }
}

async function deleteArticle(articleId: number) {
  if (!isLoggedIn.value || !hasAuthToken()) {
    showLoginModal.value = true
    return
  }
  const confirmed = window.confirm('确认删除这篇文章？此操作不可恢复。')
  if (!confirmed) return

  isDeletingArticle.value = true
  showAppToast('正在删除文章...', 'info')
  publishError.value = ''

  try {
    const response = await axios.delete<ResultResponse<null>>(`/api/admin/articles/${articleId}`, {
      headers: getAuthHeaders(),
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
    publishError.value =
      axios.isAxiosError(error) && error.response?.data?.message
        ? error.response.data.message
        : '删除接口暂时不可用，请稍后再试。'
  } finally {
    isDeletingArticle.value = false
  }
}

// ── Image upload (markdown editor / cover / avatar) ──
const isUploadingImage = ref(false)
const pendingMarkdownImage = ref<{ id: number; src: string; alt: string } | null>(null)
const contentTextarea = ref<HTMLTextAreaElement | null>(null)
const coverImageInput = ref<HTMLInputElement | null>(null)
const imageInput = ref<HTMLInputElement | null>(null)

async function insertMarkdown(before: string, after = '', placeholder = '文本') {
  const ta = contentTextarea.value
  const start = ta?.selectionStart ?? publishForm.content.length
  const end = ta?.selectionEnd ?? publishForm.content.length
  const selectedText = publishForm.content.slice(start, end) || placeholder
  const nextValue = `${publishForm.content.slice(0, start)}${before}${selectedText}${after}${publishForm.content.slice(end)}`
  publishForm.content = nextValue

  await nextTick()
  contentTextarea.value?.focus()
  const cursor = start + before.length + selectedText.length + after.length
  contentTextarea.value?.setSelectionRange(cursor, cursor)
}

function triggerImageUpload(type: 'markdown' | 'cover' | 'avatar') {
  if (!hasAuthToken()) {
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

  if (!file) return

  if (file.size > 50 * 1024 * 1024) {
    showAppToast('图片大小不能超过 50MB', 'error')
    return
  }
  if (!hasAuthToken()) {
    publishError.value = '登录状态已失效，请重新登录后再上传图片。'
    showAppToast(publishError.value, 'error')
    openLoginModal()
    return
  }

  publishError.value = ''
  isUploadingImage.value = true

  try {
    const formData = new FormData()
    formData.append('file', file)
    const usageTypeMap = { markdown: '3', cover: '2', avatar: '1' } as const
    formData.append('usageType', usageTypeMap[type])
    if (editingArticleId.value && (type === 'markdown' || type === 'cover')) {
      formData.append('usageId', editingArticleId.value.toString())
    }

    const response = await axios.post<ResultResponse<UploadImageData>>(
      '/api/admin/upload/image/with-reference',
      formData,
      { headers: getAuthHeaders() }
    )

    const imageUrl = getUploadedImageUrl(response.data.data)
    const imageId = response.data.data?.id

    if (response.data.code !== 200 || !imageUrl || imageId === undefined) {
      publishError.value = response.data.message || '图片上传失败，请稍后重试。'
      showAppToast(publishError.value, 'error')
      return
    }

    if (type === 'markdown') {
      uploadedImageMap.set(imageUrl, imageId)
      const altText = response.data.data.name || 'image'
      pendingMarkdownImage.value = { id: Date.now(), src: imageUrl, alt: altText }
      showAppToast('图片已插入正文', 'success')
    } else if (type === 'cover') {
      publishForm.coverImg = imageUrl
      showAppToast('封面图上传成功', 'success')
    } else {
      await updateUserProfile({ avatar: imageUrl })
    }
  } catch (error) {
    if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
      publishError.value = '图片上传被后端权限拦截，请重新登录后再试。'
      clearLoginState()
      openLoginModal()
      showAppToast(publishError.value, 'error')
      return
    }
    publishError.value =
      axios.isAxiosError(error)
        ? error.response?.data?.message || `图片上传失败：HTTP ${error.response?.status || '网络错误'}`
        : '图片上传失败，请稍后再试。'
    showAppToast(publishError.value, 'error')
  } finally {
    isUploadingImage.value = false
  }
}

const isDeletingArticle = ref(false)

// ── Login / logout actions ──
const showLoginModal = ref(false)

function openLoginModal() {
  showLoginModal.value = true
}
function closeLoginModal() {
  showLoginModal.value = false
}

async function handleLogin() {
  const ok = await authLogin(loginForm.email, loginForm.password)
  if (ok) {
    loginForm.email = ''
    loginForm.password = ''
    showAppToast('登录成功！', 'success')
    showLoginModal.value = false
    if (hasAuthToken()) await fetchPendingComments()
  }
}

function handleLogout() {
  closeUserMenu()
  authLogout()
  loginForm.email = ''
  loginForm.password = ''
  router.push({ name: 'home' })
  closeArticleDetail()
  showAppToast('已退出登录。', 'info')
}

// ── Access gate ──
const accessCodeInput = ref('')
const accessCodeError = ref('')
const isVerifyingAccessCode = ref(false)

async function verifyMainAccess() {
  accessCodeError.value = ''
  const code = accessCodeInput.value.trim()
  if (!code) {
    accessCodeError.value = '请输入 access code。'
    return
  }
  isVerifyingAccessCode.value = true
  try {
    const ok = await validateAccessCode(code)
    if (ok) {
      accessCodeInput.value = ''
    } else {
      accessCodeError.value = 'access code 不正确，请重新输入。'
    }
  } catch {
    accessCodeError.value = 'Access code 校验失败，请稍后重试。'
  } finally {
    isVerifyingAccessCode.value = false
  }
}

// ── Search modal ──
const showSearchModal = ref(false)

function handleSearchSelect(article: ArticleListItem) {
  showSearchModal.value = false
  openArticleDetail(article)
}

// ── User menu / navigation ──
const showUserMenu = ref(false)

function handleStatusClick() {
  showUserMenu.value = !showUserMenu.value
}
function closeUserMenu() {
  showUserMenu.value = false
}

function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!target.closest('.status-badge-wrapper')) {
    closeUserMenu()
  }
}

function navigateToSection(sectionId: string) {
  router.push({ name: sectionId })
  selectedArticle.value = null
  selectedArticlePreview.value = null

  if (sectionId === 'home') {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  if (['guestbook', 'quant-lab', 'profile', 'dashboard'].includes(sectionId)) {
    window.scrollTo({ top: 0, behavior: 'instant' })
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

function openProfile() {
  router.push({ name: 'profile' })
  closeArticleDetail()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function openDashboard() {
  router.push({ name: 'dashboard' })
  closeArticleDetail()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function openQuantLab() {
  if (!isLoggedIn.value || !hasAuthToken()) {
    openLoginModal()
    return
  }
  router.push({ name: 'quant-lab' })
  closeArticleDetail()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function openAssessment() {
  router.push({ name: 'assessment-home' })
  closeArticleDetail()
}

// ── Donate modal ──
const isDonateOpen = ref(false)
const donateQrCanvasRef = ref<HTMLCanvasElement | null>(null)
const ALIPAY_URL = 'https://qr.alipay.com/fkx15570bli95fl5zczgq60'

function checkIsMobile() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

async function openDonate() {
  if (checkIsMobile()) {
    window.open(ALIPAY_URL, '_blank')
  } else {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.7 },
      colors: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'],
      zIndex: 9999,
    })
    isDonateOpen.value = true
    await nextTick()
    if (donateQrCanvasRef.value) {
      await QRCode.toCanvas(donateQrCanvasRef.value, ALIPAY_URL, {
        width: 188,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' },
      })
    }
  }
}

// ── Global toast ──
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref<'success' | 'error' | 'info'>('info')
let toastTimeout: number | undefined

function showAppToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  if (toastTimeout) clearTimeout(toastTimeout)
  toastMessage.value = message
  toastType.value = type
  showToast.value = true
  toastTimeout = setTimeout(() => {
    showToast.value = false
  }, 3000) as unknown as number
}

// ── Keyboard shortcuts ──
function handleKeyDown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    showSearchModal.value = !showSearchModal.value
  }
}

// ── Lifecycle ──
onMounted(async () => {
  document.title = 'ETHERLOG'
  window.addEventListener('keydown', handleKeyDown)

  await checkGateStatus()
  initFromLocalStorage()
  fetchUserProfile()
  fetchArticles()
  if (hasAuthToken()) fetchPendingComments()

  if (currentPage.value === 'quant-lab' && !isLoggedIn.value) {
    router.replace({ name: 'home' })
    openLoginModal()
    showAppToast('请登录后进入量化实验室。', 'info')
  }

  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="app-container" :class="{ 'gate-pending': isCheckingGate }">
    <!-- 全局初始加载 Loading -->
    <div v-if="isCheckingGate" class="app-init-loader">
      <div class="loader-logo">E</div>
      <div class="loader-line"></div>
    </div>

    <div v-else class="main-site-shell" :class="{ locked: !accessGranted }" :aria-hidden="!accessGranted">
      <AppNavbar
        :is-logged-in="isLoggedIn"
        :login-user="loginUser"
        :show-user-menu="showUserMenu"
        @navigate="navigateToSection"
        @open-profile="openProfile"
        @open-dashboard="openDashboard"
        @open-quant-lab="openQuantLab"
        @open-login="openLoginModal"
        @toggle-status="handleStatusClick"
        @open-search="showSearchModal = true"
        @logout="handleLogout"
      />

      <Transition name="page-fade" mode="out-in">
        <ArticleDetailView
          v-if="isArticleDetailOpen && !showPublishModal"
          :article="articleForDetail!"
          :selected-article="selectedArticle"
          :is-loading="isLoadingArticleDetail"
          :show-actions="showActionsOnPage"
          :is-logged-in="isLoggedIn"
          :login-user="loginUser"
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
            :show-actions="showActionsOnPage"
            :show-featured-only="showFeaturedOnly"
            @toggle-category="toggleCategory"
            @open-article="openArticleDetail"
            @edit-article="openPublishModal"
            @delete-article="deleteArticle"
            @scroll-to-posts="navigateToSection('posts')"
            @toggle-featured="showFeaturedOnly = $event"
            @open-assessment="openAssessment"
            @open-donate="openDonate"
            @navigate="navigateToSection"
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
            :pending-comments="pendingComments"
            :is-loading-pending="isLoadingPending"
            :comment-count="commentCount"
            :total-views="totalViews"
            @new-article="openPublishModal"
            @edit-article="openPublishModal"
            @delete-article="deleteArticle"
            @open-article="openArticleDetail"
            @approve-comment="handleApproveComment"
            @delete-comment="handleDeleteComment"
          />

          <GuestbookView
            v-if="currentPage === 'guestbook'"
            :is-logged-in="isLoggedIn"
            :login-user="loginUser"
          />

          <QuantLabPage v-if="currentPage === 'quant-lab' && isLoggedIn" />

          <AboutSection v-if="currentPage === 'home' || currentPage === 'about'" />
          <ContactSection v-if="currentPage === 'home'" />
          <AppFooter v-if="currentPage === 'home'" />
        </div>
      </Transition>

      <LoginModal
        v-if="showLoginModal"
        v-model:email="loginForm.email"
        v-model:password="loginForm.password"
        :login-error="authLoginError"
        :is-logged-in="isLoggedIn"
        :is-logging-in="isLoggingIn"
        :login-user="loginUser"
        @close="closeLoginModal"
        @login="handleLogin"
        @logout="handleLogout"
      />

      <PublishModal
        v-if="showPublishModal"
        v-model:is-previewing-markdown="isPreviewingMarkdown"
        :publish-form="publishForm"
        :categories="categories"
        :publish-error="publishError"
        :is-publishing="isPublishing"
        :is-edit-mode="isEditing"
        :is-uploading-image="isUploadingImage"
        :markdown-preview-html="markdownPreviewHtml"
        :pending-markdown-image="pendingMarkdownImage"
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

      <!-- 打赏模态框 -->
      <Teleport to="body">
        <div v-if="isDonateOpen" class="donate-overlay" @click.self="isDonateOpen = false">
          <div class="donate-dialog">
            <button class="donate-close" type="button" @click="isDonateOpen = false">×</button>
            <div class="donate-icon">☕</div>
            <h3>请作者喝杯咖啡</h3>
            <p>感谢你的支持与认可 🙏</p>
            <div class="donate-qr-box">
              <canvas ref="donateQrCanvasRef" width="188" height="188"></canvas>
            </div>
            <p class="donate-tip">打开支付宝扫一扫</p>
            <p class="donate-sub-tip">PC端扫码，手机端跳转</p>
          </div>
        </div>
      </Teleport>

      <SearchModal :show="showSearchModal" :articles="articles" @close="showSearchModal = false" @select="handleSearchSelect" />

      <AppToast :message="toastMessage" :type="toastType" :show="showToast" />
    </div>

    <div v-if="!accessGranted && !isCheckingGate" class="access-gate" role="dialog" aria-modal="true" aria-label="主站访问校验">
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
/* 打赏弹窗全局样式 */
.donate-overlay {
  position: fixed; inset: 0; z-index: 3000;
  display: grid; place-items: center; padding: 20px;
  background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(12px);
  animation: fadeIn 0.3s ease;
}
.donate-dialog {
  position: relative; width: min(340px, 100%); padding: 32px 24px;
  border-radius: 20px; background: white; text-align: center;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(226, 232, 240, 0.8);
}
.donate-close {
  position: absolute; top: 12px; right: 16px; border: none;
  background: transparent; font-size: 24px; color: #94a3b8; cursor: pointer;
}
.donate-icon { font-size: 40px; margin-bottom: 12px; }
.donate-dialog h3 { margin: 0 0 8px; color: #0f172a; font-size: 20px; font-weight: 800; }
.donate-dialog p { margin: 0 0 20px; color: #64748b; font-size: 14px; font-weight: 500; }
.donate-qr-box {
  display: grid; place-items: center; width: 210px; height: 212px;
  margin: 0 auto 16px; border-radius: 16px; border: 1px solid #e2e8f0;
  background: #f8fafc; padding: 10px;
}
.donate-tip { font-weight: 800; color: #0f172a; font-size: 15px; margin: 0; }
.donate-sub-tip { font-size: 12px; color: #94a3b8; margin-top: 4px; }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

/* Global page transition styles */
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.page-fade-enter-from,
.page-fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* Wrapper for content when ArticleDetailView is not open */
.main-content-wrapper {
  min-height: 1px;
  display: flex;
  flex-direction: column;
}

/* ── 初始门禁校验 Loading ── */
.app-init-loader {
  position: fixed; inset: 0; z-index: 9999;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  background: #f5f5f7; gap: 2.5rem;
}
.loader-logo {
  width: 3.8rem; height: 3.8rem; background: #0f172a; color: white;
  display: flex; align-items: center; justify-content: center;
  border-radius: 0.85rem; font-size: 2rem; font-weight: 950;
  animation: loaderPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
.loader-line {
  width: 140px; height: 2px; background: #e2e8f0; border-radius: 99px;
  position: relative; overflow: hidden;
}
.loader-line::after {
  content: ''; position: absolute; left: 0; top: 0; height: 100%; width: 30%;
  background: #2563eb; border-radius: 99px;
  animation: loaderMove 1.5s infinite ease-in-out;
}

@keyframes loaderPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(0.94); }
}
@keyframes loaderMove {
  0% { left: -30%; }
  100% { left: 100%; }
}

.gate-pending { overflow: hidden; height: 100vh; }
</style>