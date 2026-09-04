<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, nextTick, watch } from 'vue'
import { ArrowLeft, ArrowRight, Edit3, Trash2, Clock, Eye, Tag, BookOpen, Sparkles, User } from 'lucide-vue-next'
import type { ArticleDetail, ArticleListItem, LoginUser } from '../types/blog'
import { getArticleCategory } from '../utils/article'
import { getReadingTime } from '../utils/format'
import { renderMarkdown } from '../utils/markdown'
import { useAIAssistant } from '../composables/useAIAssistantGlobal'

const ai = useAIAssistant()

const props = defineProps<{
  article: ArticleDetail | ArticleListItem
  selectedArticle: ArticleDetail | null
  isLoading: boolean
  showActions: boolean
  previousArticle: ArticleListItem | null
  nextArticle: ArticleListItem | null
  isLoggedIn?: boolean
  loginUser?: Partial<LoginUser> | null
}>()

defineEmits<{
  close: []
  edit: [article: ArticleDetail | ArticleListItem]
  delete: [articleId: number]
  openArticle: [article: ArticleListItem]
}>()

const resolvedAuthor = computed<string | null>(() => {
  const direct = props.article.author?.trim()
  return direct ? direct : null
})

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

const readingMinutes = computed(() => {
  return getReadingTime(props.selectedArticle?.content || props.selectedArticle?.renderContent || props.article.summary || '')
})

const processedContent = computed(() => {
  let html = props.selectedArticle?.contentHtml || props.selectedArticle?.renderContent || ''
  if (!html && props.selectedArticle?.content) {
    html = renderMarkdown(props.selectedArticle.content)
  }
  if (!html) return ''
  let idx = 0
  return html.replace(
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

watch(() => props.selectedArticle?.id, () => {
  nextTick(setupObserver)
})

function scrollToHeading(id: string) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

onUnmounted(() => {
  observer?.disconnect()
  window.removeEventListener('scroll', onWindowScroll)
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
</script>

<template>
  <div class="article-layout">

    <!-- ── 主体：左侧导航 + 右侧正文，整体从 navbar 下方开始 ── -->
    <div class="article-layout-inner">

      <!-- 左侧导航栏 -->
      <aside class="article-sidebar">

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
            <span v-if="resolvedAuthor" class="sidebar-stat">
              <User :size="11" />
              {{ resolvedAuthor }}
            </span>
            <span class="sidebar-stat">
              <Clock :size="11" />
              {{ article.createTime?.slice(0, 10) || '—' }}
            </span>
            <span class="sidebar-stat">
              <Eye :size="11" />
              {{ article.viewCount || 0 }} views
            </span>
            <span class="sidebar-stat">
              <BookOpen :size="11" />
              {{ readingMinutes }} min
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

        <!-- AI 助手：阅读页入口（打开全局抽屉，自动带入文章上下文） -->
        <button
          type="button"
          class="sidebar-ai-card"
          @click="ai.open({
            title: article.title,
            content: (selectedArticle?.content || article.summary || '').slice(0, 1500),
          })"
          title="让 AI 帮你解读这篇文章"
        >
          <span class="sidebar-ai-icon">
            <Sparkles :size="13" />
          </span>
          <span class="sidebar-ai-text">
            <span class="sidebar-ai-title">AI 助手</span>
            <span class="sidebar-ai-sub">解读这篇文章 / 摘要 / 问答</span>
          </span>
          <ArrowRight :size="11" class="sidebar-ai-arrow" />
        </button>

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
          <span class="breadcrumb-site">NEXTIFY</span>
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
            <span v-if="resolvedAuthor" class="article-main-author"><User :size="10" /> {{ resolvedAuthor }}</span>
            <span class="article-main-date">{{ article.createTime?.slice(0, 10) }}</span>
            <span class="article-main-views">{{ article.viewCount || 0 }} views</span>
            <span class="article-main-views">{{ readingMinutes }} min read</span>
          </div>
          <div v-if="article.tagNames?.length" class="article-main-tags">
            <span v-for="tag in article.tagNames" :key="tag" class="article-main-tag">{{ tag }}</span>
          </div>
        </div>

        <hr class="article-divider" />

        <!-- 正文 -->
        <div v-if="isLoading" class="article-body article-loading">
          <div class="loading-skeleton title"></div>
          <div class="loading-skeleton subtitle"></div>
          <div class="loading-skeleton meta"></div>
          <div class="loading-skeleton tags"></div>
          <div class="loading-skeleton divider"></div>
          <div class="loading-skeleton paragraph"></div>
          <div class="loading-skeleton paragraph short"></div>
          <div class="loading-skeleton paragraph"></div>
          <div class="loading-skeleton paragraph"></div>
          <div class="loading-skeleton paragraph short"></div>
        </div>
        <div
          v-else-if="processedContent"
          class="article-body markdown-body"
          v-html="processedContent"
        ></div>
        <div v-else class="article-body article-plain">
          {{ selectedArticle?.content || '文章正文为空。' }}
        </div>

        <nav v-if="previousArticle || nextArticle" class="article-neighbors" aria-label="文章前后导航">
          <button
            v-if="previousArticle"
            class="neighbor-card"
            type="button"
            @click="$emit('openArticle', previousArticle)"
          >
            <span><ArrowLeft :size="14" />上一篇</span>
            <strong>{{ previousArticle.title }}</strong>
          </button>
          <span v-else class="neighbor-card placeholder"></span>

          <button
            v-if="nextArticle"
            class="neighbor-card next"
            type="button"
            @click="$emit('openArticle', nextArticle)"
          >
            <span>下一篇<ArrowRight :size="14" /></span>
            <strong>{{ nextArticle.title }}</strong>
          </button>
          <span v-else class="neighbor-card placeholder"></span>
        </nav>
      </main>

    </div>
  </div>
</template>

<style scoped>
/* ── 整体容器 ── */
.article-layout {
  min-height: 100vh;
  background: #f5f5f7;
  padding-top: 5rem;
}

/* ── 主体布局 ── */
.article-layout-inner {
  max-width: var(--nav-content-max-width);
  margin: 0 auto;
  padding: 0 0.9rem;
  display: flex;
  align-items: flex-start;
}

/* ── 左侧导航栏 ── */
.article-sidebar {
  position: sticky;
  top: 2rem; 
  width: 200px;
  flex-shrink: 0;
  max-height: calc(100vh - 4rem);
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

/* AI 助手卡片（阅读页 sidebar） */
.sidebar-ai-card {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border-radius: 0.75rem;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(99, 102, 241, 0.08) 100%);
  border: 1px solid rgba(139, 92, 246, 0.25);
  color: #7c3aed;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, transform 0.15s;
  text-align: left;
  width: 100%;
  box-shadow: 0 1px 3px rgba(139, 92, 246, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.4);
}
.sidebar-ai-card:hover {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.22) 0%, rgba(99, 102, 241, 0.18) 100%);
  border-color: rgba(139, 92, 246, 0.4);
  transform: translateY(-1px);
}
.sidebar-ai-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 0.5rem;
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  color: #ffffff;
  flex-shrink: 0;
}
.sidebar-ai-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}
.sidebar-ai-title {
  font-size: 0.78rem;
  font-weight: 800;
  color: #6d28d9;
  line-height: 1.2;
}
.sidebar-ai-sub {
  font-size: 0.62rem;
  color: #94a3b8;
  font-weight: 500;
  line-height: 1.3;
}
.sidebar-ai-arrow {
  color: #a78bfa;
  flex-shrink: 0;
  transition: transform 0.2s;
}
.sidebar-ai-card:hover .sidebar-ai-arrow {
  transform: translateX(2px);
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
  padding: 2rem 0 6rem 2rem;
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
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 2.5rem;
}
.article-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #2563eb, #10b981);
  border-radius: 2px;
  transition: width 0.2s ease;
}

/* 文章标题区 */
.article-main-title-block {
  margin-bottom: 0;
}
.article-main-title {
  margin: 0 0 0.65rem;
  font-size: clamp(1.8rem, 3vw, 2.4rem);
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
.article-main-author,
.article-main-date,
.article-main-views {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.78rem;
  color: #94a3b8;
  font-weight: 600;
}
.article-main-author::before,
.article-main-date::before,
.article-main-views::before {
  content: '·';
  margin-right: 0.75rem;
  color: #e2e8f0;
  display: inline-flex;
  align-items: center;
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
.loading-skeleton.title { height: 2.5rem; width: 80%; margin-bottom: 1rem; }
.loading-skeleton.subtitle { height: 1.2rem; width: 60%; margin-bottom: 1rem; }
.loading-skeleton.meta { height: 1rem; width: 40%; margin-bottom: 0.5rem; }
.loading-skeleton.tags { height: 1rem; width: 30%; margin-bottom: 2rem; }
.loading-skeleton.divider { height: 1px; width: 100%; background: #e2e8f0; margin: 1.75rem 0 2.25rem; }
.loading-skeleton.paragraph {
  height: 1rem;
  border-radius: 0.4rem;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  margin-bottom: 0.85rem;
}
.loading-skeleton.paragraph.short { width: 55%; }
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* 正文 */
.article-body {
  color: #1f2937;
  font-size: 1.05rem;
  line-height: 1.68;
}
.article-plain { white-space: pre-wrap; }

.article-neighbors {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-top: 3.5rem;
}
.neighbor-card {
  min-height: 6.25rem;
  padding: 1rem;
  border-radius: 0.85rem;
  border: 1px solid rgba(226, 232, 240, 0.95);
  background: rgba(255, 255, 255, 0.72);
  color: #0f172a;
  text-align: left;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.55rem;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
}
.neighbor-card:hover {
  border-color: rgba(37, 99, 235, 0.32);
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.08);
  transform: translateY(-1px);
}
.neighbor-card span {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: #64748b;
  font-size: 0.72rem;
  font-weight: 850;
}
.neighbor-card strong {
  color: #0f172a;
  font-size: 0.95rem;
  line-height: 1.45;
}
.neighbor-card.next {
  text-align: right;
  align-items: flex-end;
}
.neighbor-card.placeholder {
  visibility: hidden;
  pointer-events: none;
}

/* ── 响应式 ── */
@media (max-width: 768px) {
  .article-layout { padding-top: 4.25rem; }
  .article-layout-inner { padding: 0 0.75rem; }
  /* 侧边栏移动端隐藏 */
  .article-sidebar {
    display: none;
  }
  .article-main { padding: 1.25rem 0 3.5rem; }

  /* 面包屑 */
  .article-neighbors { grid-template-columns: 1fr; }
  .neighbor-card.placeholder { display: none; }
  .breadcrumb-site,
  .breadcrumb-sep { display: none; }
  .breadcrumb-back span { display: none; }
  .breadcrumb-back { padding: 0.3rem; min-width: 2.25rem; }
  .breadcrumb-actions { gap: 0.25rem; }
  .breadcrumb-action-btn span { display: none; }
  .breadcrumb-action-btn { padding: 0.3rem; min-width: 2.25rem; }

  /* 文章标题区：紧凑 */
  .article-main-title { font-size: 1.35rem; margin-bottom: 0.5rem; line-height: 1.2; }
  .article-main-subtitle { font-size: 0.85rem; margin-bottom: 0.75rem; line-height: 1.55; }
  .article-main-meta { flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.6rem; }
  .article-main-category { font-size: 0.62rem; letter-spacing: 0.12em; }
  .article-main-date, .article-main-views { font-size: 0.72rem; }
  .article-main-date::before, .article-main-views::before { margin-right: 0.4rem; }
  .article-main-tags { gap: 0.25rem; }
  .article-main-tag { padding: 0.15rem 0.5rem; font-size: 0.68rem; }

  /* 分割线 */
  .article-divider { margin: 1.25rem 0 1.5rem; }

  /* 骨架屏 */
  .loading-skeleton.title { height: 1.8rem; width: 90%; margin-bottom: 0.75rem; }
  .loading-skeleton.subtitle { height: 1rem; width: 75%; margin-bottom: 0.75rem; }
  .loading-skeleton.meta { height: 0.85rem; width: 45%; margin-bottom: 0.4rem; }
  .loading-skeleton.tags { height: 0.85rem; width: 35%; margin-bottom: 1.5rem; }
}

/* 超窄屏文章优化 */
@media (max-width: 480px) {
  .article-layout-inner { padding: 0 0.65rem; }
  .article-main { padding: 1rem 0 3rem; }
  .article-main-title { font-size: 1.2rem; line-height: 1.25; }
  .article-main-subtitle { font-size: 0.82rem; }
  .article-main-meta { gap: 0.3rem; }
  .article-main-category { font-size: 0.6rem; }
  .article-main-date, .article-main-views { font-size: 0.7rem; }
}

/* ─ 表格样式（与编辑器保持一致）── */
:deep(.markdown-body) table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
  font-size: 0.9rem;
  border: 2px solid #cbd5e1;
  border-radius: 4px;
  overflow: hidden;
}

:deep(.markdown-body) table th,
:deep(.markdown-body) table td {
  border: 1px solid #cbd5e1;
  padding: 0.6rem 0.8rem;
  text-align: left;
  min-width: 80px;
  min-height: 36px;
  position: relative;
}

:deep(.markdown-body) table th {
  background: #e2e8f0;
  font-weight: 600;
  color: #1e293b;
}

:deep(.markdown-body) table td {
  background: #f8fafc;
  color: #334155;
}

:deep(.markdown-body) table td p,
:deep(.markdown-body) table th p {
  margin: 0;
  line-height: 1.6;
}

:deep(.markdown-body) table td p:empty::after,
:deep(.markdown-body) table th p:empty::after {
  content: '\00a0';
}

:deep(.markdown-body) table td:empty::before {
  content: '\00a0';
  display: inline-block;
  min-width: 20px;
  min-height: 20px;
}

:deep(.markdown-body) table tr:hover td {
  background: #e2e8f0;
}

/* 暗色模式表格 */
.dark :deep(.markdown-body) table {
  border-color: #334155;
}

.dark :deep(.markdown-body) table th {
  background: #1e293b;
  color: #e2e8f0;
  border-color: #334155;
}

.dark :deep(.markdown-body) table td {
  background: #0f172a;
  color: #cbd5e1;
  border-color: #334155;
}

.dark :deep(.markdown-body) table tr:hover td {
  background: #1e293b;
}
</style>