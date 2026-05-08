<script setup lang="ts">
import type { ArticleListItem, CommentItem } from '../types/blog'

defineProps<{
  articles: ArticleListItem[]
  myComments: CommentItem[]
  commentCount: number
  totalViews: number
}>()

defineEmits<{
  newArticle: []
  editArticle: [article: ArticleListItem]
  deleteArticle: [articleId: number]
  openArticle: [article: ArticleListItem]
}>()
</script>

<template>
  <section class="dashboard-page">
    <div class="stats-grid">
      <div class="stat-card">
        <span>文章总数</span>
        <strong>{{ articles.length }}</strong>
      </div>
      <div class="stat-card">
        <span>评论总数</span>
        <strong>{{ commentCount }}</strong>
      </div>
      <div class="stat-card">
        <span>总浏览</span>
        <strong>{{ totalViews }}</strong>
      </div>
      <div class="stat-card">
        <span>草稿</span>
        <strong>0</strong>
      </div>
    </div>

    <div class="dashboard-table">
      <div class="dashboard-card">
        <div class="card-grid-header">
          <h3>我的文章</h3>
          <button class="action-pill" @click="$emit('newArticle')">新建文章</button>
        </div>
        <div class="table-header">
          <span>标题</span>
          <span>分类</span>
          <span>状态</span>
          <span>操作</span>
        </div>
        <div v-for="post in articles" :key="post.id" class="table-row">
          <span>{{ post.title }}</span>
          <span>{{ post.categoryName }}</span>
          <span>{{ post.isTop ? '置顶' : '公开' }}</span>
          <span class="table-actions">
            <button type="button" class="action-pill" @click="$emit('editArticle', post)">编辑</button>
            <button type="button" class="action-pill danger" @click="$emit('deleteArticle', post.id)">删除</button>
          </span>
        </div>
      </div>

      <div class="dashboard-card">
        <div class="card-grid-header">
          <h3>评论管理</h3>
        </div>
        <div class="list-card">
          <div v-for="comment in myComments" :key="comment.id" class="comment-item">
            <p class="comment-text">{{ comment.content }}</p>
            <p class="text-muted">{{ comment.author }} · {{ comment.articleTitle }}</p>
            <div class="list-actions">
              <button
                type="button"
                class="action-pill"
                :disabled="!articles.length"
                @click="$emit('openArticle', articles.find(a => a.title === comment.articleTitle) ?? articles[0])"
              >
                查看文章
              </button>
              <button type="button" class="action-pill secondary">审核</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
