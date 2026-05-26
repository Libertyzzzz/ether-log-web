<script setup lang="ts">
import type { ArticleListItem, CommentItem, LoginUser } from '../types/blog'
import { getLoginUserName } from '../utils/article'

defineProps<{
  loginUser: Partial<LoginUser>
  articles: ArticleListItem[]
  recentArticles: ArticleListItem[]
  myComments: CommentItem[]
  commentCount: number
  totalViews: number
}>()

defineEmits<{
  openArticle: [article: ArticleListItem]
  editArticle: [article: ArticleListItem]
  newArticle: []
}>()
</script>

<template>
  <section class="profile-page">
    <div class="profile-inner">
    <div class="profile-grid">
      <div class="profile-card profile-summary">
        <div class="profile-card-header">
          <div class="profile-avatar-shell">
            <img class="profile-avatar" :src="loginUser.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Scribe'" alt="avatar" />
          </div>
          <div class="profile-user-meta">
            <h3>{{ getLoginUserName(loginUser) }}</h3>
            <p class="text-muted">{{ loginUser.email || '未设置邮箱' }}</p>
            <p class="text-muted">{{ loginUser.motto || '个人简介尚未设置。' }}</p>
          </div>
        </div>

        <div class="profile-stats">
          <div>
            <strong>{{ articles.length }}</strong>
            <span>文章</span>
          </div>
          <div>
            <strong>{{ commentCount }}</strong>
            <span>评论</span>
          </div>
          <div>
            <strong>{{ totalViews }}</strong>
            <span>总浏览</span>
          </div>
          <div>
            <strong>0</strong>
            <span>草稿</span>
          </div>
        </div>
      </div>

      <div class="profile-card profile-list-card">
        <div class="card-grid-header">
          <h3>最近文章</h3>
          <button class="action-pill" @click="$emit('newArticle')">写新文章</button>
        </div>
        <div class="list-card">
          <div v-for="post in recentArticles" :key="post.id" class="list-item">
            <div>
              <strong>{{ post.title }}</strong>
              <p class="text-muted">{{ post.categoryName }} · {{ post.createTime }}</p>
            </div>
            <div class="list-actions">
              <button type="button" class="action-pill" @click="$emit('openArticle', post)">查看</button>
              <button type="button" class="action-pill secondary" @click="$emit('editArticle', post)">编辑</button>
            </div>
          </div>
        </div>
      </div>

      <div class="profile-card profile-list-card">
        <div class="card-grid-header">
          <h3>近期评论</h3>
        </div>
        <div class="list-card">
          <div v-for="comment in myComments" :key="comment.id" class="comment-item">
            <p class="comment-text">{{ comment.content }}</p>
            <p class="text-muted">{{ comment.author }} · {{ comment.articleTitle }} · {{ comment.createTime }}</p>
            <span class="comment-status">{{ comment.status }}</span>
          </div>
        </div>
      </div>
    </div><!-- /profile-grid -->
    </div><!-- /profile-inner -->
  </section>
</template>

<style scoped>
.profile-page {
  padding-top: 5rem;
  background: #f5f5f7;
  min-height: 100vh;
}
.profile-inner {
  max-width: 64rem;
  margin: 0 auto;
  padding: 2rem 1.5rem 5rem;
}
</style>
