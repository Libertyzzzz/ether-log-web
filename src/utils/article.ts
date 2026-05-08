import type { ArticleDetail, ArticleListItem, LoginUser } from '../types/blog'

export function getLoginUserName(loginUser: Partial<LoginUser>) {
  return loginUser.nickname || loginUser.username || loginUser.email || 'User'
}

export function getArticleCategory(article: ArticleListItem | ArticleDetail | null) {
  return article?.categoryName || 'Article'
}

export function getArticleSummary(article: ArticleListItem) {
  return article.summary || article.subtitle || '暂无摘要'
}
