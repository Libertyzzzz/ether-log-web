<script setup lang="ts">
import { computed, onMounted, onUnmounted, nextTick, ref } from 'vue'
import { BookOpen, FlaskConical, MessageSquare, Search, Sparkles } from 'lucide-vue-next'
import type { ArticleListItem, Category, Tag as BlogTag, LoginUser } from '../types/blog'

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
  loginUser?: Partial<LoginUser> | null
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
  openSearch: [query: string]
}>()

const portfolioRoot = ref<HTMLElement | null>(null)
let revealObserver: IntersectionObserver | null = null
const activeFilter = ref('All')

const works = computed(() => [
  {
    key: 'assessment',
    title: 'Aether Valuation',
    subtitle: '人间估值',
    desc: '用问答、情绪化视觉和可分享报告完成的 AI 估值实验。',
    tags: ['Product', 'AI'],
    icon: Sparkles,
    action: () => emit('openAssessment'),
    tone: 'warm',
  },
  {
    key: 'quant',
    title: 'Quant Lab',
    subtitle: '量化实验台',
    desc: '策略、回测、风险指标和实验数据的个人研究空间。',
    tags: ['Research', 'Strategy'],
    icon: FlaskConical,
    action: () => emit('navigate', 'quant-lab'),
    tone: 'dark',
  },
  {
    key: 'blog',
    title: 'NEXTIFY Blog',
    subtitle: `${props.totalArticles} 篇文章`,
    desc: '技术写作、产品思考和长期学习笔记组成的公开知识系统。',
    tags: ['Writing', 'Notes'],
    icon: BookOpen,
    action: () => emit('navigate', 'blog'),
    tone: 'light',
  },
  {
    key: 'guestbook',
    title: 'Guestbook',
    subtitle: '留言板',
    desc: '给访客、朋友和未来读者留下痕迹的轻量互动空间。',
    tags: ['Community'],
    icon: MessageSquare,
    action: () => emit('navigate', 'guestbook'),
    tone: 'stone',
  },
])

const filters = computed(() => {
  const set = new Set<string>()
  works.value.forEach((w) => w.tags.forEach((t) => set.add(t)))
  return ['Show All', ...Array.from(set)]
})

const isFilterTransitioning = ref(false)
const displayedWorks = ref(works.value)

function setFilter(val: string) {
  if (val === activeFilter.value) return
  isFilterTransitioning.value = true
  setTimeout(() => {
    activeFilter.value = val
    displayedWorks.value =
      val === 'Show All' ? works.value : works.value.filter((w) => w.tags.includes(val))
    isFilterTransitioning.value = false
  }, 200)
}

function formatDate(dateStr: string) {
  return dateStr ? dateStr.slice(0, 10) : ''
}

function setupReveal() {
  if (typeof IntersectionObserver === 'undefined' || !portfolioRoot.value) return
  revealObserver?.disconnect()
  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          ;(entry.target as HTMLElement).classList.add('pf-visible')
          revealObserver?.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' },
  )
  portfolioRoot.value.querySelectorAll<HTMLElement>('.pf-reveal').forEach((el) => revealObserver?.observe(el))
}

onMounted(() => {
  nextTick(setupReveal)
})
onUnmounted(() => revealObserver?.disconnect())
</script>

<template>
  <main ref="portfolioRoot" class="pf-page">
    <!-- ===== HERO ===== -->
    <section class="pf-hero">
      <div class="pf-hero-bg" aria-hidden="true">
        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="pfGradient1" cx="50%" cy="50%" fx="0.441602%" fy="50%" r=".5">
              <animate attributeName="fx" dur="68s" values="0%;3%;0%" repeatCount="indefinite"></animate>
              <stop offset="0%" stop-color="rgba(255, 0, 255, 1)"></stop>
              <stop offset="100%" stop-color="rgba(255, 0, 255, 0)"></stop>
            </radialGradient>
            <radialGradient id="pfGradient2" cx="50%" cy="50%" fx="2.68147%" fy="50%" r=".5">
              <animate attributeName="fx" dur="47s" values="0%;3%;0%" repeatCount="indefinite"></animate>
              <stop offset="0%" stop-color="rgba(255, 255, 0, 1)"></stop>
              <stop offset="100%" stop-color="rgba(255, 255, 0, 0)"></stop>
            </radialGradient>
            <radialGradient id="pfGradient3" cx="50%" cy="50%" fx="0.836536%" fy="50%" r=".5">
              <animate attributeName="fx" dur="43s" values="0%;3%;0%" repeatCount="indefinite"></animate>
              <stop offset="0%" stop-color="rgba(0, 255, 255, 1)"></stop>
              <stop offset="100%" stop-color="rgba(0, 255, 255, 0)"></stop>
            </radialGradient>
            <radialGradient id="pfGradient4" cx="50%" cy="50%" fx="4.56417%" fy="50%" r=".5">
              <animate attributeName="fx" dur="46s" values="0%;5%;0%" repeatCount="indefinite"></animate>
              <stop offset="0%" stop-color="rgba(0, 255, 0, 1)"></stop>
              <stop offset="100%" stop-color="rgba(0, 255, 0, 0)"></stop>
            </radialGradient>
            <radialGradient id="pfGradient5" cx="50%" cy="50%" fx="2.65405%" fy="50%" r=".5">
              <animate attributeName="fx" dur="49s" values="0%;5%;0%" repeatCount="indefinite"></animate>
              <stop offset="0%" stop-color="rgba(0,0,255, 1)"></stop>
              <stop offset="100%" stop-color="rgba(0,0,255, 0)"></stop>
            </radialGradient>
            <radialGradient id="pfGradient6" cx="50%" cy="50%" fx="0.981338%" fy="50%" r=".5">
              <animate attributeName="fx" dur="51s" values="0%;5%;0%" repeatCount="indefinite"></animate>
              <stop offset="0%" stop-color="rgba(255,0,0, 1)"></stop>
              <stop offset="100%" stop-color="rgba(255,0,0, 0)"></stop>
            </radialGradient>
          </defs>
          <rect x="13.744%" y="1.18473%" width="100%" height="100%" fill="url(#pfGradient1)" transform="rotate(334.41 50 50)">
            <animate attributeName="x" dur="40s" values="25%;0%;25%" repeatCount="indefinite"></animate>
            <animate attributeName="y" dur="42s" values="0%;25%;0%" repeatCount="indefinite"></animate>
            <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="14s" repeatCount="indefinite"></animateTransform>
          </rect>
          <rect x="-2.17916%" y="35.4267%" width="100%" height="100%" fill="url(#pfGradient2)" transform="rotate(255.072 50 50)">
            <animate attributeName="x" dur="46s" values="-25%;0%;-25%" repeatCount="indefinite"></animate>
            <animate attributeName="y" dur="48s" values="0%;50%;0%" repeatCount="indefinite"></animate>
            <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="24s" repeatCount="indefinite"></animateTransform>
          </rect>
          <rect x="9.00483%" y="14.5733%" width="100%" height="100%" fill="url(#pfGradient3)" transform="rotate(139.903 50 50)">
            <animate attributeName="x" dur="50s" values="0%;25%;0%" repeatCount="indefinite"></animate>
            <animate attributeName="y" dur="24s" values="0%;25%;0%" repeatCount="indefinite"></animate>
            <animateTransform attributeName="transform" type="rotate" from="360 50 50" to="0 50 50" dur="18s" repeatCount="indefinite"></animateTransform>
          </rect>
        </svg>
        <div class="pf-hero-veil"></div>
      </div>
      <div class="pf-hero-inner">
        <p class="pf-hero-greeting pf-reveal">
          Hello, I'm Cassian — an independent builder exploring ideas through code, design &amp; AI.
        </p>
        <h1 class="pf-hero-heading pf-reveal">
          Think<span class="pf-dot-sep">·</span><span class="pf-underline">Build</span><span class="pf-dot-sep">·</span>Evolve
        </h1>
        <p class="pf-hero-desc pf-reveal">
          A living workspace for ideas, experiments, code, and everything I'm curious about.
        </p>
        <div class="pf-hero-actions pf-reveal">
          <button class="pf-btn pf-btn-outline" type="button" @click="$emit('navigate', 'blog')">
            Explore Writing
          </button>
          <button class="pf-btn pf-btn-outline" type="button" @click="$emit('openAssessment')">
            View Experiments
          </button>
        </div>
      </div>
    </section>

    <!-- ===== SELECTED WORKS ===== -->
    <section id="works" class="pf-section pf-section-light pf-works">
      <div class="pf-section-inner">
        <div class="pf-section-intro pf-reveal">
          <span class="pf-badge">An Area For My Best Work</span>
          <h2>Recent Works</h2>
          <p class="pf-section-desc">
            几个真实运行中的项目样本 —— 产品、AI、研究与写作。
          </p>
        </div>

        <div class="pf-filters pf-reveal">
          <button
            v-for="filter in filters"
            :key="filter"
            class="pf-filter-btn"
            :class="{ 'pf-filter-active': activeFilter === filter }"
            type="button"
            @click="setFilter(filter)"
          >
            {{ filter }}
          </button>
        </div>

        <div class="pf-masonry" :class="{ 'pf-masonry-fading': isFilterTransitioning }">
          <article
            v-for="work in displayedWorks"
            :key="work.key"
            class="pf-project pf-reveal"
            @click="work.action"
          >
            <div class="pf-project-visual" :class="`pf-tone-${work.tone}`">
              <component :is="work.icon" :size="40" class="pf-project-icon" />
            </div>
            <div class="pf-project-body">
              <span class="pf-project-cat">{{ work.tags[0] }}</span>
              <h3 class="pf-project-title">{{ work.title }}</h3>
              <p class="pf-project-desc">{{ work.subtitle }}</p>
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- ===== CAPABILITIES ===== -->
    <section id="about" class="pf-section pf-capabilities">
      <div class="pf-section-inner">
        <div class="pf-section-intro pf-reveal">
          <span class="pf-badge">Capabilities</span>
          <h2>What I build inside Nextify.</h2>
        </div>

        <div class="pf-caps-grid">
          <div class="pf-cap pf-reveal">
            <span class="pf-cap-num">01</span>
            <div>
              <h3>Customizable Writing System</h3>
              <p>用分类、标签和长文笔记构建可检索的知识花园，沉淀技术与产品思考。</p>
            </div>
          </div>
          <div class="pf-cap pf-reveal">
            <span class="pf-cap-num">02</span>
            <div>
              <h3>AI Co-pilot Integration</h3>
              <p>把 AI 接入阅读、检索和评估上下文，让个人知识库可以被对话式访问。</p>
            </div>
          </div>
          <div class="pf-cap pf-reveal">
            <span class="pf-cap-num">03</span>
            <div>
              <h3>Versatile Product Experiments</h3>
              <p>人间估值、量化回测等轻量产品实验，把想法快速做成可交互的原型。</p>
            </div>
          </div>
          <div class="pf-cap pf-reveal">
            <span class="pf-cap-num">04</span>
            <div>
              <h3>Open &amp; Transparent Portfolio</h3>
              <p>把真实运行的作品摆到台前，用作品集而非博客卡片讲述项目故事。</p>
            </div>
          </div>
          <div class="pf-cap pf-reveal">
            <span class="pf-cap-num">05</span>
            <div>
              <h3>Community &amp; Interaction</h3>
              <p>通过留言板、评论和社交链接，为访客和读者提供轻量互动空间。</p>
            </div>
          </div>
          <div class="pf-cap pf-reveal">
            <span class="pf-cap-num">06</span>
            <div>
              <h3>Continuous Iteration</h3>
              <p>保持高频更新和实验节奏，让网站本身成为持续演化的创作现场。</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== NOW ===== -->
    <section id="now" class="pf-section pf-section-light pf-now">
      <div class="pf-section-inner">
        <div class="pf-section-intro pf-reveal">
          <span class="pf-badge">Now / Currently</span>
          <h2>What is active right now.</h2>
        </div>

        <div class="pf-now-grid">
          <div class="pf-now-card pf-reveal">
            <strong>Writing</strong>
            <span>持续整理技术、产品和系统设计笔记。</span>
          </div>
          <div class="pf-now-card pf-reveal">
            <strong>ETHER</strong>
            <span>把 AI 助手接入阅读、检索和评估上下文。</span>
          </div>
          <div class="pf-now-card pf-reveal">
            <strong>Experiments</strong>
            <span>人间估值、Quant Lab 和更多轻量产品实验。</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== CASE STUDY / DARK SECTION ===== -->
    <section class="pf-section pf-section-dark pf-case">
      <div class="pf-section-inner">
        <div class="pf-section-intro pf-reveal">
          <span class="pf-badge pf-badge-dark">Case Study</span>
          <h2>Bringing clarity<br />to personal knowledge.</h2>
        </div>

        <div class="pf-case-grid pf-reveal">
          <div class="pf-case-meta">
            <div class="pf-case-meta-item">
              <span class="pf-case-label">Project</span>
              <span class="pf-case-val">Nextify Personal Platform</span>
            </div>
            <div class="pf-case-meta-item">
              <span class="pf-case-label">Role</span>
              <span class="pf-case-val">Builder / Writer / Product Designer</span>
            </div>
            <div class="pf-case-meta-item">
              <span class="pf-case-label">Year</span>
              <span class="pf-case-val">2023 — Present</span>
            </div>
          </div>

          <div class="pf-case-body">
            <p>
              Nextify started as a personal blog but quickly evolved into something more — a digital
              studio where writing, AI tools, and product experiments coexist. The goal was simple:
              create a space where ideas can be captured, connected, and shared without friction.
            </p>
            <h3>Creating a System, Not Just a Website</h3>
            <p>
              Rather than treating each project as a standalone product, I built Nextify as an
              integrated system. The blog feeds into the AI assistant's knowledge base. The
              assessment tool shares data with the quantitative lab. Every component reinforces
              every other.
            </p>
            <h3>A Living, Breathing Workspace</h3>
            <p>
              Nextify is never "finished." It grows as I learn, shifts as I experiment, and
              documents the journey in real time. This site is both the tool and the artifact —
              a portfolio that demonstrates its own values by existing.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== CLOSING ===== -->
    <section class="pf-section pf-closing">
      <div class="pf-section-inner pf-closing-inner pf-reveal">
        <Search :size="24" class="pf-closing-icon" />
        <h2>Looking for a specific thought?</h2>
        <p>Search across all writings, assessments, and experiments.</p>
        <button class="pf-btn pf-btn-outline" type="button" @click="$emit('openSearch', '')">
          Search Nextify
        </button>
      </div>
    </section>
  </main>
</template>

<style scoped>
.pf-page {
  min-height: 100vh;
  background: #ffffff;
  color: #111111;
  padding: 0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ===== SECTION SHARED ===== */
.pf-section {
  padding: 5.5rem 1.5rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.pf-section-light {
  background: #f8f8f8;
}

.pf-section-dark {
  background: #1a1a1a;
  color: #ffffff;
  border-bottom-color: rgba(255, 255, 255, 0.08);
}

.pf-section-inner {
  width: min(1140px, 100%);
  margin: 0 auto;
}

.pf-section-intro {
  text-align: center;
  margin-bottom: 3rem;
}

.pf-section-intro.pf-row {
  text-align: left;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1.5rem;
}

.pf-badge {
  display: inline-block;
  padding: 0.4rem 1rem;
  margin-bottom: 1rem;
  background: rgba(0, 0, 0, 0.06);
  color: rgba(0, 0, 0, 0.6);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  border-radius: 999px;
}

.pf-badge-dark {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
}

.pf-section-intro h2 {
  margin: 0 0 0.75rem;
  font-size: clamp(2.4rem, 5vw, 3.8rem);
  font-weight: 600;
  line-height: 1.08;
  letter-spacing: -0.02em;
  color: inherit;
}

.pf-section-dark .pf-section-intro h2 {
  color: #ffffff;
}

.pf-section-desc {
  max-width: 560px;
  margin: 0 auto;
  color: rgba(0, 0, 0, 0.45);
  font-size: 1rem;
  line-height: 1.7;
}

/* ===== HERO ===== */
.pf-hero {
  position: relative;
  overflow: hidden;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(64px + 2rem) 1.5rem 2rem;
  text-align: center;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.pf-hero-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

.pf-hero-bg svg {
  position: absolute;
  width: 100%;
  height: 100%;
  display: block;
}

.pf-hero-veil {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.55) 40%,
    rgba(255, 255, 255, 0.88) 100%
  );
}

.pf-hero-inner {
  position: relative;
  z-index: 1;
  max-width: 820px;
  margin: -3rem auto 0;
}

.pf-hero-greeting {
  margin: 0 0 2.8rem;
  color: rgba(0, 0, 0, 0.45);
  font-size: clamp(0.85rem, 1.2vw, 1rem);
  line-height: 1.7;
  font-weight: 400;
  letter-spacing: 0.01em;
  text-align: center;
}

.pf-hero-heading {
  margin: 0 0 3rem;
  font-size: clamp(2.6rem, 7vw, 5.5rem);
  font-weight: 600;
  line-height: 1.05;
  letter-spacing: -0.025em;
  color: #111111;
  white-space: nowrap;
  text-align: center;
}

.pf-underline {
  position: relative;
}

.pf-underline::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -10px;
  height: 2px;
  background: linear-gradient(90deg, transparent 0%, rgba(0, 0, 0, 0.28) 50%, transparent 100%);
  border-radius: 2px;
}

.pf-dot-sep {
  display: inline-block;
  margin: 0 0.4em;
  color: rgba(0, 0, 0, 0.25);
  font-weight: 400;
  vertical-align: baseline;
  line-height: 1;
}

.pf-hero-desc {
  max-width: 480px;
  margin: 0 auto 3rem;
  color: rgba(0, 0, 0, 0.4);
  font-size: clamp(0.95rem, 1.3vw, 1.05rem);
  line-height: 1.75;
  text-align: center;
}

.pf-hero-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem;
}

/* ===== BUTTONS ===== */
.pf-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 50px;
  padding: 0 1.8rem;
  border-radius: 6px;
  cursor: pointer;
  font: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  transition: all 0.2s ease;
}

.pf-btn-outline {
  background: transparent;
  color: #111111;
  border: 2px solid rgba(0, 0, 0, 0.15);
}

.pf-btn-outline:hover {
  border-color: rgba(0, 0, 0, 0.5);
  color: #000000;
}

/* ===== FILTERS ===== */
.pf-filters {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.4rem;
  margin-bottom: 2.5rem;
}

.pf-filter-btn {
  padding: 0.5rem 1.1rem;
  background: transparent;
  color: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(0, 0, 0, 0.12);
  font: inherit;
  font-size: 0.8rem;
  font-weight: 500;
  letter-spacing: 0.01em;
  cursor: pointer;
  border-radius: 999px;
  transition: all 0.2s ease;
}

.pf-filter-btn:hover {
  color: #111111;
  border-color: rgba(0, 0, 0, 0.3);
  background: rgba(0, 0, 0, 0.03);
}

.pf-filter-active {
  background: #111111;
  color: #ffffff;
  border-color: #111111;
}

.pf-filter-active:hover {
  background: #333333;
  border-color: #333333;
  color: #ffffff;
}

/* ===== MASONRY GRID ===== */
.pf-masonry {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  transition: opacity 0.25s ease;
}

.pf-masonry-fading {
  opacity: 0.35;
}

.pf-project {
  border-radius: 6px;
  overflow: hidden;
  background: #ffffff;
  cursor: pointer;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.pf-project:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.08);
}

.pf-project-visual {
  aspect-ratio: 16 / 10;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.pf-project:hover .pf-project-visual {
  transform: scale(1.03);
}

.pf-project-icon {
  opacity: 0.9;
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.pf-project:hover .pf-project-icon {
  opacity: 1;
  transform: scale(1.08);
}

.pf-project-body {
  padding: 1.2rem 1.3rem 1.3rem;
}

.pf-project-cat {
  display: block;
  margin-bottom: 0.5rem;
  color: rgba(0, 0, 0, 0.4);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.pf-project-title {
  margin: 0 0 0.35rem;
  font-size: 1.1rem;
  font-weight: 600;
  line-height: 1.25;
  color: #111111;
}

.pf-project-desc {
  margin: 0;
  color: rgba(0, 0, 0, 0.45);
  font-size: 0.85rem;
  line-height: 1.5;
}

/* Tone backgrounds */
.pf-tone-warm {
  background: linear-gradient(135deg, #faf5f0 0%, #f0e8dc 100%);
}
.pf-tone-warm .pf-project-icon { color: #b8956a; }

.pf-tone-cool {
  background: linear-gradient(135deg, #f0f4fa 0%, #dce6f5 100%);
}
.pf-tone-cool .pf-project-icon { color: #5b7fbd; }

.pf-tone-dark {
  background: linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%);
}
.pf-tone-dark .pf-project-icon { color: rgba(255, 255, 255, 0.85); }

.pf-tone-light {
  background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
}
.pf-tone-light .pf-project-icon { color: #555555; }

.pf-tone-stone {
  background: linear-gradient(135deg, #e8e2d6 0%, #d4ccb8 100%);
}
.pf-tone-stone .pf-project-icon { color: #6b5e4a; }

/* ===== CAPABILITIES ===== */
.pf-caps-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

.pf-cap {
  display: flex;
  gap: 1.2rem;
  padding: 2rem 1.8rem;
  background: #ffffff;
  border-radius: 6px;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.pf-cap:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.06);
}

.pf-cap-num {
  font-size: 2rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.12);
  line-height: 1;
  min-width: 2.6rem;
  flex-shrink: 0;
}

.pf-cap h3 {
  margin: 0 0 0.5rem;
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: #111111;
}

.pf-cap p {
  margin: 0;
  color: rgba(0, 0, 0, 0.5);
  font-size: 0.9rem;
  line-height: 1.7;
}

/* ===== NOW ===== */
.pf-now-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

.pf-now-card {
  padding: 2rem;
  background: #ffffff;
  border-radius: 6px;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.pf-now-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.06);
}

.pf-now-card strong {
  display: block;
  margin-bottom: 0.75rem;
  color: #111111;
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.pf-now-card span {
  display: block;
  color: rgba(0, 0, 0, 0.5);
  font-size: 0.9rem;
  line-height: 1.7;
}

/* ===== WRITING ===== */
.pf-text-link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0;
  background: transparent;
  border: 0;
  color: #111111;
  font: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s ease;
  white-space: nowrap;
  flex-shrink: 0;
}

.pf-text-link:hover {
  opacity: 0.65;
}

.pf-state {
  color: rgba(0, 0, 0, 0.35);
  font-weight: 500;
  padding: 3rem 0;
  text-align: center;
}

.pf-writing-list {
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.pf-writing-item {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-areas:
    'meta time'
    'title title'
    'summary summary';
  gap: 0.4rem 1.5rem;
  padding: 1.5rem 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: background 0.2s ease;
}

.pf-writing-item:hover {
  background: rgba(0, 0, 0, 0.015);
}

.pf-writing-meta {
  grid-area: meta;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: rgba(0, 0, 0, 0.35);
  font-size: 0.74rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.pf-writing-sep {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.2);
}

.pf-writing-title {
  grid-area: title;
  margin: 0;
  color: #111111;
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: -0.01em;
}

.pf-writing-summary {
  grid-area: summary;
  max-width: 680px;
  margin: 0;
  color: rgba(0, 0, 0, 0.45);
  font-size: 0.9rem;
  line-height: 1.7;
}

.pf-writing-read {
  grid-area: time;
  align-self: start;
  color: rgba(0, 0, 0, 0.3);
  font-size: 0.78rem;
  font-weight: 500;
  white-space: nowrap;
}

/* ===== CASE STUDY ===== */
.pf-case-grid {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 3rem;
}

.pf-case-meta {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding-top: 0.25rem;
}

.pf-case-meta-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.pf-case-label {
  font-size: 0.74rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.4);
}

.pf-case-val {
  font-size: 0.95rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.5;
}

.pf-case-body p {
  margin: 0 0 1.2rem;
  color: rgba(255, 255, 255, 0.65);
  font-size: 0.95rem;
  line-height: 1.8;
}

.pf-case-body h3 {
  margin: 2rem 0 0.75rem;
  color: #ffffff;
  font-size: 1.25rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.pf-case-body h3:first-child {
  margin-top: 0;
}

/* ===== CLOSING ===== */
.pf-closing {
  text-align: center;
}

.pf-closing-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.pf-closing-icon {
  color: rgba(0, 0, 0, 0.3);
}

.pf-closing h2 {
  margin: 0;
  font-size: clamp(2.4rem, 5vw, 3.8rem);
  font-weight: 600;
  line-height: 1.08;
  letter-spacing: -0.02em;
  color: #111111;
}

.pf-closing p {
  margin: 0;
  color: rgba(0, 0, 0, 0.45);
  font-size: 1rem;
  line-height: 1.7;
}

.pf-closing .pf-btn {
  margin-top: 0.5rem;
}

/* ===== REVEAL ANIMATION ===== */
.pf-reveal {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
}

.pf-reveal.pf-visible {
  opacity: 1;
  transform: translateY(0);
}

/* ===== RESPONSIVE ===== */
@media (prefers-reduced-motion: reduce) {
  .pf-hero-bg svg animate,
  .pf-hero-bg svg animateTransform {
    display: none;
  }
}

@media (max-width: 960px) {
  .pf-masonry {
    grid-template-columns: repeat(3, 1fr);
  }

  .pf-caps-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .pf-case-grid {
    grid-template-columns: 1fr;
    gap: 2rem;
  }

  .pf-case-meta {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 1.5rem 2.5rem;
  }
}

/* ════════════════════════════════
   iOS 移动端响应式
   ════════════════════════════════ */
@media (max-width: 680px) {
  .pf-page {
    padding-top: 0;
  }

  .pf-section {
    padding: 2rem 0.85rem;
  }

  /* ── Hero：紧凑排版 ── */
  .pf-hero {
    min-height: 100vh;
    padding: calc(52px + 1rem) 0.85rem 1.5rem;
  }
  .pf-hero-inner {
    max-width: 100%;
    padding: 0;
  }
  .pf-hero-greeting {
    font-size: 0.8rem;
    margin-bottom: 0.6rem;
    color: rgba(0, 0, 0, 0.45);
    line-height: 1.5;
  }
  .pf-hero-heading {
    font-size: clamp(1.05rem, 6vw, 1.35rem);
    white-space: nowrap;
    margin-bottom: 0.6rem;
    line-height: 1.1;
    letter-spacing: -0.03em;
  }
  .pf-dot-sep {
    margin: 0 0.18em;
    font-size: 0.65em;
  }
  .pf-underline::after {
    bottom: -5px;
    height: 1.5px;
  }
  .pf-hero-desc {
    font-size: 0.82rem;
    max-width: 100%;
    margin-bottom: 1.2rem;
    line-height: 1.55;
  }
  .pf-hero-actions {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .pf-hero-actions .pf-btn {
    flex: 1;
    min-width: 0;
    min-height: 40px;
    padding: 0.5rem 0.9rem;
    font-size: 0.82rem;
    border-radius: 10px;
  }
  .pf-btn-outline {
    border-width: 1px;
  }

  /* ── Filters ── */
  .pf-filters {
    flex-wrap: nowrap;
    overflow-x: auto;
    justify-content: flex-start;
    gap: 0.35rem;
    margin-bottom: 1.1rem;
    padding-bottom: 0.2rem;
    -webkit-overflow-scrolling: touch;
  }
  .pf-filters::-webkit-scrollbar { display: none; }
  .pf-filter-btn {
    flex-shrink: 0;
    padding: 0.4rem 0.8rem;
    font-size: 0.76rem;
    min-height: 30px;
  }

  /* ── Masonry ── */
  .pf-masonry {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.55rem;
  }
  .pf-project {
    border-radius: 10px;
    margin-bottom: 0;
  }
  .pf-project-visual {
    aspect-ratio: 1 / 1;
  }
  .pf-project-body {
    padding: 0.65rem 0.7rem 0.75rem;
  }
  .pf-project-cat {
    font-size: 0.62rem;
    margin-bottom: 0.2rem;
  }
  .pf-project-title {
    font-size: 0.85rem;
    margin-bottom: 0.15rem;
  }
  .pf-project-desc {
    font-size: 0.72rem;
  }
  .pf-project-icon { width: 24px; height: 24px; }

  /* ── Capabilities ── */
  .pf-caps-grid {
    grid-template-columns: 1fr;
    gap: 0.55rem;
  }
  .pf-cap {
    padding: 0.9rem 0.95rem;
    border-radius: 10px;
    gap: 0.7rem;
  }
  .pf-cap-num {
    font-size: 1.3rem;
    min-width: 1.6rem;
  }
  .pf-cap h3 {
    font-size: 0.9rem;
    margin-bottom: 0.2rem;
  }
  .pf-cap p {
    font-size: 0.78rem;
    line-height: 1.5;
  }

  /* ── Now ── */
  .pf-now-grid {
    grid-template-columns: 1fr;
    gap: 0.55rem;
  }
  .pf-now-card {
    padding: 0.9rem 0.95rem;
    border-radius: 10px;
  }
  .pf-now-card strong {
    font-size: 0.9rem;
    margin-bottom: 0.3rem;
  }
  .pf-now-card span {
    font-size: 0.78rem;
    line-height: 1.5;
  }

  /* ── Section header ── */
  .pf-section-intro.pf-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.3rem;
  }
  .pf-badge {
    font-size: 0.66rem;
  }
  .pf-section-intro h2 {
    font-size: 1.3rem;
  }
  .pf-section-desc {
    font-size: 0.82rem;
  }

  /* ── Writing ── */
  .pf-writing-item {
    grid-template-areas:
      'meta meta'
      'title title'
      'summary summary'
      'time time';
    gap: 0.25rem;
    padding: 0.85rem 0;
  }
  .pf-writing-meta {
    font-size: 0.66rem;
  }
  .pf-writing-title {
    font-size: 0.95rem;
  }
  .pf-writing-summary {
    font-size: 0.78rem;
    line-height: 1.5;
  }
  .pf-writing-read {
    font-size: 0.7rem;
  }

  /* ── Case Study ── */
  .pf-case-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  .pf-case-meta {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 0.75rem 1.2rem;
  }
  .pf-case-val {
    font-size: 0.8rem;
  }
  .pf-case-body p {
    font-size: 0.82rem;
    line-height: 1.6;
  }

  /* ── Closing ── */
  .pf-closing h2 {
    font-size: 1.5rem;
  }
  .pf-closing p {
    font-size: 0.82rem;
  }
}

@media (max-width: 420px) {
  .pf-section { padding: 1.75rem 0.7rem; }
  .pf-hero { min-height: 100vh; padding: calc(84px + 0.75rem) 0.7rem 1.25rem; }
  .pf-hero-greeting { font-size: 0.74rem; }
  .pf-hero-desc { font-size: 0.76rem; margin-bottom: 1rem; }
  .pf-hero-actions { gap: 0.4rem; }
  .pf-hero-actions .pf-btn { min-height: 38px; font-size: 0.78rem; padding: 0.45rem 0.75rem; }
  .pf-masonry { grid-template-columns: 1fr; gap: 0.5rem; }
  .pf-project-visual { aspect-ratio: 16 / 10; }
  .pf-project-body { padding: 0.6rem 0.65rem 0.7rem; }
  .pf-project-title { font-size: 0.82rem; }
  .pf-project-desc { font-size: 0.7rem; }
  .pf-section-intro h2 { font-size: 1.15rem; }
  .pf-cap { padding: 0.8rem 0.85rem; }
  .pf-now-card { padding: 0.8rem 0.85rem; }
}
</style>