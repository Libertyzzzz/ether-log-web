<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  ArrowLeft,
  Sparkles,
  RefreshCw,
  Search,
  BookOpen,
  Layers,
  Database,
  Trash2,
  AlertCircle,
  Loader2,
  Clock,
  FileText,
  CheckCircle2,
  MinusCircle,
  Zap
} from 'lucide-vue-next'
import {
  fetchAdminArticles,
  fetchKnowledgeStats,
  indexArticleKnowledge,
  indexAllArticlesKnowledge,
  removeArticleFromKnowledge,
  refreshKnowledgeCache
} from '../../api'
import type { ArticleListItem } from '../../types/blog'
import { toast } from '../../utils/toast'
import '../system-shared.css'

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '-'
  return dateStr.replace('T', ' ').slice(0, 16)
}

const emit = defineEmits<{
  back: []
}>()

// 状态定义
const articles = ref<ArticleListItem[]>([])
const isLoadingArticles = ref(false)
const searchKeyword = ref('')
const totalArticles = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)

// 知识库切片统计与映射
const chunkCounts = ref<Record<string, number>>({})
const totalChunks = ref(0)
const indexedArticleCount = ref(0)
const sliceFilter = ref<'all' | 'indexed' | 'unindexed'>('all')

// 全局操作 loading
const isIndexingAll = ref(false)
const isRefreshingCache = ref(false)
const indexingArticleId = ref<number | null>(null)
const removingArticleId = ref<number | null>(null)

// 确认弹窗
const showConfirmModal = ref(false)
const confirmAction = ref<(() => Promise<void>) | null>(null)
const confirmTitle = ref('')
const confirmMessage = ref('')

function getArticleChunkCount(articleId: number): number {
  return chunkCounts.value[String(articleId)] || 0
}

function isArticleIndexed(articleId: number): boolean {
  return getArticleChunkCount(articleId) > 0
}

const indexedCount = computed(() => articles.value.filter((a) => isArticleIndexed(a.id)).length)
const unindexedCount = computed(() => articles.value.length - indexedCount.value)

async function loadArticles() {
  isLoadingArticles.value = true
  try {
    const res = await fetchAdminArticles()
    articles.value = res.articles || []
    totalArticles.value = res.total || articles.value.length
  } catch (error: any) {
    toast(error.message || '获取文章列表失败', 'error')
  } finally {
    isLoadingArticles.value = false
  }
}

async function loadStats() {
  try {
    const res = await fetchKnowledgeStats()
    chunkCounts.value = res.chunkCounts || {}
    totalChunks.value = res.totalChunks || 0
    indexedArticleCount.value = res.indexedArticleCount || 0
  } catch (error: any) {
    console.error('获取知识库统计失败', error)
  }
}

const filteredArticles = computed(() => {
  let list = articles.value
  if (sliceFilter.value === 'indexed') {
    list = list.filter((a) => isArticleIndexed(a.id))
  } else if (sliceFilter.value === 'unindexed') {
    list = list.filter((a) => !isArticleIndexed(a.id))
  }
  if (!searchKeyword.value.trim()) return list
  const kw = searchKeyword.value.trim().toLowerCase()
  return list.filter(
    (a) => a.title.toLowerCase().includes(kw) || (a.categoryName && a.categoryName.toLowerCase().includes(kw))
  )
})

const paginatedArticles = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredArticles.value.slice(start, start + pageSize.value)
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredArticles.value.length / pageSize.value)))

// 1. 全量重新索引（一键全量切片）
function handleIndexAllClick() {
  confirmTitle.value = '全量构建知识库切片索引'
  confirmMessage.value = '系统将遍历所有已发布文章进行智能切片、调用大模型 Embedding API 生成向量索引并入库。此过程将重构知识检索底库，确认开始执行？'
  confirmAction.value = async () => {
    isIndexingAll.value = true
    try {
      await indexAllArticlesKnowledge()
      toast('全量知识库索引重建已完成！', 'success')
      await Promise.all([loadArticles(), loadStats()])
    } catch (e: any) {
      toast(e.response?.data?.message || e.message || '全量重建失败', 'error')
    } finally {
      isIndexingAll.value = false
    }
  }
  showConfirmModal.value = true
}

// 2. 刷新内存检索缓存
async function handleRefreshCache() {
  isRefreshingCache.value = true
  try {
    await refreshKnowledgeCache()
    toast('向量知识库内存检索缓存已刷新', 'success')
    await loadStats()
  } catch (e: any) {
    toast(e.response?.data?.message || e.message || '刷新缓存失败', 'error')
  } finally {
    isRefreshingCache.value = false
  }
}

// 3. 单篇切片向量化
async function handleIndexSingle(article: ArticleListItem) {
  indexingArticleId.value = article.id
  try {
    await indexArticleKnowledge(article.id)
    toast(`文章《${article.title}》已成功切块并生成向量索引！`, 'success')
    await loadStats()
  } catch (e: any) {
    toast(e.response?.data?.message || e.message || '切块向量化失败', 'error')
  } finally {
    indexingArticleId.value = null
  }
}

// 4. 从知识库移除
function handleRemoveSingle(article: ArticleListItem) {
  confirmTitle.value = '从知识库中移除文章'
  confirmMessage.value = `确认将文章《${article.title}》对应的所有向量切片从知识库中清除？清除后 AI 将无法检索到该文章内容。`
  confirmAction.value = async () => {
    removingArticleId.value = article.id
    try {
      await removeArticleFromKnowledge(article.id)
      toast(`文章《${article.title}》已从向量知识库中移除`, 'info')
      await loadStats()
    } catch (e: any) {
      toast(e.response?.data?.message || e.message || '移除向量失败', 'error')
    } finally {
      removingArticleId.value = null
    }
  }
  showConfirmModal.value = true
}

async function executeConfirm() {
  showConfirmModal.value = false
  if (confirmAction.value) {
    await confirmAction.value()
    confirmAction.value = null
  }
}

onMounted(() => {
  loadArticles()
  loadStats()
})
</script>

<template>
  <div class="sys-page">
    <!-- Hero Banner -->
    <div class="sys-hero">
      <div class="sys-hero-bg-wrap">
        <div class="sys-hero-bg" aria-hidden="true">
          <div class="sys-orb sys-orb-1"></div>
          <div class="sys-orb sys-orb-2"></div>
        </div>
        <div class="sys-hero-inner">
          <div class="sys-hero-left">
            <button class="sys-back-btn" title="返回" type="button" @click="$emit('back')">
              <ArrowLeft :size="18" />
            </button>
            <div>
              <div class="sys-hero-title-row">
                <h1 class="sys-hero-title">RAG 向量知识库</h1>
                <span class="sys-badge">AI Assistant</span>
              </div>
              <p class="sys-hero-subtitle">管理全站文章分块切片、Embedding 向量索引与热检索内存缓存</p>
            </div>
          </div>
          <div class="sys-hero-right">
            <button
              class="sys-btn sys-btn-primary"
              :disabled="isIndexingAll"
              type="button"
              @click="handleIndexAllClick"
            >
              <Loader2 v-if="isIndexingAll" :size="15" class="animate-spin" />
              <Sparkles v-else :size="15" />
              <span>{{ isIndexingAll ? '正在全量构建中...' : '全量重建索引' }}</span>
            </button>
            <button
              class="sys-btn sys-btn-secondary"
              :disabled="isRefreshingCache"
              type="button"
              @click="handleRefreshCache"
            >
              <Loader2 v-if="isRefreshingCache" :size="15" class="animate-spin" />
              <RefreshCw v-else :size="15" />
              <span>{{ isRefreshingCache ? '刷新中...' : '刷新向量缓存' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 主体区域 -->
    <div class="sys-body">
      <!-- 快捷状态卡片 -->
      <div class="kb-metrics-grid">
        <div class="kb-metric-card">
          <div class="kb-metric-icon bg-indigo">
            <BookOpen :size="20" />
          </div>
          <div class="kb-metric-info">
            <span class="kb-metric-label">文章库收录</span>
            <span class="kb-metric-val">{{ totalArticles }} <small>篇</small></span>
          </div>
        </div>
        <div class="kb-metric-card">
          <div class="kb-metric-icon bg-emerald">
            <CheckCircle2 :size="20" />
          </div>
          <div class="kb-metric-info">
            <span class="kb-metric-label">已切片入库</span>
            <span class="kb-metric-val">{{ indexedArticleCount }} / {{ totalArticles }} <small>篇</small></span>
          </div>
        </div>
        <div class="kb-metric-card">
          <div class="kb-metric-icon bg-blue">
            <Layers :size="20" />
          </div>
          <div class="kb-metric-info">
            <span class="kb-metric-label">知识向量分片</span>
            <span class="kb-metric-val">{{ totalChunks }} <small>块</small></span>
          </div>
        </div>
        <div class="kb-metric-card">
          <div class="kb-metric-icon bg-purple">
            <Database :size="20" />
          </div>
          <div class="kb-metric-info">
            <span class="kb-metric-label">Embedding 模型</span>
            <span class="kb-metric-val">Text-Embedding-v3</span>
          </div>
        </div>
      </div>

      <!-- 数据表格卡片 -->
      <div class="kb-table-card">
        <div class="kb-table-header">
          <div class="kb-header-left">
            <div class="kb-title-badge">
              <FileText :size="17" class="kb-title-icon" />
              <h2 class="kb-title-text">文章索引管理</h2>
            </div>
            <!-- 切片状态快捷筛选 Tab -->
            <div class="kb-filter-tabs">
              <button
                class="kb-filter-tab"
                :class="{ active: sliceFilter === 'all' }"
                type="button"
                @click="sliceFilter = 'all'"
              >
                全部 <span class="tab-count">{{ articles.length }}</span>
              </button>
              <button
                class="kb-filter-tab"
                :class="{ active: sliceFilter === 'indexed' }"
                type="button"
                @click="sliceFilter = 'indexed'"
              >
                已切片 <span class="tab-count">{{ indexedCount }}</span>
              </button>
              <button
                class="kb-filter-tab"
                :class="{ active: sliceFilter === 'unindexed' }"
                type="button"
                @click="sliceFilter = 'unindexed'"
              >
                未切片 <span class="tab-count">{{ unindexedCount }}</span>
              </button>
            </div>
          </div>

          <div class="kb-header-right">
            <!-- ⚡ 一键全量切片 按钮 -->
            <button
              class="kb-header-btn kb-header-btn-primary"
              :disabled="isIndexingAll"
              type="button"
              title="自动遍历所有已发布文章切块向量化入库"
              @click="handleIndexAllClick"
            >
              <Loader2 v-if="isIndexingAll" :size="14" class="animate-spin" />
              <Zap v-else :size="14" />
              <span>{{ isIndexingAll ? '全量切片中...' : '一键全量切片' }}</span>
            </button>

            <!-- 🔄 刷新向量缓存 按钮 -->
            <button
              class="kb-header-btn kb-header-btn-secondary"
              :disabled="isRefreshingCache"
              type="button"
              title="重新加载内存检索向量缓存"
              @click="handleRefreshCache"
            >
              <Loader2 v-if="isRefreshingCache" :size="14" class="animate-spin" />
              <RefreshCw v-else :size="14" />
              <span>{{ isRefreshingCache ? '刷新中...' : '刷新缓存' }}</span>
            </button>

            <div class="kb-search-box">
              <Search :size="14" class="kb-search-icon" />
              <input
                v-model="searchKeyword"
                type="text"
                class="kb-search-input"
                placeholder="搜索标题或分类..."
              />
              <button
                v-if="searchKeyword"
                class="kb-search-clear"
                type="button"
                title="清空搜索"
                @click="searchKeyword = ''"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        <div class="kb-table-container">
          <table class="kb-table">
            <thead>
              <tr>
                <th class="col-id">ID</th>
                <th class="col-title">文章标题</th>
                <th class="col-category">所属分类</th>
                <th class="col-time">发布时间</th>
                <th class="col-status">发布状态</th>
                <th class="col-slice">切片状态</th>
                <th class="col-actions">知识库操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="isLoadingArticles">
                <td colspan="7" class="kb-empty-cell">
                  <div class="kb-state-box">
                    <Loader2 :size="24" class="animate-spin kb-spin-icon" />
                    <span>正在读取文章索引数据...</span>
                  </div>
                </td>
              </tr>
              <tr v-else-if="paginatedArticles.length === 0">
                <td colspan="7" class="kb-empty-cell">
                  <div class="kb-state-box">
                    <AlertCircle :size="24" class="kb-empty-icon" />
                    <span>没有找到匹配的文章</span>
                  </div>
                </td>
              </tr>
              <tr v-for="article in paginatedArticles" :key="article.id" class="kb-row">
                <td class="col-id">
                  <span class="kb-id-tag">#{{ article.id }}</span>
                </td>
                <td class="col-title">
                  <div class="kb-title-cell">
                    <span class="kb-title-name" :title="article.title">{{ article.title }}</span>
                  </div>
                </td>
                <td class="col-category">
                  <span
                    class="kb-category-tag"
                    :class="{ 'is-empty': !article.categoryName }"
                  >
                    {{ article.categoryName || '未分类' }}
                  </span>
                </td>
                <td class="col-time">
                  <span class="kb-time-text">
                    <Clock :size="12" class="kb-time-icon" />
                    {{ formatDate(article.createTime) }}
                  </span>
                </td>
                <td class="col-status">
                  <span
                    class="kb-status-pill"
                    :class="article.status === 0 ? 'is-draft' : 'is-published'"
                  >
                    <span class="kb-status-dot"></span>
                    {{ article.status === 0 ? '草稿' : '已发布' }}
                  </span>
                </td>
                <td class="col-slice">
                  <span v-if="indexingArticleId === article.id" class="kb-slice-tag is-indexing">
                    <Loader2 :size="12" class="animate-spin" />
                    切片中...
                  </span>
                  <span v-else-if="getArticleChunkCount(article.id) > 0" class="kb-slice-tag is-indexed">
                    <CheckCircle2 :size="12" />
                    已切片 ({{ getArticleChunkCount(article.id) }} 块)
                  </span>
                  <span v-else class="kb-slice-tag is-unindexed">
                    <MinusCircle :size="12" />
                    未切片
                  </span>
                </td>
                <td class="col-actions">
                  <div class="kb-actions-group">
                    <button
                      class="kb-btn-action kb-btn-index"
                      title="手动重新切片并向量化入库"
                      type="button"
                      :disabled="indexingArticleId === article.id"
                      @click="handleIndexSingle(article)"
                    >
                      <Loader2 v-if="indexingArticleId === article.id" :size="13" class="animate-spin" />
                      <Sparkles v-else :size="13" />
                      <span>{{ indexingArticleId === article.id ? '切片中...' : '切片向量化' }}</span>
                    </button>
                    <button
                      class="kb-btn-action kb-btn-remove"
                      :class="{ 'is-disabled': getArticleChunkCount(article.id) === 0 }"
                      title="从知识库清除该文章向量"
                      type="button"
                      :disabled="removingArticleId === article.id || getArticleChunkCount(article.id) === 0"
                      @click="handleRemoveSingle(article)"
                    >
                      <Loader2 v-if="removingArticleId === article.id" :size="13" class="animate-spin" />
                      <Trash2 v-else :size="13" />
                      <span>移除</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 底部元信息与分页 -->
        <div class="kb-table-footer">
          <div class="kb-footer-meta">
            共 <strong>{{ filteredArticles.length }}</strong> 篇文章
            <span v-if="sliceFilter !== 'all'"> (当前筛选视图)</span>
          </div>
          <div v-if="totalPages > 1" class="kb-pagination">
            <button
              class="kb-page-btn"
              :disabled="currentPage === 1"
              type="button"
              @click="currentPage--"
            >
              上一页
            </button>
            <span class="kb-page-indicator">{{ currentPage }} / {{ totalPages }}</span>
            <button
              class="kb-page-btn"
              :disabled="currentPage === totalPages"
              type="button"
              @click="currentPage++"
            >
              下一页
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 二次确认弹窗 -->
    <Transition name="fade">
      <div v-if="showConfirmModal" class="kb-modal-backdrop" @click.self="showConfirmModal = false">
        <div class="kb-modal-card">
          <div class="kb-modal-icon">
            <AlertCircle :size="24" />
          </div>
          <h3 class="kb-modal-title">{{ confirmTitle }}</h3>
          <p class="kb-modal-desc">{{ confirmMessage }}</p>
          <div class="kb-modal-actions">
            <button class="sys-btn sys-btn-secondary" type="button" @click="showConfirmModal = false">
              取消
            </button>
            <button class="sys-btn sys-btn-primary" type="button" @click="executeConfirm">
              确认执行
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.sys-hero-title-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.sys-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.65rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  background: rgba(99, 102, 241, 0.24);
  color: #e0e7ff;
  border: 1px solid rgba(165, 180, 252, 0.35);
}

.sys-hero-subtitle {
  margin: 0.35rem 0 0;
  font-size: 0.86rem;
  color: rgba(226, 232, 240, 0.82);
  line-height: 1.5;
}

.sys-hero-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.sys-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 2.35rem;
  padding: 0.45rem 1rem;
  border-radius: 0.65rem;
  font-size: 0.84rem;
  font-weight: 650;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.15s ease;
  white-space: nowrap;
}

.sys-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.sys-btn-primary {
  background: #6366f1;
  color: #ffffff;
  box-shadow: 0 2px 10px rgba(99, 102, 241, 0.3);
}

.sys-btn-primary:hover:not(:disabled) {
  background: #4f46e5;
  transform: translateY(-1px);
}

.sys-hero-right .sys-btn-secondary {
  background: rgba(255, 255, 255, 0.12);
  color: #f8fafc;
  border-color: rgba(255, 255, 255, 0.22);
}

.sys-hero-right .sys-btn-secondary:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.35);
}

.kb-modal-actions .sys-btn-secondary {
  background: #f1f5f9;
  color: #334155;
  border-color: #e2e8f0;
}

.kb-modal-actions .sys-btn-secondary:hover:not(:disabled) {
  background: #e2e8f0;
}

.kb-metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

@media (max-width: 1024px) {
  .kb-metrics-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .kb-metrics-grid {
    grid-template-columns: 1fr;
  }
}

.kb-metric-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 1rem;
  padding: 1.25rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.kb-metric-icon {
  width: 44px;
  height: 44px;
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}
.kb-metric-icon.bg-indigo { background: linear-gradient(135deg, #6366f1, #4f46e5); }
.kb-metric-icon.bg-emerald { background: linear-gradient(135deg, #10b981, #059669); }
.kb-metric-icon.bg-blue { background: linear-gradient(135deg, #3b82f6, #2563eb); }
.kb-metric-icon.bg-purple { background: linear-gradient(135deg, #8b5cf6, #7c3aed); }

.kb-metric-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.kb-metric-label {
  font-size: 0.8rem;
  color: #64748b;
  font-weight: 500;
}
.kb-metric-val {
  font-size: 1.25rem;
  font-weight: 800;
  color: #0f172a;
}
.kb-metric-val small {
  font-size: 0.82rem;
  font-weight: 500;
  color: #94a3b8;
  margin-left: 2px;
}

/* ── 表格卡片精致化 ── */
.kb-table-card {
  background: #ffffff;
  border-radius: 1.25rem;
  border: 1px solid rgba(226, 232, 240, 0.85);
  box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.kb-table-header {
  padding: 1.15rem 1.5rem;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.kb-header-left {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  flex-wrap: wrap;
}

.kb-title-badge {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.kb-title-icon {
  color: #6366f1;
}

.kb-title-text {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.01em;
}

/* 状态筛选 Tabs */
.kb-filter-tabs {
  display: inline-flex;
  align-items: center;
  background: #f1f5f9;
  padding: 0.2rem;
  border-radius: 0.6rem;
  gap: 0.15rem;
}

.kb-filter-tab {
  border: none;
  background: transparent;
  padding: 0.28rem 0.65rem;
  border-radius: 0.45rem;
  font-size: 0.74rem;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.kb-filter-tab:hover {
  color: #0f172a;
}

.kb-filter-tab.active {
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}

.kb-filter-tab .tab-count {
  font-size: 0.68rem;
  padding: 0.1rem 0.35rem;
  border-radius: 9999px;
  background: rgba(148, 163, 184, 0.18);
  color: #475569;
}

.kb-filter-tab.active .tab-count {
  background: #eff6ff;
  color: #3b82f6;
  font-weight: 700;
}

.kb-header-right {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-wrap: wrap;
}

/* 表格头部按钮组 */
.kb-header-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.42rem 0.85rem;
  border-radius: 0.55rem;
  font-size: 0.76rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  white-space: nowrap;
  line-height: 1.2;
}

.kb-header-btn-primary {
  background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
  border: 1px solid #4338ca;
  color: #ffffff;
  box-shadow: 0 2px 6px rgba(79, 70, 229, 0.25);
}

.kb-header-btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #4338ca 0%, #4f46e5 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.35);
}

.kb-header-btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.kb-header-btn-secondary {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  color: #334155;
}

.kb-header-btn-secondary:hover:not(:disabled) {
  background: #f8fafc;
  border-color: #cbd5e1;
  color: #0f172a;
  transform: translateY(-1px);
}

.kb-header-btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.kb-search-box {
  position: relative;
  width: 250px;
}

.kb-search-icon {
  position: absolute;
  left: 0.8rem;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  pointer-events: none;
}

.kb-search-input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.45rem 1.8rem 0.45rem 2.2rem;
  font-size: 0.8rem;
  border: 1px solid #e2e8f0;
  border-radius: 9999px;
  outline: none;
  background: #f8fafc;
  color: #1e293b;
  transition: all 0.2s ease;
}

.kb-search-input:focus {
  border-color: #6366f1;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}

.kb-search-clear {
  position: absolute;
  right: 0.6rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 1rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.kb-search-clear:hover {
  color: #475569;
}

.kb-table-container {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.kb-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  text-align: left;
}

.kb-table thead th {
  background: #f8fafc;
  padding: 0.85rem 1.25rem;
  font-size: 0.73rem;
  font-weight: 700;
  color: #64748b;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  border-bottom: 1px solid #e2e8f0;
  white-space: nowrap;
}

.kb-table tbody td {
  padding: 0.95rem 1.25rem;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
  font-size: 0.82rem;
}

.kb-row {
  transition: background-color 0.15s ease;
}

.kb-row:hover {
  background-color: #f8faff;
}

.kb-row:last-child td {
  border-bottom: none;
}

/* 列宽分配与样式 */
.col-id {
  width: 75px;
}

.kb-id-tag {
  display: inline-block;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.76rem;
  font-weight: 700;
  color: #64748b;
  background: #f1f5f9;
  padding: 0.18rem 0.48rem;
  border-radius: 6px;
}

.col-title {
  min-width: 200px;
  max-width: 380px;
}

.kb-title-cell {
  display: flex;
  align-items: center;
}

.kb-title-name {
  font-weight: 650;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: -0.01em;
  transition: color 0.15s ease;
}

.kb-row:hover .kb-title-name {
  color: #4f46e5;
}

.col-category {
  width: 130px;
}

.kb-category-tag {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.6rem;
  background: rgba(99, 102, 241, 0.08);
  color: #4f46e5;
  border-radius: 9999px;
  font-size: 0.73rem;
  font-weight: 600;
  white-space: nowrap;
}

.kb-category-tag.is-empty {
  background: #f1f5f9;
  color: #94a3b8;
}

.col-time {
  width: 170px;
  white-space: nowrap;
}

.kb-time-text {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.78rem;
  color: #64748b;
  font-variant-numeric: tabular-nums;
}

.kb-time-icon {
  color: #94a3b8;
}

.col-status {
  width: 95px;
  white-space: nowrap;
}

.kb-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.58rem;
  border-radius: 9999px;
  font-size: 0.72rem;
  font-weight: 650;
  white-space: nowrap;
}

.kb-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.kb-status-pill.is-published {
  background: #ecfdf5;
  color: #059669;
  border: 1px solid rgba(16, 185, 129, 0.25);
}

.kb-status-pill.is-published .kb-status-dot {
  background: #10b981;
}

.kb-status-pill.is-draft {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid rgba(239, 68, 68, 0.25);
}

.kb-status-pill.is-draft .kb-status-dot {
  background: #ef4444;
}

/* 切片状态列与标签 */
.col-slice {
  width: 145px;
  white-space: nowrap;
}

.kb-slice-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.22rem 0.6rem;
  border-radius: 9999px;
  font-size: 0.72rem;
  font-weight: 650;
  white-space: nowrap;
}

.kb-slice-tag.is-indexed {
  background: #ecfdf5;
  color: #059669;
  border: 1px solid rgba(16, 185, 129, 0.25);
}

.kb-slice-tag.is-unindexed {
  background: #f1f5f9;
  color: #94a3b8;
  border: 1px solid rgba(226, 232, 240, 0.8);
}

.kb-slice-tag.is-indexing {
  background: #eff6ff;
  color: #3b82f6;
  border: 1px solid rgba(59, 130, 246, 0.25);
}

.col-actions {
  width: 240px;
  text-align: right;
  white-space: nowrap;
}

.kb-actions-group {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  white-space: nowrap;
}

/* 操作按钮 */
.kb-btn-action {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  font-weight: 650;
  padding: 0.38rem 0.75rem;
  border-radius: 0.55rem;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  white-space: nowrap;
  flex-shrink: 0;
  line-height: 1.2;
}

.kb-btn-index {
  background: #f5f3ff;
  border: 1px solid rgba(196, 181, 253, 0.7);
  color: #4f46e5;
  box-shadow: 0 1px 2px rgba(99, 102, 241, 0.05);
}

.kb-btn-index:hover:not(:disabled) {
  background: #4f46e5;
  border-color: #4f46e5;
  color: #ffffff;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.22);
}

.kb-btn-index:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.kb-btn-remove {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  color: #64748b;
}

.kb-btn-remove:hover:not(:disabled) {
  background: #fef2f2;
  border-color: rgba(239, 68, 68, 0.3);
  color: #dc2626;
  transform: translateY(-1px);
}

.kb-btn-remove:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.kb-btn-remove.is-disabled {
  opacity: 0.35;
  cursor: not-allowed;
  border-color: #f1f5f9;
  color: #cbd5e1;
}

/* 空白与加载 */
.kb-empty-cell {
  padding: 3.5rem 1.5rem !important;
  text-align: center;
}

.kb-state-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  color: #94a3b8;
  font-size: 0.85rem;
  font-weight: 500;
}

.kb-spin-icon {
  color: #6366f1;
}

.kb-empty-icon {
  color: #cbd5e1;
}

/* 底部状态与分页 */
.kb-table-footer {
  padding: 0.85rem 1.5rem;
  border-top: 1px solid #f1f5f9;
  background: #fafbfc;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.kb-footer-meta {
  font-size: 0.78rem;
  color: #64748b;
}

.kb-footer-meta strong {
  color: #0f172a;
}

.kb-pagination {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.kb-page-btn {
  padding: 0.32rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  color: #334155;
  cursor: pointer;
  transition: all 0.15s ease;
}

.kb-page-btn:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: #cbd5e1;
  color: #0f172a;
}

.kb-page-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.kb-page-indicator {
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  padding: 0 0.25rem;
}

/* Modal */
.kb-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(4px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}
.kb-modal-card {
  width: 100%;
  max-width: 440px;
  background: #ffffff;
  border-radius: 1.25rem;
  padding: 1.75rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  text-align: center;
}
.kb-modal-icon {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #eff6ff;
  color: #2563eb;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
}
.kb-modal-title {
  margin: 0 0 0.5rem;
  font-size: 1.15rem;
  font-weight: 700;
  color: #0f172a;
}
.kb-modal-desc {
  margin: 0 0 1.5rem;
  font-size: 0.88rem;
  color: #64748b;
  line-height: 1.6;
}
.kb-modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
}
</style>
