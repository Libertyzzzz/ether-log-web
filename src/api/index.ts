import axios from 'axios'
import type {
  ArticleDetail,
  ArticleListItem,
  ArticlePublishRequest,
  BackendCommentVO,
  Category,
  CommentSubmitRequest,
  LoginData,
  LoginUser,
  PageResponse,
  ResultResponse,
  Tag,
  UploadImageData,
} from '../types/blog'

// ═══════════════════════════════════════════════════════════════
// Auth Helpers
// ═══════════════════════════════════════════════════════════════

export function hasAuthToken(): boolean {
  return !!localStorage.getItem('authToken')
}

export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('authToken')
  return token ? { Authorization: token } : {}
}

// ═══════════════════════════════════════════════════════════════
// Global auth lifecycle handler
// 权限校验唯一真相源 = 后端响应状态码
//   401 → 未登录 / token 过期 → 清本地状态 + 弹登录窗
//   403 → 已登录但权限不足 → 静默记录
// ═══════════════════════════════════════════════════════════════
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status
      if (status === 401) {
        localStorage.removeItem('authToken')
        localStorage.removeItem('authUser')
        window.dispatchEvent(new CustomEvent('auth:expired'))
      } else if (status === 403) {
        console.warn('权限不足 (403):', error.config?.url)
      }
    }
    return Promise.reject(error)
  }
)

// ═══════════════════════════════════════════════════════════════
// Categories
// ═══════════════════════════════════════════════════════════════

export async function fetchCategories(): Promise<Category[]> {
  const response = await axios.get<ResultResponse<Category[]>>('/api/categories/list')
  const data = Array.isArray(response.data) ? response.data : response.data?.data
  if (Array.isArray(data)) {
    return data.map((c: any) => ({
      id: c.id,
      name: c.name || c.label || String(c.id),
      sort: typeof c.sort === 'number' ? c.sort : 0,
    }))
  }
  return []
}

export async function createCategory(payload: { name: string; sort?: number }): Promise<Category> {
  const resp = await axios.post('/api/categories', payload, hasAuthToken() ? { headers: getAuthHeaders() } : undefined)
  const p = resp.data && resp.data.data ? resp.data.data : resp.data
  return { id: p?.id || Date.now(), name: payload.name, sort: payload.sort }
}

export async function deleteCategory(id: number): Promise<void> {
  await axios.delete(`/api/categories/${id}`, hasAuthToken() ? { headers: getAuthHeaders() } : undefined)
}

// ═══════════════════════════════════════════════════════════════
// Tags
// ═══════════════════════════════════════════════════════════════

export async function fetchTags(): Promise<Tag[]> {
  const response = await axios.get<ResultResponse<PageResponse<Tag>>>(
    '/api/tags/page?pageNum=1&pageSize=200',
  )
  const payload = response.data?.data || response.data
  const records: any[] = Array.isArray(payload?.records) ? payload.records : []
  return records.map((t: any) => ({
    id: t.id,
    name: t.name || t.label || String(t.id),
    color: t.color,
  }))
}

export async function createTag(payload: { name: string; color?: string }): Promise<Tag> {
  const resp = await axios.post('/api/tags', payload, hasAuthToken() ? { headers: getAuthHeaders() } : undefined)
  const p = resp.data && resp.data.data ? resp.data.data : resp.data
  return { id: p?.id || Date.now(), name: payload.name, color: payload.color }
}

export async function deleteTag(id: number): Promise<void> {
  await axios.delete(`/api/tags/${id}`, hasAuthToken() ? { headers: getAuthHeaders() } : undefined)
}

// ═══════════════════════════════════════════════════════════════
// Articles
// ═══════════════════════════════════════════════════════════════

export async function fetchPublicArticles(pageNum = 1, pageSize = 10): Promise<ArticleListItem[]> {
  const response = await axios.get<ResultResponse<PageResponse<ArticleListItem>>>('/api/articles', {
    params: { pageNum, pageSize, status: 1 },
  })
  if (response.data.code === 200) {
    return response.data.data?.records || []
  }
  return []
}

function mapArticleRecord(record: any): ArticleListItem {
  return {
    id: record.id,
    title: record.title || '',
    subtitle: record.subtitle ?? null,
    summary: record.summary ?? null,
    coverImg: record.coverImg ?? null,
    viewCount: typeof record.viewCount === 'number' ? record.viewCount : 0,
    isTop: typeof record.isTop === 'number' ? record.isTop : record.isTop ? 1 : 0,
    categoryName: record.categoryName ?? record.category ?? null,
    tagNames: Array.isArray(record.tagNames) ? record.tagNames : [],
    createTime: record.createTime || '',
    updateTime: record.updateTime ?? null,
    status: typeof record.status === 'number' ? record.status : (record.status === '0' || record.status === 0) ? 0 : record.status ? Number(record.status) : 1,
  }
}

function extractRecords(response: any): { records: any[]; total: number } {
  const raw = response.data as any
  const payload = raw?.data ?? raw
  const records = Array.isArray(payload?.records)
    ? payload.records
    : Array.isArray(payload)
      ? payload
      : []
  const total = typeof payload?.total === 'number' ? payload.total : records.length
  return { records, total }
}

export async function fetchAdminArticles(pageNum = 1, pageSize = 6): Promise<{ articles: ArticleListItem[]; total: number }> {
  const [publishedRes, draftRes] = await Promise.all([
    axios.get<ResultResponse<PageResponse<ArticleListItem>> | PageResponse<ArticleListItem>>(
      '/api/articles',
      { params: { pageNum, pageSize, status: 1 }, headers: getAuthHeaders() },
    ),
    axios.get<ResultResponse<PageResponse<ArticleListItem>> | PageResponse<ArticleListItem>>(
      '/api/articles',
      { params: { pageNum: 1, pageSize: 200, status: 0 }, headers: getAuthHeaders() },
    ),
  ])
  const { records: publishedRecords, total } = extractRecords(publishedRes)
  const { records: draftRecords } = extractRecords(draftRes)
  const articles = [...publishedRecords.map(mapArticleRecord), ...draftRecords.map(mapArticleRecord)]
  return { articles, total }
}

export async function fetchArticleDetail(articleId: number, useAuth = false, status?: number): Promise<ArticleDetail | null> {
  const headers = useAuth && hasAuthToken() ? getAuthHeaders() : undefined
  const params: Record<string, number> = {}
  if (status !== undefined) params.status = status
  const response = await axios.get<ResultResponse<ArticleDetail>>(`/api/articles/${articleId}`, { headers, params })
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  return null
}

export async function fetchAdminArticleDetail(articleId: number, status?: number): Promise<ArticleDetail | null> {
  try {
    const params: Record<string, number> = {}
    if (status !== undefined) params.status = status
    const response = await axios.get<ResultResponse<ArticleDetail>>(`/api/articles/${articleId}`, {
      headers: getAuthHeaders(),
      params,
    })
    if (response.data.code === 200 && response.data.data) {
      return response.data.data
    }
  } catch {
    return null
  }
  return null
}

export async function createArticle(payload: ArticlePublishRequest): Promise<number> {
  const response = await axios.post<ResultResponse<number>>('/api/admin/articles', payload, {
    headers: getAuthHeaders(),
  })
  if (response.data.code === 200 && response.data.data !== undefined) {
    return response.data.data
  }
  throw new Error(response.data.message || '文章创建失败')
}

export async function updateArticle(id: number, payload: ArticlePublishRequest): Promise<number> {
  const response = await axios.put<ResultResponse<number>>(`/api/admin/articles/${id}`, payload, {
    headers: getAuthHeaders(),
  })
  if (response.data.code === 200 && response.data.data !== undefined) {
    return response.data.data
  }
  throw new Error(response.data.message || '文章更新失败')
}

export async function updateArticleField(id: number, fields: Record<string, any>): Promise<void> {
  await axios.put(`/api/articles/${id}`, fields, hasAuthToken() ? { headers: getAuthHeaders() } : undefined)
}

export async function deleteArticle(articleId: number): Promise<void> {
  const response = await axios.delete<ResultResponse<null>>(`/api/admin/articles/${articleId}`, {
    headers: getAuthHeaders(),
  })
  if (response.data.code !== 200) {
    throw new Error(response.data.message || '删除失败')
  }
}

export async function searchArticles(keyword: string): Promise<any[]> {
  const response = await axios.get('/api/articles/search', {
    params: { keyword },
  })
  if (response.data.code === 200) {
    return response.data.data || []
  }
  return []
}

// ═══════════════════════════════════════════════════════════════
// Auth
// ═══════════════════════════════════════════════════════════════

export async function login(email: string, password: string): Promise<LoginData> {
  const response = await axios.post<ResultResponse<LoginData>>('/api/auth/login', {
    username: email,
    password,
  })
  if (response.data.code !== 200) {
    throw new Error(response.data.message || '登录失败')
  }
  const loginData = response.data.data
  if (!loginData?.token || !loginData.user) {
    throw new Error('登录返回数据格式不正确')
  }
  return loginData
}

export async function fetchUserProfile(userId: number): Promise<LoginUser | null> {
  const response = await axios.get<ResultResponse<LoginUser>>(`/api/user/${userId}`, {
    headers: getAuthHeaders(),
  })
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  return null
}

export async function updateUserProfile(payload: Record<string, any>): Promise<boolean> {
  const response = await axios.post<ResultResponse<any>>('/api/user/save', payload, {
    headers: getAuthHeaders(),
  })
  return response.data.code === 200
}

// ═══════════════════════════════════════════════════════════════
// Comments
// ═══════════════════════════════════════════════════════════════

export async function fetchComments(articleId: number): Promise<BackendCommentVO[]> {
  const url = articleId === 0 ? '/api/comment/list/guest-book' : `/api/comment/list/${articleId}`
  const response = await axios.get<ResultResponse<BackendCommentVO[]>>(url)
  if (response.data.code === 200) {
    return response.data.data || []
  }
  throw new Error(response.data.message || '评论加载失败')
}

export async function fetchPendingComments(): Promise<BackendCommentVO[]> {
  const response = await axios.get<ResultResponse<BackendCommentVO[]>>(
    '/api/comment/list/guest-book',
    {
      headers: getAuthHeaders(),
      params: { status: 0 },
    },
  )
  if (response.data.code === 200) {
    return response.data.data || []
  }
  throw new Error(response.data.message || '待审核评论加载失败')
}

export async function reviewComment(commentId: number, status: number): Promise<boolean> {
  const response = await axios.put<ResultResponse<boolean>>(
    '/api/comment/review',
    null,
    {
      headers: getAuthHeaders(),
      params: { commentId, status },
    },
  )
  return response.data.code === 200 && response.data.data === true
}

export async function deleteComment(commentId: number): Promise<boolean> {
  const response = await axios.delete<ResultResponse<boolean>>('/api/comment/delete', {
    headers: getAuthHeaders(),
    params: { commentId },
  })
  return response.data.code === 200 && response.data.data === true
}

export async function submitComment(body: CommentSubmitRequest): Promise<boolean> {
  const response = await axios.post<ResultResponse<void>>('/api/comment/publish', body, {
    headers: getAuthHeaders(),
  })
  return response.data.code === 200
}

// ═══════════════════════════════════════════════════════════════
// Gate (Access Code)
// ═══════════════════════════════════════════════════════════════

export async function checkGateStatus(): Promise<{ status: number } | null> {
  const response = await axios.get<ResultResponse<any>>('/api/access-code/1')
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  return null
}

export async function verifyAccessCode(code: string): Promise<boolean> {
  const response = await axios.get<ResultResponse<boolean>>('/api/access-code/verify', {
    params: { id: 1, accessCode: code },
  })
  return response.data.code === 200 && response.data.data === true
}

// ═══════════════════════════════════════════════════════════════
// Upload
// ═══════════════════════════════════════════════════════════════

export async function uploadImage(formData: FormData): Promise<UploadImageData | null> {
  const response = await axios.post<ResultResponse<UploadImageData>>(
    '/api/admin/upload/image/with-reference',
    formData,
    { headers: getAuthHeaders() },
  )
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  return null
}

// ═══════════════════════════════════════════════════════════════
// Anonymous
// ═══════════════════════════════════════════════════════════════

export async function fetchAnonymousUser(): Promise<{ anonymousId?: string; hasCommented?: boolean } | null> {
  const resp = await axios.get('/api/anonymous/user')
  const payload = resp.data && resp.data.data ? resp.data.data : resp.data
  return payload || null
}

// ═══════════════════════════════════════════════════════════════
// Assessment
// ═══════════════════════════════════════════════════════════════

export async function fetchAssessmentShare(shareId: string): Promise<any> {
  const res = await axios.get(`/api/v2/assessment/share/${shareId}`)
  return res.data.data
}

export async function evaluateAssessment(payload: any, gender: string): Promise<any> {
  const response = await axios.post('/api/v2/assessment/evaluate', payload, {
    params: { gender },
  })
  const responseData = response.data
  return 'data' in responseData ? responseData.data : response.data
}