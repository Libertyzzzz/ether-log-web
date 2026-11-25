<script setup lang="ts">
import {
  FileText,
  MessageSquare,
  Eye,
  Sparkles,
  Edit3,
  Trash2,
  ArrowUpRight,
  Plus,
  LayoutDashboard,
  Check,
  TrendingUp,
  PieChart,
  Tag as TagIcon,
} from 'lucide-vue-next'
import { computed, ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { hasPermission, hasRole, isSuperAdmin } from '../composables/useAuth'
import SkeletonLoader from './SkeletonLoader.vue'
import type { ArticleListItem, CommentItem, Tag, Category } from '../types/blog'
import {
  fetchArticlesAdminPage,
  fetchKnowledgeStats,
} from '../api'

const props = defineProps<{
  articles: ArticleListItem[]
  categories: Category[]
  tags: Tag[]
  isLoadingArticles: boolean
  pendingComments: CommentItem[]
  isLoadingPending: boolean
  commentCount: number
  totalViews: number
  page: number
  total: number
  pageSize: number
}>()

defineEmits<{
  newArticle: []
  editArticle: [article: ArticleListItem]
  deleteArticle: [articleId: number]
  openArticle: [article: ArticleListItem]
  approveComment: [commentId: number]
  deleteComment: [commentId: number]
  'page-change': [page: number]
  refreshCategories: []
  refreshTags: []
}>()

const router = useRouter()

// ── Full-site analytics dataset (so charts reflect all posts, not just page 1) ──
const fullArticles = ref<ArticleListItem[]>([])
const ragStats = ref({ indexedArticleCount: 0, totalChunks: 0 })
const chartTab = ref<'top' | 'trend'>('top')

const mainChartRef = ref<HTMLDivElement | null>(null)
const donutChartRef = ref<HTMLDivElement | null>(null)
let mainChart: echarts.ECharts | null = null
let donutChart: echarts.ECharts | null = null

const analyticsPool = computed(() =>
  fullArticles.value.length ? fullArticles.value : props.articles
)

const publishedArticles = computed(() =>
  analyticsPool.value.filter((a) => a.status !== 0)
)
const draftArticles = computed(() =>
  analyticsPool.value.filter((a) => a.status === 0).slice(0, 4)
)
const allDraftCount = computed(() =>
  analyticsPool.value.filter((a) => a.status === 0).length
)
const topCount = computed(() =>
  publishedArticles.value.filter((a) => Boolean(a.isTop)).length
)

const computedTotalViews = computed(() => {
  const sum = analyticsPool.value.reduce((acc, a) => acc + (a.viewCount || 0), 0)
  return Math.max(sum, props.totalViews || 0)
})

const avgViews = computed(() => {
  const count = publishedArticles.value.length || props.total || 1
  return Math.round(computedTotalViews.value / count)
})

const ragCoverage = computed(() => {
  const denom = publishedArticles.value.length || props.total || 0
  if (!denom) return 0
  return Math.min(100, Math.round((ragStats.value.indexedArticleCount / denom) * 100))
})

const recentPendingComments = computed(() => props.pendingComments.slice(0, 4))

const sortedCategories = computed(() =>
  [...props.categories]
    .filter((c) => (c.articleCount ?? 0) > 0)
    .sort((a, b) => (b.articleCount ?? 0) - (a.articleCount ?? 0))
    .slice(0, 6)
)

const totalArticlesInCategories = computed(() =>
  props.categories.reduce((sum, c) => sum + (c.articleCount ?? 0), 0)
)

const hotTags = computed(() =>
  [...props.tags]
    .sort((a, b) => (b.articleCount ?? 0) - (a.articleCount ?? 0))
    .slice(0, 10)
)

const canAddArticle = computed(() => isSuperAdmin.value || hasPermission(['dashboard:article:add', 'content:article:add']))
const canEditArticle = computed(() => isSuperAdmin.value || hasPermission(['dashboard:article:edit', 'content:article:edit']))
const canManageComments = computed(() => isSuperAdmin.value || hasPermission('dashboard:comment') || hasRole(['ROLE_ADMIN', 'ROLE_SUPER_ADMIN']))
const canManageKnowledge = computed(() => isSuperAdmin.value || hasPermission('dashboard:knowledge') || hasRole(['ROLE_ADMIN', 'ROLE_SUPER_ADMIN']))

function scrollToSection(id: string) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// ── ECharts Rendering ──
function renderMainChart() {
  if (!mainChartRef.value) return
  mainChart ||= echarts.init(mainChartRef.value)

  if (chartTab.value === 'top') {
    const topPosts = [...publishedArticles.value]
      .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
      .slice(0, 6)
      .reverse()

    const labels = topPosts.map((p) =>
      p.title.length > 18 ? p.title.slice(0, 18) + '…' : p.title
    )
    const values = topPosts.map((p) => p.viewCount || 0)

    mainChart.setOption(
      {
        grid: { left: 12, right: 44, top: 14, bottom: 10, containLabel: true },
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          backgroundColor: '#0f172a',
          borderWidth: 0,
          textStyle: { color: '#f8fafc', fontSize: 12 },
          formatter: (params: any) => {
            const item = Array.isArray(params) ? params[0] : params
            const post = topPosts[item.dataIndex]
            return `<strong>${post?.title || ''}</strong><br/>阅读量：${item.value} 次`
          },
        },
        xAxis: {
          type: 'value',
          splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
          axisLabel: { color: '#94a3b8', fontSize: 11 },
        },
        yAxis: {
          type: 'category',
          data: labels,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { color: '#334155', fontSize: 12, fontWeight: 600 },
        },
        series: [
          {
            type: 'bar',
            data: values,
            barWidth: 16,
            itemStyle: {
              borderRadius: [0, 6, 6, 0],
              color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                { offset: 0, color: '#334155' },
                { offset: 1, color: '#0f172a' },
              ]),
            },
            label: {
              show: true,
              position: 'right',
              color: '#475569',
              fontSize: 11,
              fontWeight: 700,
            },
          },
        ],
      },
      true
    )
  } else {
    // Monthly publishing trend
    const monthCounts = new Map<string, number>()
    for (const post of publishedArticles.value) {
      const m = (post.createTime || '').slice(0, 7)
      if (m && /^\d{4}-\d{2}$/.test(m)) {
        monthCounts.set(m, (monthCounts.get(m) || 0) + 1)
      }
    }
    const months = Array.from(monthCounts.keys()).sort().slice(-10)
    const counts = months.map((m) => monthCounts.get(m) || 0)

    mainChart.setOption(
      {
        grid: { left: 16, right: 20, top: 20, bottom: 16, containLabel: true },
        tooltip: {
          trigger: 'axis',
          backgroundColor: '#0f172a',
          borderWidth: 0,
          textStyle: { color: '#f8fafc', fontSize: 12 },
          formatter: (params: any) => {
            const item = Array.isArray(params) ? params[0] : params
            return `${item.name}<br/>发布文章：<strong>${item.value} 篇</strong>`
          },
        },
        xAxis: {
          type: 'category',
          data: months,
          boundaryGap: false,
          axisLine: { lineStyle: { color: '#e2e8f0' } },
          axisTick: { show: false },
          axisLabel: { color: '#64748b', fontSize: 11 },
        },
        yAxis: {
          type: 'value',
          minInterval: 1,
          splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
          axisLabel: { color: '#94a3b8', fontSize: 11 },
        },
        series: [
          {
            type: 'line',
            smooth: 0.35,
            symbol: 'circle',
            symbolSize: 7,
            data: counts,
            lineStyle: { width: 2.5, color: '#0f172a' },
            itemStyle: { color: '#0f172a', borderWidth: 2, borderColor: '#ffffff' },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(15, 23, 42, 0.14)' },
                { offset: 1, color: 'rgba(15, 23, 42, 0.01)' },
              ]),
            },
          },
        ],
      },
      true
    )
  }
}

const donutPalette = ['#0f172a', '#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#94a3b8']

function renderDonutChart() {
  if (!donutChartRef.value) return
  donutChart ||= echarts.init(donutChartRef.value)

  const data = sortedCategories.value.map((c) => ({
    name: c.name,
    value: c.articleCount ?? 0,
  }))

  donutChart.setOption(
    {
      color: donutPalette,
      tooltip: {
        trigger: 'item',
        backgroundColor: '#0f172a',
        borderWidth: 0,
        textStyle: { color: '#f8fafc', fontSize: 12 },
        formatter: '{b}: {c} 篇 ({d}%)',
      },
      series: [
        {
          type: 'pie',
          radius: ['58%', '82%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 5,
            borderColor: '#ffffff',
            borderWidth: 2,
          },
          label: { show: false },
          data: data.length ? data : [{ name: '暂无分类', value: 0 }],
        },
      ],
    },
    true
  )
}

function handleResize() {
  mainChart?.resize()
  donutChart?.resize()
}

watch(chartTab, () => nextTick(renderMainChart))
watch([analyticsPool, sortedCategories], () => {
  nextTick(() => {
    renderMainChart()
    renderDonutChart()
  })
})

onMounted(async () => {
  window.addEventListener('resize', handleResize)

  // Fetch full article list for accurate analytics + RAG coverage stats
  try {
    const res = await fetchArticlesAdminPage({ pageNum: 1, pageSize: 200 })
    if (res?.records?.length) {
      fullArticles.value = res.records
    }
  } catch {
    // Fallback to props.articles
  }

  if (canManageKnowledge.value) {
    try {
      const ks = await fetchKnowledgeStats()
      if (ks) {
        ragStats.value = {
          indexedArticleCount: ks.indexedArticleCount || 0,
          totalChunks: ks.totalChunks || 0,
        }
      }
    } catch {
      // Ignore if unavailable
    }
  }

  await nextTick()
  renderMainChart()
  renderDonutChart()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  mainChart?.dispose()
  donutChart?.dispose()
  mainChart = null
  donutChart = null
})
</script>

<template>
  <div class="db-page">
    <!-- ── 紧凑工作区页头（由 AdminLayout 自动规范为浅色极简头） ── -->
    <div class="db-hero">
      <div class="db-hero-bg-wrap">
        <div class="db-hero-inner">
          <div class="db-hero-left">
            <div class="db-hero-icon">
              <LayoutDashboard :size="20" />
            </div>
            <div class="db-hero-info">
              <h1 class="db-hero-title">数据面板</h1>
              <p class="db-hero-sub">全站内容趋势、分类结构、AI 知识库覆盖与待办概览</p>
            </div>
          </div>
          <button v-if="canAddArticle" class="db-btn-new" type="button" @click="$emit('newArticle')">
            <Plus :size="15" />
            发布文章
          </button>
        </div>
      </div>
    </div>

    <div class="db-body">
      <!-- ── 1. KPI 指标条（数值 + 业务上下文） ── -->
      <div class="db-stats-grid">
        <div class="db-stat-card db-stat-card--clickable" @click="router.push('/dashboard/article')">
          <div class="db-stat-top">
            <span class="db-stat-label">已发布文章</span>
            <div class="db-stat-icon"><FileText :size="15" /></div>
          </div>
          <strong class="db-stat-value">{{ publishedArticles.length || total }}</strong>
          <span class="db-stat-meta">草稿 {{ allDraftCount }} 篇 · 置顶 {{ topCount }} 篇</span>
        </div>

        <div class="db-stat-card">
          <div class="db-stat-top">
            <span class="db-stat-label">全站总浏览</span>
            <div class="db-stat-icon"><Eye :size="15" /></div>
          </div>
          <strong class="db-stat-value">{{ computedTotalViews.toLocaleString() }}</strong>
          <span class="db-stat-meta">篇均阅读 {{ avgViews }} 次</span>
        </div>

        <div class="db-stat-card db-stat-card--clickable" @click="router.push('/dashboard/knowledge')">
          <div class="db-stat-top">
            <span class="db-stat-label">RAG 知识库覆盖</span>
            <div class="db-stat-icon"><Sparkles :size="15" /></div>
          </div>
          <div class="db-stat-row">
            <strong class="db-stat-value">{{ ragCoverage }}<small>%</small></strong>
            <span class="db-rag-chunks">{{ ragStats.totalChunks }} 切片</span>
          </div>
          <div class="db-progress-track">
            <div class="db-progress-fill" :style="{ width: ragCoverage + '%' }"></div>
          </div>
        </div>

        <div class="db-stat-card db-stat-card--clickable" @click="scrollToSection('db-comments')">
          <div class="db-stat-top">
            <span class="db-stat-label">待审核评论</span>
            <div class="db-stat-icon"><MessageSquare :size="15" /></div>
          </div>
          <strong class="db-stat-value">{{ commentCount }}</strong>
          <span class="db-stat-meta">
            <span class="status-dot" :class="commentCount > 0 ? 'warn' : 'ok'"></span>
            {{ commentCount > 0 ? '有待处理留言' : '全部已处理' }}
          </span>
        </div>
      </div>

      <!-- ── 2. 可视化洞察区（ECharts 趋势/排行 + 分类环形图） ── -->
      <div class="db-analytics-grid">
        <section class="db-card db-chart-card">
          <div class="db-card-header">
            <div class="db-card-title-row">
              <TrendingUp :size="16" class="db-card-icon" />
              <h2 class="db-card-title">内容数据洞察</h2>
            </div>
            <div class="db-segmented">
              <button
                type="button"
                :class="{ active: chartTab === 'top' }"
                @click="chartTab = 'top'"
              >阅读排行 Top 6</button>
              <button
                type="button"
                :class="{ active: chartTab === 'trend' }"
                @click="chartTab = 'trend'"
              >月度发布趋势</button>
            </div>
          </div>
          <div ref="mainChartRef" class="db-echarts-main"></div>
        </section>

        <section class="db-card db-donut-card">
          <div class="db-card-header">
            <div class="db-card-title-row">
              <PieChart :size="16" class="db-card-icon" />
              <h2 class="db-card-title">分类占比</h2>
            </div>
            <button class="db-btn-sm ghost" type="button" @click="router.push('/dashboard/category')">
              管理 <ArrowUpRight :size="12" />
            </button>
          </div>
          <div class="db-donut-layout">
            <div class="db-donut-wrap">
              <div ref="donutChartRef" class="db-echarts-donut"></div>
              <div class="db-donut-center">
                <strong>{{ totalArticlesInCategories || publishedArticles.length }}</strong>
                <span>总篇数</span>
              </div>
            </div>
            <div class="db-donut-legend">
              <div v-for="(cat, idx) in sortedCategories" :key="cat.id" class="legend-row">
                <span class="legend-dot" :style="{ background: donutPalette[idx % donutPalette.length] }"></span>
                <span class="legend-name">{{ cat.name }}</span>
                <span class="legend-val">{{ cat.articleCount ?? 0 }} 篇</span>
              </div>
              <div v-if="!sortedCategories.length" class="db-empty-inline">暂无分类数据</div>
            </div>
          </div>
        </section>
      </div>

      <!-- ── 3. 轻量化行动区（待审评论 + 草稿与热门标签） ── -->
      <div class="db-ops-grid">
        <section v-if="canManageComments" id="db-comments" class="db-card">
          <div class="db-card-header">
            <div class="db-card-title-row">
              <MessageSquare :size="15" class="db-card-icon" />
              <h2 class="db-card-title">待审核评论</h2>
            </div>
            <button class="db-btn-sm ghost" type="button" @click="router.push('/dashboard/comment')">
              全部评论 <ArrowUpRight :size="12" />
            </button>
          </div>

          <SkeletonLoader v-if="isLoadingPending" variant="table" :rows="3" />
          <div v-else-if="!recentPendingComments.length" class="db-empty">
            暂无待审核的评论
          </div>
          <div v-else class="db-comment-list">
            <div v-for="comment in recentPendingComments" :key="comment.id" class="db-comment-item">
              <div class="db-comment-main">
                <p class="db-comment-text">{{ comment.content }}</p>
                <p class="db-comment-meta">
                  {{ comment.author }}
                  <template v-if="comment.articleTitle"> · {{ comment.articleTitle }}</template>
                  <template v-if="comment.createTime"> · {{ comment.createTime }}</template>
                </p>
              </div>
              <div class="db-comment-actions">
                <button type="button" class="db-action-btn approve" @click="$emit('approveComment', comment.id)">
                  <Check :size="12" /> 通过
                </button>
                <button type="button" class="db-action-btn danger" @click="$emit('deleteComment', comment.id)">
                  <Trash2 :size="12" /> 删除
                </button>
              </div>
            </div>
          </div>
        </section>

        <section id="db-drafts" class="db-card">
          <div class="db-card-header">
            <div class="db-card-title-row">
              <Edit3 :size="15" class="db-card-icon" />
              <h2 class="db-card-title">最近草稿</h2>
            </div>
            <button class="db-btn-sm ghost" type="button" @click="router.push('/dashboard/article')">
              文章管理 <ArrowUpRight :size="12" />
            </button>
          </div>

          <div v-if="isLoadingArticles" class="db-empty">加载中...</div>
          <div v-else-if="!draftArticles.length" class="db-empty">暂无未发布草稿</div>
          <div v-else class="draft-list">
            <article v-for="draft in draftArticles" :key="draft.id" class="draft-item">
              <div class="draft-info">
                <strong>{{ draft.title || '未命名草稿' }}</strong>
                <span>{{ draft.updateTime?.slice(0, 16) || draft.createTime?.slice(0, 16) || '刚刚保存' }}</span>
              </div>
              <button v-if="canEditArticle" type="button" class="db-action-btn edit" @click="$emit('editArticle', draft)">
                <Edit3 :size="11" /> 继续写
              </button>
            </article>
          </div>

          <div class="db-tags-divider">
            <div class="db-tags-head">
              <span><TagIcon :size="13" /> 热门标签</span>
              <button type="button" class="db-link-btn" @click="router.push('/dashboard/tag')">管理标签</button>
            </div>
            <div class="tag-cloud">
              <span v-for="tag in hotTags" :key="tag.id" class="tag-pill">
                <span class="tag-dot" :style="{ background: tag.color || '#64748b' }"></span>
                {{ tag.name }}
                <small v-if="tag.articleCount">{{ tag.articleCount }}</small>
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.db-page {
  background: transparent;
}

.db-body {
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
}

.db-hero-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.db-hero-left {
  display: flex;
  align-items: center;
  gap: 0.9rem;
}

.db-hero-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.db-hero-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.db-hero-title {
  margin: 0;
}

.db-hero-sub {
  margin: 0;
}

.db-btn-new {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.52rem 1rem;
  border: 0;
  border-radius: 8px;
  background: #0f172a;
  color: #ffffff;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;
}

/* ── 1. KPI Grid ── */
.db-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
}

.db-stat-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.db-stat-card--clickable {
  cursor: pointer;
  transition: border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
}

.db-stat-card--clickable:hover {
  border-color: #cbd5e1;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.05);
}

.db-stat-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.db-stat-label {
  font-size: 0.78rem;
  font-weight: 650;
  color: #64748b;
}

.db-stat-icon {
  width: 1.9rem;
  height: 1.9rem;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #475569;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.db-stat-value {
  font-size: 1.75rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.1;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.db-stat-value small {
  font-size: 0.95rem;
  font-weight: 700;
  color: #64748b;
  margin-left: 2px;
}

.db-stat-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
}

.db-rag-chunks {
  font-size: 0.74rem;
  font-weight: 650;
  color: #64748b;
}

.db-progress-track {
  width: 100%;
  height: 5px;
  border-radius: 999px;
  background: #f1f5f9;
  overflow: hidden;
  margin-top: 0.2rem;
}

.db-progress-fill {
  height: 100%;
  border-radius: 999px;
  background: #0f172a;
  transition: width 0.4s ease;
}

.db-stat-meta {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.74rem;
  color: #64748b;
  font-weight: 500;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-dot.warn {
  background: #f59e0b;
}

.status-dot.ok {
  background: #10b981;
}

/* ── 2. Visual Analytics Bento ── */
.db-analytics-grid {
  display: grid;
  grid-template-columns: 1.55fr 1fr;
  gap: 1rem;
}

.db-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.25rem;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.db-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.db-card-title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.db-card-icon {
  color: #475569;
}

.db-card-title {
  margin: 0;
  font-size: 0.94rem;
  font-weight: 750;
  color: #0f172a;
}

.db-segmented {
  display: inline-flex;
  padding: 3px;
  border-radius: 8px;
  background: #f1f5f9;
  gap: 2px;
}

.db-segmented button {
  padding: 0.3rem 0.7rem;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #64748b;
  font-size: 0.74rem;
  font-weight: 650;
  cursor: pointer;
  transition: all 0.15s ease;
}

.db-segmented button.active {
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
}

.db-echarts-main {
  width: 100%;
  height: 250px;
}

.db-donut-layout {
  display: grid;
  grid-template-columns: 160px minmax(0, 1fr);
  align-items: center;
  gap: 1rem;
  flex: 1;
}

.db-donut-wrap {
  position: relative;
  width: 160px;
  height: 160px;
  margin: 0 auto;
}

.db-echarts-donut {
  width: 100%;
  height: 100%;
}

.db-donut-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.db-donut-center strong {
  font-size: 1.35rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.1;
}

.db-donut-center span {
  font-size: 0.7rem;
  color: #64748b;
  font-weight: 600;
}

.db-donut-legend {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  min-width: 0;
}

.legend-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-name {
  flex: 1;
  color: #334155;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.legend-val {
  color: #64748b;
  font-size: 0.76rem;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}

/* ── 3. Operations Grid ── */
.db-ops-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.db-btn-sm.ghost {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.3rem 0.65rem;
  border-radius: 7px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #475569;
  font-size: 0.74rem;
  font-weight: 650;
  cursor: pointer;
}

.db-btn-sm.ghost:hover {
  background: #f8fafc;
  color: #0f172a;
}

.db-empty,
.db-empty-inline {
  padding: 2rem 1rem;
  text-align: center;
  color: #94a3b8;
  font-size: 0.82rem;
}

.db-comment-list {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.db-comment-item {
  padding: 0.85rem 0.95rem;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.85rem;
}

.db-comment-main {
  min-width: 0;
  flex: 1;
}

.db-comment-text {
  margin: 0 0 0.25rem;
  font-size: 0.84rem;
  color: #1e293b;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.db-comment-meta {
  margin: 0;
  font-size: 0.72rem;
  color: #94a3b8;
}

.db-comment-actions {
  display: flex;
  gap: 0.35rem;
  flex-shrink: 0;
}

.db-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.32rem 0.6rem;
  border-radius: 7px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #334155;
  font-size: 0.72rem;
  font-weight: 650;
  cursor: pointer;
}

.db-action-btn.approve:hover {
  background: #ecfdf5;
  border-color: #a7f3d0;
  color: #059669;
}

.db-action-btn.danger:hover {
  background: #fef2f2;
  border-color: #fecaca;
  color: #dc2626;
}

.db-action-btn.edit:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.draft-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.draft-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.65rem 0.85rem;
  border-radius: 9px;
  background: #f8fafc;
  border: 1px solid #f1f5f9;
}

.draft-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.draft-info strong {
  font-size: 0.84rem;
  font-weight: 650;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.draft-info span {
  font-size: 0.72rem;
  color: #94a3b8;
}

.db-tags-divider {
  margin-top: 1.1rem;
  padding-top: 1rem;
  border-top: 1px solid #f1f5f9;
}

.db-tags-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.65rem;
}

.db-tags-head span {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.78rem;
  font-weight: 700;
  color: #475569;
}

.db-link-btn {
  background: transparent;
  border: 0;
  color: #64748b;
  font-size: 0.74rem;
  font-weight: 600;
  cursor: pointer;
}

.db-link-btn:hover {
  color: #0f172a;
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.tag-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.6rem;
  border-radius: 7px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  font-size: 0.74rem;
  font-weight: 600;
  color: #334155;
}

.tag-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.tag-pill small {
  color: #94a3b8;
  font-size: 0.68rem;
}

/* ── Responsive ── */
@media (max-width: 1100px) {
  .db-analytics-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .db-stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .db-ops-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .db-stats-grid {
    grid-template-columns: 1fr;
  }
  .db-donut-layout {
    grid-template-columns: 1fr;
  }
  .db-comment-item {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
