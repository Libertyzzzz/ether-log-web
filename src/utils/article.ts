import type { ArticleDetail, ArticleListItem, LoginUser } from '../types/blog'
import { getReadingTime } from './format'

export function getLoginUserName(loginUser: Partial<LoginUser>) {
  return loginUser.nickname || loginUser.username || loginUser.email || 'User'
}

export function getArticleCategory(article: ArticleListItem | ArticleDetail | null) {
  return article?.categoryName || 'Article'
}

export function getArticleSummary(article: ArticleListItem) {
  return article.summary || article.subtitle || '暂无摘要'
}

const ESTIMATED_CONTENT_MULTIPLIER = 7
const LIST_MAX_READING_MINUTES = 15

export function getArticleReadingTime(article: ArticleListItem | ArticleDetail | null): number {
  if (!article) return 1
  const detail = article as ArticleDetail
  if (typeof detail.content === 'string' && detail.content.length > 0) {
    return getReadingTime(detail.content)
  }
  if (typeof detail.renderContent === 'string' && detail.renderContent.length > 0) {
    return getReadingTime(detail.renderContent)
  }
  const head = (article.title || '').length + (article.subtitle || '').length
  const summary = (article.summary || '').replace(/<[^>]+>/g, '').replace(/\s+/g, '').length
  const estimated = Math.max(0, head + summary * ESTIMATED_CONTENT_MULTIPLIER)
  if (estimated <= 0) return 1
  const CHARS_PER_MINUTE = 450
  const minutes = Math.ceil(estimated / CHARS_PER_MINUTE)
  return Math.max(1, Math.min(LIST_MAX_READING_MINUTES, minutes))
}