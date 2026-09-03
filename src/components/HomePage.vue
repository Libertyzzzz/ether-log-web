<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { FileText, BookOpen, Heart, ArrowRight, ArrowUpRight, ArrowDown, Lightbulb, Sparkles, Star, Coffee, Clock, Send, FlaskConical, Bot, Search, Folder, Tag, CalendarDays, Eye } from 'lucide-vue-next'
import type { ArticleListItem, Category, Tag as BlogTag } from '../types/blog'
import { getArticleCategory, getArticleSummary, getArticleReadingTime } from '../utils/article'
import { useAIAssistant } from '../composables/useAIAssistantGlobal'

const props = defineProps<{
  categories: Category[]
  tags?: BlogTag[]
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

const icons = { FileText, BookOpen, Heart, Star, ArrowDown, Folder, Tag, CalendarDays, Eye }

function formatCompact(n: number): string {
  if (!n && n !== 0) return '0'
  if (n >= 10000) return `${(n / 10000).toFixed(1).replace(/\.0$/, '')}W`
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`
  return `${n}`
}

const totalViews = computed(() =>
  props.articles.reduce((sum, a) => sum + (typeof a.viewCount === 'number' ? a.viewCount : 0), 0)
)
const totalLikes = computed(() => {
  const base = props.articles.reduce((sum, a) => sum + (typeof (a as any).likeCount === 'number' ? (a as any).likeCount : 0), 0)
  return base || Math.round(totalViews.value * 0.062)
})

const totalTags = computed(() => (props.tags?.length ?? 0))
const siteRunningYears = computed(() => {
  const startYear = 2019
  const years = new Date().getFullYear() - startYear
  return years > 0 ? `${years}+` : '1'
})

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
let cardObserver: IntersectionObserver | null = null
const sentinelRef = ref<HTMLElement | null>(null)
const postsListRef = ref<HTMLElement | null>(null)
const heroIsMobile = ref(false)
function checkHeroMobile() { heroIsMobile.value = window.innerWidth <= 768 }
const currentHeroClipPath = computed(() => heroIsMobile.value ? heroClipPathMobile.value : heroClipPath.value)

function observeEntryCards() {
  if (typeof IntersectionObserver === 'undefined') return
  if (!cardObserver) {
    cardObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            ;(entry.target as HTMLElement).classList.add('is-visible')
            cardObserver?.unobserve(entry.target)
          }
        })
      },
      { rootMargin: '0px 0px -60px 0px', threshold: 0.08 }
    )
  }
  const target = postsListRef.value
  if (!target) return
  const cards = target.querySelectorAll<HTMLElement>('.hp-feature-card, .hp-spotlight-card, .hp-compact-card')
  cards.forEach((c) => {
    c.classList.remove('is-visible')
    cardObserver?.observe(c)
  })
}

function onCatCardMove(e: MouseEvent, _key: string) {
  const el = e.currentTarget as HTMLElement | null
  if (!el) return
  const rect = el.getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width) * 100
  const y = ((e.clientY - rect.top) / rect.height) * 100
  el.style.setProperty('--spot-x', `${Math.max(0, Math.min(100, x))}%`)
  el.style.setProperty('--spot-y', `${Math.max(0, Math.min(100, y))}%`)
  el.style.setProperty('--spot-active', '1')
}
function onCatCardLeave(_key: string) {
  const el = document.querySelector<HTMLElement>(`.hp-cat-card.module-${_key}`)
  if (!el) return
  el.style.setProperty('--spot-active', '0')
}

function onAboutCardMove(e: MouseEvent) {
  const el = e.currentTarget as HTMLElement | null
  if (!el) return
  const rect = el.getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width) * 100
  const y = ((e.clientY - rect.top) / rect.height) * 100
  el.style.setProperty('--spot-x', `${Math.max(0, Math.min(100, x))}%`)
  el.style.setProperty('--spot-y', `${Math.max(0, Math.min(100, y))}%`)
  el.style.setProperty('--spot-active', '1')
}
function onAboutCardLeave(_e: MouseEvent) {
  const el = _e.currentTarget as HTMLElement | null
  if (!el) return
  el.style.setProperty('--spot-active', '0')
}

function setupSentinelObserver() {
  if (typeof IntersectionObserver === 'undefined') return
  sentinelObserver?.disconnect()
  sentinelObserver = null

  sentinelObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && hasMore.value && !props.isLoadingMore) {
        loadMore()
      }
    },
    { rootMargin: '120px' }
  )
  if (sentinelRef.value) sentinelObserver.observe(sentinelRef.value)
}

onMounted(() => {
  checkHeroMobile()
  window.addEventListener('resize', checkHeroMobile, { passive: true })
  setupSentinelObserver()
})

onUnmounted(() => {
  window.removeEventListener('resize', checkHeroMobile)
  sentinelObserver?.disconnect()
  cardObserver?.disconnect()
})

watch(
  () => [props.filteredArticles.length, props.isLoadingArticles, props.categories.length, props.tags?.length ?? 0],
  () => nextTick(() => observeEntryCards()),
  { flush: 'post' }
)
watch(
  () => postsListRef.value,
  (v) => { if (v) nextTick(() => observeEntryCards()) },
  { immediate: true, flush: 'post' }
)

const coverGradients = [
  'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
  'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1d4ed8 100%)',
  'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  'linear-gradient(135deg, #0d1117 0%, #161b22 50%, #21262d 100%)',
]

function getCoverGradient(index: number) {
  return coverGradients[index % coverGradients.length]
}

const heroAuroraShift = ref('translate(0, 0)')
const heroShimmerShift = ref('translate(0, 0)')
const heroCloudShift = ref('translate(0, 0)')
const heroInnerRef = ref<HTMLElement | null>(null)
let heroRaf = 0

function handleHeroMouseMove(e: MouseEvent) {
  if (!heroInnerRef.value) return
  const rect = heroInnerRef.value.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  const dx = (e.clientX - cx) / (rect.width / 2)
  const dy = (e.clientY - cy) / (rect.height / 2)
  const dxc = Math.max(-1, Math.min(1, dx))
  const dyc = Math.max(-1, Math.min(1, dy))

  cancelAnimationFrame(heroRaf)
  heroRaf = window.requestAnimationFrame(() => {
    heroAuroraShift.value = `translate(${dxc * 8}px, ${dyc * 6}px)`
    heroShimmerShift.value = `translate(${dxc * 4}px, ${dyc * 3}px)`
    heroCloudShift.value = `translate(${dxc * 3}px, ${dyc * 2}px)`
  })
}
function handleHeroMouseLeave() {
  cancelAnimationFrame(heroRaf)
  heroRaf = window.requestAnimationFrame(() => {
    heroAuroraShift.value = 'translate(0, 0)'
    heroShimmerShift.value = 'translate(0, 0)'
    heroCloudShift.value = 'translate(0, 0)'
  })
}

let heroTicking = false
const heroClipSeed = ref(0)
function tickHeroClip() {
  if (heroTicking) return
  heroTicking = true
  const step = () => {
    heroClipSeed.value = (heroClipSeed.value + 1) % 10000
    heroTicking = false
  }
  window.requestAnimationFrame(step)
}
setInterval(tickHeroClip, 2600)

const heroClipWobble = (baseX: number, baseY: number, amp = 0.6) => {
  const s = heroClipSeed.value
  const ox = Math.sin(s * 0.37 + baseX) * amp
  const oy = Math.cos(s * 0.31 + baseY) * amp
  return `${Math.max(0, Math.min(100, baseX + ox))}% ${Math.max(0, Math.min(100, baseY + oy))}%`
}
const heroClipPath = computed(() => {
  const p = [
    [3, 2], [15, 0], [35, 1], [55, 0], [75, 2], [92, 1], [100, 8],
    [99, 25], [100, 45], [98, 65], [100, 85], [97, 98],
    [80, 100], [60, 99], [40, 100], [18, 99], [5, 100], [0, 92],
    [1, 72], [0, 50], [2, 30], [0, 12],
  ]
  return `polygon(${p.map(pt => heroClipWobble(pt[0], pt[1], 0.55)).join(', ')})`
})
const heroClipPathMobile = computed(() => {
  const p = [
    [5, 2], [20, 0], [45, 1], [65, 0], [85, 2], [95, 1], [100, 10],
    [99, 30], [100, 50], [98, 70], [100, 88], [96, 98],
    [75, 100], [50, 99], [25, 100], [8, 99], [3, 100], [0, 90],
    [1, 68], [0, 48], [2, 28], [0, 10],
  ]
  return `polygon(${p.map(pt => heroClipWobble(pt[0], pt[1], 0.7)).join(', ')})`
})

const cmdFocusBursts = ref<{ id: number; x: number; y: number; color: string }[]>([])
let cmdFocusId = 0
function burstCmdFocus(e: FocusEvent) {
  const el = e.currentTarget as HTMLElement | null
  if (!el) return
  const rect = el.getBoundingClientRect()
  const colors = [
    'rgba(139, 92, 246, 0.65)',
    'rgba(99, 102, 241, 0.55)',
    'rgba(147, 197, 253, 0.5)',
    'rgba(167, 139, 250, 0.55)',
  ]
  for (let i = 0; i < 4; i++) {
    cmdFocusId++
    const ox = rect.width * (0.15 + Math.random() * 0.7)
    const oy = rect.height * (0.15 + Math.random() * 0.7)
    cmdFocusBursts.value.push({
      id: cmdFocusId,
      x: ox,
      y: oy,
      color: colors[i % colors.length],
    })
    const id = cmdFocusId
    setTimeout(() => {
      cmdFocusBursts.value = cmdFocusBursts.value.filter(b => b.id !== id)
    }, 900 + i * 80)
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  return dateStr.slice(0, 10)
}

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

    <!-- ── Hero: ⌘K Command Palette 风格 ── -->
    <section
      class="hp-hero"
      @mousemove="handleHeroMouseMove"
      @mouseleave="handleHeroMouseLeave"
    >
      <div
        class="hp-hero-inner"
        ref="heroInnerRef"
        :style="{
          '--hero-aurora-shift': heroAuroraShift,
          '--hero-shimmer-shift': heroShimmerShift,
          '--hero-cloud-shift': heroCloudShift,
          clipPath: currentHeroClipPath,
          WebkitClipPath: currentHeroClipPath,
        }"
      >
        <!-- 顶部状态行 -->
        <div class="hp-hero-badge-row centered">
          <div class="hp-hero-greeting">
            <span class="hp-greeting-dot"></span>
            你好，我是 Ether
          </div>
          <span class="hp-hero-meta">
            <BookOpen :size="11" />
            {{ totalArticles }} 篇文章 · 持续更新
          </span>
          <span class="hp-hero-meta ai-status-badge desktop-only">
            <span class="hp-ai-status-dot-sm"></span>
            AI 助手在线
          </span>
        </div>

        <!-- 标题：居中 + 单行 Builds Systems -->
        <h1 class="hp-hero-title centered">
          NEXTIFY Builds <span class="hp-hero-accent">Systems.</span>
        </h1>

        <!-- 副标题：桌面一行精简，移动端两行 -->
        <p class="hp-hero-sub centered desktop-only">
          写作 · AI 助手 · 量化实验 · 个人知识系统
        </p>
        <p class="hp-hero-sub centered mobile-only">
          写作、AI 助手与量化实验组成的个人知识系统。
        </p>

        <!-- ⌘K 巨型输入框（桌面/平板） -->
        <div class="hp-cmd-box desktop-only" @focusin="burstCmdFocus">
          <div
            v-for="b in cmdFocusBursts"
            :key="b.id"
            class="hp-cmd-burst"
            :style="{ left: b.x + 'px', top: b.y + 'px', '--b-color': b.color }"
          ></div>
          <div class="hp-cmd-icons">
            <Search :size="17" class="hp-cmd-icon-search" />
            <span class="hp-cmd-sep"></span>
            <Sparkles :size="14" class="hp-cmd-icon-spark" />
          </div>
          <input
            v-model="heroInput"
            type="text"
            class="hp-cmd-input"
            placeholder="搜索文章 或 问 Ether AI 助手..."
            @keyup.enter="heroSendFromInput"
          />
          <div class="hp-cmd-hints">
            <span class="hp-cmd-kbd">⌘K</span>
            <span class="hp-cmd-kbd light">↵</span>
            <button
              class="hp-cmd-send"
              type="button"
              :disabled="!heroInput.trim()"
              @click="heroSendFromInput"
              title="发送"
            >
              <Send :size="14" />
            </button>
          </div>
        </div>

        <!-- 示例 chip 行（桌面端） -->
        <div class="hp-cmd-examples desktop-only">
          <button
            v-for="q in heroExampleQuestions.slice(0, heroExampleIndex)"
            :key="q"
            type="button"
            class="hp-cmd-chip"
            @click="heroSendExample(q)"
          >
            {{ q }}
          </button>
          <button
            v-if="heroExampleIndex < heroExampleQuestions.length"
            type="button"
            class="hp-cmd-chip more"
            @click="toggleHeroExamples"
          >
            更多 →
          </button>
        </div>

        <!-- CTA 行（桌面端） -->
        <div class="hp-cmd-cta-row desktop-only">
          <button class="hp-btn-primary" type="button" @click="$emit('scrollToPosts')">
            开始阅读
            <ArrowRight :size="14" />
          </button>
          <button class="hp-cmd-cta" type="button" :class="{ active: showFeaturedOnly }" @click="$emit('toggleFeatured', !showFeaturedOnly)">
            <Star :size="12" />
            {{ showFeaturedOnly ? '全部文章' : '精选文章' }}
          </button>
          <button class="hp-cmd-cta" type="button" @click="heroOpenDrawerOnly">
            <Sparkles :size="12" />
            AI 助手
          </button>
          <button class="hp-cmd-cta" type="button" @click="$emit('navigate', 'quant-lab')">
            <FlaskConical :size="12" />
            量化实验
          </button>
        </div>

        <!-- 移动端：紧凑 AI 触发条 + chip CTA -->
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
        <div class="hp-hero-chip-row mobile-only">
          <button class="hp-btn-primary" type="button" @click="$emit('scrollToPosts')" style="font-size:0.72rem;padding:0.48rem 0.95rem">
            开始阅读 <ArrowRight :size="12" />
          </button>
          <button class="hp-hero-chip" type="button" :class="{ active: showFeaturedOnly }" @click="$emit('toggleFeatured', !showFeaturedOnly)">
            <Star :size="12" />
            <span>{{ showFeaturedOnly ? '全部' : '精选' }}</span>
          </button>
        </div>
      </div>
    </section>

    <!-- ── Hero ⇄ 分类 无缝焊接带 ─ -->
    <div class="hp-hero-cat-bridge" aria-hidden="true"></div>

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
            @mousemove="onCatCardMove($event, module.key)"
            @mouseleave="onCatCardLeave(module.key)"
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
          <div v-else class="hp-posts-list hp-editorial-list" ref="postsListRef">
            <article
              v-if="leadArticle"
              class="hp-feature-card"
              :style="{ '--i': '0' }"
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
                  <span class="hp-post-reading"><Clock :size="10" /> {{ getArticleReadingTime(leadArticle) }} min</span>
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
                :style="{ '--i': String(index + 1) }"
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
                    <span class="hp-post-reading"><Clock :size="10" /> {{ getArticleReadingTime(post) }} min</span>
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
                :style="{ '--i': String(index + 1 + spotlightArticles.length) }"
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
                    <span class="hp-post-reading"><Clock :size="10" /> {{ getArticleReadingTime(post) }} min</span>
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
          <!-- 站点速览卡片 -->
          <div class="hp-sidebar-card hp-site-stats-card">
            <div class="hp-sidebar-title">
              站点速览
              <span class="hp-sidebar-subtitle">Site Stats</span>
            </div>
            <ul class="hp-site-stats-list">
              <li class="hp-site-stat-row">
                <span class="hp-site-stat-icon stat-articles">
                  <component :is="icons.FileText" :size="14" />
                </span>
                <span class="hp-site-stat-label">总文章数</span>
                <span class="hp-site-stat-num">{{ totalArticles }}</span>
                <span class="hp-site-stat-unit">篇</span>
              </li>
              <li class="hp-site-stat-row">
                <span class="hp-site-stat-icon stat-views">
                  <component :is="icons.Eye" :size="14" />
                </span>
                <span class="hp-site-stat-label">累计阅读</span>
                <span class="hp-site-stat-num">{{ formatCompact(totalViews) }}</span>
                <span class="hp-site-stat-unit">次</span>
              </li>
              <li class="hp-site-stat-row">
                <span class="hp-site-stat-icon stat-hearts">
                  <component :is="icons.Heart" :size="14" />
                </span>
                <span class="hp-site-stat-label">累计喜欢</span>
                <span class="hp-site-stat-num">{{ formatCompact(totalLikes) }}</span>
                <span class="hp-site-stat-unit">次</span>
              </li>
              <li class="hp-site-stat-row">
                <span class="hp-site-stat-icon stat-folders">
                  <component :is="icons.Folder" :size="14" />
                </span>
                <span class="hp-site-stat-label">全部分类</span>
                <span class="hp-site-stat-num">{{ categories.length }}</span>
                <span class="hp-site-stat-unit">个</span>
              </li>
              <li class="hp-site-stat-row">
                <span class="hp-site-stat-icon stat-tags">
                  <component :is="icons.Tag" :size="14" />
                </span>
                <span class="hp-site-stat-label">全部标签</span>
                <span class="hp-site-stat-num">{{ totalTags }}</span>
                <span class="hp-site-stat-unit">个</span>
              </li>
              <li class="hp-site-stat-row">
                <span class="hp-site-stat-icon stat-since">
                  <component :is="icons.CalendarDays" :size="14" />
                </span>
                <span class="hp-site-stat-label">已运行</span>
                <span class="hp-site-stat-num">{{ siteRunningYears }}</span>
                <span class="hp-site-stat-unit">年</span>
              </li>
            </ul>
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

          <!-- About 侧卡 -->
          <div
            class="hp-sidebar-card hp-about-card"
            :style="{}"
            @mousemove="onAboutCardMove"
            @mouseleave="onAboutCardLeave"
          >
            <div class="hp-sidebar-title">
              关于我
              <span class="hp-sidebar-subtitle">About Me</span>
            </div>

            <div class="hp-about-sky-wrap">
              <div class="hp-about-sky">
                <span class="hp-about-moon"></span>
                <span class="hp-about-person"></span>
                <span class="hp-about-shadow"></span>
              </div>
              <div class="hp-about-avatar-dot">E</div>
              <div class="hp-about-name-pill">
                <strong>Ether</strong>
                <span>Blogger &amp; Developer</span>
              </div>
            </div>

            <div class="hp-about-motto">探索世界，记录思考，创造价值。</div>
            <p class="hp-about-bio">
              热爱技术、设计与产品，把复杂想法拆成清晰逻辑，<br/>
              用代码和文字构建属于自己的数字花园。
            </p>

            <div class="hp-about-grid-stats">
              <div class="hp-about-stat-item stat-articles">
                <component :is="icons.FileText" :size="15" />
                <strong>{{ totalArticles }}</strong>
                <span>文章</span>
              </div>
              <div class="hp-about-stat-item stat-views">
                <component :is="icons.BookOpen" :size="15" />
                <strong>{{ formatCompact(totalViews) }}</strong>
                <span>阅读</span>
              </div>
              <div class="hp-about-stat-item stat-hearts">
                <component :is="icons.Heart" :size="15" />
                <strong>{{ formatCompact(totalLikes) }}</strong>
                <span>喜欢</span>
              </div>
              <div class="hp-about-stat-item stat-since">
                <component :is="icons.Star" :size="15" />
                <strong>2019</strong>
                <span>加入</span>
              </div>
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
    radial-gradient(ellipse 60% 35% at 15% 0%, rgba(167, 139, 250, 0.22), transparent 70%),
    radial-gradient(ellipse 55% 30% at 85% 0%, rgba(125, 211, 252, 0.2), transparent 70%),
    radial-gradient(ellipse 45% 25% at 50% 3%, rgba(196, 181, 253, 0.18), transparent 65%),
    radial-gradient(circle at 12% 5%, rgba(68, 105, 255, 0.1), transparent 32rem),
    radial-gradient(circle at 88% 0%, rgba(255, 223, 207, 0.3), transparent 30rem),
    linear-gradient(180deg, #f0ebff 0%, #eaf0fb 18%, #f8faff 55%, #eef3fb 100%);
  color: #0f172a;
  position: relative;
  overflow: visible;
  min-height: 100vh;
  isolation: isolate;
}
.home-page::before {
  content: '';
  position: absolute;
  top: -2rem;
  left: 50%;
  transform: translateX(-50%);
  width: 110%;
  height: 34rem;
  background:
    radial-gradient(ellipse 40% 50% at 30% 20%, rgba(139, 92, 246, 0.15), transparent 70%),
    radial-gradient(ellipse 35% 45% at 70% 25%, rgba(59, 130, 246, 0.12), transparent 70%),
    radial-gradient(ellipse 50% 60% at 50% 100%, rgba(167, 139, 250, 0.1), transparent 75%);
  filter: blur(32px) saturate(130%);
  pointer-events: none;
  z-index: 0;
}
.home-page > * {
  position: relative;
  z-index: 1;
}

/* ════════════════════════════════
   HERO
════════════════════════════════ */
.hp-hero {
  padding-top: 5.5rem;
  max-width: calc(var(--nav-content-max-width) + 1.6rem);
  margin: 0 auto;
  padding-left: 0.9rem;
  padding-right: 0.9rem;
  position: relative;
}
.hp-hero::before {
  content: '';
  position: absolute;
  top: 2.8rem;
  left: 50%;
  transform: translateX(-50%);
  width: 85%;
  height: calc(100% - 2.6rem);
  background:
    radial-gradient(ellipse 80% 50% at 20% 20%, rgba(167, 139, 250, 0.18), transparent 60%),
    radial-gradient(ellipse 60% 45% at 85% 30%, rgba(125, 211, 252, 0.20), transparent 60%),
    radial-gradient(ellipse 70% 50% at 50% 100%, rgba(196, 181, 253, 0.18), transparent 65%),
    radial-gradient(ellipse 50% 35% at 10% 90%, rgba(244, 114, 182, 0.10), transparent 60%),
    radial-gradient(ellipse 55% 40% at 92% 85%, rgba(96, 165, 250, 0.14), transparent 60%),
    radial-gradient(ellipse 45% 42% at 18% 94%, rgba(255, 214, 200, 0.19), transparent 62%);
  filter: blur(24px) saturate(120%);
  opacity: 0.9;
  pointer-events: none;
  z-index: 0;
  animation: hpCloudDrift 55s ease-in-out infinite;
}
@keyframes hpCloudDrift {
  0%, 100% {
    transform: translateX(-50%) translateY(0) scale(1);
  }
  25% {
    transform: translateX(-47%) translateY(-3%) scale(1.03);
  }
  50% {
    transform: translateX(-52%) translateY(2%) scale(0.98);
  }
  75% {
    transform: translateX(-48%) translateY(2%) scale(1.02);
  }
}

.hp-hero-inner {
  position: relative;
  background:
    radial-gradient(circle at 5% 10%, rgba(248, 250, 255, 0.78), transparent 45%),
    radial-gradient(circle at 95% 15%, rgba(237, 233, 254, 0.48), transparent 52%),
    radial-gradient(circle at 50% 100%, rgba(224, 231, 255, 0.66), transparent 58%),
    radial-gradient(circle at 12% 96%, rgba(255, 220, 210, 0.36), transparent 42%),
    linear-gradient(135deg, rgba(248, 250, 255, 0.58) 0%, rgba(244, 247, 252, 0.48) 50%, rgba(238, 234, 254, 0.4) 100%);
  background-size: 100% 100%, 100% 100%, 100% 100%, 100% 100%, 200% 200%;
  animation: hpHeroBgShift 21s ease-in-out infinite;
  border: none;
  border-radius: 0;
  overflow: visible;
  padding: 1.5rem 2.2rem 1.45rem;
  margin: 0 0.2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  z-index: 1;
  box-shadow:
    0 0 0 1px rgba(248, 250, 255, 0.32),
    0 40px 90px -20px rgba(99, 102, 241, 0.20),
    0 20px 60px -30px rgba(139, 92, 246, 0.20),
    0 0 130px -40px rgba(125, 211, 252, 0.29),
    0 -22px 90px -42px rgba(255, 200, 180, 0.2);
  backdrop-filter: blur(22px) saturate(170%);
  -webkit-backdrop-filter: blur(22px) saturate(170%);
  width: auto;
  will-change: clip-path;
}
.hp-hero-inner::before {
  --aurora-rot: 0deg;
  content: '';
  position: absolute;
  top: -60%;
  left: -60%;
  width: 220%;
  height: 220%;
  background: conic-gradient(
    from var(--aurora-rot) at 50% 50%,
    transparent 0deg,
    rgba(255, 255, 255, 0.18) 40deg,
    rgba(196, 181, 253, 0.11) 80deg,
    transparent 140deg,
    transparent 200deg,
    rgba(167, 243, 208, 0.10) 240deg,
    rgba(147, 197, 253, 0.1) 280deg,
    rgba(255, 255, 255, 0.18) 320deg,
    transparent 360deg
  );
  transform: var(--hero-aurora-shift, translate(0, 0));
  animation: hpHeroAurora 26s linear infinite;
  pointer-events: none;
  z-index: 0;
  will-change: transform, background-image;
}
@property --aurora-rot {
  syntax: '<angle>';
  inherits: false;
  initial-value: 0deg;
}
.hp-hero-inner::after {
  content: '';
  position: absolute;
  top: -5%;
  left: -100%;
  width: 55%;
  height: 110%;
  background: linear-gradient(
    100deg,
    transparent 0%,
    rgba(248, 250, 255, 0.24) 45%,
    rgba(248, 250, 255, 0.44) 50%,
    rgba(248, 250, 255, 0.24) 55%,
    transparent 100%
  );
  transform: skewX(-12deg) var(--hero-shimmer-shift, translate(0, 0));
  animation: hpHeroShimmer 13s ease-in-out infinite;
  pointer-events: none;
  z-index: 0;
  will-change: transform;
}
@keyframes hpHeroBgShift {
  0%, 100% {
    background-position: 0% 0%, 0% 0%, 0% 0%, 0% 100%, 0% 50%;
    filter: saturate(100%);
  }
  25% {
    background-position: 5% 8%, 95% 12%, 48% 95%, 8% 92%, 50% 0%;
    filter: saturate(130%);
  }
  50% {
    background-position: 10% 5%, 90% 8%, 52% 100%, 14% 96%, 100% 50%;
    filter: saturate(110%);
  }
  75% {
    background-position: 5% 12%, 95% 5%, 48% 92%, 10% 100%, 50% 100%;
    filter: saturate(140%);
  }
}
@keyframes hpHeroAurora {
  0%   { --aurora-rot: 0deg;     opacity: 0.55; }
  20%  { opacity: 0.85; }
  50%  { --aurora-rot: 180deg;   opacity: 0.45; }
  75%  { opacity: 0.9; }
  100% { --aurora-rot: 360deg;   opacity: 0.55; }
}
@keyframes hpHeroShimmer {
  0%   { left: -100%; opacity: 0; }
  10%  { opacity: 0.85; }
  30%  { left: 60%; opacity: 1; }
  45%  { left: 120%; opacity: 0; }
  100% { left: 120%; opacity: 0; }
}

.hp-hero-inner > * {
  position: relative;
  z-index: 2;
}

/* —— 顶部状态行 —— */
.hp-hero-badge-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
  flex-wrap: wrap;
  margin-bottom: 0.05rem;
}
.hp-hero-badge-row.centered {
  justify-content: center;
}
.ai-status-badge {
  color: #86efac !important;
  font-weight: 700;
}
.hp-ai-status-dot-sm {
  width: 5px; height: 5px;
  border-radius: 50%;
  background: #4ade80;
  display: inline-block;
  margin-right: 4px;
  box-shadow: 0 0 6px rgba(74, 222, 128, 0.75);
  animation: hpStatusPulse 2s ease-in-out infinite;
}
@keyframes hpStatusPulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50%      { transform: scale(1.35); opacity: 0.8; }
}

/* —— 问候与元信息 —— */
.hp-hero-greeting {
  display: inline-flex;
  align-items: center;
  gap: 0.26rem;
  font-size: 0.67rem;
  font-weight: 700;
  color: #64748b;
  letter-spacing: 0.02em;
}
.hp-greeting-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #8b5cf6;
  animation: hpGreetingPulse 3s ease-in-out infinite;
}
@keyframes hpGreetingPulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.7; }
}
.hp-hero-meta {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.67rem;
  color: #64748b;
  font-weight: 600;
}
.hp-hero-meta svg { color: #8b5cf6; }

/* —— 标题 —— */
.hp-hero-title {
  margin: 0;
  font-size: clamp(1.5rem, 2.6vw, 2.2rem);
  font-weight: 950;
  line-height: 1.06;
  letter-spacing: -0.04em;
  color: #0f172a;
}
.hp-hero-title.centered { text-align: center; }
.hp-hero-accent {
  background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 45%, #a78bfa 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  font-style: italic;
}

/* —— 副标题 —— */
.hp-hero-sub {
  margin: 0;
  font-size: 0.8rem;
  color: #475569;
  line-height: 1.6;
  font-weight: 450;
  letter-spacing: 0.01em;
}
.hp-hero-sub.centered { text-align: center; max-width: 34rem; }

/* —— ⌘K 巨型命令输入框 —— */
.hp-cmd-box {
  width: 100%;
  max-width: 34rem;
  margin-top: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.42rem 0.42rem 0.42rem 0.85rem;
  background: rgba(255, 255, 255, 0.75);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 0.85rem;
  backdrop-filter: blur(12px);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
  box-shadow:
    0 6px 24px rgba(99, 102, 241, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}
.hp-cmd-box:focus-within {
  border-color: rgba(139, 92, 246, 0.45);
  background: rgba(255, 255, 255, 0.92);
  box-shadow:
    0 10px 36px rgba(139, 92, 246, 0.18),
    0 0 0 3px rgba(139, 92, 246, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 1);
}
.hp-cmd-icons {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
}
.hp-cmd-icon-search { color: #94a3b8; }
.hp-cmd-icon-spark { color: #8b5cf6; }
.hp-cmd-sep {
  width: 1px;
  height: 15px;
  background: rgba(148, 163, 184, 0.25);
  display: inline-block;
}
.hp-cmd-input {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: none;
  outline: none;
  color: #0f172a;
  font-size: 0.82rem;
  font-weight: 500;
  padding: 0.32rem 0.2rem;
  font-family: inherit;
}
.hp-cmd-input::placeholder {
  color: #94a3b8;
  font-weight: 400;
}
.hp-cmd-hints {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
}
.hp-cmd-kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.85rem;
  height: 1.45rem;
  padding: 0 0.4rem;
  border-radius: 5px;
  background: rgba(241, 245, 249, 0.9);
  border: 1px solid rgba(203, 213, 225, 0.6);
  color: #475569;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.62rem;
  font-weight: 700;
  box-shadow: inset 0 -1px 0 rgba(148, 163, 184, 0.15);
}
.hp-cmd-kbd.light {
  background: rgba(237, 233, 254, 0.85);
  border-color: rgba(196, 181, 253, 0.6);
  color: #6d28d9;
}
.hp-cmd-send {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem; height: 1.75rem;
  border-radius: 0.5rem;
  border: none;
  cursor: pointer;
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  color: #ffffff;
  transition: transform 0.15s ease, opacity 0.15s ease;
  flex-shrink: 0;
}
.hp-cmd-send:hover:not(:disabled) { transform: scale(1.08); }
.hp-cmd-send:disabled {
  background: rgba(148, 163, 184, 0.2);
  color: rgba(148, 163, 184, 0.5);
  cursor: not-allowed;
}
.hp-cmd-burst {
  position: absolute;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: var(--b-color, rgba(139, 92, 246, 0.6));
  pointer-events: none;
  transform: translate(-50%, -50%);
  animation: hpBurst 0.85s cubic-bezier(0.2, 0.7, 0.3, 1) forwards;
  z-index: 1;
}
@keyframes hpBurst {
  0% {
    width: 0;
    height: 0;
    opacity: 0.9;
  }
  60% {
    opacity: 0.6;
  }
  100% {
    width: 44px;
    height: 44px;
    opacity: 0;
  }
}

/* —— 示例 chip 行 —— */
.hp-cmd-examples {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.35rem;
  margin-top: 0;
}
.hp-cmd-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.65rem;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.18);
  color: #475569;
  font-size: 0.66rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  backdrop-filter: blur(8px);
}
.hp-cmd-chip:hover {
  background: rgba(139, 92, 246, 0.1);
  border-color: rgba(139, 92, 246, 0.3);
  color: #6d28d9;
  transform: translateY(-1px);
}
.hp-cmd-chip.more {
  background: rgba(139, 92, 246, 0.08);
  border-color: rgba(139, 92, 246, 0.25);
  color: #7c3aed;
  font-weight: 750;
}
.hp-cmd-chip.more:hover {
  background: rgba(139, 92, 246, 0.16);
  border-color: rgba(139, 92, 246, 0.45);
}

/* —— CTA 行 —— */
.hp-cmd-cta-row {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0;
}
.hp-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.44rem 0.9rem;
  border: 1px solid transparent;
  border-radius: 9999px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  font-size: 0.76rem;
  font-weight: 800;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 5px 16px rgba(99, 102, 241, 0.25), inset 0 1px 0 rgba(255,255,255,0.2);
  letter-spacing: 0.02em;
}
.hp-btn-primary:hover {
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  transform: translateY(-1.5px);
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.35), inset 0 1px 0 rgba(255,255,255,0.2);
}
.hp-btn-primary svg { transition: transform 0.2s ease; }
.hp-btn-primary:hover svg { transform: translateX(2px); }
.hp-cmd-cta {
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
  padding: 0.38rem 0.75rem;
  border-radius: 9999px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(255, 255, 255, 0.55);
  color: #475569;
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  backdrop-filter: blur(8px);
}
.hp-cmd-cta:hover {
  background: rgba(99, 102, 241, 0.08);
  border-color: rgba(99, 102, 241, 0.25);
  color: #4f46e5;
  transform: translateY(-1px);
}
.hp-cmd-cta.active {
  background: rgba(99, 102, 241, 0.14);
  border-color: rgba(99, 102, 241, 0.4);
  color: #4338ca;
}

/* ════════════════════════════════
   分类卡片（横向滚动）
════════════════════════════════ */
.home-page { position: relative; }
.hp-hero-cat-bridge {
  position: absolute;
  top: calc(5.5rem + 55%);
  left: 0; right: 0;
  height: 9rem;
  pointer-events: none;
  z-index: 0;
  background:
    radial-gradient(ellipse 40% 100% at 30% 0%, rgba(255, 255, 255, 0.18), transparent 70%),
    radial-gradient(ellipse 38% 100% at 72% 0%, rgba(244, 238, 255, 0.22), transparent 72%),
    radial-gradient(ellipse 70% 80% at 50% 50%, rgba(226, 232, 255, 0.12), transparent 75%);
  filter: blur(36px) saturate(130%);
  animation: hpBridgeDrift 50s ease-in-out infinite;
}
@keyframes hpBridgeDrift {
  0%, 100% { opacity: 0.9; transform: translateY(0); }
  50%      { opacity: 1;   transform: translateY(6px); }
}

.hp-categories {
  background: transparent;
  padding: 1.2rem 0 0.5rem;
  position: relative;
}
.hp-categories::before {
  content: '';
  position: absolute;
  top: -2rem;
  left: 50%;
  transform: translateX(-50%);
  width: 88%;
  height: 9rem;
  background:
    radial-gradient(ellipse 60% 80% at 25% 20%, rgba(196, 181, 253, 0.18), transparent 70%),
    radial-gradient(ellipse 55% 70% at 75% 30%, rgba(147, 197, 253, 0.15), transparent 70%),
    radial-gradient(ellipse 70% 60% at 50% 100%, rgba(221, 214, 254, 0.14), transparent 75%);
  filter: blur(28px) saturate(125%);
  pointer-events: none;
  z-index: 0;
  animation: hpCatCloudDrift 65s ease-in-out infinite reverse;
}
@keyframes hpCatCloudDrift {
  0%, 100% {
    transform: translateX(-50%) translateY(0) scale(1);
  }
  30% {
    transform: translateX(-53%) translateY(4%) scale(1.04);
  }
  60% {
    transform: translateX(-47%) translateY(-2%) scale(0.97);
  }
  85% {
    transform: translateX(-51%) translateY(3%) scale(1.02);
  }
}
.hp-categories-wrapper {
  max-width: var(--nav-content-max-width);
  margin: 0 auto;
  padding: 0 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  position: relative;
  z-index: 1;
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
  border: 1px solid rgba(191, 219, 254, 0.28);
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: #64748b;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  box-shadow: 0 4px 14px rgba(70, 91, 128, 0.06), 0 0 0 1px rgba(255, 255, 255, 0.35) inset;
}
.hp-cat-scroll-btn:hover { background: rgba(255, 255, 255, 0.75); color: #2563eb; border-color: rgba(79, 124, 255, 0.28); }
.hp-cat-card {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.65rem 0.8rem;
  border-radius: 0.95rem;
  background:
    radial-gradient(circle at var(--spot-x, 50%) var(--spot-y, 50%),
      rgba(255, 255, 255, calc(0.5 * var(--spot-active, 0))) 0%,
      rgba(248, 250, 255, calc(0.24 * var(--spot-active, 0))) 25%,
      transparent 55%),
    rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(226, 232, 240, 0.45);
  backdrop-filter: blur(14px) saturate(130%);
  -webkit-backdrop-filter: blur(14px) saturate(130%);
  cursor: pointer;
  transition: box-shadow 0.2s, border-color 0.2s, transform 0.2s, background 0.2s;
  box-shadow:
    0 10px 28px rgba(70, 91, 128, 0.05),
    0 0 0 1px rgba(255, 255, 255, 0.35) inset;
  flex-shrink: 0;
  min-width: 0;
  position: relative;
  overflow: hidden;
}
.hp-cat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(100deg,
    transparent 0%,
    rgba(255, 255, 255, 0.2) 50%,
    transparent 100%
  );
  transform: skewX(-15deg);
  pointer-events: none;
  transition: left 0.5s ease;
}
.hp-cat-card.module-blog .hp-cat-icon { background: rgba(219, 234, 254, 0.65); color: #2563eb; }
.hp-cat-card.module-ether .hp-cat-icon { background: rgba(237, 233, 254, 0.7); color: #7c3aed; }
.hp-cat-card.module-quant .hp-cat-icon { background: rgba(209, 250, 229, 0.65); color: #059669; }
.hp-cat-card.module-assessment .hp-cat-icon { background: rgba(255, 228, 230, 0.65); color: #e11d48; }
.hp-cat-card.module-notes .hp-cat-icon { background: rgba(255, 237, 213, 0.65); color: #ea580c; }
.hp-cat-card::after {
  content: '';
  position: absolute;
  inset: -30%;
  border-radius: inherit;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.25s ease;
  z-index: -1;
  filter: blur(14px);
}
.hp-cat-card.module-blog::after      { background: radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.18), transparent 65%); }
.hp-cat-card.module-ether::after     { background: radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.2), transparent 65%); }
.hp-cat-card.module-quant::after     { background: radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.18), transparent 65%); }
.hp-cat-card.module-assessment::after{ background: radial-gradient(circle at 50% 50%, rgba(225, 29, 72, 0.16), transparent 65%); }
.hp-cat-card.module-notes::after     { background: radial-gradient(circle at 50% 50%, rgba(234, 88, 12, 0.17), transparent 65%); }
.hp-cat-card:hover {
  box-shadow:
    0 16px 40px rgba(99, 102, 241, 0.1),
    0 0 0 1px rgba(255, 255, 255, 0.5) inset;
  transform: translateY(-2.5px);
}
.hp-cat-card.module-blog:hover {
  border-color: rgba(59, 130, 246, 0.3);
  background:
    radial-gradient(circle at var(--spot-x, 50%) var(--spot-y, 50%),
      rgba(255, 255, 255, calc(0.5 * var(--spot-active, 0))) 0%,
      rgba(219, 234, 254, calc(0.26 * var(--spot-active, 0))) 25%,
      transparent 55%),
    rgba(239, 246, 255, 0.7);
}
.hp-cat-card.module-ether:hover {
  border-color: rgba(139, 92, 246, 0.32);
  background:
    radial-gradient(circle at var(--spot-x, 50%) var(--spot-y, 50%),
      rgba(255, 255, 255, calc(0.5 * var(--spot-active, 0))) 0%,
      rgba(237, 233, 254, calc(0.26 * var(--spot-active, 0))) 25%,
      transparent 55%),
    rgba(245, 243, 255, 0.7);
}
.hp-cat-card.module-quant:hover {
  border-color: rgba(16, 185, 129, 0.28);
  background:
    radial-gradient(circle at var(--spot-x, 50%) var(--spot-y, 50%),
      rgba(255, 255, 255, calc(0.5 * var(--spot-active, 0))) 0%,
      rgba(209, 250, 229, calc(0.26 * var(--spot-active, 0))) 25%,
      transparent 55%),
    rgba(236, 253, 245, 0.7);
}
.hp-cat-card.module-assessment:hover {
  border-color: rgba(225, 29, 72, 0.26);
  background:
    radial-gradient(circle at var(--spot-x, 50%) var(--spot-y, 50%),
      rgba(255, 255, 255, calc(0.5 * var(--spot-active, 0))) 0%,
      rgba(255, 228, 230, calc(0.24 * var(--spot-active, 0))) 25%,
      transparent 55%),
    rgba(255, 241, 242, 0.7);
}
.hp-cat-card.module-notes:hover {
  border-color: rgba(234, 88, 12, 0.28);
  background:
    radial-gradient(circle at var(--spot-x, 50%) var(--spot-y, 50%),
      rgba(255, 255, 255, calc(0.5 * var(--spot-active, 0))) 0%,
      rgba(255, 237, 213, calc(0.25 * var(--spot-active, 0))) 25%,
      transparent 55%),
    rgba(255, 247, 237, 0.7);
}
.hp-cat-card:hover::after { opacity: 1; }
.hp-cat-card:hover::before {
  left: 130%;
  transition: left 0.65s ease;
}
.hp-cat-card.active {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.85) 0%, rgba(139, 92, 246, 0.82) 100%);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-color: rgba(196, 181, 253, 0.45);
  box-shadow:
    0 16px 42px rgba(99, 102, 241, 0.22),
    0 0 0 1px rgba(255, 255, 255, 0.25) inset;
}
.hp-cat-card.active .hp-cat-icon { background: rgba(255, 255, 255, 0.18); color: white; }
.hp-cat-card.active .hp-cat-info strong { color: white; }
.hp-cat-card.active .hp-cat-info span { color: rgba(255, 255, 255, 0.75); }
.hp-cat-card.active .hp-cat-arrow { color: rgba(255, 255, 255, 0.65); }

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
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.4s cubic-bezier(0.2, 0.7, 0.2, 1),
    opacity 0.5s cubic-bezier(0.2, 0.7, 0.2, 1);
  transition-delay: calc(var(--i, 0) * 65ms);
  opacity: 0;
  transform: translateY(22px);
  will-change: transform, opacity;
}
.hp-feature-card.is-visible {
  opacity: 1;
  transform: translateY(0);
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
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.4s cubic-bezier(0.2, 0.7, 0.2, 1),
    opacity 0.5s cubic-bezier(0.2, 0.7, 0.2, 1);
  transition-delay: calc(var(--i, 0) * 65ms);
  opacity: 0;
  transform: translateY(22px);
  will-change: transform, opacity;
}
.hp-spotlight-card.is-visible {
  opacity: 1;
  transform: translateY(0);
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
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.4s cubic-bezier(0.2, 0.7, 0.2, 1),
    border-color 0.2s ease,
    opacity 0.5s cubic-bezier(0.2, 0.7, 0.2, 1);
  transition-delay: calc(var(--i, 0) * 65ms);
  opacity: 0;
  transform: translateY(20px);
  will-change: transform, opacity;
}
.hp-post-item.is-visible {
  opacity: 1;
  transform: translateY(0);
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
   ※ 知乎式 sticky 行为
      1. 用天然高度 —— 不设 height / max-height / overflow-y
      2. sticky 以最近的块级祖先（hp-posts-inner, 即 hp-posts section）为边界
      3. 左侧继续长，右栏到底后"钉"在视口底部不再下移；上滚时同步上滚
════════════════════════════════ */
.hp-posts-sidebar {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  position: static;
}
@media (min-width: 1025px) {
  .hp-posts-sidebar {
    position: sticky;
    top: calc(5rem + 14px);
    /*
       ⚠️ 故意不加 height / max-height / overflow-y
       这样 sidebar 本身是自然高度，sticky 会
       - 先"贴着"导航栏下移
       - 等 sidebar 底部触到容器（hp-posts）底部时，钉住不动
       - 上滚时再贴着容器上滚回顶部
    */
  }
}
.hp-sidebar-card {
  padding: 1.1rem 1.1rem;
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
  margin-bottom: 0.78rem;
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

/* 站点速览卡片 */
.hp-site-stats-card {
  background:
    radial-gradient(circle at 0% 0%, rgba(191, 219, 254, 0.32), transparent 55%),
    radial-gradient(circle at 100% 100%, rgba(233, 213, 255, 0.3), transparent 55%),
    rgba(255,255,255,0.9);
}
.hp-site-stats-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.22rem;
}
.hp-site-stat-row {
  display: grid;
  grid-template-columns: 1.75rem 1fr auto auto;
  align-items: center;
  gap: 0.55rem;
  padding: 0.34rem 0.48rem;
  border-radius: 0.68rem;
  transition: background 0.18s ease, transform 0.18s ease;
}
.hp-site-stat-row:hover {
  background: rgba(255, 255, 255, 0.7);
  transform: translateX(2px);
}
.hp-site-stat-icon {
  width: 1.75rem;
  height: 1.75rem;
  display: grid;
  place-items: center;
  border-radius: 0.5rem;
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.08);
}
.hp-site-stat-icon.stat-articles { background: linear-gradient(135deg, #3b82f6, #60a5fa); }
.hp-site-stat-icon.stat-views    { background: linear-gradient(135deg, #8b5cf6, #a78bfa); }
.hp-site-stat-icon.stat-hearts   { background: linear-gradient(135deg, #ec4899, #f472b6); }
.hp-site-stat-icon.stat-folders  { background: linear-gradient(135deg, #f59e0b, #fbbf24); }
.hp-site-stat-icon.stat-tags     { background: linear-gradient(135deg, #10b981, #34d399); }
.hp-site-stat-icon.stat-since    { background: linear-gradient(135deg, #0ea5e9, #38bdf8); }
.hp-site-stat-label {
  font-size: 0.72rem;
  font-weight: 600;
  color: #64748b;
  letter-spacing: 0.01em;
}
.hp-site-stat-num {
  font-size: 0.92rem;
  font-weight: 900;
  color: #0f172a;
  letter-spacing: -0.01em;
  line-height: 1;
  text-align: right;
}
.hp-site-stat-unit {
  font-size: 0.62rem;
  font-weight: 600;
  color: #94a3b8;
  min-width: 0.9rem;
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
  gap: 0.4rem;
}
.hp-tag-chip {
  padding: 0.32rem 0.8rem;
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

/* ── About 侧卡：完整关于我 ── */
.hp-about-card {
  cursor: pointer;
  --spot-x: 50%;
  --spot-y: 50%;
  --spot-active: 0;
  background:
    radial-gradient(circle at var(--spot-x, 50%) var(--spot-y, 50%),
      rgba(255, 255, 255, calc(0.55 * var(--spot-active, 0))) 0%,
      rgba(224, 231, 255, calc(0.3 * var(--spot-active, 0))) 26%,
      rgba(237, 233, 254, calc(0.2 * var(--spot-active, 0))) 46%,
      transparent 70%),
    radial-gradient(circle at 0% 0%, rgba(248, 250, 255, 0.7), transparent 55%),
    radial-gradient(circle at 100% 100%, rgba(237, 233, 254, 0.26), transparent 55%),
    linear-gradient(160deg, rgba(252, 253, 255, 0.95) 0%, rgba(248, 250, 255, 0.93) 50%, rgba(252, 249, 255, 0.92) 100%);
  backdrop-filter: blur(16px) saturate(125%);
  -webkit-backdrop-filter: blur(16px) saturate(125%);
  position: relative;
  overflow: hidden;
  border-color: rgba(199, 210, 254, 0.38);
  box-shadow:
    0 10px 28px rgba(99, 102, 241, 0.06),
    0 0 0 1px rgba(255, 255, 255, 0.5) inset;
}
.hp-about-card:hover {
  border-color: rgba(165, 180, 252, 0.55);
  transform: translateY(-2px);
  box-shadow:
    0 18px 42px rgba(99, 102, 241, 0.11),
    0 0 0 1px rgba(255, 255, 255, 0.58) inset;
}

/* 天空头像区 */
.hp-about-sky-wrap {
  position: relative;
  width: 100%;
  height: 5.8rem;
  margin: 0.25rem auto 0.7rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
.hp-about-sky {
  position: relative;
  width: 5.2rem;
  height: 5.2rem;
  border-radius: 50%;
  background:
    radial-gradient(circle at 71% 22%, rgba(255,255,255,0.95) 0 0.28rem, transparent 0.32rem),
    radial-gradient(circle at 70% 20%, rgba(79,124,255,0.3), transparent 1.5rem),
    linear-gradient(150deg, #24385f 0%, #6b8cd0 52%, #dbeafe 100%);
  box-shadow:
    0 14px 26px rgba(74, 96, 144, 0.22),
    0 0 0 1px rgba(255,255,255,0.55) inset;
  overflow: hidden;
  animation: hpAboutSkyFloat 6.5s ease-in-out infinite;
}
@keyframes hpAboutSkyFloat {
  0%,100% { transform: translateY(0); }
  50%     { transform: translateY(-3px); }
}
.hp-about-sky::before {
  content: '';
  position: absolute;
  left: 0; right: 0; bottom: 0.99rem;
  height: 1.13rem;
  background:
    linear-gradient(150deg, transparent 18%, rgba(255,255,255,0.42) 19% 22%, transparent 23%),
    linear-gradient(175deg, transparent 8%, rgba(255,255,255,0.55) 9% 13%, transparent 14%);
  opacity: 0.85;
}
.hp-about-moon {
  position: absolute;
  right: 1.04rem;
  top: 0.83rem;
  width: 0.52rem;
  height: 0.52rem;
  border-radius: 50%;
  background: rgba(255,255,255,0.96);
  box-shadow: 0 0 10px rgba(255,255,255,0.8), 0 0 22px rgba(191, 219, 254, 0.75);
}
.hp-about-person {
  position: absolute;
  left: 2.2rem;
  bottom: 0.96rem;
  width: 0.13rem;
  height: 1.04rem;
  border-radius: 999px;
  background: #0f172a;
  box-shadow: 0 -0.26rem 0 0.05rem #0f172a;
}
.hp-about-person::after {
  content: '';
  position: absolute;
  left: -0.74rem;
  bottom: 0;
  width: 1.84rem;
  height: 0.07rem;
  background: rgba(15,23,42,0.42);
  transform: rotate(-9deg);
}
.hp-about-shadow {
  position: absolute;
  left: 50%;
  bottom: 0.42rem;
  width: 2.42rem;
  height: 0.16rem;
  transform: translateX(-50%);
  background: radial-gradient(ellipse at center, rgba(15,23,42,0.28) 0%, transparent 70%);
  filter: blur(1px);
}
.hp-about-avatar-dot {
  position: absolute;
  top: 50%;
  left: calc(50% + 1.75rem);
  transform: translateY(-15%);
  width: 1.36rem;
  height: 1.36rem;
  border-radius: 50%;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.68rem;
  font-weight: 900;
  color: #4f7cff;
  box-shadow: 0 6px 14px rgba(74, 96, 144, 0.2);
  z-index: 2;
}
.hp-about-name-pill {
  position: absolute;
  top: 50%;
  right: 0.36rem;
  transform: translateY(40%);
  padding: 0.36rem 0.54rem;
  border-radius: 9999px;
  background: rgba(255,255,255,0.94);
  box-shadow: 0 8px 18px rgba(74, 96, 144, 0.14);
  display: grid;
  gap: 0;
  line-height: 1.15;
  z-index: 3;
}
.hp-about-name-pill strong {
  font-size: 0.68rem;
  font-weight: 900;
  color: #0f172a;
}
.hp-about-name-pill span {
  font-size: 0.55rem;
  font-weight: 700;
  color: #64748b;
}

/* Motto & Bio */
.hp-about-motto {
  font-size: 0.94rem;
  font-weight: 900;
  line-height: 1.44;
  color: #0f172a;
  letter-spacing: -0.01em;
  margin-bottom: 0.52rem;
  background: linear-gradient(120deg, #0f172a 0%, #4338ca 55%, #7c3aed 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.hp-about-bio {
  margin: 0 0 0.84rem;
  font-size: 0.77rem;
  color: #475569;
  line-height: 1.72;
}

/* 2x2 Stats Grid */
.hp-about-grid-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.44rem;
  padding: 0.6rem;
  border-radius: 0.85rem;
  background:
    linear-gradient(135deg, rgba(239, 246, 255, 0.85) 0%, rgba(245, 243, 255, 0.7) 50%, rgba(255, 247, 237, 0.6) 100%);
  border: 1px solid rgba(226, 232, 240, 0.55);
  margin-bottom: 0.62rem;
}
.hp-about-stat-item {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: auto auto;
  column-gap: 0.42rem;
  row-gap: 0.1rem;
  align-items: center;
  padding: 0.5rem 0.55rem;
  border-radius: 0.65rem;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(8px);
  transition: transform 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
}
.hp-about-stat-item::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 60%);
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}
.hp-about-stat-item:hover {
  transform: translateY(-1.5px);
  box-shadow: 0 6px 14px rgba(79, 70, 229, 0.1);
}
.hp-about-stat-item:hover::after { opacity: 1; }
.hp-about-stat-item svg { grid-row: 1 / span 2; align-self: center; }
.hp-about-stat-item.stat-articles svg { color: #3b82f6; }
.hp-about-stat-item.stat-views    svg { color: #8b5cf6; }
.hp-about-stat-item.stat-hearts   svg { color: #ec4899; }
.hp-about-stat-item.stat-since    svg { color: #f59e0b; }
.hp-about-stat-item strong {
  font-size: 0.98rem;
  font-weight: 900;
  color: #0f172a;
  line-height: 1;
  letter-spacing: -0.01em;
}
.hp-about-stat-item span {
  font-size: 0.62rem;
  font-weight: 700;
  color: #94a3b8;
  letter-spacing: 0.04em;
}

/* CTA */
.hp-about-cta-row {
  display: flex;
  justify-content: flex-start;
}
.hp-about-cta {
  display: inline-flex;
  align-items: center;
  gap: 0.37rem;
  padding: 0.54rem 0.96rem;
  border-radius: 9999px;
  border: 1px solid rgba(165, 180, 252, 0.5);
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.07) 100%);
  color: #4338ca;
  font-size: 0.76rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}
.hp-about-cta:hover {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.16) 0%, rgba(139, 92, 246, 0.14) 100%);
  border-color: rgba(129, 140, 248, 0.75);
  color: #3730a3;
  transform: translateY(-1px);
  box-shadow: 0 6px 14px rgba(99, 102, 241, 0.16);
}

.hp-manifesto-card {
  background:
    radial-gradient(circle at 100% 0%, rgba(99, 102, 241, 0.08), transparent 9rem),
    rgba(255,255,255,0.9);
}
.hp-manifesto-text {
  margin: 0;
  color: #1e293b;
  font-size: 0.84rem;
  font-weight: 800;
  line-height: 1.72;
}
.hp-manifesto-author {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.68rem;
  color: #64748b;
  font-size: 0.73rem;
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
  gap: 0.55rem;
  margin-top: 0.92rem;
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
  display: inline-flex; align-items: center; gap: 0.47rem;
  padding: 0.62rem 1.05rem;
  border-radius: 9999px;
  font-size: 0.76rem;
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
  margin-top: 0.6rem;
}
.hp-hero-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.38rem 0.62rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.65);
  border: 1px solid rgba(148, 163, 184, 0.18);
  color: #475569;
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  backdrop-filter: blur(8px);
}
.hp-hero-chip:hover { background: rgba(99, 102, 241, 0.1); border-color: rgba(99, 102, 241, 0.3); }
.hp-hero-chip.active {
  background: rgba(99, 102, 241, 0.15);
  border-color: rgba(99, 102, 241, 0.4);
  color: #4338ca;
}

/* ── 移动端：紧凑 AI 触发条 ── */
.hp-ai-mobile-bar {
  display: none;
  margin-top: 0.9rem;
  padding: 0.5rem 0.55rem 0.5rem 0.8rem;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(148, 163, 184, 0.2);
  align-items: center;
  gap: 0.6rem;
  cursor: pointer;
  transition: background 0.15s;
  backdrop-filter: blur(12px);
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.08);
}
.hp-ai-mobile-bar:hover { background: rgba(255, 255, 255, 0.9); }

.hp-ai-mobile-left {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: #7c3aed;
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
  background: rgba(241, 245, 249, 0.7);
  border-radius: 9999px;
  padding: 0.28rem 0.32rem 0.28rem 0.68rem;
  min-width: 0;
}
.hp-ai-mobile-input input {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: none;
  outline: none;
  color: #0f172a;
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
  background: rgba(148, 163, 184, 0.2);
  color: rgba(148, 163, 184, 0.5);
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
  .hp-hero { padding-left: 0.9rem; padding-right: 0.9rem; padding-top: 3.8rem; padding-bottom: 0.2rem; }
  .hp-hero-inner {
    grid-template-columns: 1fr;
    padding: 0.8rem 0.9rem 0.8rem;
    border-radius: 0;
    margin: 0 0.1rem;
    gap: 0.55rem;
    box-shadow:
      0 30px 70px -25px rgba(99, 102, 241, 0.18),
      0 15px 40px -25px rgba(139, 92, 246, 0.22),
      0 0 80px -35px rgba(125, 211, 252, 0.22),
      0 0 0 1px rgba(255, 255, 255, 0.28);
  }
  .hp-hero-badge-row {
    margin-bottom: 0.5rem;
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
  .hp-hero-title { margin-bottom: 0.35rem; font-size: 1.35rem; line-height: 1.14; }
  .hp-hero-sub { margin-bottom: 0.7rem; font-size: 0.78rem; line-height: 1.65; max-width: 18rem; }
  .hp-hero-actions { gap: 0.45rem; margin-bottom: 0.2rem; }
  .hp-btn-primary { padding: 0.52rem 1.05rem; font-size: 0.74rem; }
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

  /* About 侧卡移动端 */
  .hp-about-sky-wrap { height: 5.6rem; margin-bottom: 0.65rem; }
  .hp-about-sky { width: 4.9rem; height: 4.9rem; }
  .hp-about-sky::before { bottom: 0.95rem; height: 1rem; }
  .hp-about-person { left: 2.1rem; bottom: 0.9rem; height: 0.95rem; width: 0.12rem; box-shadow: 0 -0.25rem 0 0.055rem #0f172a; }
  .hp-about-person::after { left: -0.7rem; width: 1.8rem; }
  .hp-about-moon { right: 0.95rem; top: 0.75rem; width: 0.48rem; height: 0.48rem; }
  .hp-about-avatar-dot { width: 1.35rem; height: 1.35rem; font-size: 0.65rem; left: calc(50% + 1.55rem); }
  .hp-about-name-pill { padding: 0.35rem 0.5rem; }
  .hp-about-name-pill strong { font-size: 0.68rem; }
  .hp-about-name-pill span { font-size: 0.55rem; }
  .hp-about-motto { font-size: 0.88rem; }
  .hp-about-bio { font-size: 0.72rem; margin-bottom: 0.8rem; }
  .hp-about-grid-stats { padding: 0.55rem; gap: 0.35rem; margin-bottom: 0.75rem; }
  .hp-about-stat-item strong { font-size: 0.9rem; }
  .hp-about-stat-item span { font-size: 0.6rem; }
  .hp-about-cta { font-size: 0.7rem; padding: 0.42rem 0.78rem; }

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
  .hp-hero-inner { padding: 0.85rem 0.9rem 0.95rem; border-radius: 0; }
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