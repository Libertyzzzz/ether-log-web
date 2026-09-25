<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Clock, ChevronLeft, ChevronRight, Calendar, Instagram } from 'lucide-vue-next'
import type { ArticleListItem, Category, Tag as BlogTag, LoginUser } from '../types/blog'
import { getArticleCategory, getArticleSummary, getArticleReadingTime } from '../utils/article'

const props = defineProps<{
  categories: Category[]
  tags?: BlogTag[]
  activeCategoryId: number | null
  articles: ArticleListItem[]
  filteredArticles: ArticleListItem[]
  trendingArticles?: ArticleListItem[]
  featuredArticles?: ArticleListItem[]
  totalArticles: number
  articleError: string
  isLoadingArticles: boolean
  showActions: boolean
  showFeaturedOnly: boolean
  loginUser?: Partial<LoginUser> | null
  currentPage: number
  pageSize: number
  isLoggedIn: boolean
  canAccessDashboard: boolean
  canAccessSystem: boolean
}>()

function resolveAuthor(article: ArticleListItem): string | null {
  const direct = article.author?.trim()
  return direct ? direct : null
}

const emit = defineEmits<{
  toggleCategory: [categoryId: number]
  openArticle: [article: ArticleListItem]
  editArticle: [article: ArticleListItem]
  deleteArticle: [articleId: number]
  scrollToPosts: []
  toggleFeatured: [val: boolean]
  pageChange: [page: number]
  pageSizeChange: [size: number]
  navigate: [page: string]
  openLogin: []
}>()

const totalPages = computed(() => Math.max(1, Math.ceil(props.totalArticles / props.pageSize)))

const pageRange = computed(() => {
  const current = props.currentPage
  const total = totalPages.value
  const pages: (number | string)[] = []
  const range = 2

  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - range && i <= current + range)) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...')
    }
  }
  return pages
})

function goToPage(page: number) {
  if (page < 1 || page > totalPages.value || page === props.currentPage) return
  emit('pageChange', page)
}

const stockImages = [
  'https://images.unsplash.com/photo-1488161628813-04466f872be2?w=1600&q=80',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1600&q=80',
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1600&q=80',
  'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=1600&q=80',
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1600&q=80',
  'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?w=1600&q=80',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1600&q=80',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80',
]

const heroThumbnails = computed(() => props.featuredArticles?.slice(0, 5) ?? [])

const trendingList = computed(() => props.trendingArticles ?? [])

const recentArticles = computed(() => {
  return [...props.filteredArticles]
    .sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime())
    .slice(0, 5)
})

const featuredCarouselPosts = computed(() => {
  return (props.featuredArticles?.slice(1, 7) ?? []).map((a, i) => ({
    article: a,
    image: a.coverImg || stockImages[(i + 2) % stockImages.length],
    title: a.title,
    category: getArticleCategory(a) || 'Journey',
    author: resolveAuthor(a) || 'Ether',
    date: formatDate(a.createTime),
  }))
})

const mainArticles = computed(() => {
  return props.filteredArticles
})

const sidebarCategories = computed(() => props.categories.slice(0, 6))

const instagramImages = [
  'https://images.unsplash.com/photo-1488161628813-04466f872be2?w=400&q=80',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=400&q=80',
  'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=400&q=80',
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400&q=80',
  'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?w=400&q=80',
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&q=80',
]

const heroActiveIndex = ref(0)

function selectHeroArticle(i: number) {
  heroActiveIndex.value = i
}

const highlightIndex = ref(0)

const featuredIndex = ref(0)
const FEATURED_VISIBLE = 3
const featuredBound = computed(() => Math.max(0, featuredCarouselPosts.value.length - FEATURED_VISIBLE))

function nextFeatured() {
  if (featuredIndex.value < featuredBound.value) featuredIndex.value++
}
function prevFeatured() {
  if (featuredIndex.value > 0) featuredIndex.value--
}

watch(
  () => featuredCarouselPosts.value.length,
  () => { if (featuredIndex.value > featuredBound.value) featuredIndex.value = featuredBound.value }
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

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  return dateStr.slice(0, 10)
}
</script>

<template>
  <div class="home-page">
    <!-- ── 1. Hero 区：大图特色文章 + Trending 侧栏 ── -->
    <section class="bm-hero">
      <div class="bm-hero-inner">
        <!-- 左侧大图特色文章 -->
        <div class="bm-hero-main">
          <div v-if="heroThumbnails.length" class="bm-hero-feature" @click="$emit('openArticle', heroThumbnails[heroActiveIndex])">
            <div class="bm-hero-image" :style="`background-image: url('${heroThumbnails[heroActiveIndex].coverImg || stockImages[heroActiveIndex % stockImages.length]}')`"></div>
            <div class="bm-hero-overlay"></div>
            <div class="bm-hero-card">
              <span class="bm-category-pill">{{ getArticleCategory(heroThumbnails[heroActiveIndex]) || 'Moments' }}</span>
              <h2 class="bm-hero-title">{{ heroThumbnails[heroActiveIndex].title }}</h2>
              <p class="bm-hero-excerpt">{{ getArticleSummary(heroThumbnails[heroActiveIndex]) }}</p>
              <div class="bm-hero-meta">
                <img class="bm-hero-avatar" :src="`https://api.dicebear.com/7.x/avataaars/svg?seed=${resolveAuthor(heroThumbnails[heroActiveIndex]) || 'Ether'}`" alt="author" />
                <span class="bm-hero-author">{{ resolveAuthor(heroThumbnails[heroActiveIndex]) || 'Ether' }}</span>
                <span class="bm-hero-date"><Calendar :size="11" /> {{ formatDate(heroThumbnails[heroActiveIndex].createTime) }}</span>
              </div>
            </div>
          </div>

          <!-- 缩略图轮播导航 -->
          <div v-if="heroThumbnails.length > 1" class="bm-hero-thumbs">
            <button class="bm-thumb-arrow prev" type="button" @click="heroActiveIndex = Math.max(0, heroActiveIndex - 1)" :disabled="heroActiveIndex === 0">
              <ChevronLeft :size="18" />
            </button>
            <div class="bm-thumb-track">
              <button
                v-for="(post, i) in heroThumbnails"
                :key="post.id"
                class="bm-hero-thumb"
                :class="{ active: i === heroActiveIndex }"
                type="button"
                @click="selectHeroArticle(i); $emit('openArticle', post)"
              >
                <img :src="post.coverImg || stockImages[i % stockImages.length]" :alt="post.title" loading="lazy" />
              </button>
            </div>
            <button class="bm-thumb-arrow next" type="button" @click="heroActiveIndex = Math.min(heroThumbnails.length - 1, heroActiveIndex + 1)" :disabled="heroActiveIndex === heroThumbnails.length - 1">
              <ChevronRight :size="18" />
            </button>
          </div>
        </div>

        <!-- 右侧 Trending -->
        <aside class="bm-hero-sidebar">
          <div class="bm-side-card">
            <div class="bm-side-title">
              <span class="bm-side-title-dot"></span>
              TRENDING
            </div>
            <ol class="bm-trending-list">
              <li
                v-for="(post, i) in trendingList"
                :key="post.id"
                class="bm-trending-item"
                @click="$emit('openArticle', post)"
              >
                <span class="bm-trending-num">{{ i + 1 }}</span>
                <img class="bm-trending-thumb" :src="post.coverImg || stockImages[i % stockImages.length]" :alt="post.title" />
                <div class="bm-trending-info">
                  <h4 class="bm-trending-title">{{ post.title }}</h4>
                  <span class="bm-trending-date"><Calendar :size="10" /> {{ formatDate(post.createTime) }}</span>
                </div>
              </li>
            </ol>
          </div>
        </aside>
      </div>
    </section>

    <!-- ── 2. 特色文章 3 列轮播 ── -->
    <section v-if="featuredCarouselPosts.length >= 3" class="bm-featured-section">
      <div class="bm-featured-carousel">
        <button class="bm-feat-arrow prev" type="button" @click="prevFeatured" :disabled="featuredIndex === 0">
          <ChevronLeft :size="22" />
        </button>
        <div class="bm-feat-track-wrap">
          <div class="bm-feat-track" :style="{ transform: `translateX(-${featuredIndex * (100 / FEATURED_VISIBLE)}%)` }">
            <div
              v-for="post in featuredCarouselPosts"
              :key="post.article.id"
              class="bm-feat-card"
              @click="$emit('openArticle', post.article)"
            >
              <div class="bm-feat-image" :style="`background-image: url('${post.image}')`"></div>
              <div class="bm-feat-overlay"></div>
              <div class="bm-feat-content">
                <span class="bm-feat-cat">{{ post.category }}</span>
                <h3 class="bm-feat-title">{{ post.title }}</h3>
                <div class="bm-feat-meta">
                  <img class="bm-feat-avatar" :src="`https://api.dicebear.com/7.x/avataaars/svg?seed=${post.author}`" alt="author" />
                  <span>{{ post.author }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <button class="bm-feat-arrow next" type="button" @click="nextFeatured" :disabled="featuredIndex >= featuredBound">
          <ChevronRight :size="22" />
        </button>
      </div>
    </section>

    <!-- ── 3. 主内容区：文章列表 + 侧栏 ── -->
    <section id="posts" class="bm-content">
      <div class="bm-content-inner">
        <!-- 主文章流 -->
        <div class="bm-main">
          <div class="bm-section-head">
            <h2 class="bm-section-title">Latest Posts</h2>
            <span class="bm-section-line"></span>
          </div>

          <!-- 分类筛选 -->
          <div v-if="categories.length" class="bm-filter-row">
            <button
              class="bm-filter-btn"
              type="button"
              :class="{ active: !activeCategoryId && !showFeaturedOnly }"
              @click="activeCategoryId && $emit('toggleCategory', activeCategoryId); showFeaturedOnly && $emit('toggleFeatured', false)"
            >All</button>
            <button
              class="bm-filter-btn"
              type="button"
              :class="{ active: showFeaturedOnly }"
              @click="$emit('toggleFeatured', !showFeaturedOnly)"
            >Featured</button>
            <button
              v-for="cat in categories.slice(0, 5)"
              :key="cat.id"
              class="bm-filter-btn"
              type="button"
              :class="{ active: activeCategoryId === cat.id }"
              @click="$emit('toggleCategory', cat.id)"
            >{{ cat.name }}</button>
          </div>

          <!-- 加载状态 -->
          <div v-if="articleError" class="bm-empty">
            <p>{{ articleError }}</p>
          </div>
          <div v-else-if="isLoadingArticles" class="bm-skeleton-list">
            <div v-for="i in 4" :key="i" class="bm-skeleton-card">
              <div class="bm-skeleton-img"></div>
              <div class="bm-skeleton-body">
                <div class="bm-skel-line w70"></div>
                <div class="bm-skel-line w40"></div>
                <div class="bm-skel-line w90"></div>
                <div class="bm-skel-line w60"></div>
              </div>
            </div>
          </div>
          <div v-else-if="!filteredArticles.length" class="bm-empty">
            <p>暂无文章</p>
          </div>

          <!-- 文章列表：左图右文 -->
          <div v-else class="bm-article-list" ref="postsListRef">
            <article
              v-for="(post, index) in mainArticles"
              :key="post.id"
              class="bm-article-card"
              :style="{ '--i': String(index) }"
              @click="$emit('openArticle', post)"
            >
              <div class="bm-article-cover" :style="post.coverImg ? `background-image: url('${post.coverImg}')` : `background: ${getCoverGradient(index)}`">
                <span class="bm-category-badge">{{ getArticleCategory(post) }}</span>
              </div>
              <div class="bm-article-body">
                <div class="bm-article-date"><Calendar :size="11" /> {{ formatDate(post.createTime) }}</div>
                <h3 class="bm-article-title">{{ post.title }}</h3>
                <div class="bm-article-meta">
                  <img class="bm-article-avatar" :src="`https://api.dicebear.com/7.x/avataaars/svg?seed=${resolveAuthor(post) || 'Ether'}`" alt="author" />
                  <span class="bm-article-author">{{ resolveAuthor(post) || 'Ether' }}</span>
                  <span class="bm-article-dot">·</span>
                  <span class="bm-article-reading"><Clock :size="11" /> {{ getArticleReadingTime(post) }} min</span>
                </div>
                <p class="bm-article-excerpt">{{ getArticleSummary(post) }}</p>
                <span class="bm-article-read">continue reading..</span>
              </div>
              <div v-if="showActions" class="bm-card-admin" @click.stop>
                <button type="button" class="bm-admin-btn" @click="$emit('editArticle', post)">Edit</button>
                <button type="button" class="bm-admin-btn danger" @click="$emit('deleteArticle', post.id)">Delete</button>
              </div>
            </article>

            <!-- 加载中骨架 -->
            <template v-if="isLoadingArticles">
              <div v-for="i in 3" :key="'skel-' + i" class="bm-skeleton-card">
                <div class="bm-skeleton-img"></div>
                <div class="bm-skeleton-body">
                  <div class="bm-skel-line w70"></div>
                  <div class="bm-skel-line w40"></div>
                </div>
              </div>
            </template>
          </div>

          <!-- 分页 -->
          <div v-if="filteredArticles.length" class="bm-pagination">
            <template v-for="(page, idx) in pageRange" :key="idx">
              <span v-if="page === '...'" class="bm-pg-ellipsis">...</span>
              <button 
                v-else 
                class="bm-pg-btn" 
                :class="{ active: page === currentPage }"
                @click="goToPage(page as number)"
              >{{ page }}</button>
            </template>
            <button 
              class="bm-pg-btn"
              :disabled="currentPage >= totalPages"
              @click="goToPage(currentPage + 1)"
            >
              <ChevronRight :size="16" />
            </button>
          </div>
        </div>

        <!-- 侧栏 -->
        <aside class="bm-sidebar">
          <!-- 入口导航（需登录） -->
          <div v-if="isLoggedIn" class="bm-side-card">
            <div class="bm-side-title">
              <span class="bm-side-title-dot"></span>
              QUICK ACCESS
            </div>
            <div class="bm-quick-list">
              <button class="bm-quick-item" @click="$emit('navigate', 'profile')">
                <span class="bm-quick-icon">👤</span>
                <span class="bm-quick-label">个人主页</span>
              </button>
              <button v-if="canAccessDashboard" class="bm-quick-item" @click="$emit('navigate', 'dashboard')">
                <span class="bm-quick-icon">📊</span>
                <span class="bm-quick-label">数据面板</span>
              </button>
              <button v-if="canAccessSystem" class="bm-quick-item" @click="$emit('navigate', 'system')">
                <span class="bm-quick-icon">⚙️</span>
                <span class="bm-quick-label">系统管理</span>
              </button>
            </div>
          </div>

          <!-- 未登录：登录提示 -->
          <div v-else class="bm-side-card bm-login-tip-card">
            <div class="bm-side-title">
              <span class="bm-side-title-dot"></span>
              MEMBERS
            </div>
            <button class="bm-login-tip-btn" @click="$emit('openLogin')">点击登录</button>
          </div>

          <!-- Trending Posts -->
          <div class="bm-side-card">
            <div class="bm-side-title">
              <span class="bm-side-title-dot"></span>
              TRENDING POSTS
            </div>
            <ul class="bm-recent-list">
              <li
                v-for="post in trendingList.slice(0, 5)"
                :key="post.id"
                class="bm-recent-item"
                @click="$emit('openArticle', post)"
              >
                <img class="bm-recent-thumb" :src="post.coverImg || stockImages[trendingList.indexOf(post) % stockImages.length]" :alt="post.title" />
                <div class="bm-recent-info">
                  <h4 class="bm-recent-title">{{ post.title }}</h4>
                  <span class="bm-recent-date"><Calendar :size="10" /> {{ formatDate(post.createTime) }}</span>
                </div>
              </li>
            </ul>
          </div>

          <!-- Highlights 轮播 -->
          <div v-if="recentArticles.length" class="bm-side-card">
            <div class="bm-side-title">
              <span class="bm-side-title-dot"></span>
              HIGHLIGHTS
            </div>
            <div class="bm-highlight" @click="$emit('openArticle', recentArticles[highlightIndex % recentArticles.length])">
              <div class="bm-highlight-img" :style="`background-image: url('${recentArticles[highlightIndex % recentArticles.length].coverImg || stockImages[3]}')`">
                <button class="bm-hl-arrow prev" type="button" @click.stop="highlightIndex = (highlightIndex - 1 + recentArticles.length) % recentArticles.length">
                  <ChevronLeft :size="16" />
                </button>
                <button class="bm-hl-arrow next" type="button" @click.stop="highlightIndex = (highlightIndex + 1) % recentArticles.length">
                  <ChevronRight :size="16" />
                </button>
              </div>
              <h4 class="bm-highlight-title">{{ recentArticles[highlightIndex % recentArticles.length].title }}</h4>
              <span class="bm-highlight-date"><Calendar :size="10" /> {{ formatDate(recentArticles[highlightIndex % recentArticles.length].createTime) }}</span>
            </div>
          </div>

          <!-- Categories -->
          <div v-if="sidebarCategories.length" class="bm-side-card">
            <div class="bm-side-title">
              <span class="bm-side-title-dot"></span>
              CATEGORIES
            </div>
            <ul class="bm-cat-list">
              <li v-for="cat in sidebarCategories" :key="cat.id" class="bm-cat-item" @click="$emit('toggleCategory', cat.id)">
                {{ cat.name }}
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </section>

    <!-- ── 4. Instagram 图片墙 ── -->
    <section class="bm-instagram">
      <div class="bm-ig-track">
        <div v-for="(img, i) in instagramImages" :key="i" class="bm-ig-item">
          <img :src="img" :alt="`instagram ${i + 1}`" loading="lazy" />
        </div>
      </div>
      <div class="bm-ig-badge">
        <Instagram :size="16" />
        <span>Instagram</span>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* ── BLOGMATIC 风格变量 ── */
.home-page {
  --bm-bg: #f7f7f5;
  --bm-surface: #ffffff;
  --bm-text: #18181b;
  --bm-text-muted: #71717a;
  --bm-border: #e8e8e3;
  --bm-accent: #18181b;
  --bm-accent-invert: #ffffff;
  --bm-radius: 12px;
  --bm-radius-sm: 8px;
  background: var(--bm-bg);
  color: var(--bm-text);
  font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
  min-height: 100vh;
  padding-top: 5rem;
}

/* ═══════════════════════════════════════
   1. Hero 区：大图 + Trending 侧栏
   ═══════════════════════════════════════ */
.bm-hero {
  max-width: 1110px;
  margin: 0 auto;
  padding: 1rem 1.25rem 1rem;
}

.bm-hero-inner {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 2rem;
  align-items: start;
}

.bm-hero-main {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* 大图特色文章 */
.bm-hero-feature {
  position: relative;
  border-radius: var(--bm-radius);
  overflow: hidden;
  height: 420px;
  cursor: pointer;
  background: #111;
}

.bm-hero-image {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  transition: transform 8s ease;
}

.bm-hero-feature:hover .bm-hero-image {
  transform: scale(1.06);
}

.bm-hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    rgba(0, 0, 0, 0.8) 0%,
    rgba(0, 0, 0, 0.4) 50%,
    rgba(0, 0, 0, 0.1) 100%
  );
}

.bm-hero-card {
  position: absolute;
  left: 2.5rem;
  bottom: 2.5rem;
  max-width: 420px;
  color: #fff;
  z-index: 2;
}

.bm-category-pill {
  display: inline-block;
  background: #fff;
  color: #18181b;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 0.3rem 0.8rem;
  border-radius: 4px;
  margin-bottom: 0.85rem;
}

.bm-hero-title {
  font-size: 2rem;
  font-weight: 800;
  line-height: 1.2;
  margin: 0 0 0.65rem;
  color: #fff;
  letter-spacing: -0.02em;
}

.bm-hero-excerpt {
  font-size: 0.92rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.82);
  margin: 0 0 1rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.bm-hero-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.75);
}

.bm-hero-meta svg {
  display: inline;
  vertical-align: -2px;
}

.bm-hero-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.6);
}

/* Hero 缩略图轮播 */
.bm-hero-thumbs {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.bm-thumb-arrow {
  width: 40px;
  height: 72px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #1e3a8a;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s;
}

.bm-thumb-arrow.prev {
  border-left: 2px solid #1e3a8a;
}

.bm-thumb-arrow.next {
  border-right: 2px solid #1e3a8a;
}

.bm-thumb-arrow:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.bm-thumb-arrow:not(:disabled):hover {
  background: #1e3a8a;
  color: #fff;
  border-color: #1e3a8a;
}

.bm-thumb-track {
  flex: 1;
  display: flex;
  gap: 0.5rem;
  overflow: hidden;
}

.bm-hero-thumb {
  flex: 1;
  height: 72px;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;
  background: none;
  transition: border-color 0.3s, opacity 0.3s;
  opacity: 0.55;
}

.bm-hero-thumb.active {
  border-color: var(--bm-accent);
  opacity: 1;
}

.bm-hero-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Hero 侧栏 Trending */
.bm-hero-sidebar {
  position: sticky;
  top: 80px;
}

/* ═══════════════════════════════════════
   通用侧栏卡片
   ═══════════════════════════════════════ */
.bm-side-card {
  background: var(--bm-surface);
  border-radius: var(--bm-radius);
  padding: 1.5rem;
}

.bm-side-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
  font-weight: 700;
  margin-bottom: 1.25rem;
  letter-spacing: 0.02em;
}

.bm-side-title-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--bm-accent);
}

/* Trending 列表（带序号） */
.bm-trending-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
}

.bm-trending-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  padding: 0.7rem 0;
  border-bottom: 1px solid var(--bm-border);
  transition: background 0.2s;
}

.bm-trending-item:last-child {
  border-bottom: none;
}

.bm-trending-item:hover {
  background: var(--bm-bg);
  margin: 0 -0.5rem;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}

.bm-trending-num {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--bm-border);
  width: 24px;
  text-align: center;
  flex-shrink: 0;
  font-style: italic;
  line-height: 1;
}

.bm-trending-thumb {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
}

.bm-trending-info {
  flex: 1;
  min-width: 0;
}

.bm-trending-title {
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1.4;
  margin: 0 0 0.3rem;
  color: var(--bm-text);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.bm-trending-date {
  font-size: 0.7rem;
  color: var(--bm-text-muted);
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.bm-trending-date svg {
  display: inline;
}

/* ═══════════════════════════════════════
   2. 特色文章 3 列轮播
   ═══════════════════════════════════════ */
.bm-featured-section {
  max-width: 1110px;
  margin: 0 auto;
  padding: 1rem 1.25rem;
}

.bm-featured-carousel {
  position: relative;
}

.bm-feat-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: var(--bm-surface);
  color: var(--bm-text);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.2s;
  z-index: 3;
}

.bm-feat-arrow.prev { left: 0.75rem; }
.bm-feat-arrow.next { right: 0.75rem; }

.bm-feat-arrow:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.bm-feat-arrow:not(:disabled):hover {
  background: var(--bm-accent);
  color: #fff;
}

.bm-feat-track-wrap {
  overflow: hidden;
  border-radius: var(--bm-radius);
}

.bm-feat-track {
  display: flex;
  transition: transform 0.5s ease;
}

.bm-feat-card {
  flex: 0 0 calc(100% / 3);
  position: relative;
  height: 320px;
  cursor: pointer;
  overflow: hidden;
}

.bm-feat-card + .bm-feat-card {
  border-left: 4px solid var(--bm-bg);
}

.bm-feat-image {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  transition: transform 0.5s ease;
}

.bm-feat-card:hover .bm-feat-image {
  transform: scale(1.05);
}

.bm-feat-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.8) 0%,
    rgba(0, 0, 0, 0.2) 60%,
    rgba(0, 0, 0, 0) 100%
  );
}

.bm-feat-content {
  position: absolute;
  left: 1.25rem;
  right: 1.25rem;
  bottom: 1.5rem;
  color: #fff;
  z-index: 2;
}

.bm-feat-cat {
  display: inline-block;
  background: #fff;
  color: #18181b;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 0.25rem 0.65rem;
  border-radius: 4px;
  margin-bottom: 0.7rem;
}

.bm-feat-title {
  font-size: 1.15rem;
  font-weight: 700;
  line-height: 1.3;
  margin: 0 0 0.7rem;
  color: #fff;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.bm-feat-meta {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.85);
}

.bm-feat-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.5);
}

/* ═══════════════════════════════════════
   3. 主内容区
   ═══════════════════════════════════════ */
.bm-content {
  max-width: 1110px;
  margin: 0 auto;
  padding: 1.5rem 1.25rem;
}

.bm-content-inner {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 2rem;
}

.bm-main {
  min-width: 0;
}

.bm-section-head {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.bm-section-title {
  font-size: 1.25rem;
  font-weight: 800;
  margin: 0;
  letter-spacing: -0.01em;
}

.bm-section-line {
  flex: 1;
  height: 1px;
  background: var(--bm-border);
}

/* 分类筛选 */
.bm-filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.bm-filter-btn {
  padding: 0.4rem 1rem;
  border-radius: 999px;
  border: 1px solid var(--bm-border);
  background: var(--bm-surface);
  color: var(--bm-text-muted);
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.bm-filter-btn:hover {
  border-color: var(--bm-accent);
  color: var(--bm-accent);
}

.bm-filter-btn.active {
  background: var(--bm-accent);
  color: var(--bm-accent-invert);
  border-color: var(--bm-accent);
}

/* 骨架屏 */
.bm-skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.bm-skeleton-card {
  display: flex;
  gap: 1.25rem;
  background: var(--bm-surface);
  border-radius: var(--bm-radius);
  padding: 1rem;
  overflow: hidden;
}

.bm-skeleton-img {
  width: 220px;
  height: 160px;
  border-radius: 10px;
  background: linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%);
  background-size: 200% 100%;
  animation: bm-shimmer 1.5s infinite;
  flex-shrink: 0;
}

.bm-skeleton-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-top: 0.5rem;
}

.bm-skel-line {
  height: 14px;
  border-radius: 4px;
  background: linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%);
  background-size: 200% 100%;
  animation: bm-shimmer 1.5s infinite;
}

.w40 { width: 40%; }
.w60 { width: 60%; }
.w70 { width: 70%; }
.w90 { width: 90%; }

@keyframes bm-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* 空状态 */
.bm-empty {
  text-align: center;
  padding: 4rem 1rem;
  color: var(--bm-text-muted);
  font-size: 0.95rem;
}

/* 文章列表 */
.bm-article-list {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.bm-article-card {
  display: flex;
  gap: 1.5rem;
  background: var(--bm-surface);
  border-radius: var(--bm-radius);
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.25s, box-shadow 0.25s;
  position: relative;
}

.bm-article-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
}

.bm-article-cover {
  width: 260px;
  min-height: 180px;
  flex-shrink: 0;
  background-size: cover;
  background-position: center;
  position: relative;
}

.bm-article-body {
  flex: 1;
  padding: 1.25rem 1.5rem 1.25rem 0;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.bm-article-date {
  font-size: 0.75rem;
  color: var(--bm-text-muted);
  margin-bottom: 0.5rem;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.bm-article-date svg {
  display: inline;
}

.bm-article-title {
  font-size: 1.15rem;
  font-weight: 700;
  line-height: 1.35;
  margin: 0 0 0.6rem;
  color: var(--bm-text);
  letter-spacing: -0.01em;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.bm-article-meta {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.78rem;
  color: var(--bm-text-muted);
  margin-bottom: 0.6rem;
  flex-wrap: wrap;
}

.bm-article-avatar {
  width: 18px;
  height: 18px;
  border-radius: 50%;
}

.bm-article-reading {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
}

.bm-article-reading svg {
  display: inline;
}

.bm-article-dot {
  color: var(--bm-border);
}

.bm-article-excerpt {
  font-size: 0.88rem;
  line-height: 1.6;
  color: var(--bm-text-muted);
  margin: 0 0 0.75rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.bm-article-read {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--bm-accent);
  margin-top: auto;
  letter-spacing: 0.02em;
}

.bm-card-admin {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  display: flex;
  gap: 0.4rem;
  z-index: 3;
}

.bm-admin-btn {
  padding: 0.3rem 0.7rem;
  border-radius: 6px;
  border: 1px solid var(--bm-border);
  background: #fff;
  font-size: 0.72rem;
  cursor: pointer;
  color: var(--bm-text);
}

.bm-admin-btn.danger {
  color: #dc2626;
  border-color: #fecaca;
}

/* 分页 */
.bm-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2rem 0 1rem;
}

.bm-pg-btn {
  min-width: 40px;
  height: 40px;
  padding: 0 0.4rem;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: #4b5563;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.bm-pg-btn:hover:not(:disabled):not(.active) {
  background: #f3f4f6;
  color: #111827;
}

.bm-pg-btn.active {
  background: #1e3a8a;
  color: #ffffff;
  font-weight: 600;
}

.bm-pg-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.bm-pg-ellipsis {
  padding: 0 0.4rem;
  color: #9ca3af;
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .bm-pagination {
    flex-wrap: wrap;
    gap: 0.3rem;
  }

  .bm-pg-btn {
    min-width: 36px;
    height: 36px;
  }
}

/* ═══════════════════════════════════════
   侧栏内容
   ═══════════════════════════════════════ */
.bm-sidebar {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  position: sticky;
  top: 80px;
  align-self: start;
}

/* Quick Access 入口 */
.bm-quick-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.bm-quick-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--bm-border);
  border-radius: 8px;
  background: transparent;
  color: var(--bm-text-secondary);
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
  font-family: inherit;
}

.bm-quick-item:hover {
  border-color: #1e3a8a;
  background: rgba(30, 58, 138, 0.04);
  color: #1e3a8a;
}

.bm-quick-icon {
  font-size: 0.95rem;
  width: 1.3rem;
  text-align: center;
}

.bm-quick-label {
  flex: 1;
}

/* 未登录登录提示 */
.bm-login-tip-btn {
  display: block;
  width: 100%;
  padding: 0.7rem;
  border: 1px dashed var(--bm-border);
  border-radius: 8px;
  background: transparent;
  color: var(--bm-text-muted);
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
}

.bm-login-tip-btn:hover {
  border-color: #1e3a8a;
  color: #1e3a8a;
  border-style: solid;
}

/* Recent Posts 列表 */
.bm-recent-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
}

.bm-recent-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  cursor: pointer;
  padding: 0.6rem 0;
  border-bottom: 1px solid var(--bm-border);
  transition: opacity 0.2s;
}

.bm-recent-item:last-child {
  border-bottom: none;
}

.bm-recent-item:hover {
  opacity: 0.75;
}

.bm-recent-thumb {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
}

.bm-recent-info {
  flex: 1;
  min-width: 0;
}

.bm-recent-title {
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1.4;
  margin: 0 0 0.3rem;
  color: var(--bm-text);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.bm-recent-date {
  font-size: 0.7rem;
  color: var(--bm-text-muted);
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.bm-recent-date svg {
  display: inline;
}

/* Highlights 轮播 */
.bm-highlight {
  cursor: pointer;
}

.bm-highlight-img {
  position: relative;
  width: 100%;
  height: 180px;
  border-radius: var(--bm-radius-sm);
  background-size: cover;
  background-position: center;
  margin-bottom: 0.75rem;
  overflow: hidden;
}

.bm-hl-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.85);
  color: #18181b;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.bm-hl-arrow:hover {
  background: #fff;
}

.bm-hl-arrow.prev { left: 0.5rem; }
.bm-hl-arrow.next { right: 0.5rem; }

.bm-highlight-title {
  font-size: 0.92rem;
  font-weight: 600;
  line-height: 1.4;
  margin: 0 0 0.3rem;
  color: var(--bm-text);
}

.bm-highlight-date {
  font-size: 0.72rem;
  color: var(--bm-text-muted);
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.bm-highlight-date svg {
  display: inline;
}

/* Categories */
.bm-cat-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.bm-cat-item {
  padding: 0.6rem 0;
  border-bottom: 1px solid var(--bm-border);
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--bm-text);
  transition: color 0.2s, padding-left 0.2s;
}

.bm-cat-item:last-child {
  border-bottom: none;
}

.bm-cat-item:hover {
  color: var(--bm-accent);
  padding-left: 0.5rem;
}

/* ═══════════════════════════════════════
   4. Instagram 图片墙
   ═══════════════════════════════════════ */
.bm-instagram {
  position: relative;
  max-width: 1110px;
  margin: 2rem auto 0;
  padding: 0 1.25rem 3rem;
}

.bm-ig-track {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.25rem;
  border-radius: var(--bm-radius);
  overflow: hidden;
}

.bm-ig-item {
  aspect-ratio: 1;
  overflow: hidden;
  cursor: pointer;
}

.bm-ig-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease, filter 0.4s ease;
  filter: saturate(0.9);
}

.bm-ig-item:hover img {
  transform: scale(1.08);
  filter: saturate(1.1);
}

.bm-ig-badge {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: #fff;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.82rem;
  font-weight: 600;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  color: var(--bm-text);
}

.bm-ig-badge svg {
  display: inline;
}

/* ═══════════════════════════════════════
   移动端适配
   ═══════════════════════════════════════ */
@media (max-width: 900px) {
  .bm-hero-inner {
    grid-template-columns: 1fr;
  }
  .bm-hero-sidebar {
    position: static;
  }
  .bm-content-inner {
    grid-template-columns: 1fr;
  }
  .bm-sidebar {
    position: static;
  }
  .bm-ig-track {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .home-page {
    padding-top: calc(3.25rem + env(safe-area-inset-top));
  }

  .bm-hero {
    padding: 0.75rem 0 0.75rem;
  }

  .bm-hero-feature {
    height: 320px;
    border-radius: 0;
  }

  .bm-hero-card {
    left: 1.25rem;
    right: 1.25rem;
    bottom: 1.5rem;
    max-width: none;
  }

  .bm-hero-title {
    font-size: 1.5rem;
  }

  .bm-hero-excerpt {
    font-size: 0.85rem;
  }

  .bm-hero-thumbs {
    padding: 0 1rem;
  }

  .bm-hero-thumb {
    height: 56px;
  }

  .bm-thumb-arrow {
    width: 32px;
    height: 32px;
  }

  /* 特色轮播：单卡片 */
  .bm-feat-card {
    flex: 0 0 100%;
    height: 240px;
  }
  .bm-feat-card + .bm-feat-card {
    border-left: none;
  }

  .bm-content {
    padding: 1rem;
  }

  .bm-article-card {
    flex-direction: column;
    gap: 0;
  }

  .bm-article-cover {
    width: 100%;
    min-height: 180px;
    height: 180px;
  }

  .bm-article-body {
    padding: 1rem 1.1rem 1.1rem;
  }

  .bm-article-title {
    font-size: 1.02rem;
  }

  .bm-skeleton-card {
    flex-direction: column;
  }

  .bm-skeleton-img {
    width: 100%;
    height: 160px;
  }

  .bm-section-title {
    font-size: 1.1rem;
  }

  .bm-ig-track {
    grid-template-columns: repeat(3, 1fr);
  }

  .bm-featured-section {
    padding: 0.75rem 1rem;
  }
}

@media (max-width: 480px) {
  .bm-hero-feature {
    height: 280px;
  }

  .bm-hero-title {
    font-size: 1.2rem;
  }

  .bm-hero-thumb {
    height: 48px;
  }

  .bm-ig-track {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>