<script setup lang="ts">
import { ArrowUpRight, Cpu, Globe, Terminal, Zap } from 'lucide-vue-next'
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
</script>

<template>
  <section class="home-page">
    <header id="home" class="hero-section">
      <div class="hero-copy">
        <div class="version-tag">
          <Terminal :size="12" class="text-blue-600" />
          <span>Version 2.0 Stable</span>
        </div>
        <h1 class="hero-title">
          Crafting <span class="text-gray-300 italic font-serif">Logic</span><br />
          Into <span class="text-blue-600">Digital Art.</span>
        </h1>
        <p class="hero-subtitle">
          欢迎回到 EtherLog。淬炼理性逻辑,筑造数字美学。
        </p>
      </div>
      <div class="hero-visual" aria-hidden="true">
        <div class="hero-core">
          <div class="hero-core-icon">
            <Terminal :size="42" />
          </div>
          <div class="hero-core-copy">
            <span>EtherLog Core</span>
            <strong>Vue · Spring · JWT</strong>
          </div>
        </div>
        <div class="hero-code-card">
          <div class="code-dot-row">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <p><span>const</span> thought = logic.render()</p>
          <p><span>await</span> publish.markdown()</p>
          <p><span>return</span> digitalArt</p>
        </div>
        <div class="hero-orbit">
          <div class="orbit-node node-a"><Zap :size="20" /></div>
          <div class="orbit-node node-b"><Cpu :size="20" /></div>
          <div class="orbit-node node-c"><Globe :size="20" /></div>
        </div>
      </div>
    </header>

    <section class="section-intro">
      <div class="section-meta">
        <div class="section-meta-left">
          <span class="section-label">JOURNAL / DUST</span>
          <h2 class="section-title">Tracing Thoughts, Shaping Logic.</h2>
        </div>
        <div class="section-meta-right">
          <p class="section-copy">
            万物起于微末，亦如尘埃。<br />
            在繁杂的世界里，捕捉转瞬即逝的审美，固化永恒的逻辑。
          </p>
        </div>
      </div>
      <div class="category-list">
        <button
          v-for="cat in categories"
          :key="cat.id"
          class="category-pill"
          :class="{ active: activeCategoryId === cat.id }"
          type="button"
          @click="$emit('toggleCategory', cat.id)"
        >
          {{ cat.label }}
        </button>
      </div>
    </section>

    <main id="posts" class="grid-container">
      <div v-if="articleError" class="card-large bg-white border-white shadow-sm">
        <div class="card-footer">
          <span class="tag">Error</span>
          <h3 class="text-2xl font-bold">文章加载失败</h3>
          <p class="text-gray-400 mt-2 font-light text-sm">{{ articleError }}</p>
        </div>
      </div>

      <div v-else-if="isLoadingArticles" class="card-large bg-white border-white shadow-sm">
        <div class="card-footer">
          <span class="tag">Loading</span>
          <h3 class="text-2xl font-bold">正在加载文章</h3>
          <p class="text-gray-400 mt-2 font-light text-sm">从后端文章接口读取最新内容。</p>
        </div>
      </div>

      <div v-else-if="!filteredArticles.length" class="card-large bg-white border-white shadow-sm">
        <div class="card-footer">
          <span class="tag">Empty</span>
          <h3 class="text-2xl font-bold">没有匹配的文章</h3>
          <p class="text-gray-400 mt-2 font-light text-sm">换一个分类看看，或者登录后发布一篇新文章。</p>
        </div>
      </div>

      <template v-else>
        <div
          v-for="post in filteredArticles"
          :key="post.id"
          class="card-large bg-white border-white shadow-sm hover:bg-gray-50 transition-all cursor-pointer"
          @click="$emit('openArticle', post)"
        >
          <div class="card-header">
            <span class="tag">{{ getArticleCategory(post) }}</span>
            <ArrowUpRight class="text-gray-300" />
          </div>
          <div class="card-footer">
            <h3 class="text-2xl font-bold">{{ post.title }}</h3>
            <p class="text-gray-400 mt-2 font-light text-sm">{{ getArticleSummary(post) }}</p>
            <div v-if="post.tagNames?.length" class="article-tags">
              <span v-for="tag in post.tagNames" :key="tag">{{ tag }}</span>
            </div>
            <div v-if="showActions" class="card-actions">
              <button type="button" class="action-pill" @click.stop="$emit('editArticle', post)">编辑</button>
              <button type="button" class="action-pill danger" @click.stop="$emit('deleteArticle', post.id)">删除</button>
            </div>
          </div>
        </div>
      </template>

      <div class="card-full bg-blue-600 text-white shadow-lg">
        <div class="slogan-text">"Simplicity is the ultimate sophistication."</div>
        <div class="slogan-footer">
          <Globe :size="14" />
          <span>ETHERLOG NETWORK</span>
        </div>
      </div>
    </main>
  </section>
</template>
