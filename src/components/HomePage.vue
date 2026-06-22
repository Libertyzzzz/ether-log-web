<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { BookOpen, ArrowRight, ArrowUpRight, ArrowDown, Lightbulb, Code2, Palette, BookMarked, MessageCircle, Sparkles, Star, Coffee, Clock } from 'lucide-vue-next'
import type { ArticleListItem, Category } from '../types/blog'
import { getArticleCategory, getArticleSummary } from '../utils/article'
import { getReadingTime } from '../utils/format'

const props = defineProps<{
  categories: Category[]
  activeCategoryId: number | null
  articles: ArticleListItem[]
  filteredArticles: ArticleListItem[]
  articleError: string
  isLoadingArticles: boolean
  showActions: boolean
  showFeaturedOnly: boolean
}>()

defineEmits<{
  toggleCategory: [categoryId: number]
  openArticle: [article: ArticleListItem]
  editArticle: [article: ArticleListItem]
  deleteArticle: [articleId: number]
  scrollToPosts: []
  toggleFeatured: [val: boolean]
  openAssessment: [] // 新增：打开人间估值事件
  openDonate: []
  navigate: [page: string]
}>()

const PAGE_SIZE = 9
const displayedCount = ref(PAGE_SIZE)
const isLoadingMore = ref(false)

const displayedArticles = computed(() =>
  props.filteredArticles.slice(0, displayedCount.value)
)

const hasMore = computed(() =>
  displayedCount.value < props.filteredArticles.length
)

const remainingCount = computed(() =>
  props.filteredArticles.length - displayedCount.value
)

function loadMore() {
  if (!hasMore.value || isLoadingMore.value) return
  isLoadingMore.value = true
  setTimeout(() => {
    displayedCount.value += PAGE_SIZE
    isLoadingMore.value = false
  }, 350)
}

let sentinelObserver: IntersectionObserver | null = null
const sentinelRef = ref<HTMLElement | null>(null)

onMounted(() => {
  if (typeof IntersectionObserver === 'undefined') return
  sentinelObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && hasMore.value && !isLoadingMore.value) {
        loadMore()
      }
    },
    { rootMargin: '120px' }
  )
  if (sentinelRef.value) sentinelObserver.observe(sentinelRef.value)
})

onUnmounted(() => {
  sentinelObserver?.disconnect()
})

// 分类图标映射（固定静态，和后端 label 对应）
const categoryIconMap: Record<string, any> = {
  Thought: Lightbulb,
  Code: Code2,
  Design: Palette,
  Guide: BookMarked,
}

// 分类描述（固定静态）
const categoryDescMap: Record<string, string> = {
  Thought: '思考与观察的碎片',
  Code: '代码与技术的实践',
  Design: '设计与美学的探索',
  Guide: '指南与方法论整理',
}

// 文章封面占位渐变（当 coverImg 为空时使用）
const coverGradients = [
  'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
  'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1d4ed8 100%)',
  'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  'linear-gradient(135deg, #0d1117 0%, #161b22 50%, #21262d 100%)',
]

function getCoverGradient(index: number) {
  return coverGradients[index % coverGradients.length]
}

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  return dateStr.slice(0, 10)
}
</script>

<template>
  <div class="home-page">
    <!-- global SidebarNav mounted in App.vue; local instance removed -->

    <!-- ── Hero ── -->
    <section class="hp-hero">
      <div class="hp-hero-inner">
        <div class="hp-hero-copy">
          <div class="hp-hero-label">
            <span class="hp-label-dot"></span>
            JOURNAL / DUST
            <span class="hp-label-arrow">→</span>
          </div>
          <h1 class="hp-hero-title">
            Tracing Thoughts,<br />
            Shaping <span class="hp-hero-accent">Logic.</span>
          </h1>
          <p class="hp-hero-sub">
            万物起手微末，亦如尘埃。<br />
            在繁杂的世界里，捕捉转瞬即逝的审美，<br />
            固化永恒的逻辑。
          </p>
          <div class="hp-hero-actions">
            <button class="hp-btn-primary" type="button" @click="$emit('scrollToPosts')">
              <BookOpen :size="15" />
              开始阅读
            </button>
            <button class="hp-btn-ghost" :class="{ active: showFeaturedOnly }" type="button" @click="$emit('toggleFeatured', !showFeaturedOnly)">
              <Star :size="15" />
              <span>{{ showFeaturedOnly ? '查看全部' : '精选文章' }}</span>
            </button>
            <button class="hp-btn-ghost" type="button" @click="$emit('openAssessment')">
              <Sparkles :size="15" />
              <span>人间估值</span>
            </button>
            <button class="hp-btn-ghost" type="button" @click="$emit('navigate', 'guestbook')">
              <MessageCircle :size="15" />
              <span>留言板</span>
            </button>
          </div>
        </div>

        <!-- 右侧装饰：纯 CSS 玻璃态几何，无需图片资源 -->
        <div class="hp-hero-visual" aria-hidden="true">
          <div class="hp-glass-orb hp-orb-1"></div>
          <div class="hp-glass-orb hp-orb-2"></div>
          <div class="hp-glass-orb hp-orb-3"></div>
          <div class="hp-glass-card">
            <div class="hp-glass-card-inner">
              <span class="hp-glass-label">NEXTIFY</span>
              <strong class="hp-glass-title">E</strong>
              <span class="hp-glass-sub">Vue · Spring · JWT</span>
            </div>
          </div>
          <div class="hp-float-chip hp-chip-1">Thought</div>
          <div class="hp-float-chip hp-chip-2">Code</div>
          <div class="hp-float-chip hp-chip-3">Design</div>
        </div>
      </div>
    </section>

    <!-- ── 分类卡片（固定静态，图标写死） ── -->
    <section class="hp-categories">
      <div class="hp-categories-inner">
        <div
          v-for="cat in categories"
          :key="cat.id"
          class="hp-cat-card"
          :class="{ active: activeCategoryId === cat.id }"
          @click="$emit('toggleCategory', cat.id); $emit('scrollToPosts')"
        >
          <div class="hp-cat-icon">
            <component :is="categoryIconMap[cat.name] || BookMarked" :size="20" />
          </div>
          <div class="hp-cat-info">
            <strong>{{ cat.name }}</strong>
            <span>{{ categoryDescMap[cat.name] || cat.name }}</span>
          </div>
          <ArrowRight class="hp-cat-arrow" :size="14" />
        </div>
      </div>
    </section>

    <!-- ── 最新文章（后端数据） ── -->
    <section id="posts" class="hp-posts">
      <div class="hp-posts-inner">
        <div class="hp-section-header">
          <h2 class="hp-section-title">
            最新文章
            <span class="hp-section-dot"></span>
          </h2>
          <button
            class="hp-view-all"
            type="button"
            @click="showFeaturedOnly && $emit('toggleFeatured', false); activeCategoryId && $emit('toggleCategory', activeCategoryId); $emit('scrollToPosts')"
          >
            查看全部文章 <ArrowUpRight :size="13" />
          </button>
        </div>

        <!-- 加载 / 错误 / 空状态 -->
        <div v-if="articleError" class="hp-state-card">
          <span class="hp-state-tag">Error</span>
          <p>{{ articleError }}</p>
        </div>
        <div v-else-if="isLoadingArticles" class="hp-posts-grid">
          <div v-for="i in 9" :key="i" class="hp-article-card hp-skeleton">
            <div class="hp-skeleton-cover"></div>
            <div class="hp-skeleton-body">
              <div class="hp-skeleton-line title"></div>
              <div class="hp-skeleton-line summary"></div>
              <div class="hp-skeleton-line meta"></div>
            </div>
          </div>
        </div>
        <div v-else-if="!filteredArticles.length" class="hp-state-card">
          <span class="hp-state-tag">Empty</span>
          <p>暂无文章，换个分类看看。</p>
          <div class="hp-empty-illustration">
            <!-- Placeholder for a simple SVG or icon for empty state -->
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-text">
              <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
              <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
              <path d="M10 9H8"/>
              <path d="M16 13H8"/>
              <path d="M16 17H8"/>
            </svg>
            <p>这里空空如也，不如去写点什么？</p>
          </div>
        </div>

        <!-- 文章卡片列表（3 列） -->
        <div v-else class="hp-posts-grid">
          <article
            v-for="(post, index) in displayedArticles"
            :key="post.id"
            class="hp-article-card"
            @click="$emit('openArticle', post)"
          >
            <!-- 封面图：优先用后端 coverImg，无则用渐变占位 -->
            <div
              class="hp-card-cover"
              :style="post.coverImg
                ? `background-image: url('${post.coverImg}')`
                : `background: ${getCoverGradient(index)}`"
            >
              <span class="hp-card-category-badge">{{ getArticleCategory(post) }}</span>
              <div v-if="showActions" class="hp-card-admin-actions" @click.stop>
                <button type="button" class="hp-admin-btn" @click="$emit('editArticle', post)">编辑</button>
                <button type="button" class="hp-admin-btn danger" @click="$emit('deleteArticle', post.id)">删除</button>
              </div>
            </div>

            <!-- 卡片文字区（后端数据） -->
            <div class="hp-card-body">
              <h3 class="hp-card-title">{{ post.title }}</h3>
              <p class="hp-card-summary">{{ getArticleSummary(post) }}</p>
              <div class="hp-card-meta">
                <span class="hp-card-author">Ether</span>
                <span class="hp-card-date">{{ formatDate(post.createTime) }}</span>
                <span class="hp-card-reading-time"><Clock :size="10" /> {{ getReadingTime(post.summary || '') }} min read</span>
                <span class="hp-card-views">{{ post.viewCount }} views</span>
              </div>
            </div>
          </article>

          <template v-if="isLoadingMore">
            <div v-for="i in 3" :key="'more-skel-' + i" class="hp-article-card hp-skeleton">
              <div class="hp-skeleton-cover"></div>
              <div class="hp-skeleton-body">
                <div class="hp-skeleton-line title"></div>
                <div class="hp-skeleton-line summary"></div>
                <div class="hp-skeleton-line meta"></div>
              </div>
            </div>
          </template>
        </div>

        <!-- 加载更多 / 底部结束线 -->
        <div v-if="hasMore && !isLoadingArticles && !articleError && filteredArticles.length" class="hp-load-more-area">
          <div ref="sentinelRef" class="hp-sentinel"></div>
          <button class="hp-load-more-btn" type="button" @click="loadMore()" :disabled="isLoadingMore">
            <template v-if="isLoadingMore">
              <span class="hp-load-more-dot"></span>
              <span class="hp-load-more-dot"></span>
              <span class="hp-load-more-dot"></span>
            </template>
            <template v-else>
              <ArrowDown :size="14" />
              加载更多文章
              <span class="hp-load-more-count">（还剩 {{ remainingCount }} 篇）</span>
            </template>
          </button>
        </div>

        <div v-if="!hasMore && !isLoadingArticles && !articleError && filteredArticles.length" class="hp-end-divider">
          <span class="hp-end-line"></span>
          <span class="hp-end-text">已经到底啦</span>
          <span class="hp-end-line"></span>
        </div>
      </div>
    </section>

    <!-- ── 引言 Banner（固定静态） ── -->
    <section class="hp-quote">
      <div class="hp-quote-inner">
        <div class="hp-quote-content">
          <span class="hp-quote-mark">"</span>
          <blockquote class="hp-quote-text">
            写作，是把模糊的思考变得清晰，<br />
            也是与未来的自己对话。
          </blockquote>
          <div class="hp-quote-footer">
            <cite class="hp-quote-author">— Ether</cite>
            <div class="hp-quote-action">
              <button class="hp-btn-donate" type="button" @click="$emit('openDonate')">
                <Coffee class="hp-btn-donate-icon" :size="16" />
                <span class="hp-btn-donate-text">来杯咖啡吧</span>
              </button>
            </div>
          </div>
        </div>
        <!-- 右侧装饰：纯 CSS，无需图片 -->
        <div class="hp-quote-deco" aria-hidden="true">
          <div class="hp-deco-circle"></div>
          <div class="hp-deco-lamp"></div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* ── 全局背景 ── */
.home-page {
  background:
    radial-gradient(circle at 12% 5%, rgba(68, 105, 255, 0.14), transparent 32rem),
    radial-gradient(circle at 88% 0%, rgba(255, 223, 207, 0.42), transparent 30rem),
    linear-gradient(180deg, #eaf0fb 0%, #f8faff 48%, #eef3fb 100%);
  color: #0f172a;
}

/* ════════════════════════════════
   HERO
════════════════════════════════ */
.hp-hero {
  padding-top: 6.5rem; 
  max-width: 64rem;
  margin: 0 auto;
  padding-left: 1.5rem;
  padding-right: 1.5rem;
}

.hp-hero-inner {
  position: relative;
  background:
    radial-gradient(circle at 78% 28%, rgba(96, 165, 250, 0.24), transparent 16rem),
    radial-gradient(circle at 88% 70%, rgba(240, 171, 252, 0.16), transparent 18rem),
    linear-gradient(145deg, rgba(12, 18, 32, 0.96) 0%, rgba(24, 35, 55, 0.92) 46%, rgba(49, 46, 129, 0.82) 100%);
  border: 1px solid rgba(191, 219, 254, 0.22);
  border-radius: 2rem;
  overflow: hidden;
  padding: 3rem 3.5rem;
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 2rem;
  align-items: center;
  z-index: 1;
  box-shadow:
    0 28px 76px rgba(15, 23, 42, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);
}
.hp-hero-inner::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(120deg, rgba(255, 255, 255, 0.08), transparent 35%),
    radial-gradient(ellipse 80% 60% at 70% 40%, rgba(147, 197, 253, 0.14) 0%, transparent 70%);
  pointer-events: none;
}

/* 左侧文案 */
.hp-hero-label {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #93c5fd;
  margin-bottom: 1.5rem;
}
.hp-label-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #60a5fa;
  box-shadow: 0 0 10px rgba(96, 165, 250, 0.85);
}
.hp-label-arrow { color: #c4b5fd; }

.hp-hero-title {
  margin: 0 0 1.5rem;
  font-size: clamp(1.8rem, 3.2vw, 2.6rem);
  font-weight: 900;
  line-height: 1.15;
  letter-spacing: -0.03em;
  color: #f8fafc;
}
.hp-hero-accent {
  background: linear-gradient(90deg, #60a5fa 0%, #a78bfa 50%, #f0abfc 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  font-style: italic;
}

.hp-hero-sub {
  margin: 0 0 2rem;
  font-size: 1rem;
  color: #cbd5e1;
  line-height: 1.85;
  font-weight: 400;
}

.hp-hero-actions {
  display: flex;
  gap: 0.85rem;
  flex-wrap: wrap;
}
.hp-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: 1px solid rgba(191, 219, 254, 0.18);
  border-radius: 9999px;
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  color: white;
  font-size: 0.88rem;
  font-weight: 800;
  cursor: pointer;
  transition: background 0.2s, transform 0.15s;
}
.hp-btn-primary:hover { background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); transform: translateY(-1px); }
.hp-btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: 1px solid rgba(191, 219, 254, 0.22);
  border-radius: 9999px;
  background: rgba(15, 23, 42, 0.26);
  color: #dbeafe;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}
.hp-btn-ghost:hover { background: rgba(59, 130, 246, 0.16); border-color: rgba(167, 139, 250, 0.42); }
.hp-btn-ghost.active {
  background: rgba(79, 124, 255, 0.22);
  border-color: rgba(147, 197, 253, 0.46);
  color: #ffffff;
}

/* 右侧装饰 */
.hp-hero-visual {
  position: relative;
  height: 280px;
}
.hp-glass-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(1px);
}
.hp-orb-1 {
  width: 220px; height: 220px;
  top: 20px; right: 10px;
  background: radial-gradient(circle at 35% 35%, rgba(147,197,253,0.34), rgba(96,165,250,0.12) 58%, transparent);
  border: 1px solid rgba(191,219,254,0.22);
}
.hp-orb-2 {
  width: 140px; height: 140px;
  top: 60px; right: 80px;
  background: radial-gradient(circle at 40% 30%, rgba(240,171,252,0.22), transparent 70%);
  border: 1px solid rgba(240,171,252,0.16);
}
.hp-orb-3 {
  width: 80px; height: 80px;
  bottom: 80px; right: 40px;
  background: radial-gradient(circle, rgba(96,165,250,0.38), transparent 70%);
}
.hp-glass-card {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 120px; height: 120px;
  border-radius: 2rem;
  background: rgba(255,255,255,0.075);
  border: 1px solid rgba(191,219,254,0.2);
  backdrop-filter: blur(20px);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 24px 60px rgba(2,6,23,0.32);
}
.hp-glass-card-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}
.hp-glass-label { font-size: 0.6rem; font-weight: 800; letter-spacing: 0.2em; color: #93c5fd; text-transform: uppercase; }
.hp-glass-title { font-size: 3rem; font-weight: 900; color: white; line-height: 1; }
.hp-glass-sub { font-size: 0.55rem; color: #94a3b8; font-weight: 600; }

.hp-float-chip {
  position: absolute;
  padding: 0.35rem 0.85rem;
  border-radius: 9999px;
  background: rgba(15,23,42,0.28);
  border: 1px solid rgba(191,219,254,0.18);
  color: #dbeafe;
  font-size: 0.7rem;
  font-weight: 700;
  backdrop-filter: blur(8px);
}
.hp-chip-1 { top: 30px; left: 10px; }
.hp-chip-2 { bottom: 100px; left: 0; }
.hp-chip-3 { bottom: 40px; right: 10px; }

/* ════════════════════════════════
   分类卡片
════════════════════════════════ */
.hp-categories {
  background: transparent;
  padding: 2.25rem 0 1rem;
}
.hp-categories-inner {
  max-width: 64rem;
  margin: 0 auto;
  padding: 0 1.5rem;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}
.hp-cat-card {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 1rem 1.1rem;
  border-radius: 1rem;
  background: rgba(255,255,255,0.78);
  border: 1px solid rgba(191,219,254,0.32);
  cursor: pointer;
  transition: box-shadow 0.2s, border-color 0.2s, transform 0.2s;
  box-shadow: 0 12px 30px rgba(70,91,128,0.08);
}
.hp-cat-card:hover {
  box-shadow: 0 14px 34px rgba(59,130,246,0.12);
  border-color: rgba(79,124,255,0.34);
  transform: translateY(-2px);
}
.hp-cat-card.active {
  background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
  border-color: rgba(147,197,253,0.46);
  box-shadow: 0 14px 34px rgba(37,99,235,0.26);
}
.hp-cat-card.active .hp-cat-icon { background: rgba(255,255,255,0.15); color: white; }
.hp-cat-card.active .hp-cat-info strong { color: white; }
.hp-cat-card.active .hp-cat-info span { color: rgba(255,255,255,0.7); }
.hp-cat-card.active .hp-cat-arrow { color: rgba(255,255,255,0.6); }

.hp-cat-icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.7rem;
  background: #eff6ff;
  color: #3b82f6;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.hp-cat-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}
.hp-cat-info strong {
  font-size: 0.88rem;
  font-weight: 800;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.hp-cat-info span {
  font-size: 0.7rem;
  color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.hp-cat-arrow { color: #cbd5e1; flex-shrink: 0; }

/* ════════════════════════════════
   最新文章
════════════════════════════════ */
.hp-posts {
  padding: 1rem 0 3rem;
  background: transparent;
}
.hp-posts-inner {
  max-width: 64rem;
  margin: 0 auto;
  padding: 0 1.5rem;
}
.hp-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}
.hp-section-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 900;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.hp-section-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: #4f7cff;
  box-shadow: 0 0 8px rgba(79,124,255,0.72);
}
.hp-view-all {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  border: none;
  background: transparent;
  color: #3b82f6;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  letter-spacing: 0.04em;
  transition: gap 0.2s;
}
.hp-view-all:hover { gap: 0.5rem; }

/* 文章网格 */
.hp-posts-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;
}

/* 文章卡片 */
.hp-article-card {
  border-radius: 1.5rem;
  background: rgba(255,255,255,0.84);
  border: 1px solid rgba(203,213,225,0.62);
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.2s;
  box-shadow: 0 14px 34px rgba(70,91,128,0.07);
}
.hp-article-card:hover {
  box-shadow: 0 18px 44px rgba(70,91,128,0.13);
  transform: translateY(-3px);
}

/* 封面图区域 */
.hp-card-cover {
  position: relative;
  height: 180px;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}
.hp-card-category-badge {
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  padding: 0.2rem 0.65rem;
  border-radius: 9999px;
  background: rgba(0,0,0,0.45);
  backdrop-filter: blur(8px);
  color: white;
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.hp-card-admin-actions {
  position: absolute;
  bottom: 0.75rem;
  right: 0.75rem;
  display: flex;
  gap: 0.4rem;
}
.hp-admin-btn {
  padding: 0.25rem 0.65rem;
  border-radius: 9999px;
  border: none;
  background: rgba(255,255,255,0.85);
  color: #334155;
  font-size: 0.7rem;
  font-weight: 700;
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition: background 0.2s;
}
.hp-admin-btn:hover { background: white; }
.hp-admin-btn.danger { color: #dc2626; }
.hp-admin-btn.danger:hover { background: #fee2e2; }

/* 卡片文字区 */
.hp-card-body {
  padding: 1.1rem 1.25rem 1.25rem;
}
.hp-card-title {
  margin: 0 0 0.5rem;
  font-size: 0.95rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.hp-card-summary {
  margin: 0 0 0.85rem;
  font-size: 0.8rem;
  color: #64748b;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.hp-card-meta {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.72rem;
  color: #94a3b8;
  font-weight: 600;
}
.hp-card-author { color: #475569; font-weight: 700; }
.hp-card-date::before,
.hp-card-reading-time::before,
.hp-card-views::before { content: '·'; margin-right: 0.6rem; }
.hp-card-reading-time {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  color: #94a3b8;
}

/* 状态卡片 */
.hp-state-card {
  padding: 2.5rem;
  border-radius: 1.5rem;
  background: rgba(255,255,255,0.84);
  border: 1px solid rgba(203,213,225,0.62);
  text-align: center;
  color: #64748b;
}
.hp-state-tag {
  display: inline-block;
  padding: 0.2rem 0.65rem;
  border-radius: 9999px;
  background: #f1f5f9;
  color: #94a3b8;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 0.75rem;
}

/* 骨架屏 */
.hp-skeleton {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.hp-skeleton-cover {
  height: 180px;
  border-radius: 1.25rem 1.25rem 0 0;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
.hp-skeleton-body {
  padding: 1.1rem 1.25rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.hp-skeleton-line {
  height: 0.9rem;
  border-radius: 0.4rem;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
.hp-skeleton-line.title { width: 90%; }
.hp-skeleton-line.summary { width: 80%; }
.hp-skeleton-line.meta { width: 50%; height: 0.7rem; margin-top: 0.5rem; }

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Empty State Illustration */
.hp-empty-illustration {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  margin-top: 1.5rem;
}
.hp-empty-illustration svg {
  width: 48px;
  height: 48px;
  color: #cbd5e1;
}
.hp-empty-illustration p {
  font-size: 1rem;
  color: #94a3b8;
  font-weight: 600;
}

.hp-load-more-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem 0 1rem;
  gap: 0.5rem;
}
.hp-sentinel {
  height: 1px;
  width: 100%;
}
.hp-load-more-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.4rem;
  border: 1px solid #e2e8f0;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.55);
  color: #64748b;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  backdrop-filter: blur(6px);
}
.hp-load-more-btn:hover {
  background: #ffffff;
  border-color: #c7d2fe;
  color: #4f46e5;
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.15);
}
.hp-load-more-btn:disabled {
  opacity: 0.7;
  cursor: default;
}
.hp-load-more-count {
  font-weight: 500;
  opacity: 0.55;
  font-size: 0.75rem;
}

.hp-load-more-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
  animation: dotPulse 1.2s infinite;
}
.hp-load-more-dot:nth-child(2) { animation-delay: 0.2s; }
.hp-load-more-dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes dotPulse {
  0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1); }
}

.hp-end-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 2.5rem 0 1rem;
}
.hp-end-line {
  flex: 0 0 60px;
  height: 1px;
  background: #e2e8f0;
}
.hp-end-text {
  font-size: 0.75rem;
  font-weight: 600;
  color: #94a3b8;
  white-space: nowrap;
}

/* ════════════════════════════════
   引言 Banner（固定静态）
════════════════════════════════ */
.hp-quote {
  padding: 0 0 3rem;
}
.hp-quote-inner {
  max-width: 64rem;
  margin: 0 auto;
  padding: 0 1.5rem;
}
.hp-quote-inner > * {
  border-radius: 1.75rem;
  overflow: hidden;
}
.hp-quote-content {
  position: relative;
  background:
    radial-gradient(circle at 88% 0%, rgba(79,124,255,0.12), transparent 16rem),
    radial-gradient(circle at 14% 100%, rgba(240,171,252,0.12), transparent 14rem),
    rgba(255, 255, 255, 0.74);
  padding: 2rem 2.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  border-radius: 1.25rem;
  border: 1px solid rgba(203, 213, 225, 0.62);
  box-shadow: 0 14px 36px rgba(70,91,128,0.08);
}
.hp-quote-mark {
  font-size: 3rem;
  line-height: 0.8;
  color: #4f7cff;
  font-family: Georgia, serif;
  font-weight: 900;
  opacity: 0.8;
}
.hp-quote-text {
  margin: 0;
  font-size: clamp(1.05rem, 2vw, 1.35rem);
  font-weight: 700;
  color: #1e293b;
  line-height: 1.65;
  font-style: normal;
}
.hp-quote-footer {
  display: flex;
  align-items: center;
  justify-content: space-between; /* 左右分布，作者在左按钮在右 */
  margin-top: 0.5rem;
}
.hp-quote-author {
  font-size: 0.88rem;
  color: #64748b;
  font-style: normal;
  font-weight: 600;
}

/* ── 打赏按钮集成（引言卡片内） ── */
.hp-quote-action {
  margin-top: 0; /* 移除顶部间距，由 footer 统一控制 */
  display: flex;
  justify-content: flex-start;
}
.hp-btn-donate {
  display: inline-flex; align-items: center; gap: 0.6rem;
  padding: 0.5rem 1rem;
  border-radius: 999px;
  border: 1px solid rgba(203, 213, 225, 0.72);
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  color: #334155; cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
.hp-btn-donate:hover {
  background: #ffffff;
  transform: translateY(-0.5px);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25);
}
.hp-btn-donate-icon { flex-shrink: 0; }
.hp-btn-donate-text { font-size: 0.85rem; font-weight: 800; letter-spacing: 0.02em; }

/* ════════════════════════════════
   响应式
════════════════════════════════ */
@media (max-width: 1024px) {
  .hp-categories-inner { grid-template-columns: repeat(2, 1fr); }
  .hp-posts-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 768px) {
  .hp-quote-footer { flex-direction: column; align-items: flex-start; gap: 1rem; } /* 移动端切回垂直排列 */
  .hp-hero { padding-left: 1rem; padding-right: 1rem; }
  .hp-hero-inner { grid-template-columns: 1fr; padding: 2.5rem 1.5rem; border-radius: 1.5rem; }
  .hp-hero-visual { display: none; }
  .hp-categories-inner { grid-template-columns: repeat(2, 1fr); }
  .hp-posts-grid { grid-template-columns: 1fr; }
  .hp-quote-content { padding: 2rem 1.5rem; }
}
@media (max-width: 480px) {
  .hp-categories-inner { grid-template-columns: 1fr 1fr; }
}

/* 暗色模式 */
</style>