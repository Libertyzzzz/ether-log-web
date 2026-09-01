<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  FileText, Plus, Search, Trash2, Pencil, ChevronLeft, ChevronRight,
  ArrowLeft, Eye, Pin, EyeOff, CheckCircle, XCircle, Clock, Filter,
  Layout, Tag as TagIcon, ArrowUpRight
} from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import {
  fetchArticlesAdminPage,
  fetchCategories,
  deleteArticle,
  updateArticleField,
  auditArticle,
  batchUpdateArticleStatus,
  isForbiddenError,
} from '../../api'
import type { ArticleListItem, Category } from '../../types/blog'
import { toast } from '../../utils/toast'
import AppConfirmDialog from '../AppConfirmDialog.vue'

const emit = defineEmits<{
  back: []
}>()

const router = useRouter()

const loading = ref(false)
const allItems = ref<ArticleListItem[]>([])
const totalRecords = ref(0)
const currentPage = ref(1)
const pageSize = 10
const searchQuery = ref('')
const categoryFilter = ref<number | ''>('')
const statusFilter = ref<number | ''>('')
const topFilter = ref<number | ''>('')

const categories = ref<Category[]>([])

const showAddModal = ref(false)
const showEditModal = ref(false)
const deletingItem = ref<{ show: boolean; item: ArticleListItem | null }>({ show: false, item: null })
const auditingItem = ref<{ show: boolean; item: ArticleListItem | null; passed: boolean }>({ show: false, item: null, passed: true })

let searchTimer: ReturnType<typeof setTimeout> | null = null

async function loadCategories() {
  try {
    categories.value = await fetchCategories()
  } catch {
    categories.value = []
  }
}

async function loadData() {
  loading.value = true
  const params: any = {
    pageNum: currentPage.value,
    pageSize,
  }
  const keyword = searchQuery.value.trim()
  if (keyword) params.keyword = keyword
  if (categoryFilter.value !== '') params.categoryId = Number(categoryFilter.value)
  if (statusFilter.value !== '') params.status = Number(statusFilter.value)
  if (topFilter.value !== '') params.isTop = Number(topFilter.value)
  try {
    const result = await fetchArticlesAdminPage(params)
    allItems.value = result.records
    totalRecords.value = result.total
  } catch (e) {
    if (!isForbiddenError(e)) {
      allItems.value = []
      totalRecords.value = 0
    }
  } finally {
    loading.value = false
  }
}

watch(searchQuery, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    currentPage.value = 1
    loadData()
  }, 300)
})

watch([categoryFilter, statusFilter, topFilter], () => {
  currentPage.value = 1
  loadData()
})

const totalPages = computed(() => Math.max(1, Math.ceil(totalRecords.value / pageSize)))
const visiblePages = computed(() => {
  const total = totalPages.value
  const cur = currentPage.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | 'ellipsis')[] = [1]
  if (cur > 3) pages.push('ellipsis')
  const start = Math.max(2, cur - 1)
  const end = Math.min(total - 1, cur + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  if (cur < total - 2) pages.push('ellipsis')
  pages.push(total)
  return pages
})

function goToPage(p: number) {
  if (p >= 1 && p <= totalPages.value) {
    currentPage.value = p
    loadData()
  }
}

onMounted(() => {
  loadCategories()
  loadData()
})

function statusLabel(s: number | undefined) {
  if (s === 0) return '草稿'
  if (s === 1) return '已发布'
  if (s === 2) return '待审核'
  if (s === 3) return '已下架'
  return '未知'
}

function statusClass(s: number | undefined) {
  if (s === 0) return 'status-draft'
  if (s === 1) return 'status-published'
  if (s === 2) return 'status-pending'
  if (s === 3) return 'status-offline'
  return ''
}

function openNewArticle() {
  emit('back')
  router.push({ name: 'publish' })
}

function openEditArticle(item: ArticleListItem) {
  emit('back')
  router.push({ name: 'publish-edit', params: { articleId: item.id } })
}

function openViewArticle(item: ArticleListItem) {
  emit('back')
  router.push({ name: 'post-detail', params: { articleSlug: String(item.id) } })
}

function confirmDelete(item: ArticleListItem) {
  deletingItem.value = { show: true, item }
}

async function handleDelete() {
  const item = deletingItem.value.item
  if (!item) { deletingItem.value.show = false; return }
  try {
    await deleteArticle(item.id)
    toast('文章已删除', 'success')
    loadData()
  } catch (e) {
    if (!isForbiddenError(e)) toast('删除失败，请稍后重试', 'error')
  } finally {
    deletingItem.value.show = false
  }
}

async function toggleTop(item: ArticleListItem) {
  const nextTop = item.isTop === 1 ? 0 : 1
  try {
    await updateArticleField(item.id, { isTop: nextTop })
    item.isTop = nextTop
    toast(nextTop === 1 ? '已置顶' : '已取消置顶', 'success')
  } catch (e) {
    if (!isForbiddenError(e)) toast('操作失败', 'error')
  }
}

function openAudit(item: ArticleListItem, passed: boolean) {
  auditingItem.value = { show: true, item, passed }
}

async function handleAudit() {
  const { item, passed } = auditingItem.value
  if (!item) { auditingItem.value.show = false; return }
  try {
    await auditArticle(item.id, passed)
    toast(passed ? '审核通过' : '已拒绝', 'success')
    loadData()
  } catch (e) {
    if (!isForbiddenError(e)) toast('审核操作失败', 'error')
  } finally {
    auditingItem.value.show = false
  }
}

const publishedCount = computed(() => allItems.value.filter((a) => a.status === 1).length)
const pendingCount = computed(() => allItems.value.filter((a) => a.status === 2).length)
const topCount = computed(() => allItems.value.filter((a) => a.isTop === 1).length)
const totalViews = computed(() => allItems.value.reduce((s, a) => s + (a.viewCount || 0), 0))
</script>

<template>
  <div class="sys-page">
    <div class="sys-hero">
      <div class="sys-hero-bg-wrap">
        <div class="sys-hero-bg">
          <div class="sys-orb sys-orb-1"></div>
          <div class="sys-orb sys-orb-2"></div>
        </div>
        <div class="sys-hero-inner">
          <div class="sys-hero-left">
            <button type="button" class="sys-back-btn" aria-label="返回" @click="emit('back')">
              <ArrowLeft :size="18" />
            </button>
            <div class="sys-hero-icon" style="background:rgba(99,102,241,0.12);border-color:rgba(99,102,241,0.2);color:#818cf8">
              <FileText :size="22" />
            </div>
            <div class="sys-hero-info">
              <h2 class="sys-hero-title">文章管理</h2>
              <p class="sys-hero-sub">统一管理文章内容，支持审核、置顶与批量操作</p>
            </div>
          </div>
          <button type="button" class="sys-btn-new" @click="openNewArticle">
            <Plus :size="14" />
            发布文章
          </button>
        </div>
      </div>
    </div>

    <div class="sys-body">
      <div class="sys-stats-grid">
        <div class="sys-stat-card">
          <div class="sys-stat-icon" style="background:rgba(99,102,241,0.1);color:#6366f1">
            <FileText :size="18" />
          </div>
          <div class="sys-stat-label">总文章数</div>
          <div class="sys-stat-value">{{ totalRecords }}</div>
        </div>
        <div class="sys-stat-card">
          <div class="sys-stat-icon" style="background:rgba(16,185,129,0.1);color:#10b981">
            <CheckCircle :size="18" />
          </div>
          <div class="sys-stat-label">已发布</div>
          <div class="sys-stat-value">{{ publishedCount }}</div>
        </div>
        <div class="sys-stat-card">
          <div class="sys-stat-icon" style="background:rgba(245,158,11,0.1);color:#f59e0b">
            <Clock :size="18" />
          </div>
          <div class="sys-stat-label">待审核</div>
          <div class="sys-stat-value">{{ pendingCount }}</div>
        </div>
        <div class="sys-stat-card">
          <div class="sys-stat-icon" style="background:rgba(239,68,68,0.1);color:#ef4444">
            <Pin :size="18" />
          </div>
          <div class="sys-stat-label">置顶 / 总浏览</div>
          <div class="sys-stat-value">{{ topCount }} / {{ totalViews }}</div>
        </div>
      </div>

      <div class="sys-card">
        <div class="sys-card-header">
          <div class="sys-card-title-row">
            <Layout :size="16" class="sys-card-icon" />
            <h3 class="sys-card-title">文章列表</h3>
          </div>
          <div class="sys-filter-bar">
            <div class="sys-search-wrap">
              <Search :size="13" class="sys-search-icon" />
              <input v-model="searchQuery" class="sys-search-input" type="text" placeholder="搜索标题 / 摘要" />
            </div>
            <select v-model="categoryFilter" class="sys-filter-select">
              <option value="">全部分类</option>
              <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
            <select v-model="statusFilter" class="sys-filter-select">
              <option value="">全部状态</option>
              <option :value="0">草稿</option>
              <option :value="1">已发布</option>
              <option :value="2">待审核</option>
              <option :value="3">已下架</option>
            </select>
            <select v-model="topFilter" class="sys-filter-select">
              <option value="">置顶筛选</option>
              <option :value="1">已置顶</option>
              <option :value="0">未置顶</option>
            </select>
          </div>
        </div>

        <div class="sys-table-head" style="grid-template-columns: 56px minmax(0,2fr) 90px 100px 90px 70px 90px 180px;">
          <span>ID</span>
          <span>文章信息</span>
          <span>分类</span>
          <span>标签</span>
          <span>浏览</span>
          <span>置顶</span>
          <span>状态</span>
          <span style="text-align:right">操作</span>
        </div>

        <div v-if="loading" class="sys-empty">加载中...</div>
        <div v-else-if="!allItems.length" class="sys-empty">暂无文章，点击右上角「发布文章」开始创作</div>

        <div v-for="item in allItems" :key="item.id" class="sys-table-row article-table-row" style="grid-template-columns: 56px minmax(0,2fr) 90px 100px 90px 70px 90px 180px;">
          <span class="sys-row-text">#{{ item.id }}</span>
          <div class="sys-article-info">
            <div v-if="item.coverImg" class="sys-article-cover">
              <img :src="item.coverImg" alt="" />
            </div>
            <div class="sys-article-meta">
              <strong class="sys-article-title">{{ item.title }}</strong>
              <span v-if="item.summary" class="sys-article-summary">{{ item.summary }}</span>
              <span class="sys-article-time">{{ item.createTime }}</span>
            </div>
          </div>
          <span class="sys-row-text">{{ item.categoryName || '-' }}</span>
          <div class="sys-article-tags">
            <span v-for="(t, idx) in (item.tagNames || []).slice(0, 2)" :key="idx" class="sys-mini-tag">
              <TagIcon :size="9" />{{ t }}
            </span>
            <span v-if="(item.tagNames || []).length > 2" class="sys-mini-tag more">+{{ (item.tagNames || []).length - 2 }}</span>
          </div>
          <span class="sys-row-text">{{ item.viewCount || 0 }}</span>
          <button type="button" class="sys-top-btn" :class="{ active: item.isTop === 1 }" @click="toggleTop(item)" :title="item.isTop === 1 ? '取消置顶' : '置顶'">
            <Pin :size="12" />
          </button>
          <span class="sys-row-status article-status" :class="statusClass(item.status)">
            {{ statusLabel(item.status) }}
          </span>
          <div class="sys-row-actions" style="justify-content:flex-end">
            <button type="button" class="sys-action-btn sub" @click="openViewArticle(item)">
              <Eye :size="11" /> 查看
            </button>
            <button v-if="item.status === 2" type="button" class="sys-action-btn edit" @click="openAudit(item, true)">
              <CheckCircle :size="11" /> 通过
            </button>
            <button v-if="item.status === 2" type="button" class="sys-action-btn danger" @click="openAudit(item, false)">
              <XCircle :size="11" /> 拒绝
            </button>
            <button type="button" class="sys-action-btn edit" @click="openEditArticle(item)">
              <Pencil :size="11" /> 编辑
            </button>
            <button type="button" class="sys-action-btn danger" @click="confirmDelete(item)">
              <Trash2 :size="11" />
            </button>
          </div>
        </div>

        <div v-if="totalPages > 1" class="sys-pagination">
          <button type="button" class="sys-page-btn" :disabled="currentPage === 1" @click="goToPage(currentPage - 1)">
            <ChevronLeft :size="14" />
          </button>
          <template v-for="(p, idx) in visiblePages" :key="idx">
            <span v-if="p === 'ellipsis'" class="sys-page-ellipsis">...</span>
            <button
              v-else
              type="button"
              class="sys-page-btn"
              :class="{ active: p === currentPage }"
              @click="goToPage(p)"
            >{{ p }}</button>
          </template>
          <button type="button" class="sys-page-btn" :disabled="currentPage === totalPages" @click="goToPage(currentPage + 1)">
            <ChevronRight :size="14" />
          </button>
          <span class="sys-page-info">共 {{ totalRecords }} 条</span>
        </div>
      </div>
    </div>

    <AppConfirmDialog
      :show="deletingItem.show"
      title="确认删除"
      :message="'确认删除文章《' + (deletingItem.item?.title || '') + '》？此操作不可恢复。'"
      confirm-text="删除"
      cancel-text="取消"
      tone="danger"
      @confirm="handleDelete"
      @cancel="deletingItem.show = false"
    />
    <AppConfirmDialog
      :show="auditingItem.show"
      :title="auditingItem.passed ? '审核通过' : '审核拒绝'"
      :message="auditingItem.passed
        ? `确认通过文章《${auditingItem.item?.title || ''}》的审核？`
        : `确认拒绝文章《${auditingItem.item?.title || ''}》？作者会收到通知。`"
      :confirm-text="auditingItem.passed ? '确认通过' : '确认拒绝'"
      cancel-text="取消"
      :tone="auditingItem.passed ? 'primary' : 'danger'"
      @confirm="handleAudit"
      @cancel="auditingItem.show = false"
    />
  </div>
</template>

<style scoped>
@import '../system-shared.css';

.article-table-row {
  align-items: center;
}
.sys-article-info {
  display: flex;
  gap: 0.65rem;
  align-items: center;
  min-width: 0;
}
.sys-article-cover {
  width: 3.25rem;
  height: 3.25rem;
  border-radius: 0.65rem;
  overflow: hidden;
  flex-shrink: 0;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
}
.sys-article-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.sys-article-meta {
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
  min-width: 0;
  flex: 1;
}
.sys-article-title {
  font-size: 0.82rem;
  color: #0f172a;
  font-weight: 750;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sys-article-summary {
  font-size: 0.7rem;
  color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
}
.sys-article-time {
  font-size: 0.65rem;
  color: #cbd5e1;
  font-weight: 500;
}
.sys-article-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem;
}
.sys-mini-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  padding: 0.12rem 0.4rem;
  background: rgba(99,102,241,0.08);
  color: #6366f1;
  border-radius: 999px;
  font-size: 0.62rem;
  font-weight: 600;
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.sys-mini-tag.more {
  background: #f1f5f9;
  color: #64748b;
}
.sys-top-btn {
  width: 1.8rem;
  height: 1.8rem;
  display: grid;
  place-items: center;
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
  background: white;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.15s;
}
.sys-top-btn:hover {
  border-color: #f59e0b;
  color: #f59e0b;
}
.sys-top-btn.active {
  background: rgba(245,158,11,0.1);
  border-color: #f59e0b;
  color: #f59e0b;
}
.article-status.status-draft { background: rgba(148,163,184,0.1); color: #64748b; }
.article-status.status-published { background: rgba(16,185,129,0.1); color: #10b981; }
.article-status.status-pending { background: rgba(245,158,11,0.1); color: #f59e0b; }
.article-status.status-offline { background: rgba(248,113,113,0.1); color: #f87171; }

.sys-action-btn.sub { background: rgba(148,163,184,0.08); color: #64748b; }
.sys-action-btn.sub:hover { background: rgba(148,163,184,0.15); }

@media (max-width: 960px) {
  .sys-table-head, .sys-table-row {
    grid-template-columns: 1fr !important;
  }
  .sys-table-head { display: none; }
}
</style>