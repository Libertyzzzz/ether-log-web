<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ArrowLeft, Edit3, Trash2, Clock, Eye, Tag, BookOpen } from 'lucide-vue-next'
import type { ArticleDetail, ArticleListItem } from '../types/blog'
import { getArticleCategory } from '../utils/article'

const props = defineProps<{
  article: ArticleDetail | ArticleListItem
  selectedArticle: ArticleDetail | null
  isLoading: boolean
  showActions: boolean
}>()

defineEmits<{
  close: []
  edit: [article: ArticleDetail | ArticleListItem]
  delete: [articleId: number]
}>()

// 从正文中提取标题生成目录
const headings = computed(() => {
  const content = props.selectedArticle?.renderContent || ''
  if (!content) return []
  const matches = [...content.matchAll(/<h([123])[^>]*>(.*?)<\/h[123]>/gi)]
  return matches.map((m, i) => ({
    id: `heading-${i}`,
    level: Number(m[1]),
    text: m[2].replace(/<[^>]+>/g, ''),
  }))
})

const activeHeadingId = ref('')
const sidebarRef = ref<HTMLElement | null>(null)

// 注入锚点 id 到正文标题
const processedContent = computed(() => {
  if (!props.selectedArticle?.renderContent) return ''
  let idx = 0
  return props.selectedArticle.renderContent.replace(
    /<h([123])([^>]*)>/gi,
    (_, level, attrs) => `<h${level}${attrs} id="heading-${idx++}">`
  )
})

// 滚动监听，高亮当前目录项
let observer: IntersectionObserver | null = null

function setupObserver() {
  observer?.disconnect()
  const targets = document.querySelectorAll('.article-body h1, .article-body h2, .article-body h3')
  if (!targets.length) return
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          activeHeadingId.value = entry.target.id
          break
        }
      }
    },
    { rootMargin: '-10% 0px -80% 0px' }
  )
  targets.forEach(el => observer!.observe(el))
}

function scrollToHeading(id: string) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

onMounted(() => {
  setTimeout(setupObserver, 300)
})

onUnmounted(() => {
  observer?.disconnect()
})

// 阅读进度（监听 window 滚动）
const readProgress = ref(0)
function onWindowScroll() {
  const { scrollTop, scrollHeight, clientHeight } = document.documentElement
  readProgress.value = scrollHeight <= clientHeight
    ? 100
    : Math.round((scrollTop / (scrollHeight - clientHeight)) * 100)
}

onMounted(() => {
  window.addEventListener('scroll', onWindowScroll, { passive: true })
})
onUnmounted(() => {
  window.removeEventListener('scroll', onWindowScroll)
})
</script>

<template>
  <div class="article-layout">

    <!-- ── 主体：左侧导航 + 右侧正文，整体从 navbar 下方开始 ── -->
    <div class="article-layout-inner">

      <!-- 左侧导航栏 -->
      <aside ref="sidebarRef" class="article-sidebar">

        <!-- 返回按钮 -->
        <button class="sidebar-back" type="button" @click="$emit('close')">
          <ArrowLeft :size="14" />
          <span>返回列表</span>
        </button>

        <!-- 文章元信息 -->
        <div class="sidebar-meta">
          <span class="sidebar-category">{{ getArticleCategory(article) }}</span>
          <h2 class="sidebar-title">{{ article.title }}</h2>
          <p v-if="article.subtitle" class="sidebar-subtitle">{{ article.subtitle }}</p>

          <div class="sidebar-stats">
            <span class="sidebar-stat">
              <Clock :size="11" />
              {{ article.createTime?.slice(0, 10) || '—' }}
            </span>
            <span class="sidebar-stat">
              <Eye :size="11" />
              {{ article.viewCount || 0 }} views
            </span>
          </div>

          <div v-if="article.tagNames?.length" class="sidebar-tags">
            <Tag :size="10" />
            <span v-for="tag in article.tagNames" :key="tag" class="sidebar-tag">{{ tag }}</span>
          </div>
        </div>

        <!-- 阅读进度 -->
        <div class="sidebar-progress-wrap">
          <div class="sidebar-progress-label">
            <BookOpen :size="11" />
            <span>阅读进度</span>
            <span class="sidebar-progress-pct">{{ readProgress }}%</span>
          </div>
          <div class="sidebar-progress-bar">
            <div class="sidebar-progress-fill" :style="{ width: readProgress + '%' }"></div>
          </div>
        </div>

        <!-- 目录 -->
        <nav v-if="headings.length" class="sidebar-toc">
          <p class="sidebar-toc-label">目录</p>
          <ul>
            <li
              v-for="h in headings"
              :key="h.id"
              :class="['toc-item', `toc-h${h.level}`, { active: activeHeadingId === h.id }]"
              @click="scrollToHeading(h.id)"
            >
              {{ h.text }}
            </li>
          </ul>
        </nav>

        <!-- 操作按钮 -->
        <div v-if="showActions" class="sidebar-actions">
          <button type="button" class="sidebar-action-btn edit" @click="$emit('edit', article)">
            <Edit3 :size="13" />
            <span>编辑文章</span>
          </button>
          <button type="button" class="sidebar-action-btn danger" @click="$emit('delete', article.id)">
            <Trash2 :size="13" />
            <span>删除</span>
          </button>
        </div>
      </aside>

      <!-- 右侧正文区域 -->
      <main class="article-main">

        <!-- 面包屑导航行（内容流，不 sticky，不突兀） -->
        <div class="article-breadcrumb">
          <button class="breadcrumb-back" type="button" @click="$emit('close')">
            <ArrowLeft :size="13" />
            <span>返回</span>
          </button>
          <span class="breadcrumb-sep">/</span>
          <span class="breadcrumb-site">ETHERLOG</span>
          <span class="breadcrumb-sep">/</span>
          <span class="breadcrumb-category">{{ getArticleCategory(article) }}</span>
          <div class="breadcrumb-spacer"></div>
          <div v-if="showActions" class="breadcrumb-actions">
            <button type="button" class="breadcrumb-action-btn" @click="$emit('edit', article)">
              <Edit3 :size="12" />编辑
            </button>
            <button type="button" class="breadcrumb-action-btn danger" @click="$emit('delete', article.id)">
              <Trash2 :size="12" />删除
            </button>
          </div>
        </div>

        <!-- 阅读进度条（紧贴面包屑下方，细线） -->
        <div class="article-progress-bar">
          <div class="article-progress-fill" :style="{ width: readProgress + '%' }"></div>
        </div>

        <div class="article-main-title-block">
          <h1 class="article-main-title">{{ article.title }}</h1>
          <p v-if="article.subtitle" class="article-main-subtitle">{{ article.subtitle }}</p>
          <div class="article-main-meta">
            <span class="article-main-category">{{ getArticleCategory(article) }}</span>
            <span class="article-main-date">{{ article.createTime?.slice(0, 10) }}</span>
            <span class="article-main-views">{{ article.viewCount || 0 }} views</span>
          </div>
          <div v-if="article.tagNames?.length" class="article-main-tags">
            <span v-for="tag in article.tagNames" :key="tag" class="article-main-tag">{{ tag }}</span>
          </div>
        </div>

        <hr class="article-divider" />

        <!-- 正文 -->
        <div v-if="isLoading" class="article-body article-loading">
          <div class="loading-skeleton"></div>
          <div class="loading-skeleton short"></div>
          <div class="loading-skeleton"></div>
          <div class="loading-skeleton"></div>
          <div class="loading-skeleton short"></div>
        </div>
        <div
          v-else-if="processedContent"
          class="article-body markdown-body"
          v-html="processedContent"
        ></div>
        <div v-else class="article-body article-plain">
          {{ selectedArticle?.content || '文章正文为空。' }}
        </div>
      </main>

    </div>
  </div>
</template>

<style scoped>
/* ── 整体容器 ── */
.article-layout {
  min-height: 100vh;
  background: #f5f5f7;
  padding-top: 5rem; /* navbar fixed 高度 */
}

/* ── 主体布局 ── */
.article-layout-inner {
  max-width: 64rem;
  margin: 0 auto;
  padding: 0 1.5rem;
  display: flex;
  align-items: flex-start;
}

/* ── 左侧导航栏 ── */
.article-sidebar {
  position: sticky;
  top: 8rem; /* navbar(5rem) + 面包屑行(2.75rem) + 间距 */
  width: 210px;
  flex-shrink: 0;
  max-height: calc(100vh - 8rem);
  overflow-y: auto;
  padding: 2rem 1.25rem 2rem 0;
  display: flex;
  flex-direction: column;
  gap: 1.35rem;
  border-right: 1px solid rgba(226, 232, 240, 0.7);
  scrollbar-width: none;
}
.article-sidebar::-webkit-scrollbar { display: none; }

.sidebar-back {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  padding: 0.4rem 0.65rem;
  border-radius: 9999px;
  transition: background 0.2s, color 0.2s;
  align-self: flex-start;
  margin-left: -0.5rem;
}
.sidebar-back:hover {
  background: rgba(37, 99, 235, 0.08);
  color: #2563eb;
}

.sidebar-meta {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}
.sidebar-category {
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #2563eb;
}
.sidebar-title {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.4;
  overflow-wrap: break-word;
}
.sidebar-subtitle {
  margin: 0;
  font-size: 0.78rem;
  color: #64748b;
  line-height: 1.5;
  overflow-wrap: break-word;
}
.sidebar-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-top: 0.15rem;
}
.sidebar-stat {
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
  font-size: 0.72rem;
  color: #94a3b8;
  font-weight: 600;
}
.sidebar-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.1rem;
  color: #94a3b8;
}
.sidebar-tag {
  padding: 0.12rem 0.5rem;
  border-radius: 9999px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 0.67rem;
  font-weight: 700;
}

/* 阅读进度 */
.sidebar-progress-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.sidebar-progress-label {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.7rem;
  font-weight: 700;
  color: #94a3b8;
}
.sidebar-progress-pct {
  margin-left: auto;
  color: #2563eb;
  font-size: 0.7rem;
}
.sidebar-progress-bar {
  height: 3px;
  border-radius: 9999px;
  background: #e2e8f0;
  overflow: hidden;
}
.sidebar-progress-fill {
  height: 100%;
  border-radius: 9999px;
  background: linear-gradient(90deg, #2563eb, #10b981);
  transition: width 0.25s ease;
}

/* 目录 */
.sidebar-toc { flex: 1; }
.sidebar-toc-label {
  margin: 0 0 0.55rem;
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #94a3b8;
}
.sidebar-toc ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.05rem;
}
.toc-item {
  padding: 0.3rem 0.6rem;
  border-radius: 0.45rem;
  font-size: 0.78rem;
  color: #64748b;
  cursor: pointer;
  line-height: 1.4;
  transition: background 0.15s, color 0.15s;
  border-left: 2px solid transparent;
  overflow-wrap: break-word;
}
.toc-item:hover { background: rgba(37, 99, 235, 0.06); color: #2563eb; }
.toc-item.active {
  background: rgba(37, 99, 235, 0.08);
  color: #2563eb;
  border-left-color: #2563eb;
  font-weight: 700;
}
.toc-h2 { padding-left: 1rem; }
.toc-h3 { padding-left: 1.6rem; font-size: 0.73rem; }

/* 操作按钮 */
.sidebar-actions {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(226, 232, 240, 0.8);
}
.sidebar-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.55rem 0.8rem;
  border-radius: 0.75rem;
  border: 1px solid transparent;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
}
.sidebar-action-btn.edit {
  background: rgba(37, 99, 235, 0.07);
  border-color: rgba(37, 99, 235, 0.16);
  color: #2563eb;
}
.sidebar-action-btn.edit:hover { background: rgba(37, 99, 235, 0.13); }
.sidebar-action-btn.danger {
  background: rgba(239, 68, 68, 0.06);
  border-color: rgba(239, 68, 68, 0.16);
  color: #dc2626;
}
.sidebar-action-btn.danger:hover { background: rgba(239, 68, 68, 0.12); }

/* ── 右侧正文 ── */
.article-main {
  flex: 1;
  min-width: 0;
  padding: 2rem 0 6rem 2.5rem;
  overflow-wrap: break-word;
  word-break: break-word;
}

/* 面包屑导航行 */
.article-breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.breadcrumb-back {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
  padding: 0.3rem 0.55rem;
  border-radius: 9999px;
  transition: background 0.2s, color 0.2s;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.breadcrumb-back:hover {
  background: rgba(37, 99, 235, 0.08);
  color: #2563eb;
}
.breadcrumb-sep   { color: #e2e8f0; }
.breadcrumb-site  { color: #cbd5e1; }
.breadcrumb-category { color: #2563eb; }
.breadcrumb-spacer { flex: 1; }
.breadcrumb-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.breadcrumb-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.28rem 0.65rem;
  border-radius: 9999px;
  border: 1px solid rgba(37, 99, 235, 0.18);
  background: rgba(37, 99, 235, 0.05);
  color: #2563eb;
  font-size: 0.7rem;
  font-weight: 700;
  cursor: pointer;
  text-transform: none;
  letter-spacing: 0;
  transition: background 0.2s;
}
.breadcrumb-action-btn:hover { background: rgba(37, 99, 235, 0.1); }
.breadcrumb-action-btn.danger {
  border-color: rgba(239, 68, 68, 0.18);
  background: rgba(239, 68, 68, 0.05);
  color: #dc2626;
}
.breadcrumb-action-btn.danger:hover { background: rgba(239, 68, 68, 0.1); }

/* 阅读进度条（细线，紧贴面包屑下方） */
.article-progress-bar {
  height: 2px;
  background: #f1f5f9;
  border-radius: 9999px;
  overflow: hidden;
  margin-bottom: 2rem;
}
.article-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #2563eb, #10b981);
  border-radius: 9999px;
  transition: width 0.2s ease;
}

/* 文章标题区 */
.article-main-title-block {
  margin-bottom: 0;
}
.article-main-title {
  margin: 0 0 0.65rem;
  font-size: clamp(1.8rem, 3.5vw, 2.8rem);
  font-weight: 900;
  color: #0f172a;
  line-height: 1.1;
  letter-spacing: -0.03em;
}
.article-main-subtitle {
  margin: 0 0 1rem;
  font-size: 1.05rem;
  color: #475569;
  line-height: 1.65;
  font-weight: 450;
}
.article-main-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
}
.article-main-category {
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #2563eb;
}
.article-main-date,
.article-main-views {
  font-size: 0.78rem;
  color: #94a3b8;
  font-weight: 600;
}
.article-main-date::before,
.article-main-views::before {
  content: '·';
  margin-right: 0.75rem;
  color: #e2e8f0;
}
.article-main-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}
.article-main-tag {
  padding: 0.18rem 0.6rem;
  border-radius: 9999px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 0.7rem;
  font-weight: 800;
}

.article-divider {
  border: none;
  border-top: 1px solid rgba(226, 232, 240, 0.9);
  margin: 1.75rem 0 2.25rem;
}

/* 加载骨架 */
.article-loading {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}
.loading-skeleton {
  height: 0.9rem;
  border-radius: 0.4rem;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
.loading-skeleton.short { width: 55%; }
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* 正文 */
.article-body {
  color: #1f2937;
  font-size: 1.05rem;
  line-height: 1.9;
}
.article-plain { white-space: pre-wrap; }

/* ── 响应式 ── */
@media (max-width: 768px) {
  .article-layout { padding-top: 4.5rem; }
  .article-layout-inner { padding: 0 1rem; }
  .article-sidebar { display: none; }
  .article-main { padding: 1.5rem 0 4rem; }
  .breadcrumb-site,
  .breadcrumb-sep { display: none; }
}
</style>
