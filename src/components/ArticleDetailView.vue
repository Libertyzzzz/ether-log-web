<script setup lang="ts">
import type { ArticleDetail, ArticleListItem } from '../types/blog'
import { getArticleCategory } from '../utils/article'

defineProps<{
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
</script>

<template>
  <article class="article-page">
    <button class="back-button" type="button" @click="$emit('close')">← 返回文章列表</button>
    <div class="article-page-shell">
      <div class="article-page-meta">
        <div>
          <span class="section-label">{{ getArticleCategory(article) }}</span>
          <span>{{ article.createTime }} · {{ article.viewCount || 0 }} views</span>
        </div>
        <div v-if="showActions" class="article-detail-actions">
          <button type="button" class="action-pill" @click="$emit('edit', article)">编辑</button>
          <button type="button" class="action-pill danger" @click="$emit('delete', article.id)">删除</button>
        </div>
      </div>
      <h1>{{ article.title }}</h1>
      <p v-if="article.subtitle" class="article-page-subtitle">{{ article.subtitle }}</p>
      <div v-if="article.tagNames?.length" class="article-tags detail-tags">
        <span v-for="tag in article.tagNames" :key="tag">{{ tag }}</span>
      </div>
      <div v-if="isLoading" class="article-content article-plain">正在读取文章正文...</div>
      <div v-else-if="selectedArticle?.renderContent" class="article-content markdown-body" v-html="selectedArticle.renderContent"></div>
      <div v-else class="article-content article-plain">{{ selectedArticle?.content || '文章正文为空。' }}</div>
    </div>
  </article>
</template>
