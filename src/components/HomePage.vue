<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { BookOpen, ArrowRight, ArrowUpRight, ArrowDown, Lightbulb, MessageCircle, Sparkles, Star, Coffee, Clock, Send, FlaskConical, Bot } from 'lucide-vue-next'
import type { ArticleListItem, Category } from '../types/blog'
import { getArticleCategory, getArticleSummary } from '../utils/article'
import { getReadingTime } from '../utils/format'
import { useAIAssistant } from '../composables/useAIAssistantGlobal'

const props = defineProps<{
  categories: Category[]
  activeCategoryId: number | null
  articles: ArticleListItem[]
  filteredArticles: ArticleListItem[]
  totalArticles: number
  articleError: string
  isLoadingArticles: boolean
  isLoadingMore: boolean
  showActions: boolean
  showFeaturedOnly: boolean
}>()

const emit = defineEmits<{
  toggleCategory: [categoryId: number]
  openArticle: [article: ArticleListItem]
  editArticle: [article: ArticleListItem]
  deleteArticle: [articleId: number]
  scrollToPosts: []
  toggleFeatured: [val: boolean]
  openAssessment: []
  openDonate: []
  navigate: [page: string]
  loadMore: []
}>()

const hasMore = computed(() =>
  props.filteredArticles.length < props.totalArticles
)

const remainingCount = computed(() =>
  props.totalArticles - props.filteredArticles.length
)

const leadArticle = computed(() => props.filteredArticles[0] || null)
const spotlightArticles = computed(() => props.filteredArticles.slice(1, 3))
const compactArticles = computed(() => props.filteredArticles.slice(3))

const nextifyModules = [
  {
    key: 'blog',
    title: 'Blog',
    desc: '技术写作与长期沉淀',
    icon: BookOpen,
    action: () => emit('scrollToPosts'),
  },
  {
    key: 'ether',
    title: 'ETHER',
    desc: 'AI 助手与知识检索',
    icon: Bot,
    action: () => ai.open(),
  },
  {
    key: 'quant',
    title: 'Quant Lab',
    desc: '量化实验与策略研究',
    icon: FlaskConical,
    action: () => emit('navigate', 'quant-lab'),
  },
  {
    key: 'assessment',
    title: '估值实验',
    desc: '人间估值与自我观察',
    icon: Sparkles,
    action: () => emit('openAssessment'),
  },
  {
    key: 'notes',
    title: 'Notes',
    desc: '碎片思考与灵感记录',
    icon: Lightbulb,
    action: () => emit('scrollToPosts'),
  },
]

function loadMore() {
  if (!hasMore.value || props.isLoadingMore) return
  emit('loadMore')
}

let sentinelObserver: IntersectionObserver | null = null
const sentinelRef = ref<HTMLElement | null>(null)

onMounted(() => {
  if (typeof IntersectionObserver === 'undefined') return
  sentinelObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && hasMore.value && !props.isLoadingMore) {
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

// ── Hero 右侧 AI 助手卡片 ──
const ai = useAIAssistant()
const heroInput = ref('')

const heroExampleQuestions = [
  'Spring Security 登录流程',
  'JWT 如何工作？',
  'Docker 最佳实践',
  'Redis 缓存设计',
]
let heroExampleIndex = ref(3)

function toggleHeroExamples() {
  heroExampleIndex.value = heroExampleIndex.value === 3 ? heroExampleQuestions.length : 3
}

async function heroSendFromInput() {
  const text = heroInput.value.trim()
  if (!text) return
  heroInput.value = ''
  ai.open()
  await ai.sendFreeChat(text)
}

async function heroSendExample(text: string) {
  heroInput.value = ''
  ai.open()
  await ai.sendFreeChat(text)
}

function heroOpenDrawerOnly() {
  ai.open()
}
</script>

<template>
  <div class="home-page">
    <!-- global SidebarNav mounted in App.vue; local instance removed -->

    <!-- ── Hero ── -->
    <section class="hp-hero">
      <div class="hp-hero-inner">
        <div class="hp-hero-copy">
          <div class="hp-hero-badge-row">
            <div class="hp-hero-greeting">
              <span class="hp-greeting-dot"></span>
              你好，我是 Ether
            </div>
            <span class="hp-hero-meta desktop-only">
              <BookOpen :size="11" />
              {{ totalArticles }} 篇文章 · 持续更新
            </span>
          </div>
          <h1 class="hp-hero-title">
            NEXTIFY<br />
            Builds <span class="hp-hero-accent">Systems.</span>
          </h1>
          <!-- PC/平板：产品化副标题 -->
          <p class="hp-hero-sub desktop-only">
            一个由写作、AI 助手与量化实验组成的个人知识系统。<br />
            在代码、认知与数据之间，沉淀长期可复用的判断。
          </p>
          <!-- 移动端：精简一行副标题 -->
          <p class="hp-hero-sub mobile-only">
            写作、AI 助手与量化实验组成的个人知识系统。
          </p>
          <div class="hp-hero-actions">
            <button class="hp-btn-primary" type="button" @click="$emit('scrollToPosts')">
              开始阅读
              <ArrowRight :size="14" />
            </button>
            <!-- PC/平板：次级入口精简为文字链接 -->
            <button class="hp-btn-link desktop-only" type="button" @click="$emit('navigate', 'guestbook')">
              <MessageCircle :size="13" />
              <span>留言板</span>
            </button>
          </div>
          <!-- 移动端：次级入口改用 chip 形式 -->
          <div class="hp-hero-chip-row mobile-only">
            <button class="hp-hero-chip" type="button" :class="{ active: showFeaturedOnly }" @click="$emit('toggleFeatured', !showFeaturedOnly)">
              <Star :size="12" />
              <span>{{ showFeaturedOnly ? '全部' : '精选' }}</span>
            </button>
            <button class="hp-hero-chip" type="button" @click="$emit('navigate', 'guestbook')">
              <MessageCircle :size="12" />
              <span>留言</span>
            </button>
          </div>
        </div>

        <!-- PC/平板：完整 AI 助手卡片 -->
        <div class="hp-hero-ai desktop-only" @click="heroOpenDrawerOnly">
          <!-- 玻璃态背景点缀（保留原装饰风格） -->
          <span class="hp-ai-orb hp-ai-orb-1"></span>
          <span class="hp-ai-orb hp-ai-orb-2"></span>

          <!-- 卡片顶部：标题 + BETA + 在线状态 -->
          <div class="hp-ai-header">
            <div class="hp-ai-title">
              <Sparkles :size="14" />
              <span>ETHER</span>
              <span class="hp-ai-beta">BETA</span>
            </div>
            <div class="hp-ai-status">
              <span class="hp-ai-status-dot"></span>
              <span>在线</span>
            </div>
          </div>

          <!-- 问候语 -->
          <div class="hp-ai-greet">NEXTIFY AI Assistant · 有什么可以帮你？</div>

          <!-- 输入区：阻止冒泡，避免触发 heroOpenDrawerOnly -->
          <div class="hp-ai-input-wrap" @click.stop>
            <input
              v-model="heroInput"
              type="text"
              class="hp-ai-input"
              placeholder="输入你的问题，或 / 选择示例"
              @keyup.enter="heroSendFromInput"
            />
            <button
              class="hp-ai-send"
              type="button"
              :disabled="!heroInput.trim()"
              @click="heroSendFromInput"
              title="发送"
            >
              <Send :size="15" />
            </button>
          </div>

          <!-- 示例按钮区 -->
          <div class="hp-ai-examples" @click.stop>
            <button
              v-for="q in heroExampleQuestions.slice(0, heroExampleIndex)"
              :key="q"
              type="button"
              class="hp-ai-chip"
              @click="heroSendExample(q)"
            >
              {{ q }}
            </button>
            <button
              v-if="heroExampleIndex < heroExampleQuestions.length"
              type="button"
              class="hp-ai-chip hp-ai-chip-more"
              @click="toggleHeroExamples"
            >
              更多 →
            </button>
            <button
              v-else-if="heroExampleQuestions.length > 3"
              type="button"
              class="hp-ai-chip hp-ai-chip-more"
              @click="toggleHeroExamples"
            >
              收起 ↑
            </button>
          </div>
        </div>

        <!-- 移动端：紧凑 AI 触发条（仅在移动端显示） -->
        <div class="hp-ai-mobile-bar mobile-only" @click="heroOpenDrawerOnly">
          <div class="hp-ai-mobile-left">
            <Sparkles :size="16" />
            <span>AI 助手</span>
          </div>
          <div class="hp-ai-mobile-input" @click.stop>
            <input
              v-model="heroInput"
              type="text"
              placeholder="有什么可以帮你？"
              @keyup.enter="heroSendFromInput"
            />
            <button
              class="hp-ai-mobile-send"
              type="button"
              :disabled="!heroInput.trim()"
              @click="heroSendFromInput"
            >
              <Send :size="14" />
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- ── NEXTIFY 能力入口 ─ -->
    <section class="hp-categories">
      <div class="hp-categories-wrapper">
        <div class="hp-categories-inner">
          <div
            v-for="module in nextifyModules"
            :key="module.key"
            class="hp-cat-card"
            :class="`module-${module.key}`"
            @click="module.action"
          >
            <div class="hp-cat-icon">
              <component :is="module.icon" :size="18" />
            </div>
            <div class="hp-cat-info">
              <strong>{{ module.title }}</strong>
              <span>{{ module.desc }}</span>
            </div>
            <ArrowRight class="hp-cat-arrow" :size="13" />
          </div>
        </div>
      </div>
    </section>

    <!-- ── 最新文章（双栏：左文章流 + 右侧栏） ── -->
    <section id="posts" class="hp-posts">
      <div class="hp-posts-inner">
        <!-- 左栏：文章流 -->
        <div class="hp-posts-main">
          <div class="hp-section-header">
            <h2 class="hp-section-title">
              Latest from NEXTIFY
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

          <div v-if="categories.length" class="hp-topic-filter-row">
            <button
              class="hp-topic-filter"
              type="button"
              :class="{ active: !activeCategoryId && !showFeaturedOnly }"
              @click="activeCategoryId && $emit('toggleCategory', activeCategoryId); showFeaturedOnly && $emit('toggleFeatured', false)"
            >
              全部
            </button>
            <button
              class="hp-topic-filter"
              type="button"
              :class="{ active: showFeaturedOnly }"
              @click="$emit('toggleFeatured', !showFeaturedOnly)"
            >
              精选
            </button>
            <button
              v-for="cat in categories.slice(0, 6)"
              :key="cat.id"
              class="hp-topic-filter"
              type="button"
              :class="{ active: activeCategoryId === cat.id }"
              @click="$emit('toggleCategory', cat.id)"
            >
              {{ cat.name }}
            </button>
          </div>

          <!-- 加载 / 错误 / 空状态 -->
          <div v-if="articleError" class="hp-state-card">
            <span class="hp-state-tag">Error</span>
            <p>{{ articleError }}</p>
          </div>
          <div v-else-if="isLoadingArticles" class="hp-posts-list">
            <div v-for="i in 5" :key="i" class="hp-post-item hp-skeleton">
              <div class="hp-post-cover-skeleton"></div>
              <div class="hp-post-skeleton-body">
                <div class="hp-skeleton-line title"></div>
                <div class="hp-skeleton-line summary"></div>
                <div class="hp-skeleton-line meta"></div>
              </div>
            </div>
          </div>
          <div v-else-if="!filteredArticles.length" class="hp-state-card">
            <span class="hp-state-tag">Empty</span>
            <p>暂无文章，换个分类看看。</p>
          </div>

          <!-- 文章列表（主推 + 次重点 + 紧凑卡，保持后端数据结构不变） -->
          <div v-else class="hp-posts-list hp-editorial-list">
            <article
              v-if="leadArticle"
              class="hp-feature-card"
              @click="$emit('openArticle', leadArticle)"
            >
              <div
                class="hp-feature-cover"
                :style="leadArticle.coverImg
                  ? `background-image: url('${leadArticle.coverImg}')`
                  : `background: ${getCoverGradient(0)}`"
              >
                <span class="hp-post-category-tag">{{ getArticleCategory(leadArticle) }}</span>
              </div>
              <div class="hp-feature-body">
                <div class="hp-feature-kicker">Editor's Pick</div>
                <h3 class="hp-feature-title">{{ leadArticle.title }}</h3>
                <p class="hp-feature-summary">{{ getArticleSummary(leadArticle) }}</p>
                <div class="hp-post-meta">
                  <span class="hp-post-author">Ether</span>
                  <span class="hp-post-sep">·</span>
                  <span class="hp-post-date">{{ formatDate(leadArticle.createTime) }}</span>
                  <span class="hp-post-sep">·</span>
                  <span class="hp-post-reading"><Clock :size="10" /> {{ getReadingTime(leadArticle.summary || '') }} min</span>
                </div>
                <button class="hp-feature-read" type="button" @click.stop="$emit('openArticle', leadArticle)">
                  阅读主推 <ArrowRight :size="13" />
                </button>
              </div>
              <div v-if="showActions" class="hp-card-admin-actions" @click.stop>
                <button type="button" class="hp-admin-btn" @click="$emit('editArticle', leadArticle)">编辑</button>
                <button type="button" class="hp-admin-btn danger" @click="$emit('deleteArticle', leadArticle.id)">删除</button>
              </div>
            </article>

            <div v-if="spotlightArticles.length" class="hp-spotlight-grid">
              <article
                v-for="(post, index) in spotlightArticles"
                :key="post.id"
                class="hp-spotlight-card"
                @click="$emit('openArticle', post)"
              >
                <div
                  class="hp-spotlight-cover"
                  :style="post.coverImg
                    ? `background-image: url('${post.coverImg}')`
                    : `background: ${getCoverGradient(index + 1)}`"
                >
                  <span class="hp-post-category-tag">{{ getArticleCategory(post) }}</span>
                </div>
                <div class="hp-spotlight-body">
                  <h3 class="hp-spotlight-title">{{ post.title }}</h3>
                  <p class="hp-spotlight-summary">{{ getArticleSummary(post) }}</p>
                  <div class="hp-post-meta">
                    <span>{{ formatDate(post.createTime) }}</span>
                    <span class="hp-post-sep">·</span>
                    <span class="hp-post-reading"><Clock :size="10" /> {{ getReadingTime(post.summary || '') }} min</span>
                  </div>
                </div>
                <div v-if="showActions" class="hp-card-admin-actions" @click.stop>
                  <button type="button" class="hp-admin-btn" @click="$emit('editArticle', post)">编辑</button>
                  <button type="button" class="hp-admin-btn danger" @click="$emit('deleteArticle', post.id)">删除</button>
                </div>
              </article>
            </div>

            <div v-if="compactArticles.length" class="hp-compact-grid">
              <article
                v-for="(post, index) in compactArticles"
                :key="post.id"
                class="hp-post-item hp-compact-card"
                @click="$emit('openArticle', post)"
              >
                <div
                  class="hp-post-cover"
                  :style="post.coverImg
                    ? `background-image: url('${post.coverImg}')`
                    : `background: ${getCoverGradient(index + 3)}`"
                >
                  <span class="hp-post-category-tag">{{ getArticleCategory(post) }}</span>
                </div>

                <div class="hp-post-body">
                  <h3 class="hp-post-title">{{ post.title }}</h3>
                  <p class="hp-post-summary">{{ getArticleSummary(post) }}</p>
                  <div class="hp-post-meta">
                    <span class="hp-post-date">{{ formatDate(post.createTime) }}</span>
                    <span class="hp-post-sep">·</span>
                    <span class="hp-post-reading"><Clock :size="10" /> {{ getReadingTime(post.summary || '') }} min</span>
                  </div>
                </div>

                <div class="hp-post-arrow">
                  <ArrowRight :size="14" />
                </div>

                <div v-if="showActions" class="hp-card-admin-actions" @click.stop>
                  <button type="button" class="hp-admin-btn" @click="$emit('editArticle', post)">编辑</button>
                  <button type="button" class="hp-admin-btn danger" @click="$emit('deleteArticle', post.id)">删除</button>
                </div>
              </article>
            </div>

            <!-- 加载更多骨架 -->
            <template v-if="isLoadingMore">
              <div v-for="i in 2" :key="'more-skel-' + i" class="hp-post-item hp-skeleton">
                <div class="hp-post-cover-skeleton"></div>
                <div class="hp-post-skeleton-body">
                  <div class="hp-skeleton-line title"></div>
                  <div class="hp-skeleton-line summary"></div>
                  <div class="hp-skeleton-line meta"></div>
                </div>
              </div>
            </template>
          </div>

          <!-- 加载更多 -->
          <div v-if="hasMore && !isLoadingArticles && !articleError && filteredArticles.length" class="hp-load-more-area">
            <div ref="sentinelRef" class="hp-sentinel"></div>
            <button class="hp-load-more-btn" type="button" @click="loadMore()" :disabled="isLoadingMore">
              <template v-if="isLoadingMore">
                <span class="hp-load-more-dot"></span>
                <span class="hp-load-more-dot"></span>
                <span class="hp-load-more-dot"></span>
              </template>
              <template v-else>
                加载更多
                <span class="hp-load-more-count">（剩 {{ remainingCount }} 篇）</span>
                <ArrowDown :size="13" />
              </template>
            </button>
          </div>

          <div v-if="!hasMore && !isLoadingArticles && !articleError && filteredArticles.length" class="hp-end-divider">
            <span class="hp-end-line"></span>
            <span class="hp-end-text">已经到底啦</span>
            <span class="hp-end-line"></span>
          </div>
        </div>

        <!-- 右栏：关于我 + 标签 + 其他入口 -->
        <aside class="hp-posts-sidebar">
          <!-- 关于我卡片 -->
          <div class="hp-sidebar-card">
            <div class="hp-sidebar-title">
              关于我
              <span class="hp-sidebar-subtitle">About</span>
            </div>
            <p class="hp-about-text">
              一名热爱技术的全栈开发者，喜欢在代码中寻找逻辑之美，在文字中记录成长与思考。
            </p>
            <div class="hp-about-stats">
              <div class="hp-about-stat">
                <div class="hp-about-stat-num">{{ totalArticles }}</div>
                <div class="hp-about-stat-label">文章</div>
              </div>
              <div class="hp-about-stat">
                <div class="hp-about-stat-num">{{ categories.length }}</div>
                <div class="hp-about-stat-label">分类</div>
              </div>
              <div class="hp-about-stat">
                <div class="hp-about-stat-num">∞</div>
                <div class="hp-about-stat-label">思考</div>
              </div>
            </div>
          </div>

          <!-- 热门标签卡片 -->
          <div class="hp-sidebar-card">
            <div class="hp-sidebar-title">
              热门标签
              <span class="hp-sidebar-subtitle">Tags</span>
            </div>
            <div class="hp-tags-cloud">
              <button
                v-for="cat in categories.slice(0, 6)"
                :key="cat.id"
                class="hp-tag-chip"
                type="button"
                :class="{ active: activeCategoryId === cat.id }"
                @click="$emit('toggleCategory', cat.id); $emit('scrollToPosts')"
              >
                {{ cat.name }}
              </button>
              <button
                class="hp-tag-chip more"
                type="button"
                @click="activeCategoryId && $emit('toggleCategory', activeCategoryId)"
              >
                +更多
              </button>
            </div>
          </div>

          <!-- NEXTIFY Manifesto -->
          <div class="hp-sidebar-card hp-manifesto-card">
            <div class="hp-sidebar-title">
              NEXTIFY Manifesto
              <span class="hp-sidebar-subtitle">IP</span>
            </div>
            <blockquote class="hp-manifesto-text">
              写作，是把模糊的思考变得清晰，也是与未来的自己对话。
            </blockquote>
            <cite class="hp-manifesto-author">Ether</cite>
            <div class="hp-manifesto-actions">
              <button class="hp-btn-assessment" type="button" @click="$emit('openAssessment')">
                <Sparkles :size="14" />
                <span>人间估值</span>
              </button>
              <button class="hp-btn-donate" type="button" @click="$emit('openDonate')">
                <Coffee class="hp-btn-donate-icon" :size="14" />
                <span class="hp-btn-donate-text">咖啡</span>
              </button>
            </div>
          </div>
        </aside>
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
  padding-top: 6.1rem;
  max-width: var(--content-max-width);
  margin: 0 auto;
  padding-left: 0.9rem;
  padding-right: 0.9rem;
}

.hp-hero-inner {
  position: relative;
  background:
    radial-gradient(circle at 75% 30%, rgba(139, 92, 246, 0.45), transparent 14rem),
    radial-gradient(circle at 92% 75%, rgba(167, 139, 250, 0.35), transparent 18rem),
    radial-gradient(circle at 10% 80%, rgba(59, 130, 246, 0.18), transparent 16rem),
    linear-gradient(145deg, rgba(12, 18, 32, 0.96) 0%, rgba(24, 35, 55, 0.92) 46%, rgba(49, 46, 129, 0.82) 100%);
  border: 1px solid rgba(191, 219, 254, 0.22);
  /* 左右四角统一圆角，视觉更和谐 */
  border-radius: 1.5rem;
  overflow: hidden;
  padding: 0.55rem 0.55rem;
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 0.14rem;
  align-items: center;
  z-index: 1;
  box-shadow:
    0 20px 60px rgba(15, 23, 42, 0.22),
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

/* 顶部 Badge 行（问候 + 文章数） */
.hp-hero-badge-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.22rem;
  gap: 0.18rem;
  flex-wrap: wrap;
}

/* 左侧文案 */
.hp-hero-greeting {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.7rem;
  font-weight: 700;
  color: #cbd5e1;
  letter-spacing: 0.02em;
}
.hp-greeting-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #a78bfa;
  animation: hpGreetingPulse 3s ease-in-out infinite;
}
@keyframes hpGreetingPulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.7; }
}

/* 文章数小标签 */
.hp-hero-meta {
  display: inline-flex;
  align-items: center;
  gap: 0.18rem;
  font-size: 0.7rem;
  color: #cbd5e1;
  font-weight: 600;
}
.hp-hero-meta svg {
  color: #a78bfa;
}

.hp-hero-title {
  margin: 0 0 0.35rem;
  font-size: clamp(1.55rem, 2.65vw, 2.15rem);
  font-weight: 900;
  line-height: 1.1;
  letter-spacing: -0.035em;
  color: #f8fafc;
}
.hp-hero-accent {
  background: linear-gradient(90deg, #a78bfa 0%, #c4b5fd 50%, #ddd6fe 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  font-style: italic;
}

.hp-hero-sub {
  margin: 0 0 0.25rem;
  font-size: 0.8rem;
  color: #cbd5e1;
  line-height: 1.75;
  font-weight: 400;
}

.hp-hero-actions {
  display: flex;
  align-items: center;
  gap: 0.14rem;
  flex-wrap: wrap;
}
.hp-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.1rem;
  padding: 0.45rem 0.85rem;
  border: 1px solid transparent;
  border-radius: 9999px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  font-size: 0.82rem;
  font-weight: 800;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.3), inset 0 1px 0 rgba(255,255,255,0.2);
  letter-spacing: 0.02em;
}
.hp-btn-primary:hover {
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  transform: translateY(-1.5px);
  box-shadow: 0 10px 28px rgba(99, 102, 241, 0.4), inset 0 1px 0 rgba(255,255,255,0.2);
}
.hp-btn-primary svg {
  transition: transform 0.2s ease;
}
.hp-btn-primary:hover svg {
  transform: translateX(2px);
}
.hp-btn-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 9999px;
  background: rgba(15, 23, 42, 0.25);
  color: #cbd5e1;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}
.hp-btn-link:hover {
  background: rgba(59, 130, 246, 0.15);
  border-color: rgba(96, 165, 250, 0.35);
  color: #dbeafe;
}

/* —— Hero 右侧 AI 助手区域（融入 Hero，无独立卡片感） —— */
.hp-hero-ai {
  position: relative;
  padding: 0.25rem 0 0.25rem 1.05rem;
  /* 无独立背景 → 让 Hero 背景直接透过来 */
  background: transparent;
  border: none;
  border-radius: 0;
  cursor: pointer;
  transition: transform 0.2s ease;
  box-shadow: none;
  overflow: visible;
}
.hp-hero-ai:hover {
  /* 不再上浮（避免像卡片） */
  box-shadow: none;
}
.hp-hero-ai:hover::before {
  opacity: 1;
}
/* 左侧渐变分隔线（代替卡片边界） */
.hp-hero-ai::before {
  content: '';
  position: absolute;
  left: 0;
  top: 10%;
  bottom: 10%;
  width: 1px;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(167, 139, 250, 0.35) 25%,
    rgba(167, 139, 250, 0.55) 50%,
    rgba(167, 139, 250, 0.35) 75%,
    transparent 100%
  );
  opacity: 0.7;
  transition: opacity 0.2s ease;
  pointer-events: none;
}
/* 内部光晕点缀 — 用 Hero 已有的颜色体系，避免新视觉元素 */
.hp-ai-orb { display: none; }
.hp-ai-orb-1 { display: none; }
.hp-ai-orb-2 { display: none; }
.hp-ai-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.48rem;
}
.hp-ai-title {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: #e0e7ff;
  font-size: 0.85rem;
  font-weight: 800;
  letter-spacing: 0.02em;
}
.hp-ai-beta {
  display: inline-block;
  font-size: 0.55rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  padding: 2px 6px;
  border-radius: 4px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(96, 165, 250, 0.2));
  color: #f5f3ff;
  border: 1px solid rgba(167, 139, 250, 0.28);
}
.hp-ai-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.65rem;
  font-weight: 600;
  color: #86efac;
}
.hp-ai-status-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: #4ade80;
  box-shadow: 0 0 8px rgba(74, 222, 128, 0.7);
  animation: hpStatusPulse 2s ease-in-out infinite;
}
@keyframes hpStatusPulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50%      { transform: scale(1.3); opacity: 0.8; }
}
.hp-ai-greet {
  position: relative;
  color: #cbd5e1;
  font-size: 0.78rem;
  font-weight: 500;
  margin-bottom: 0.45rem;
  letter-spacing: 0.01em;
}
/* 输入区 — 更轻量，像 Hero 内部的功能区 */
.hp-ai-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 4px 4px 12px;
  background: rgba(15, 23, 42, 0.45);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 9999px;
  margin-bottom: 0.5rem;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.hp-ai-input-wrap:focus-within {
  border-color: rgba(139, 92, 246, 0.45);
  background: rgba(15, 23, 42, 0.6);
}
.hp-ai-input {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: none;
  outline: none;
  color: #f1f5f9;
  font-size: 0.78rem;
  font-weight: 500;
  padding: 6px 0;
}
.hp-ai-input::placeholder {
  color: #94a3b8;
  font-weight: 400;
}
.hp-ai-send {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px; height: 28px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  color: #ffffff;
  transition: transform 0.15s ease;
  flex-shrink: 0;
}
.hp-ai-send:hover:not(:disabled) { transform: scale(1.08); }
.hp-ai-send:disabled {
  background: rgba(99, 102, 241, 0.2);
  color: rgba(226, 232, 240, 0.5);
  cursor: not-allowed;
}
/* 示例按钮 — 弱化玻璃态感，更像 Hero 内部的标签 */
.hp-ai-examples {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}
.hp-ai-chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 9px;
  border-radius: 9999px;
  background: rgba(30, 41, 59, 0.35);
  border: 1px solid rgba(148, 163, 184, 0.15);
  color: #cbd5e1;
  font-size: 0.65rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}
.hp-ai-chip:hover {
  background: rgba(59, 130, 246, 0.18);
  border-color: rgba(139, 92, 246, 0.38);
  color: #e0e7ff;
}
.hp-ai-chip-more {
  background: rgba(139, 92, 246, 0.12);
  border-color: rgba(139, 92, 246, 0.3);
  color: #c4b5fd;
  font-weight: 700;
}
.hp-ai-chip-more:hover {
  background: rgba(139, 92, 246, 0.22);
  border-color: rgba(167, 139, 250, 0.5);
}

/* ════════════════════════════════
   分类卡片（横向滚动）
════════════════════════════════ */
.hp-categories {
  background: transparent;
  padding: 1rem 0 0.5rem;
}
.hp-categories-wrapper {
  max-width: var(--nav-content-max-width);
  margin: 0 auto;
  padding: 0 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.hp-categories-inner {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.75rem;
  overflow-x: auto;
  scroll-behavior: smooth;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding: 0.25rem 0;
}
.hp-categories-inner::-webkit-scrollbar { display: none; }
.hp-cat-scroll-btn {
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  border: 1px solid rgba(191,219,254,0.32);
  background: rgba(255,255,255,0.78);
  color: #64748b;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  box-shadow: 0 4px 12px rgba(70,91,128,0.08);
}
.hp-cat-scroll-btn:hover { background: #fff; color: #2563eb; border-color: rgba(79,124,255,0.34); }
.hp-cat-card {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0.75rem;
  border-radius: 0.85rem;
  background: rgba(255,255,255,0.78);
  border: 1px solid rgba(191,219,254,0.32);
  cursor: pointer;
  transition: box-shadow 0.2s, border-color 0.2s, transform 0.2s;
  box-shadow: 0 8px 22px rgba(70,91,128,0.07);
  flex-shrink: 0;
  min-width: 0;
}
.hp-cat-card.module-blog .hp-cat-icon { background: #eff6ff; color: #2563eb; }
.hp-cat-card.module-ether .hp-cat-icon { background: #f5f3ff; color: #7c3aed; }
.hp-cat-card.module-quant .hp-cat-icon { background: #ecfdf5; color: #059669; }
.hp-cat-card.module-assessment .hp-cat-icon { background: #fff1f2; color: #e11d48; }
.hp-cat-card.module-notes .hp-cat-icon { background: #fff7ed; color: #ea580c; }
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
  width: 2rem;
  height: 2rem;
  border-radius: 0.55rem;
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
  gap: 0.1rem;
  min-width: 0;
}
.hp-cat-info strong {
  font-size: 0.8rem;
  font-weight: 800;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.hp-cat-info span {
  font-size: 0.65rem;
  color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.hp-cat-arrow { color: #cbd5e1; flex-shrink: 0; }

/* ════════════════════════════════
   最新文章（双栏布局）
════════════════════════════════ */
.hp-posts {
  padding: 1.25rem 0 3rem;
  background: transparent;
}
.hp-posts-inner {
  max-width: var(--nav-content-max-width);
  margin: 0 auto;
  padding: 0 0.9rem;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 18rem;
  gap: 2rem;
  align-items: start;
}

/* 左栏：文章流 */
.hp-posts-main {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.hp-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}
.hp-section-title {
  margin: 0;
  font-size: 1.05rem;
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

.hp-topic-filter-row {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  overflow-x: auto;
  scrollbar-width: none;
  padding: 0.1rem 0 0.35rem;
  margin-top: -0.5rem;
}
.hp-topic-filter-row::-webkit-scrollbar { display: none; }
.hp-topic-filter {
  flex-shrink: 0;
  border: 1px solid rgba(203, 213, 225, 0.55);
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.62);
  color: #64748b;
  cursor: pointer;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.38rem 0.78rem;
  transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
}
.hp-topic-filter:hover {
  background: #ffffff;
  border-color: rgba(99, 102, 241, 0.28);
  color: #4f46e5;
}
.hp-topic-filter.active {
  background: #111827;
  border-color: #111827;
  color: #ffffff;
}

/* 文章网格 */
/* 文章列表（纵向堆叠） */
.hp-posts-list {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.hp-editorial-list {
  gap: 1rem;
}

.hp-feature-card {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(18rem, 0.92fr);
  min-height: 18rem;
  overflow: hidden;
  border-radius: 1.05rem;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(203, 213, 225, 0.5);
  cursor: pointer;
  box-shadow: 0 14px 36px rgba(70, 91, 128, 0.08);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}
.hp-feature-card:hover {
  border-color: rgba(99, 102, 241, 0.24);
  box-shadow: 0 18px 44px rgba(70, 91, 128, 0.12);
  transform: translateY(-2px);
}
.hp-feature-cover {
  position: relative;
  min-height: 18rem;
  background-size: cover;
  background-position: center;
  overflow: hidden;
}
.hp-feature-cover::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(15, 23, 42, 0.04), rgba(15, 23, 42, 0.32)),
    linear-gradient(90deg, transparent 60%, rgba(255, 255, 255, 0.18));
}
.hp-feature-body {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.8rem;
  padding: 2rem 2.1rem;
  min-width: 0;
}
.hp-feature-kicker {
  color: #6366f1;
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.hp-feature-title {
  margin: 0;
  color: #0f172a;
  font-size: clamp(1.45rem, 2.4vw, 2.2rem);
  font-weight: 900;
  line-height: 1.16;
}
.hp-feature-summary {
  margin: 0;
  color: #64748b;
  font-size: 0.9rem;
  line-height: 1.75;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.hp-feature-read {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.15rem;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 9999px;
  background: #111827;
  color: #ffffff;
  cursor: pointer;
  font-size: 0.76rem;
  font-weight: 800;
  padding: 0.55rem 0.95rem;
  transition: background 0.18s ease, transform 0.18s ease;
}
.hp-feature-read:hover {
  background: #312e81;
  transform: translateY(-1px);
}

.hp-spotlight-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.9rem;
}
.hp-spotlight-card {
  position: relative;
  overflow: hidden;
  border-radius: 0.95rem;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(203, 213, 225, 0.5);
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}
.hp-spotlight-card:hover {
  border-color: rgba(99, 102, 241, 0.24);
  box-shadow: 0 12px 30px rgba(70, 91, 128, 0.08);
  transform: translateY(-2px);
}
.hp-spotlight-cover {
  position: relative;
  aspect-ratio: 16 / 9;
  background-size: cover;
  background-position: center;
  overflow: hidden;
}
.hp-spotlight-cover::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 40%, rgba(15, 23, 42, 0.22));
}
.hp-spotlight-body {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 1rem 1.05rem 1.1rem;
}
.hp-spotlight-title {
  margin: 0;
  color: #0f172a;
  font-size: 1.02rem;
  font-weight: 850;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.hp-spotlight-summary {
  margin: 0;
  color: #64748b;
  font-size: 0.78rem;
  line-height: 1.65;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.hp-compact-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.7rem;
}

.hp-post-item {
  position: relative;
  display: flex;
  align-items: stretch;
  gap: 1rem;
  padding: 1rem;
  border-radius: 1rem;
  background: rgba(255,255,255,0.82);
  border: 1px solid rgba(203,213,225,0.5);
  cursor: pointer;
  transition: background 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease;
}
.hp-post-item:hover {
  background: rgba(255,255,255,0.96);
  box-shadow: 0 8px 22px rgba(70,91,128,0.07);
  transform: translateY(-2px);
  border-color: rgba(99,102,241,0.25);
}

/* 封面图 */
.hp-post-cover {
  position: relative;
  width: 7.5rem;
  flex-shrink: 0;
  border-radius: 0.85rem;
  background-size: cover;
  background-position: center;
  overflow: hidden;
  min-height: 6rem;
}
.hp-post-cover::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(15,23,42,0) 40%, rgba(15,23,42,0.15) 100%);
}
.hp-post-category-tag {
  position: absolute;
  bottom: 0.45rem;
  left: 0.45rem;
  padding: 0.15rem 0.45rem;
  border-radius: 0.35rem;
  background: rgba(15,23,42,0.55);
  backdrop-filter: blur(6px);
  color: #f1f5f9;
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  z-index: 1;
}

/* 文章正文 */
.hp-post-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.4rem;
}
.hp-post-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.hp-post-summary {
  margin: 0;
  font-size: 0.78rem;
  color: #64748b;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.hp-post-meta {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.7rem;
  color: #94a3b8;
  font-weight: 600;
  flex-wrap: wrap;
}
.hp-post-author { color: #475569; font-weight: 700; }
.hp-post-sep { color: #cbd5e1; }
.hp-post-reading {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
}

/* 右侧箭头 */
.hp-post-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #cbd5e1;
  flex-shrink: 0;
  padding-left: 0.25rem;
  transition: color 0.2s, transform 0.25s ease;
}
.hp-post-item:hover .hp-post-arrow {
  color: #6366f1;
  transform: translateX(4px);
}

/* 管理按钮 */
.hp-card-admin-actions {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  display: flex;
  gap: 0.3rem;
}
.hp-admin-btn {
  padding: 0.22rem 0.55rem;
  border-radius: 9999px;
  border: none;
  background: rgba(255,255,255,0.92);
  color: #334155;
  font-size: 0.68rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(15,23,42,0.08);
  transition: background 0.2s;
}
.hp-admin-btn:hover { background: #fff; }
.hp-admin-btn.danger { color: #dc2626; }
.hp-admin-btn.danger:hover { background: #fee2e2; }

/* 状态卡片 */
.hp-state-card {
  padding: 2rem;
  border-radius: 1.1rem;
  background: rgba(255,255,255,0.92);
  border: 1px solid rgba(203,213,225,0.55);
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

/* 骨架屏（文章列表版本） */
.hp-post-item.hp-skeleton {
  align-items: center;
  gap: 1rem;
}
.hp-post-cover-skeleton {
  width: 7.5rem;
  height: 6rem;
  border-radius: 0.85rem;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  flex-shrink: 0;
}
.hp-post-skeleton-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}
.hp-skeleton-line {
  height: 0.85rem;
  border-radius: 0.4rem;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
.hp-skeleton-line.title { width: 85%; height: 1rem; }
.hp-skeleton-line.summary { width: 70%; }
.hp-skeleton-line.meta { width: 45%; height: 0.7rem; }

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.hp-load-more-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.5rem 0 0.5rem;
  gap: 0.5rem;
}
.hp-sentinel {
  height: 1px;
  width: 100%;
}

/* ════════════════════════════════
   右栏：关于我 + 标签
════════════════════════════════ */
.hp-posts-sidebar {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: sticky;
  top: 4.5rem;
}
.hp-sidebar-card {
  padding: 1.35rem 1.4rem;
  border-radius: 1.1rem;
  background: rgba(255,255,255,0.9);
  border: 1px solid rgba(203,213,225,0.45);
  box-shadow: 0 4px 12px rgba(70,91,128,0.03);
  transition: box-shadow 0.25s ease, border-color 0.25s ease, transform 0.2s ease;
}
.hp-sidebar-card:hover {
  box-shadow: 0 8px 24px rgba(70,91,128,0.05);
  border-color: rgba(99,102,241,0.15);
}
.hp-sidebar-title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.88rem;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 0.85rem;
  letter-spacing: 0.02em;
}
.hp-sidebar-subtitle {
  font-size: 0.65rem;
  font-weight: 600;
  color: #94a3b8;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.8;
}
.hp-about-text {
  margin: 0 0 1.1rem;
  font-size: 0.78rem;
  color: #64748b;
  line-height: 1.75;
}
.hp-about-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.25rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(203,213,225,0.5);
}
.hp-about-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  text-align: center;
  padding: 0.35rem 0.2rem;
  border-radius: 0.7rem;
  transition: background 0.2s ease;
}
.hp-about-stat:hover {
  background: rgba(99,102,241,0.04);
}
.hp-about-stat-num {
  font-size: 1.05rem;
  font-weight: 900;
  color: #6366f1;
  letter-spacing: -0.02em;
  line-height: 1;
}
.hp-about-stat-label {
  font-size: 0.65rem;
  color: #94a3b8;
  font-weight: 600;
  letter-spacing: 0.05em;
}

/* 标签云 */
.hp-tags-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}
.hp-tag-chip {
  padding: 0.32rem 0.75rem;
  border-radius: 9999px;
  border: 1px solid rgba(203,213,225,0.55);
  background: rgba(248,250,252,0.7);
  color: #475569;
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  letter-spacing: 0.02em;
}
.hp-tag-chip:hover {
  background: #eff6ff;
  border-color: rgba(99,102,241,0.3);
  color: #4f46e5;
  transform: translateY(-1px);
}
.hp-tag-chip.active {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border-color: transparent;
  color: white;
  box-shadow: 0 3px 10px rgba(99,102,241,0.25);
}
.hp-tag-chip.more {
  color: #94a3b8;
  background: rgba(241,245,249,0.6);
  font-weight: 700;
}
.hp-manifesto-card {
  background:
    radial-gradient(circle at 100% 0%, rgba(99, 102, 241, 0.08), transparent 9rem),
    rgba(255,255,255,0.9);
}
.hp-manifesto-text {
  margin: 0;
  color: #1e293b;
  font-size: 0.86rem;
  font-weight: 800;
  line-height: 1.75;
}
.hp-manifesto-author {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.85rem;
  color: #64748b;
  font-size: 0.72rem;
  font-style: normal;
  font-weight: 800;
}
.hp-manifesto-author::before {
  content: '';
  width: 18px;
  height: 1px;
  border-radius: 999px;
  background: linear-gradient(90deg, #a78bfa, transparent);
}
.hp-manifesto-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 1rem;
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

.hp-btn-donate,
.hp-btn-assessment {
  display: inline-flex; align-items: center; gap: 0.5rem;
  padding: 0.55rem 1rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
}
.hp-btn-donate {
  border: 1px solid rgba(99,102,241,0.25);
  background: rgba(255, 255, 255, 0.72);
  color: #4f46e5;
}
.hp-btn-assessment {
  border: 1px solid rgba(225, 29, 72, 0.18);
  background: linear-gradient(135deg, rgba(255, 241, 242, 0.82), rgba(245, 243, 255, 0.74));
  color: #be123c;
}
.hp-btn-donate:hover,
.hp-btn-assessment:hover {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border-color: transparent;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(99, 102, 241, 0.25);
}
.hp-btn-donate-icon { flex-shrink: 0; }
.hp-btn-donate-text { letter-spacing: 0.02em; }

/* ════════════════════════════════
   响应式
════════════════════════════════ */
/* 显示/隐藏工具类（与 Navbar 保持一致，避免泄漏 scoped 类名冲突问题 */
.desktop-only { display: inherit; }
.mobile-only { display: none; }

/* ── 移动端：Hero chip 行（次级入口） ── */
.hp-hero-chip-row {
  display: flex;
  gap: 0.45rem;
  flex-wrap: wrap;
  margin-top: 0.65rem;
}
.hp-hero-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.4rem 0.65rem;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.35);
  border: 1px solid rgba(191, 219, 254, 0.22);
  color: #dbeafe;
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.hp-hero-chip:hover { background: rgba(59, 130, 246, 0.25); border-color: rgba(147, 197, 253, 0.4); }
.hp-hero-chip.active {
  background: rgba(79, 124, 255, 0.32);
  border-color: rgba(147, 197, 253, 0.55);
  color: #ffffff;
}

/* ── 移动端：紧凑 AI 触发条 ── */
.hp-ai-mobile-bar {
  display: none;
  margin-top: 1rem;
  padding: 0.55rem 0.6rem 0.55rem 0.85rem;
  border-radius: 9999px;
  background: rgba(15, 23, 42, 0.55);
  border: 1px solid rgba(191, 219, 254, 0.2);
  align-items: center;
  gap: 0.6rem;
  cursor: pointer;
  transition: background 0.15s;
}
.hp-ai-mobile-bar:hover { background: rgba(15, 23, 42, 0.7); }

.hp-ai-mobile-left {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: #c4b5fd;
  font-size: 0.7rem;
  font-weight: 700;
  white-space: nowrap;
  flex-shrink: 0;
}
.hp-ai-mobile-input {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  background: rgba(15, 23, 42, 0.35);
  border-radius: 9999px;
  padding: 0.3rem 0.35rem 0.3rem 0.7rem;
  min-width: 0;
}
.hp-ai-mobile-input input {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: none;
  outline: none;
  color: #f1f5f9;
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0;
}
.hp-ai-mobile-input input::placeholder { color: #94a3b8; }
.hp-ai-mobile-send {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: transform 0.15s;
}
.hp-ai-mobile-send:hover:not(:disabled) { transform: scale(1.08); }
.hp-ai-mobile-send:disabled {
  background: rgba(99, 102, 241, 0.2);
  color: rgba(226, 232, 240, 0.5);
  cursor: not-allowed;
}

/* ── 响应式 ── */
@media (max-width: 1024px) {
  .hp-posts-inner { grid-template-columns: 1fr; gap: 1.5rem; }
  .hp-posts-sidebar { position: static; }
}

/* P1-P3: 移动端全面优化 */
@media (max-width: 768px) {
  .desktop-only { display: none !important; }
  .mobile-only { display: flex !important; }
  .home-page { padding-bottom: 4.75rem; }

  /* Hero 移动端：压缩间距与字号 */
  .hp-hero { padding-left: 0.9rem; padding-right: 0.9rem; padding-top: 4.15rem; padding-bottom: 0.2rem; }
  .hp-hero-inner {
    grid-template-columns: 1fr;
    padding: 1rem 1rem 1rem;
    border-radius: 1rem;
    gap: 0.75rem;
    box-shadow:
      0 14px 36px rgba(15, 23, 42, 0.18),
      inset 0 1px 0 rgba(255, 255, 255, 0.12);
  }
  .hp-hero-badge-row {
    margin-bottom: 0.7rem;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  .hp-hero-greeting {
    font-size: 0.65rem;
    padding: 0.25rem 0.55rem;
    gap: 0.35rem;
  }
  .hp-hero-meta {
    font-size: 0.65rem;
    padding: 0.2rem 0.45rem;
  }
  .hp-hero-title { margin-bottom: 0.42rem; font-size: 1.48rem; line-height: 1.14; }
  .hp-hero-sub { margin-bottom: 0.8rem; font-size: 0.78rem; line-height: 1.65; max-width: 18rem; }
  .hp-hero-actions { gap: 0.45rem; margin-bottom: 0.2rem; }
  .hp-btn-primary { padding: 0.55rem 1.1rem; font-size: 0.75rem; }
  .hp-ai-mobile-bar { display: flex; }

  /* 分类卡片：缩小图标和间距 */
  .hp-categories { padding: 0.6rem 0 0.35rem; }
  .hp-cat-scroll-btn { display: none; }
  .hp-categories-wrapper { padding: 0 0.85rem; gap: 0.3rem; }
  .hp-categories-inner {
    display: flex;
    padding: 0.2rem 0 0.35rem;
    gap: 0.55rem;
    scroll-snap-type: x mandatory;
  }
  .hp-cat-card {
    width: 10.7rem;
    min-width: 10.7rem;
    padding: 0.58rem 0.68rem;
    border-radius: 0.82rem;
    gap: 0.5rem;
    scroll-snap-align: start;
  }
  .hp-cat-icon {
    width: 1.7rem;
    height: 1.7rem;
    border-radius: 0.45rem;
  }
  .hp-cat-icon svg { width: 16px; height: 16px; }
  .hp-cat-info strong { font-size: 0.78rem; }
  .hp-cat-info span { font-size: 0.68rem; }
  .hp-cat-arrow { width: 12px; height: 12px; }

  /* 文章列表：缩小整体 padding 与卡片尺寸 */
  .hp-posts { padding: 0.8rem 0 1.5rem; }
  .hp-posts-inner { padding: 0 0.85rem; gap: 1rem; }
  .hp-posts-main {
    gap: 0.85rem;
  }

  /* 区块标题 */
  .hp-section-header { margin-bottom: 0.75rem; }
  .hp-section-title { font-size: 1rem; gap: 0.4rem; }
  .hp-section-dot { width: 5px; height: 5px; }
  .hp-view-all { font-size: 0.7rem; gap: 0.25rem; }
  .hp-view-all svg { width: 12px; height: 12px; }
  .hp-topic-filter-row {
    margin-top: -0.25rem;
    padding-bottom: 0.35rem;
    gap: 0.4rem;
    scroll-snap-type: x mandatory;
  }
  .hp-topic-filter {
    font-size: 0.7rem;
    padding: 0.36rem 0.72rem;
    scroll-snap-align: start;
  }

  /* 移动端内容改为信息流：减少卡片边界，保留阅读连续性 */
  .hp-posts-list {
    gap: 0;
    border-radius: 1rem;
    background: rgba(255,255,255,0.68);
    border: 1px solid rgba(203,213,225,0.42);
    overflow: hidden;
  }
  .hp-editorial-list {
    gap: 0;
  }
  .hp-feature-card {
    grid-template-columns: 1fr;
    min-height: 0;
    border-radius: 0;
    border: none;
    border-bottom: 1px solid rgba(203,213,225,0.48);
    background: transparent;
    box-shadow: none;
  }
  .hp-feature-card:hover {
    box-shadow: none;
    transform: none;
  }
  .hp-feature-cover {
    min-height: 8.5rem;
    aspect-ratio: 16 / 9;
  }
  .hp-feature-body {
    padding: 1rem 1rem 1.05rem;
    gap: 0.55rem;
  }
  .hp-feature-kicker {
    font-size: 0.62rem;
  }
  .hp-feature-title {
    font-size: 1.18rem;
    line-height: 1.25;
  }
  .hp-feature-summary {
    font-size: 0.76rem;
    line-height: 1.6;
    -webkit-line-clamp: 2;
  }
  .hp-feature-read {
    display: none;
  }
  .hp-spotlight-grid,
  .hp-compact-grid {
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  .hp-spotlight-card,
  .hp-spotlight-body {
    min-width: 0;
  }
  .hp-spotlight-card {
    display: grid;
    grid-template-columns: 4.8rem minmax(0, 1fr);
    gap: 0.75rem;
    padding: 0.82rem 0.92rem;
    border: none;
    border-radius: 0;
    border-bottom: 1px solid rgba(203,213,225,0.45);
    background: transparent;
    box-shadow: none;
  }
  .hp-spotlight-card:hover {
    box-shadow: none;
    transform: none;
  }
  .hp-spotlight-cover {
    width: 4.8rem;
    min-height: 3.9rem;
    aspect-ratio: auto;
    border-radius: 0.66rem;
  }
  .hp-spotlight-cover .hp-post-category-tag {
    display: none;
  }
  .hp-spotlight-body {
    padding: 0;
    justify-content: center;
    gap: 0.28rem;
  }
  .hp-spotlight-title {
    font-size: 0.88rem;
    line-height: 1.36;
  }
  .hp-spotlight-summary {
    font-size: 0.72rem;
    line-height: 1.5;
    -webkit-line-clamp: 1;
  }
  .hp-post-item {
    padding: 0.82rem 0.92rem;
    gap: 0.75rem;
    border: none;
    border-radius: 0;
    border-bottom: 1px solid rgba(203,213,225,0.45);
    background: transparent;
    box-shadow: none;
  }
  .hp-post-item:hover {
    background: rgba(255,255,255,0.48);
    box-shadow: none;
    transform: none;
  }
  .hp-post-item:last-child,
  .hp-compact-grid .hp-post-item:last-child {
    border-bottom: none;
  }
  .hp-post-cover { width: 4.8rem; min-height: 3.9rem; border-radius: 0.66rem; }
  .hp-post-category-tag { display: none; }
  .hp-post-body { gap: 0.25rem; justify-content: center; }
  .hp-post-title { font-size: 0.85rem; line-height: 1.32; }
  .hp-post-summary { font-size: 0.72rem; line-height: 1.5; -webkit-line-clamp: 1; }
  .hp-post-meta { font-size: 0.65rem; gap: 0.25rem; }
  .hp-post-arrow { display: none; }

  /* 骨架屏（移动端） */
  .hp-post-cover-skeleton { width: 4.8rem; height: 3.9rem; border-radius: 0.66rem; }
  .hp-post-skeleton-body { gap: 0.3rem; }
  .hp-skeleton-line { height: 0.75rem; }
  .hp-skeleton-line.title { height: 0.9rem; width: 80%; }
  .hp-skeleton-line.summary { width: 65%; }
  .hp-skeleton-line.meta { width: 40%; height: 0.6rem; }

  /* 侧栏卡片（移动端） */
  .hp-posts-sidebar { gap: 0.75rem; }
  .hp-sidebar-card { padding: 1rem 1.05rem; border-radius: 0.95rem; }
  .hp-sidebar-title { font-size: 0.85rem; margin-bottom: 0.6rem; }
  .hp-about-text { font-size: 0.75rem; margin-bottom: 0.75rem; }
  .hp-about-stat-num { font-size: 0.95rem; }
  .hp-about-stat-label { font-size: 0.62rem; }
  .hp-tag-chip { font-size: 0.7rem; padding: 0.3rem 0.6rem; }
  .hp-manifesto-text { font-size: 0.8rem; line-height: 1.7; }
  .hp-manifesto-actions { margin-top: 0.85rem; }

  /* 状态卡 */
  .hp-state-card { padding: 1.75rem 1rem; border-radius: 1.15rem; }
  .hp-state-card p { font-size: 0.85rem; }
  .hp-state-tag { font-size: 0.65rem; padding: 0.18rem 0.55rem; }

  /* 加载更多 */
  .hp-load-more-area { padding: 1.5rem 0 0.75rem; }
  .hp-load-more-btn {
    padding: 0.5rem 1.1rem;
    font-size: 0.75rem;
    gap: 0.4rem;
  }
  .hp-load-more-btn svg { width: 14px; height: 14px; }
  .hp-load-more-count { font-size: 0.7rem; display: none; }

  /* 底部结束线 */
  .hp-end-divider { padding: 1.75rem 0 0.75rem; gap: 0.75rem; }
  .hp-end-line { flex: 0 0 40px; }
  .hp-end-text { font-size: 0.7rem; }
  .hp-btn-donate,
  .hp-btn-assessment {
    padding: 0.45rem 0.82rem;
    gap: 0.4rem;
    font-size: 0.7rem;
  }
}

@media (max-width: 480px) {
  .hp-hero-inner { padding: 0.85rem 0.9rem 1rem; border-radius: 0.95rem; }
  .hp-hero-title { font-size: 1.05rem; }
  .hp-hero-sub { font-size: 0.75rem; }

  /* 移动端 AI 触发条：从横排改竖排（避免更窄屏拥挤 */
  .hp-ai-mobile-bar {
    padding: 0.7rem 0.85rem;
    border-radius: 1rem;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.55rem;
  }
  .hp-ai-mobile-left { font-size: 0.75rem; }
  .hp-ai-mobile-input {
    width: 100%;
    padding: 0.35rem 0.4rem 0.35rem 0.8rem;
  }

  /* 分类卡片：超窄屏进一步压缩，隐藏描述 */
  .hp-cat-card { width: 135px; min-width: 125px; padding: 0.45rem 0.55rem; gap: 0.4rem; }
  .hp-cat-icon { width: 1.55rem; height: 1.55rem; border-radius: 0.4rem; }
  .hp-cat-icon svg { width: 14px; height: 14px; }
  .hp-cat-info span { display: none; }
  .hp-cat-info strong { font-size: 0.75rem; }
  .hp-cat-arrow { display: none; }

  /* 文章卡片超窄屏：封面进一步缩小 */
  .hp-post-cover { width: 4.75rem; min-height: 4rem; border-radius: 0.65rem; }
}

/* 暗色模式 */
</style>