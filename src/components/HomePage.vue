<script setup lang="ts">
import { BookOpen, ArrowRight, ArrowUpRight, Lightbulb, Code2, Palette, BookMarked } from 'lucide-vue-next'
import type { ArticleListItem, Category } from '../types/blog'
import { getArticleCategory, getArticleSummary } from '../utils/article'

defineProps<{
  categories: Category[]
  activeCategoryId: number | null
  filteredArticles: ArticleListItem[]
  articleError: string
  isLoadingArticles: boolean
  showActions: boolean
}>()

defineEmits<{
  toggleCategory: [categoryId: number]
  openArticle: [article: ArticleListItem]
  editArticle: [article: ArticleListItem]
  deleteArticle: [articleId: number]
}>()

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
            <button class="hp-btn-primary" type="button">
              <BookOpen :size="15" />
              开始阅读
            </button>
            <button class="hp-btn-ghost" type="button">
              ☆ 精选文章
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
              <span class="hp-glass-label">EtherLog</span>
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
          @click="$emit('toggleCategory', cat.id)"
        >
          <div class="hp-cat-icon">
            <component :is="categoryIconMap[cat.label] || BookMarked" :size="20" />
          </div>
          <div class="hp-cat-info">
            <strong>{{ cat.label }}</strong>
            <span>{{ categoryDescMap[cat.label] || cat.label }}</span>
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
          <button class="hp-view-all" type="button">
            查看全部文章 <ArrowUpRight :size="13" />
          </button>
        </div>

        <!-- 加载 / 错误 / 空状态 -->
        <div v-if="articleError" class="hp-state-card">
          <span class="hp-state-tag">Error</span>
          <p>{{ articleError }}</p>
        </div>
        <div v-else-if="isLoadingArticles" class="hp-posts-grid">
          <div v-for="i in 3" :key="i" class="hp-article-card hp-skeleton">
            <div class="hp-card-cover hp-skeleton-cover"></div>
            <div class="hp-card-body">
              <div class="hp-skeleton-line"></div>
              <div class="hp-skeleton-line short"></div>
            </div>
          </div>
        </div>
        <div v-else-if="!filteredArticles.length" class="hp-state-card">
          <span class="hp-state-tag">Empty</span>
          <p>暂无文章，换个分类看看。</p>
        </div>

        <!-- 文章卡片列表（3 列） -->
        <div v-else class="hp-posts-grid">
          <article
            v-for="(post, index) in filteredArticles"
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
                <span class="hp-card-views">{{ post.viewCount }} views</span>
              </div>
            </div>
          </article>
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
          <cite class="hp-quote-author">— Ether</cite>
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
  background: #f5f5f7;
}

/* ════════════════════════════════
   HERO
════════════════════════════════ */
.hp-hero {
  padding-top: 6.5rem; /* navbar 高度 */
  background: linear-gradient(160deg, #0f172a 0%, #1e1b4b 45%, #312e81 100%);
  overflow: hidden;
  position: relative;
}
.hp-hero::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 80% 60% at 70% 40%, rgba(99,102,241,0.18) 0%, transparent 70%);
  pointer-events: none;
}

.hp-hero-inner {
  max-width: 64rem;
  margin: 0 auto;
  padding: 4rem 1.5rem 5rem;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;
  align-items: center;
  position: relative;
  z-index: 1;
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
  color: #818cf8;
  margin-bottom: 1.5rem;
}
.hp-label-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #818cf8;
  box-shadow: 0 0 8px #818cf8;
}
.hp-label-arrow { color: #4f46e5; }

.hp-hero-title {
  margin: 0 0 1.5rem;
  font-size: clamp(2.4rem, 4.5vw, 3.8rem);
  font-weight: 900;
  line-height: 1.08;
  letter-spacing: -0.03em;
  color: #f8fafc;
}
.hp-hero-accent {
  color: #818cf8;
  font-style: italic;
}

.hp-hero-sub {
  margin: 0 0 2.5rem;
  font-size: 1rem;
  color: #94a3b8;
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
  border: none;
  border-radius: 9999px;
  background: #4f46e5;
  color: white;
  font-size: 0.88rem;
  font-weight: 800;
  cursor: pointer;
  transition: background 0.2s, transform 0.15s;
}
.hp-btn-primary:hover { background: #4338ca; transform: translateY(-1px); }
.hp-btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: 1px solid rgba(129,140,248,0.3);
  border-radius: 9999px;
  background: rgba(129,140,248,0.08);
  color: #a5b4fc;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}
.hp-btn-ghost:hover { background: rgba(129,140,248,0.14); border-color: rgba(129,140,248,0.5); }

/* 右侧装饰 */
.hp-hero-visual {
  position: relative;
  height: 360px;
}
.hp-glass-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(1px);
}
.hp-orb-1 {
  width: 260px; height: 260px;
  top: 20px; right: 20px;
  background: radial-gradient(circle at 35% 35%, rgba(129,140,248,0.35), rgba(79,70,229,0.1) 60%, transparent);
  border: 1px solid rgba(129,140,248,0.2);
}
.hp-orb-2 {
  width: 160px; height: 160px;
  top: 60px; right: 80px;
  background: radial-gradient(circle at 40% 30%, rgba(196,181,253,0.25), transparent 70%);
  border: 1px solid rgba(196,181,253,0.15);
}
.hp-orb-3 {
  width: 80px; height: 80px;
  bottom: 80px; right: 40px;
  background: radial-gradient(circle, rgba(99,102,241,0.4), transparent 70%);
}
.hp-glass-card {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 140px; height: 140px;
  border-radius: 2rem;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  backdrop-filter: blur(20px);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 24px 60px rgba(0,0,0,0.3);
}
.hp-glass-card-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}
.hp-glass-label { font-size: 0.6rem; font-weight: 800; letter-spacing: 0.2em; color: #818cf8; text-transform: uppercase; }
.hp-glass-title { font-size: 3rem; font-weight: 900; color: white; line-height: 1; }
.hp-glass-sub { font-size: 0.55rem; color: #64748b; font-weight: 600; }

.hp-float-chip {
  position: absolute;
  padding: 0.35rem 0.85rem;
  border-radius: 9999px;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.12);
  color: #c7d2fe;
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
  background: #f5f5f7;
  padding: 2.5rem 0;
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
  border-radius: 1.25rem;
  background: white;
  border: 1px solid rgba(226,232,240,0.8);
  cursor: pointer;
  transition: box-shadow 0.2s, border-color 0.2s, transform 0.2s;
  box-shadow: 0 2px 8px rgba(15,23,42,0.04);
}
.hp-cat-card:hover {
  box-shadow: 0 8px 24px rgba(79,70,229,0.1);
  border-color: rgba(79,70,229,0.25);
  transform: translateY(-2px);
}
.hp-cat-card.active {
  background: #4f46e5;
  border-color: #4f46e5;
  box-shadow: 0 12px 32px rgba(79,70,229,0.3);
}
.hp-cat-card.active .hp-cat-icon { background: rgba(255,255,255,0.15); color: white; }
.hp-cat-card.active .hp-cat-info strong { color: white; }
.hp-cat-card.active .hp-cat-info span { color: rgba(255,255,255,0.7); }
.hp-cat-card.active .hp-cat-arrow { color: rgba(255,255,255,0.6); }

.hp-cat-icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.75rem;
  background: #eff6ff;
  color: #4f46e5;
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
  background: #4f46e5;
  box-shadow: 0 0 6px #4f46e5;
}
.hp-view-all {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  border: none;
  background: transparent;
  color: #4f46e5;
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
  background: white;
  border: 1px solid rgba(226,232,240,0.8);
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.2s;
  box-shadow: 0 2px 8px rgba(15,23,42,0.04);
}
.hp-article-card:hover {
  box-shadow: 0 16px 40px rgba(15,23,42,0.1);
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
.hp-card-views::before { content: '·'; margin-right: 0.6rem; }

/* 状态卡片 */
.hp-state-card {
  padding: 2.5rem;
  border-radius: 1.5rem;
  background: white;
  border: 1px solid rgba(226,232,240,0.8);
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
.hp-skeleton .hp-skeleton-cover {
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
.hp-skeleton-line {
  height: 0.85rem;
  border-radius: 0.4rem;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  margin-bottom: 0.5rem;
}
.hp-skeleton-line.short { width: 60%; }
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
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
  background: #0f172a;
  padding: 3rem 3.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  border-radius: 1.75rem;
}
.hp-quote-mark {
  font-size: 5rem;
  line-height: 0.8;
  color: #4f46e5;
  font-family: Georgia, serif;
  font-weight: 900;
  opacity: 0.8;
}
.hp-quote-text {
  margin: 0;
  font-size: clamp(1.2rem, 2.5vw, 1.6rem);
  font-weight: 700;
  color: #f1f5f9;
  line-height: 1.65;
  font-style: normal;
}
.hp-quote-author {
  font-size: 0.88rem;
  color: #64748b;
  font-style: normal;
  font-weight: 600;
}

/* ════════════════════════════════
   响应式
════════════════════════════════ */
@media (max-width: 1024px) {
  .hp-categories-inner { grid-template-columns: repeat(2, 1fr); }
  .hp-posts-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 768px) {
  .hp-hero-inner { grid-template-columns: 1fr; }
  .hp-hero-visual { display: none; }
  .hp-categories-inner { grid-template-columns: repeat(2, 1fr); }
  .hp-posts-grid { grid-template-columns: 1fr; }
  .hp-quote-content { padding: 2rem 1.5rem; }
}
@media (max-width: 480px) {
  .hp-categories-inner { grid-template-columns: 1fr 1fr; }
}
</style>
