<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import QRCode from 'qrcode'
import confetti from 'canvas-confetti'
import AboutSection from './components/AboutSection.vue'
import AppFooter from './components/AppFooter.vue'
import AppNavbar from './components/AppNavbar.vue'
import SidebarNav from './components/SidebarNav.vue'
import ArticleDetailView from './components/ArticleDetailView.vue'
import ContactSection from './components/ContactSection.vue'
import DashboardPage from './components/DashboardPage.vue'
import MediaHubPage from './components/MediaHubPage.vue'
import GuestbookView from './components/GuestbookView.vue'
import HomePage from './components/HomePage.vue'
import LoginModal from './components/LoginModal.vue'
import AppToast from './components/AppToast.vue'
import AppConfirmDialog from './components/AppConfirmDialog.vue'
import SearchModal from './components/SearchModal.vue'
import ProfilePage from './components/ProfilePage.vue'
import PublishModal from './components/PublishModal.vue'
import QuantLabPage from './components/QuantLabPage.vue'
import type {
  ArticleDetail,
  ArticleListItem,
  ArticlePublishRequest,
  Category,
  Tag,
} from './types/blog'
import { renderMarkdown } from './utils/markdown'
import { getUploadedImageUrl } from './utils/format'
import { useAuth } from './composables/useAuth'
import { useArticles } from './composables/useArticles'
import { useGate } from './composables/useGate'
import { useDarkMode } from './composables/useDarkMode'
import { useComments } from './composables/useComments'
import {
  fetchCategories as apiFetchCategories,
  fetchTags as apiFetchTags,
  fetchAdminArticles as apiFetchAdminArticles,
  fetchAdminArticleDetail,
  fetchArticleDetail,
  createArticle,
  updateArticle,
  deleteArticle as apiDeleteArticle,
  uploadImage as apiUploadImage,
} from './api'

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
  totalArticles,
  articleError,
  isLoadingArticles,
  isLoadingMore,
  selectedArticle,
  selectedArticlePreview,
  isLoadingArticleDetail,
  fetchArticles,
  loadMoreArticles,
  openArticleDetail,
  closeArticleDetail,
} = useArticles()

const adminArticles = ref<ArticleListItem[]>([])
const isLoadingAdminArticles = ref(false)
const adminPage = ref(1)
const adminTotal = ref(0)
const ADMIN_PAGE_SIZE = 6

const { accessGranted, isCheckingGate, checkGateStatus, validateAccessCode } = useGate()

const {
  pendingComments,
  isLoadingPending,
  fetchPendingComments,
  reviewComment,
  deleteComment: deleteCommentApi,
} = useComments()

const { isDark, toggleDark } = useDarkMode()

// ── Categories & Tags (real data from backend) ──
const categories = ref<Category[]>([])
const tags = ref<Tag[]>([])

async function fetchCategories() {
  try {
    const data = await apiFetchCategories()
    if (data.length) {
      categories.value = data.sort((a, b) => (a.sort || 0) - (b.sort || 0))
    }
  } catch (err) {
    console.warn('加载分类失败', err)
    if (!categories.value.length) {
      categories.value = [{ id: 1, name: '未分类', sort: 0 }]
    }
  }
}

async function fetchTags() {
  try {
    tags.value = await apiFetchTags()
  } catch (err) {
    console.warn('加载标签失败', err)
    tags.value = []
  }
}

async function fetchAdminArticles(page = 1) {
  isLoadingAdminArticles.value = true
  adminPage.value = page
  try {
    const result = await apiFetchAdminArticles(page, ADMIN_PAGE_SIZE)
    adminArticles.value = result.articles
    adminTotal.value = result.total
  } catch (err) {
    console.warn('加载管理端文章列表失败', err)
    adminArticles.value = []
    adminTotal.value = 0
  } finally {
    isLoadingAdminArticles.value = false
  }
}

function handleAdminPageChange(page: number) {
  fetchAdminArticles(page)
}

async function refreshArticleData() {
  await fetchArticles()
  try {
    await fetchAdminArticles()
  } catch { /* 未登录时后端 401，由拦截器处理 */ }
}

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
  return list.filter((article) => article.categoryName === activeCategory?.name)
})

function toggleCategory(categoryId: number) {
  activeCategoryId.value = activeCategoryId.value === categoryId ? null : categoryId
}

function handleFilterCategory(label: string) {
  // find category by name; if missing, add a transient category entry
  let found = categories.value.find((c) => c.name === label)
  if (!found) {
    const nextId = Date.now()
    found = { id: nextId, name: label, sort: 999 }
    categories.value.push(found)
  }
  activeCategoryId.value = found.id
  // ensure we navigate to posts view
  navigateToSection('posts')
}

// ── Derived view state ──
const articleForDetail = computed(() => selectedArticle.value || selectedArticlePreview.value)
const isArticleDetailOpen = computed(() => Boolean(articleForDetail.value))
const currentPage = computed(() => (route.meta.page as string) || 'home')
const showActionsOnPage = computed(() => currentPage.value === 'profile' || currentPage.value === 'dashboard')
const totalViews = computed(() =>
  articles.value.reduce((sum, item) => sum + (item.viewCount || 0), 0)
)
const currentArticleIndex = computed(() => {
  const id = articleForDetail.value?.id
  return id ? articles.value.findIndex((item) => item.id === id) : -1
})
const previousArticle = computed(() =>
  currentArticleIndex.value >= 0 ? articles.value[currentArticleIndex.value + 1] || null : null
)
const nextArticle = computed(() =>
  currentArticleIndex.value > 0 ? articles.value[currentArticleIndex.value - 1] || null : null
)
const dashboardArticles = computed(() => (adminArticles.value.length ? adminArticles.value : articles.value))

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
const LOCAL_DRAFT_PREFIX = 'nextify:publish-local-backup:'
const publishReturnRoute = ref<string | null>(null)
const draftStatus = ref('')
const hasSavedPublishDraft = ref(false)
const lastSavedPublishSnapshot = ref('')
const isSavingDraft = ref(false)
let isApplyingPublishSnapshot = false

type PublishDraftPayload = {
  articleId: number | null
  savedAt: string
  form: ArticlePublishRequest
}

function clonePublishForm(): ArticlePublishRequest {
  return {
    title: publishForm.title,
    subtitle: publishForm.subtitle,
    summary: publishForm.summary,
    content: publishForm.content,
    contentHtml: publishForm.contentHtml,
    coverImg: publishForm.coverImg,
    cardStyle: publishForm.cardStyle,
    status: publishForm.status,
    isTop: publishForm.isTop,
    categoryId: publishForm.categoryId,
    tagIds: [...publishForm.tagIds],
    imageIds: [...publishForm.imageIds],
  }
}

function applyPublishFormSnapshot(snapshot: ArticlePublishRequest) {
  isApplyingPublishSnapshot = true
  publishForm.title = snapshot.title || ''
  publishForm.subtitle = snapshot.subtitle || ''
  publishForm.summary = snapshot.summary || ''
  publishForm.content = snapshot.content || ''
  publishForm.contentHtml = snapshot.contentHtml || ''
  publishForm.coverImg = snapshot.coverImg || ''
  publishForm.cardStyle = snapshot.cardStyle || 1
  publishForm.status = snapshot.status ?? 0
  publishForm.isTop = snapshot.isTop || 0
  publishForm.categoryId = snapshot.categoryId || categories.value[0]?.id || 1
  publishForm.tagIds = Array.isArray(snapshot.tagIds) ? [...snapshot.tagIds] : []
  publishForm.imageIds = Array.isArray(snapshot.imageIds) ? [...snapshot.imageIds] : []
  nextTick(() => {
    lastSavedPublishSnapshot.value = JSON.stringify(clonePublishForm())
    isApplyingPublishSnapshot = false
  })
}

function getLocalDraftKey(articleId = editingArticleId.value) {
  return `${LOCAL_DRAFT_PREFIX}${articleId ?? 'new'}`
}

function loadPublishDraft(articleId = editingArticleId.value): PublishDraftPayload | null {
  try {
    const raw = localStorage.getItem(getLocalDraftKey(articleId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as PublishDraftPayload
    if (!parsed?.form) return null
    return parsed
  } catch {
    return null
  }
}

function refreshPublishDraftState() {
  hasSavedPublishDraft.value = Boolean(loadPublishDraft())
}

function clearPublishDraft(articleId = editingArticleId.value) {
  localStorage.removeItem(getLocalDraftKey(articleId))
  hasSavedPublishDraft.value = false
}

function hasAnyPublishContent() {
  return Boolean(
    publishForm.title.trim() ||
      publishForm.subtitle.trim() ||
      publishForm.summary.trim() ||
      publishForm.content.trim() ||
      publishForm.contentHtml.trim() ||
      publishForm.coverImg.trim() ||
      publishForm.tagIds.length
  )
}

function canSaveBackendDraft() {
  return Boolean(publishForm.title.trim() && publishForm.content.trim() && publishForm.categoryId)
}

function saveLocalPublishBackup(message = '已保留本地备份') {
  const savedAt = new Date().toISOString()
  const payload: PublishDraftPayload = {
    articleId: editingArticleId.value,
    savedAt,
    form: clonePublishForm(),
  }
  localStorage.setItem(getLocalDraftKey(), JSON.stringify(payload))
  hasSavedPublishDraft.value = true
  lastSavedPublishSnapshot.value = JSON.stringify(payload.form)
  draftStatus.value = message
}

function collectPublishImageIds() {
  publishForm.contentHtml = publishForm.contentHtml || markdownPreviewHtml.value
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
}

async function saveArticleWithStatus(status: 0 | 1 | 2) {
  collectPublishImageIds()
  const payload: ArticlePublishRequest = { ...clonePublishForm(), status }
  if (editingArticleId.value) {
    return updateArticle(editingArticleId.value, payload)
  }
  return createArticle(payload)
}

async function savePublishDraft(options: { silent?: boolean } = {}) {
  if (!showPublishModal.value || isPublishing.value || isSavingDraft.value || isApplyingPublishSnapshot) return false

  const snapshot = JSON.stringify(clonePublishForm())
  if (snapshot === lastSavedPublishSnapshot.value) return true

  if (!hasAnyPublishContent()) {
    clearPublishDraft()
    lastSavedPublishSnapshot.value = snapshot
    return true
  }

  if (!canSaveBackendDraft()) {
    saveLocalPublishBackup('输入标题和正文后自动保存到后端')
    return true
  }

  if (!options.silent) draftStatus.value = '保存草稿中...'
  isSavingDraft.value = true
  try {
    const createdArticleId = await saveArticleWithStatus(0)

    if (!editingArticleId.value && createdArticleId) {
      clearPublishDraft(null)
      editingArticleId.value = createdArticleId
      router.replace({ name: 'publish-edit', params: { articleId: createdArticleId } })
    }

    publishForm.status = 0
    clearPublishDraft()
    hasSavedPublishDraft.value = false
    lastSavedPublishSnapshot.value = JSON.stringify(clonePublishForm())
    const savedAt = new Date()
    draftStatus.value = `草稿已保存 ${savedAt.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    })}`
    await fetchAdminArticles()
    return true
  } catch (error) {
    const errMsg = axios.isAxiosError(error) && error.response?.data?.message
      ? error.response.data.message
      : '后端保存失败，已保留本地备份'
    saveLocalPublishBackup(errMsg)
    if (!options.silent) {
      showAppToast(errMsg, 'error')
    }
    return false
  } finally {
    isSavingDraft.value = false
  }
}

async function saveDraftManually() {
  if (!canSaveBackendDraft()) {
    saveLocalPublishBackup('请先填写标题和正文')
    showAppToast('请先填写标题和正文，再保存到后端草稿。', 'error')
    return
  }
  const ok = await savePublishDraft()
  if (ok) showAppToast('草稿已保存', 'success')
}

function savePublishDraftBackupOnly() {
  if (!showPublishModal.value || isPublishing.value || isApplyingPublishSnapshot) return
  if (!hasAnyPublishContent()) {
    clearPublishDraft()
    lastSavedPublishSnapshot.value = JSON.stringify(clonePublishForm())
    return
  }
  const savedAt = new Date()
  saveLocalPublishBackup(`本地备份 ${savedAt.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })}`)
}

function hasUnsavedPublishChanges() {
  if (!showPublishModal.value) return false
  return JSON.stringify(clonePublishForm()) !== lastSavedPublishSnapshot.value
}

async function discardPublishDraft() {
  const confirmed = window.confirm(
    editingArticleId.value
      ? '确认清除本地草稿？当前编辑内容会恢复为服务器上的文章内容。'
      : '确认清除本地草稿？当前编辑内容会回到空白新文章。',
  )
  if (!confirmed) return
  clearPublishDraft()
  if (editingArticleId.value) {
    await loadArticleForEdit(editingArticleId.value)
  } else {
    resetPublishForm()
  }
  lastSavedPublishSnapshot.value = JSON.stringify(clonePublishForm())
  showAppToast('本地草稿已清除', 'info')
}

function resetPublishForm() {
  applyPublishFormSnapshot({
    title: '',
    subtitle: '',
    summary: '',
    content: '',
    contentHtml: '',
    coverImg: '',
    cardStyle: 1,
    status: 0,
    isTop: 0,
    categoryId: categories.value[0]?.id || 1,
    tagIds: [],
    imageIds: [],
  })
  uploadedImageMap.clear()
  isPreviewingMarkdown.value = true
}

function fillPublishForm(article: ArticleDetail) {
  applyPublishFormSnapshot({
    title: article.title || '',
    subtitle: article.subtitle || '',
    summary: article.summary || '',
    content: article.content || '',
    contentHtml: article.contentHtml || article.renderContent || '',
    coverImg: article.coverImg || '',
    cardStyle: article.cardStyle || 1,
    status: typeof article.status === 'number' ? article.status : 1,
    isTop: typeof article.isTop === 'number' ? article.isTop : article.isTop ? 1 : 0,
    categoryId: article.categoryId || categories.value[0]?.id || 1,
    tagIds: Array.isArray(article.tagIds) ? article.tagIds : [],
    imageIds: [],
  })
  uploadedImageMap.clear()
}

async function closePublishModal(force = false) {
  if (!force) {
    await savePublishDraft({ silent: true })
  }
  if (!force && hasUnsavedPublishChanges()) {
    const confirmed = window.confirm('当前文章有未自动保存的修改，确认离开编辑页？')
    if (!confirmed) return
  }
  showPublishModal.value = false
  publishError.value = ''
  editingArticleId.value = null
  draftStatus.value = ''
  lastSavedPublishSnapshot.value = ''
  const targetRoute = publishReturnRoute.value || 'home'
  publishReturnRoute.value = null
  if (currentPage.value === 'publish') {
    router.push({ name: targetRoute })
  }
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function loadArticleForEdit(articleId: number) {
  publishError.value = ''
  showPublishModal.value = true
  try {
    let article = await fetchAdminArticleDetail(articleId, 0)
    if (!article) {
      article = await fetchAdminArticleDetail(articleId, 1)
    }
    if (!article) {
      article = await fetchArticleDetail(articleId, true, 0)
    }
    if (!article) {
      article = await fetchArticleDetail(articleId, true, 1)
    }
    if (article) {
      fillPublishForm(article)
      isPreviewingMarkdown.value = true
      return
    }
    publishError.value = '文章读取失败，无法进入编辑模式。'
    editingArticleId.value = null
  } catch (error) {
    publishError.value =
      axios.isAxiosError(error) && error.response?.data?.message
        ? error.response.data.message
        : '文章详情接口暂时不可用，请稍后重试。'
    editingArticleId.value = null
  }
}

async function startPublishPage(articleId?: number) {
  closeArticleDetail()
  publishError.value = ''
  showPublishModal.value = true
  isPreviewingMarkdown.value = true
  refreshPublishDraftState()

  if (articleId) {
    editingArticleId.value = articleId
    await loadArticleForEdit(articleId)
    const draft = loadPublishDraft(articleId)
    if (draft?.articleId === articleId) {
      const confirmed = window.confirm('检测到这篇文章的本地草稿，是否恢复草稿内容？')
      if (confirmed) {
        applyPublishFormSnapshot(draft.form)
        draftStatus.value = '已恢复本地草稿'
      }
    }
    return
  }

  editingArticleId.value = null
  const draft = loadPublishDraft(null)
  if (draft && draft.articleId === null) {
    applyPublishFormSnapshot(draft.form)
    draftStatus.value = '已恢复本地草稿'
  } else {
    resetPublishForm()
  }
}

function openPublishModal(article?: ArticleListItem | ArticleDetail) {
  if (currentPage.value !== 'publish') {
    publishReturnRoute.value = (route.name as string) || 'home'
  }
  const nextRoute = article
    ? { name: 'publish-edit', params: { articleId: article.id } }
    : { name: 'publish' }
  router.push(nextRoute)
  startPublishPage(article?.id)
}

async function publishArticle() {
  publishError.value = ''
  if (!publishForm.title || !publishForm.content || !publishForm.categoryId) {
    publishError.value = '请至少填写标题、正文和分类。'
    return
  }

  isPublishing.value = true

  try {
    const savedArticleId = await saveArticleWithStatus(1)

    const finalArticleId = editingArticleId.value || savedArticleId || null
    clearPublishDraft()
    resetPublishForm()
    await closePublishModal(true)
    showAppToast(finalArticleId ? '文章保存成功！' : '文章发布成功！', 'success')
    await refreshArticleData()
    if (finalArticleId && selectedArticle.value?.id === finalArticleId) {
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
  pendingDeleteArticleId.value = articleId
  showDeleteConfirm.value = true
}

async function confirmDeleteArticle() {
  const articleId = pendingDeleteArticleId.value
  if (articleId === null) return
  showDeleteConfirm.value = false
  pendingDeleteArticleId.value = null

  isDeletingArticle.value = true
  showAppToast('正在删除文章...', 'info')
  publishError.value = ''

  try {
    await apiDeleteArticle(articleId)
    if (editingArticleId.value === articleId) {
      resetPublishForm()
      await closePublishModal(true)
    }
    if (selectedArticle.value?.id === articleId) {
      closeArticleDetail()
    }
    showAppToast('文章删除成功！', 'success')
    await refreshArticleData()
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

  publishError.value = ''
  isUploadingImage.value = true

  try {
    const formData = new FormData()
    formData.append('file', file)
    const usageTypeMap = { markdown: '3', cover: '1', avatar: '2' } as const
    formData.append('usageType', usageTypeMap[type])
    if (editingArticleId.value && (type === 'markdown' || type === 'cover')) {
      formData.append('usageId', editingArticleId.value.toString())
    }

    const data = await apiUploadImage(formData)

    if (!data) {
      publishError.value = '图片上传失败，请稍后重试。'
      showAppToast(publishError.value, 'error')
      return
    }

    const imageUrl = getUploadedImageUrl(data)
    const imageId = data?.id

    if (!imageUrl || imageId === undefined) {
      publishError.value = '图片上传失败，请稍后重试。'
      showAppToast(publishError.value, 'error')
      return
    }

    if (type === 'markdown') {
      uploadedImageMap.set(imageUrl, imageId)
      const altText = data.name || 'image'
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
const showDeleteConfirm = ref(false)
const pendingDeleteArticleId = ref<number | null>(null)

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
    await Promise.all([fetchCategories(), fetchTags(), fetchPendingComments()])
    await fetchAdminArticles()
    if (currentPage.value === 'publish') {
      const articleId = Number(route.params.articleId)
      await startPublishPage(Number.isFinite(articleId) ? articleId : undefined)
    }
  }
}

function handleLogout() {
  closeUserMenu()
  authLogout()
  adminArticles.value = []
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
    const result = await validateAccessCode(code)
    if (result?.success) {
      accessCodeInput.value = ''
    } else {
      accessCodeError.value = result?.message || 'access code 不正确，请重新输入。'
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
  if (sectionId === 'dashboard') {
    fetchAdminArticles()
  }

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
  fetchAdminArticles()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function openQuantLab() {
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

let publishDraftTimer: number | undefined

watch(
  publishForm,
  () => {
    if (!showPublishModal.value || isApplyingPublishSnapshot || isSavingDraft.value) return
    if (publishDraftTimer) clearTimeout(publishDraftTimer)
    publishDraftTimer = setTimeout(savePublishDraft, 1500) as unknown as number
  },
  { deep: true },
)

function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (!showPublishModal.value) return
  savePublishDraftBackupOnly()
  if (!hasUnsavedPublishChanges()) return
  event.preventDefault()
  event.returnValue = ''
}

// ── Lifecycle ──
onMounted(async () => {
  document.title = 'NEXTIFY'
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('beforeunload', handleBeforeUnload)

  await checkGateStatus()
  initFromLocalStorage()
  fetchUserProfile()
  await fetchCategories()
  fetchTags()
  await refreshArticleData()
  try {
    fetchPendingComments()
  } catch { /* 未登录时后端 401，由拦截器处理 */ }
  refreshPublishDraftState()

  if (currentPage.value === 'publish') {
    const articleId = Number(route.params.articleId)
    await startPublishPage(Number.isFinite(articleId) ? articleId : undefined)
  }

  document.addEventListener('click', handleClickOutside)
  // global toast bridge: listen to CustomEvent dispatched from anywhere
  window.addEventListener('app-toast', (e: Event) => {
    const ev = e as CustomEvent
    const detail = ev.detail || {}
    showAppToast(detail.message || '', detail.type || 'info')
  })
  // 后端返回 401 时，axios 拦截器触发此事件 → 清本地登录态 + 弹登录窗
  // code=1004 (MAX_EXPIRED) —— token 超过最大有效期，强制提醒重新登录
  // code=1003 (TOKEN_INVALID) —— token 无效
  window.addEventListener('auth:expired', (evt: Event) => {
    clearLoginState()
    const detail = (evt as CustomEvent).detail
    const code = detail?.code
    if (code === 1004) {
      showAppToast('登录已过期，请重新登录', 'info')
    } else if (code === 1003) {
      showAppToast('登录态无效，请重新登录', 'info')
    } else {
      showAppToast('登录已过期，请重新登录', 'info')
    }
    showLoginModal.value = true
  })
})

onUnmounted(() => {
  if (publishDraftTimer) clearTimeout(publishDraftTimer)
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('beforeunload', handleBeforeUnload)
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
        :is-dark="isDark"
        @navigate="navigateToSection"
        @open-profile="openProfile"
        @open-dashboard="openDashboard"
        @open-quant-lab="openQuantLab"
        @open-login="openLoginModal"
        @toggle-status="handleStatusClick"
        @open-search="showSearchModal = true"
        @logout="handleLogout"
        @toggle-dark="toggleDark"
      />

      <!-- Global sidebar (hover from left edge) -->
      <SidebarNav :articles="articles" :categories="categories" @navigate="navigateToSection" @open-article="openArticleDetail" @filter-category="handleFilterCategory" />

      <Transition name="page-fade" mode="out-in">
        <ArticleDetailView
          v-if="isArticleDetailOpen && !showPublishModal"
          :article="articleForDetail!"
          :selected-article="selectedArticle"
          :is-loading="isLoadingArticleDetail"
          :show-actions="showActionsOnPage"
          :previous-article="previousArticle"
          :next-article="nextArticle"
          :is-logged-in="isLoggedIn"
          :login-user="loginUser"
          @close="closeArticleDetail"
          @edit="openPublishModal"
          @delete="deleteArticle"
          @open-article="openArticleDetail"
        />
        <div v-else-if="!showPublishModal" class="main-content-wrapper">
          <HomePage
            v-if="currentPage === 'home' || currentPage === 'posts' || currentPage === 'about'"
            :categories="categories"
            :active-category-id="activeCategoryId"
            :articles="articles"
            :filtered-articles="filteredArticles"
            :total-articles="totalArticles"
            :article-error="articleError"
            :is-loading-articles="isLoadingArticles"
            :is-loading-more="isLoadingMore"
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
            @load-more="loadMoreArticles"
          />

          <ProfilePage
            v-if="currentPage === 'profile'"
            :login-user="loginUser"
            @upload-avatar="uploadImage($event, 'avatar')"
            @update-profile="updateUserProfile"
          />

          <DashboardPage
            v-if="currentPage === 'dashboard'"
            :articles="dashboardArticles"
            :categories="categories"
            :tags="tags"
            :is-loading-articles="isLoadingAdminArticles"
            :pending-comments="pendingComments"
            :is-loading-pending="isLoadingPending"
            :comment-count="commentCount"
            :total-views="totalViews"
            :page="adminPage"
            :total="adminTotal"
            :page-size="ADMIN_PAGE_SIZE"
            @new-article="openPublishModal"
            @edit-article="openPublishModal"
            @delete-article="deleteArticle"
            @open-article="openArticleDetail"
            @approve-comment="handleApproveComment"
            @delete-comment="handleDeleteComment"
            @page-change="handleAdminPageChange"
            @refresh-categories="fetchCategories"
            @refresh-tags="fetchTags"
          />

          <MediaHubPage
            v-if="currentPage === 'dashboard-media'"
            @back="router.push('/dashboard')"
          />

          <GuestbookView
            v-if="currentPage === 'guestbook'"
            :is-logged-in="isLoggedIn"
            :login-user="loginUser"
          />

          <QuantLabPage
            v-if="currentPage === 'quant-lab'"
            :is-logged-in="isLoggedIn"
            @open-login="openLoginModal"
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
        :tags="tags"
        :publish-error="publishError"
        :is-publishing="isPublishing"
        :is-edit-mode="isEditing"
        :is-uploading-image="isUploadingImage"
        :markdown-preview-html="markdownPreviewHtml"
        :pending-markdown-image="pendingMarkdownImage"
        :draft-status="draftStatus"
        :has-saved-draft="hasSavedPublishDraft"
        @close="closePublishModal"
        @publish="publishArticle"
        @save-draft="saveDraftManually"
        @discard-draft="discardPublishDraft"
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
      <AppConfirmDialog
        :show="showDeleteConfirm"
        title="确认删除"
        message="确认删除这篇文章？此操作不可恢复。"
        confirm-text="删除"
        cancel-text="取消"
        tone="danger"
        @confirm="confirmDeleteArticle"
        @cancel="showDeleteConfirm = false"
      />
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

.gate-pending { overflow: hidden; height: 100vh;}
</style>