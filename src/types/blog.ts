export interface ResultResponse<T> {
  code: number
  message: string
  data: T
  timestamp: number
}

export interface PageResponse<T> {
  records: T[]
  total: number
  size: number
  current: number
  pages: number
}

export interface Category {
  id: number
  label: string
}

export interface ArticleListItem {
  id: number
  title: string
  subtitle: string | null
  summary: string | null
  coverImg: string | null
  viewCount: number
  isTop: number
  categoryName: string | null
  tagNames: string[]
  createTime: string
}

export interface ArticleDetail extends ArticleListItem {
  content: string
  contentHtml: string | null
  renderContent: string | null
  tagIds: number[]
  categoryId: number
  cardStyle: number
  status: number
}

export interface ArticlePublishRequest {
  title: string
  subtitle: string
  summary: string
  content: string
  contentHtml: string
  coverImg: string
  cardStyle: number
  status: number
  isTop: number
  categoryId: number
  tagIds: number[]
}

export interface LoginUser {
  id: number
  username: string
  nickname: string | null
  avatar: string | null
  email: string | null
  motto: string | null
  createTime: string
  updateTime: string
  lastLoginTime: string | null
}

export interface LoginData {
  token: string
  user: LoginUser
}

export interface UploadImageData {
  url: string
  path: string
  name: string
}

export interface CommentItem {
  id: number
  author: string
  articleTitle: string
  content: string
  status: string
  createTime: string
}
