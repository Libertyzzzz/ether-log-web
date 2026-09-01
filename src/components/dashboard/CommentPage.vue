<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  MessageSquare, Search, Trash2, ChevronLeft, ChevronRight,
  ArrowLeft, User, CheckCircle, XCircle, Clock,
  FileText, ThumbsUp, Reply
} from 'lucide-vue-next'
import {
  fetchCommentsPage,
  batchReviewComments,
  batchDeleteComments,
  isForbiddenError,
} from '../../api'
import type { BackendCommentVO } from '../../types/blog'
import { toast } from '../../utils/toast'
import AppConfirmDialog from '../AppConfirmDialog.vue'

const emit = defineEmits<{
  back: []
}>()

const loading = ref(false)
const allItems = ref<BackendCommentVO[]>([])
const totalRecords = ref(0)
const currentPage = ref(1)
const pageSize = 10
const searchQuery = ref('')
const statusFilter = ref<number | ''>('')

const selectedIds = ref<Set<number>>(new Set())
const showBatchBar = computed(() => selectedIds.value.size > 0)

const deletingItem = ref<{ show: boolean; item: BackendCommentVO | null }>({ show: false, item: null })
const batchAction = ref<{ show: boolean; type: 'approve' | 'reject' | 'delete' }>({ show: false, type: 'approve' })

let searchTimer: ReturnType<typeof setTimeout> | null = null

async function loadData() {
  loading.value = true
  const params: any = {
    pageNum: currentPage.value,
    pageSize,
  }
  const keyword = searchQuery.value.trim()
  if (keyword) params.keyword = keyword
  if (statusFilter.value !== '') params.status = Number(statusFilter.value)
  try {
    const result = await fetchCommentsPage(params)
    allItems.value = result.records
    totalRecords.value = result.total
    selectedIds.value.clear()
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

watch(statusFilter, () => {
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
  loadData()
})

function toggleSelect(id: number) {
  if (selectedIds.value.has(id)) {
    selectedIds.value.delete(id)
  } else {
    selectedIds.value.add(id)
  }
  selectedIds.value = new Set(selectedIds.value)
}

function toggleSelectAll() {
  if (selectedIds.value.size === allItems.value.length) {
    selectedIds.value.clear()
  } else {
    selectedIds.value = new Set(allItems.value.map((c) => c.id))
  }
}

function statusLabel(s: number | undefined) {
  if (s === 0) return '待审核'
  if (s === 1) return '已通过'
  if (s === 2) return '已拒绝'
  return '未知'
}

function statusClass(s: number | undefined) {
  if (s === 0) return 'status-pending'
  if (s === 1) return 'status-approved'
  if (s === 2) return 'status-rejected'
  return ''
}

function confirmDelete(item: BackendCommentVO) {
  deletingItem.value = { show: true, item }
}

async function handleDelete() {
  const item = deletingItem.value.item
  if (!item) { deletingItem.value.show = false; return }
  try {
    await batchDeleteComments([item.id])
    toast('评论已删除', 'success')
    loadData()
  } catch (e) {
    if (!isForbiddenError(e)) toast('删除失败，请稍后重试', 'error')
  } finally {
    deletingItem.value.show = false
  }
}

function openBatch(type: 'approve' | 'reject' | 'delete') {
  batchAction.value = { show: true, type }
}

async function handleBatchAction() {
  const ids = Array.from(selectedIds.value)
  const type = batchAction.value.type
  batchAction.value.show = false
  if (!ids.length) return
  try {
    if (type === 'approve') {
      await batchReviewComments(ids, 1)
      toast(`已通过 ${ids.length} 条评论`, 'success')
    } else if (type === 'reject') {
      await batchReviewComments(ids, 2)
      toast(`已拒绝 ${ids.length} 条评论`, 'success')
    } else if (type === 'delete') {
      await batchDeleteComments(ids)
      toast(`已删除 ${ids.length} 条评论`, 'success')
    }
    loadData()
  } catch (e) {
    if (!isForbiddenError(e)) toast('批量操作失败', 'error')
  }
}

const pendingCount = computed(() => allItems.value.filter((c) => c.status === 0).length)
const approvedCount = computed(() => allItems.value.filter((c) => c.status === 1).length)
const totalLikes = computed(() => allItems.value.reduce((s, c) => s + (c.likeCount || 0), 0))
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
            <div class="sys-hero-icon" style="background:rgba(14,165,233,0.12);border-color:rgba(14,165,233,0.2);color:#38bdf8">
              <MessageSquare :size="22" />
            </div>
            <div class="sys-hero-info">
              <h2 class="sys-hero-title">评论管理</h2>
              <p class="sys-hero-sub">审核与管理用户评论，过滤敏感内容</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="sys-body">
      <div class="sys-stats-grid">
        <div class="sys-stat-card">
          <div class="sys-stat-icon" style="background:rgba(14,165,233,0.1);color:#0ea5e9">
            <MessageSquare :size="18" />
          </div>
          <div class="sys-stat-label">评论总数</div>
          <div class="sys-stat-value">{{ totalRecords }}</div>
        </div>
        <div class="sys-stat-card">
          <div class="sys-stat-icon" style="background:rgba(245,158,11,0.1);color:#f59e0b">
            <Clock :size="18" />
          </div>
          <div class="sys-stat-label">待审核</div>
          <div class="sys-stat-value">{{ pendingCount }}</div>
        </div>
        <div class="sys-stat-card">
          <div class="sys-stat-icon" style="background:rgba(16,185,129,0.1);color:#10b981">
            <CheckCircle :size="18" />
          </div>
          <div class="sys-stat-label">已通过</div>
          <div class="sys-stat-value">{{ approvedCount }}</div>
        </div>
        <div class="sys-stat-card">
          <div class="sys-stat-icon" style="background:rgba(244,114,182,0.1);color:#f472b6">
            <ThumbsUp :size="18" />
          </div>
          <div class="sys-stat-label">总点赞</div>
          <div class="sys-stat-value">{{ totalLikes }}</div>
        </div>
      </div>

      <div class="sys-card">
        <div class="sys-card-header">
          <div class="sys-card-title-row">
            <MessageSquare :size="16" class="sys-card-icon" />
            <h3 class="sys-card-title">评论列表</h3>
          </div>
          <div class="sys-filter-bar">
            <div class="sys-search-wrap">
              <Search :size="13" class="sys-search-icon" />
              <input v-model="searchQuery" class="sys-search-input" type="text" placeholder="搜索内容 / 昵称" />
            </div>
            <select v-model="statusFilter" class="sys-filter-select">
              <option value="">全部状态</option>
              <option :value="0">待审核</option>
              <option :value="1">已通过</option>
              <option :value="2">已拒绝</option>
            </select>
          </div>
        </div>

        <Transition name="bar-slide">
          <div v-if="showBatchBar" class="batch-action-bar">
            <label class="batch-select">
              <input type="checkbox" :checked="selectedIds.size === allItems.length && allItems.length > 0" @change="toggleSelectAll" />
              <span>已选 {{ selectedIds.size }} 项</span>
            </label>
            <div class="batch-actions">
              <button type="button" class="batch-btn approve" @click="openBatch('approve')">
                <CheckCircle :size="12" /> 批量通过
              </button>
              <button type="button" class="batch-btn reject" @click="openBatch('reject')">
                <XCircle :size="12" /> 批量拒绝
              </button>
              <button type="button" class="batch-btn delete" @click="openBatch('delete')">
                <Trash2 :size="12" /> 批量删除
              </button>
              <button type="button" class="batch-btn cancel" @click="selectedIds.clear()">取消选择</button>
            </div>
          </div>
        </Transition>

        <div class="sys-table-head comment-table-head" style="grid-template-columns: 40px 130px minmax(0,2fr) 110px 80px 90px 140px;">
          <span><input type="checkbox" :checked="allItems.length > 0 && selectedIds.size === allItems.length" @change="toggleSelectAll" /></span>
          <span>评论者</span>
          <span>评论内容</span>
          <span>所属文章</span>
          <span>点赞</span>
          <span>状态</span>
          <span style="text-align:right">操作</span>
        </div>

        <div v-if="loading" class="sys-empty">加载中...</div>
        <div v-else-if="!allItems.length" class="sys-empty">暂无评论记录</div>

        <div v-for="item in allItems" :key="item.id" class="sys-table-row comment-table-row" style="grid-template-columns: 40px 130px minmax(0,2fr) 110px 80px 90px 140px;">
          <span><input type="checkbox" :checked="selectedIds.has(item.id)" @change="toggleSelect(item.id)" /></span>
          <div class="sys-comment-user">
            <div v-if="item.avatarUrl" class="sys-comment-avatar">
              <img :src="item.avatarUrl" alt="" />
            </div>
            <div v-else class="sys-comment-avatar placeholder">
              <User :size="14" />
            </div>
            <div class="sys-comment-user-meta">
              <strong class="sys-comment-nick">{{ item.nickname || '匿名用户' }}</strong>
              <span v-if="item.createTime" class="sys-comment-time">{{ item.createTime.split(' ')[0] }}</span>
            </div>
          </div>
          <div class="sys-comment-body">
            <p class="sys-comment-content">{{ item.content }}</p>
            <div v-if="item.parentComment" class="sys-comment-reply">
              <Reply :size="10" />
              <span class="sys-reply-to">{{ item.parentComment.nickname || '匿名' }}：</span>
              <span>{{ item.parentComment.content }}</span>
            </div>
          </div>
          <span class="sys-row-text sys-comment-article" :title="item.articleTitle ?? undefined">
            <FileText :size="11" />
            {{ item.articleTitle ? (item.articleTitle.length > 8 ? item.articleTitle.slice(0, 8) + '...' : item.articleTitle) : '-' }}
          </span>
          <span class="sys-row-text">
            <ThumbsUp :size="11" class="mini-icon" />
            {{ item.likeCount || 0 }}
          </span>
          <span class="sys-row-status comment-status" :class="statusClass(item.status)">
            {{ statusLabel(item.status) }}
          </span>
          <div class="sys-row-actions" style="justify-content:flex-end">
            <button v-if="item.status === 0" type="button" class="sys-action-btn edit" @click="() => { selectedIds = new Set([item.id]); openBatch('approve') }">
              <CheckCircle :size="11" /> 通过
            </button>
            <button v-if="item.status === 0" type="button" class="sys-action-btn danger" @click="() => { selectedIds = new Set([item.id]); openBatch('reject') }">
              <XCircle :size="11" /> 拒绝
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
      :message="'确认删除该评论？该操作不可恢复。'"
      confirm-text="删除"
      cancel-text="取消"
      tone="danger"
      @confirm="handleDelete"
      @cancel="deletingItem.show = false"
    />
    <AppConfirmDialog
      :show="batchAction.show"
      :title="batchAction.type === 'approve' ? '批量通过' : batchAction.type === 'reject' ? '批量拒绝' : '批量删除'"
      :message="batchAction.type === 'approve'
        ? `确认通过选中的 ${selectedIds.size} 条评论？通过后将在前端展示。`
        : batchAction.type === 'reject'
        ? `确认拒绝选中的 ${selectedIds.size} 条评论？拒绝后前端不可见。`
        : `确认删除选中的 ${selectedIds.size} 条评论？此操作不可恢复。`"
      :confirm-text="batchAction.type === 'approve' ? '确认通过' : batchAction.type === 'reject' ? '确认拒绝' : '确认删除'"
      cancel-text="取消"
      :tone="batchAction.type === 'approve' ? 'default' : 'danger'"
      @confirm="handleBatchAction"
      @cancel="batchAction.show = false"
    />
  </div>
</template>

<style scoped>
@import '../system-shared.css';

.comment-table-head, .comment-table-row {
  align-items: flex-start;
  padding-top: 0.65rem;
  padding-bottom: 0.65rem;
}
.comment-table-head {
  align-items: center;
  padding-top: 0.6rem;
  padding-bottom: 0.6rem;
}
.sys-comment-user {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}
.sys-comment-avatar {
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 999px;
  overflow: hidden;
  flex-shrink: 0;
  border: 2px solid #f1f5f9;
}
.sys-comment-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.sys-comment-avatar.placeholder {
  background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
  display: grid;
  place-items: center;
  color: white;
}
.sys-comment-user-meta {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}
.sys-comment-nick {
  font-size: 0.8rem;
  color: #0f172a;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sys-comment-time {
  font-size: 0.65rem;
  color: #cbd5e1;
  font-weight: 500;
}
.sys-comment-body {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  min-width: 0;
}
.sys-comment-content {
  margin: 0;
  font-size: 0.8rem;
  color: #334155;
  line-height: 1.55;
  word-break: break-word;
  font-weight: 500;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.sys-comment-reply {
  display: flex;
  align-items: flex-start;
  gap: 0.25rem;
  padding: 0.4rem 0.55rem;
  background: #f8fafc;
  border-radius: 0.45rem;
  border-left: 2px solid #e2e8f0;
  font-size: 0.72rem;
  color: #64748b;
  line-height: 1.45;
  font-weight: 500;
}
.sys-comment-reply svg { color: #94a3b8; flex-shrink: 0; margin-top: 0.1rem; }
.sys-reply-to {
  color: #6366f1;
  font-weight: 700;
  flex-shrink: 0;
}
.sys-comment-article {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.76rem;
  color: #475569;
  font-weight: 600;
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.sys-comment-article .mini-icon { color: #94a3b8; }
.mini-icon { vertical-align: -1px; }

.comment-status.status-pending { background: rgba(245,158,11,0.1); color: #f59e0b; }
.comment-status.status-approved { background: rgba(16,185,129,0.1); color: #10b981; }
.comment-status.status-rejected { background: rgba(248,113,113,0.1); color: #f87171; }

.batch-action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.6rem 1rem;
  margin: 0 -0.25rem 0.5rem;
  background: linear-gradient(90deg, rgba(99,102,241,0.06), rgba(59,130,246,0.06));
  border: 1px solid rgba(99,102,241,0.18);
  border-radius: 0.75rem;
}
.batch-select {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.78rem;
  color: #475569;
  font-weight: 700;
}
.batch-select input {
  width: 0.9rem;
  height: 0.9rem;
  accent-color: #4f46e5;
}
.batch-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}
.batch-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.35rem 0.75rem;
  border-radius: 0.5rem;
  border: none;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
}
.batch-btn.approve {
  background: rgba(16,185,129,0.12);
  color: #10b981;
}
.batch-btn.approve:hover { background: rgba(16,185,129,0.2); }
.batch-btn.reject {
  background: rgba(245,158,11,0.12);
  color: #f59e0b;
}
.batch-btn.reject:hover { background: rgba(245,158,11,0.2); }
.batch-btn.delete {
  background: rgba(248,113,113,0.12);
  color: #ef4444;
}
.batch-btn.delete:hover { background: rgba(248,113,113,0.2); }
.batch-btn.cancel {
  background: #f1f5f9;
  color: #64748b;
}
.batch-btn.cancel:hover { background: #e2e8f0; }

.bar-slide-enter-active,
.bar-slide-leave-active {
  transition: all 0.22s ease;
}
.bar-slide-enter-from,
.bar-slide-leave-to {
  opacity: 0;
  transform: translateY(-4px);
  margin-bottom: -2.2rem;
}

@media (max-width: 960px) {
  .comment-table-head, .comment-table-row {
    grid-template-columns: 1fr !important;
  }
  .comment-table-head { display: none; }
  .batch-action-bar { flex-direction: column; align-items: flex-start; }
}
</style>