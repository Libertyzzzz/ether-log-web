import axios from 'axios'
import type {
  AIChatRequest,
  AIChatResponse,
  AIChatAction,
  AgentChatRequestPayload,
  AgentConversationCreateRequest,
  AgentConversationListItem,
  AgentConversationResponse,
  AgentMessageVo,
  ArticleDetail,
  ArticleListItem,
  ArticlePublishRequest,
  BackendCommentVO,
  Category,
  CommentSubmitRequest,
  ImageDeleteResultVo,
  ImageInfoVo,
  ImageQueryDto,
  ImageReferenceVo,
  LoginData,
  LoginUser,
  PageResponse,
  RefreshTokenData,
  ResultResponse,
  SensitiveWordCreateRequest,
  SensitiveWordItem,
  SensitiveWordQueryDto,
  Tag,
  UploadImageData,
  SysRole,
  SysPermission,
  PermissionTreeQueryDto,
  PermissionTreeVO,
  UserPermissionInfo,
  RoleUserItem,
  SysUser,
  SysUserCreateRequest,
  SysUserUpdateRequest,
  SysUserQueryDto,
} from '../types/blog'

const TOKEN_KEY = 'authToken'
const TOKEN_EXPIRE_KEY = 'authTokenExpire'

export function getStoredItem(key: string): string | null {
  return localStorage.getItem(key) || sessionStorage.getItem(key)
}

export function setStoredItem(key: string, value: string): void {
  localStorage.setItem(key, value)
  sessionStorage.setItem(key, value)
}

export function removeStoredItem(key: string): void {
  localStorage.removeItem(key)
  sessionStorage.removeItem(key)
}

export function hasAuthToken(): boolean {
  return !!getStoredItem(TOKEN_KEY)
}

export function getAuthHeaders(): Record<string, string> {
  const token = getStoredItem(TOKEN_KEY)
  return token ? { Authorization: token } : {}
}

export function parseJwt<T = any>(token: string): T | null {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(json)
  } catch {
    return null
  }
}

export function getTokenExpire(): number | null {
  const stored = getStoredItem(TOKEN_EXPIRE_KEY)
  if (stored) {
    const n = Number(stored)
    if (!Number.isNaN(n)) return n
  }
  const token = getStoredItem(TOKEN_KEY)
  if (!token) return null
  const payload = parseJwt<{ exp: number }>(token)
  if (payload && typeof payload.exp === 'number') {
    return normalizeExpire(payload.exp) ?? null
  }
  return null
}

export function setTokenExpire(expireMs: number) {
  setStoredItem(TOKEN_EXPIRE_KEY, String(expireMs))
}

function clearAuthState(code?: number) {
  removeStoredItem(TOKEN_KEY)
  removeStoredItem(TOKEN_EXPIRE_KEY)
  removeStoredItem('authUser')
  window.dispatchEvent(new CustomEvent('auth:expired', { detail: { code } }))
}

axios.interceptors.request.use(
  (config) => {
    // 关键修复：续约接口 /api/auth/refresh 依赖 Cookie (withCredentials)，绝不能携带过期的 Authorization 头！
    // 否则后端的全局 JWT Filter 会优先校验过期的 Header 并抛出 401/403，导致续约接口被拦截强行登出。
    if (config.url && config.url.includes('/api/auth/refresh')) {
      if (config.headers) {
        delete config.headers.Authorization
      }
      return config
    }

    const token = getStoredItem(TOKEN_KEY)
    if (token) {
      config.headers = config.headers || {}
      if (!config.headers.Authorization) config.headers.Authorization = token
    }
    return config
  },
  (error) => Promise.reject(error),
)

function dispatchForbiddenEvent(message: string | undefined, url: string) {
  window.dispatchEvent(new CustomEvent('api:forbidden', {
    detail: {
      message: message || '抱歉，你没有该操作的权限',
      url: url || '',
    }
  }))
}

/**
 * 判断一个错误是否为「权限不足 (403)」且已由全局拦截器处理过。
 * 覆盖两种情况：
 *   1. HTTP 200 + body.code = 403（拦截器 reject 时打了 _forbiddenHandled 标记）
 *   2. HTTP status = 403（协议层）
 * 上层 catch 如果返回 true，应跳过自己的 toast，避免重复提示。
 */
export function isForbiddenError(err: unknown): boolean {
  if (!err) return false
  if ((err as any)._forbiddenHandled === true) return true
  if (axios.isAxiosError(err)) {
    if (err.response?.status === 403) {
      const bodyCode = (err.response?.data as any)?.code
      // 1003/1004 是 token 过期，不属于权限不足提示的场景
      if (bodyCode === 1003 || bodyCode === 1004) return false
      return true
    }
  }
  return false
}

axios.interceptors.response.use(
  (response) => {
    const body = response.data
    const code = body?.code
    // 只有后端明确返回已失效业务状态码 1003 (TOKEN_INVALID) / 1004 (MAX_EXPIRED) 时才判定登录状态失效
    if (code === 1003 || code === 1004) {
      clearAuthState(code)
      window.dispatchEvent(new CustomEvent('auth:need-login', {
        detail: { message: body?.message || '登录状态已失效，请重新登录' }
      }))
      return Promise.reject(new Error(body?.message || '登录已过期'))
    }
    // 业务码 403：HTTP 200，但 body.code 表示权限不足（真正的角色无权限）
    if (code === 403) {
      dispatchForbiddenEvent(body?.message, response.config?.url || '')
      const err = new Error(body?.message || '权限不足，拒绝访问') as Error & { _forbiddenHandled?: boolean }
      err._forbiddenHandled = true
      return Promise.reject(err)
    }
    return response
  },
  (error) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status
      const body = error.response?.data
      const code = body?.code
      // 401 状态交给 useAuth.ts 中的重试拦截器统一捕获并尝试 runRefreshOnce() 续约，此处不盲目清除状态
      if (status === 403) {
        if (code === 1003 || code === 1004) {
          clearAuthState(code)
        } else {
          // HTTP 403：协议层权限不足（已登录但角色无权限）
          dispatchForbiddenEvent(body?.message, error.config?.url || '')
          ;(error as any)._forbiddenHandled = true
        }
      }
    }
    return Promise.reject(error)
  }
)

export async function fetchCategories(): Promise<Category[]> {
  const response = await axios.get<ResultResponse<Category[]>>('/api/categories/list')
  const data = Array.isArray(response.data) ? response.data : response.data?.data
  if (Array.isArray(data)) {
    return data.map((c: any) => ({
      id: c.id,
      name: c.name || c.label || String(c.id),
      sort: typeof c.sort === 'number' ? c.sort : 0,
      articleCount: typeof c.articleCount === 'number' ? c.articleCount
        : typeof c.count === 'number' ? c.count
        : typeof c.article_count === 'number' ? c.article_count : undefined,
    }))
  }
  return []
}

export async function createCategory(payload: { name: string; sort?: number }): Promise<Category> {
  const resp = await axios.post('/api/categories', payload)
  const p = resp.data && resp.data.data ? resp.data.data : resp.data
  return { id: p?.id || Date.now(), name: payload.name, sort: payload.sort }
}

export async function deleteCategory(id: number): Promise<void> {
  await axios.delete(`/api/categories/${id}`)
}

export async function updateCategory(id: number, payload: { name: string; sort?: number }): Promise<Category> {
  const resp = await axios.put(`/api/categories/${id}`, payload)
  const p = resp.data && resp.data.data ? resp.data.data : resp.data
  return { id: p?.id || id, name: payload.name, sort: payload.sort }
}

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
  const resp = await axios.post('/api/tags', payload)
  const p = resp.data && resp.data.data ? resp.data.data : resp.data
  return { id: p?.id || Date.now(), name: payload.name, color: payload.color }
}

export async function deleteTag(id: number): Promise<void> {
  await axios.delete(`/api/tags/${id}`)
}

export async function updateTag(id: number, payload: { name: string; color?: string }): Promise<Tag> {
  const resp = await axios.put(`/api/tags/${id}`, payload)
  const p = resp.data && resp.data.data ? resp.data.data : resp.data
  return { id: p?.id || id, name: payload.name, color: payload.color }
}

export async function fetchSensitiveWords(params: SensitiveWordQueryDto = {}): Promise<PageResponse<SensitiveWordItem>> {
  const response = await axios.get<ResultResponse<PageResponse<SensitiveWordItem>> | PageResponse<SensitiveWordItem>>(
    '/api/admin/sensitive-words',
    { params },
  )
  const body = response.data as ResultResponse<PageResponse<SensitiveWordItem>> | PageResponse<SensitiveWordItem>
  const payload = (body as any)?.data ?? body
  if (payload && typeof payload === 'object' && Array.isArray(payload.records)) {
    return {
      records: payload.records,
      total: typeof payload.total === 'number' ? payload.total : payload.records.length,
      size: typeof payload.size === 'number' ? payload.size : params.pageSize ?? 10,
      current: typeof payload.current === 'number' ? payload.current : params.pageNum ?? 1,
      pages: typeof payload.pages === 'number' ? payload.pages : 1,
    }
  }
  return { records: [], total: 0, size: params.pageSize ?? 10, current: params.pageNum ?? 1, pages: 1 }
}

export async function createSensitiveWord(payload: SensitiveWordCreateRequest): Promise<SensitiveWordItem> {
  const response = await axios.post<ResultResponse<SensitiveWordItem>>('/api/admin/sensitive-words', payload)
  if (response.data?.code === 200) {
    return (response.data.data ?? {}) as SensitiveWordItem
  }
  throw new Error(response.data?.message || '创建敏感词失败')
}

export async function deleteSensitiveWord(id: number): Promise<void> {
  const response = await axios.delete<ResultResponse<null>>(`/api/admin/sensitive-words/${id}`)
  if (response.data?.code !== 200) {
    throw new Error(response.data?.message || '删除敏感词失败')
  }
}

export async function fetchPublicArticles(pageNum = 1, pageSize = 9): Promise<{ records: ArticleListItem[]; total: number }> {
  const response = await axios.get<ResultResponse<PageResponse<ArticleListItem>>>('/api/articles', {
    params: { pageNum, pageSize, status: 1 },
  })
  if (response.data.code === 200) {
    const data = response.data.data
    const records = (data?.records || []).map(mapArticleRecord)
    const total = data?.total ?? records.length
    return { records, total }
  }
  return { records: [], total: 0 }
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
      { params: { pageNum, pageSize: 200, status: 0 }, headers: getAuthHeaders() },
    ),
  ])
  const { records: publishedRecords, total } = extractRecords(publishedRes)
  const { records: draftRecords } = extractRecords(draftRes)
  const articles = [...publishedRecords.map(mapArticleRecord), ...draftRecords.map(mapArticleRecord)]
  return { articles, total }
}

export async function fetchArticleDetail(articleId: number, _useAuth = false, status?: number): Promise<ArticleDetail | null> {
  const params: Record<string, number> = {}
  if (status !== undefined) params.status = status
  const response = await axios.get<ResultResponse<ArticleDetail>>(`/api/articles/${articleId}`, { params })
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  return null
}

export async function fetchAdminArticleDetail(articleId: number, status?: number): Promise<ArticleDetail | null> {
  try {
    const params: Record<string, number> = {}
    if (status !== undefined) params.status = status
    const response = await axios.get<ResultResponse<ArticleDetail>>(`/api/articles/${articleId}`, { params })
    if (response.data.code === 200 && response.data.data) {
      return response.data.data
    }
  } catch {
    return null
  }
  return null
}

export async function createArticle(payload: ArticlePublishRequest): Promise<number> {
  const response = await axios.post<ResultResponse<number>>('/api/admin/articles', payload)
  if (response.data.code === 200 && response.data.data !== undefined) {
    return response.data.data
  }
  throw new Error(response.data.message || '文章创建失败')
}

export async function updateArticle(id: number, payload: ArticlePublishRequest): Promise<number> {
  const response = await axios.put<ResultResponse<number>>(`/api/admin/articles/${id}`, payload)
  if (response.data.code === 200 && response.data.data !== undefined) {
    return response.data.data
  }
  throw new Error(response.data.message || '文章更新失败')
}

export async function updateArticleField(id: number, fields: Record<string, any>): Promise<void> {
  await axios.put(`/api/articles/${id}`, fields)
}

export async function deleteArticle(articleId: number): Promise<void> {
  const response = await axios.delete<ResultResponse<null>>(`/api/admin/articles/${articleId}`)
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

export function normalizeExpire(value: number | undefined | null): number | undefined {
  if (typeof value !== 'number' || Number.isNaN(value)) return undefined
  return value < 1_000_000_000_000 ? value * 1000 : value
}

export async function login(email: string, password: string): Promise<LoginData> {
  const response = await axios.post<ResultResponse<LoginData>>('/api/auth/login', {
    username: email,
    password,
  }, {
    withCredentials: true,
  })
  if (response.data.code !== 200) {
    throw new Error(response.data.message || '登录失败')
  }
  const loginData = response.data.data
  if (!loginData?.token || !loginData.user) {
    throw new Error('登录返回数据格式不正确')
  }
  const fromApi = normalizeExpire(loginData.expire)
  if (fromApi) {
    loginData.expire = fromApi
  } else {
    const payload = parseJwt(loginData.token)
    if (payload && typeof payload.exp === 'number') {
      loginData.expire = normalizeExpire(payload.exp)!
    }
  }
  return loginData
}

export async function refreshToken(): Promise<RefreshTokenData> {
  const response = await axios.post<ResultResponse<RefreshTokenData>>(
    '/api/auth/refresh',
    {},
    {
      withCredentials: true,
    }
  )
  if (response.data.code !== 200) {
    throw new Error(response.data.message || '刷新 token 失败')
  }
  const data = response.data.data
  if (!data?.token) throw new Error('刷新返回数据格式不正确')
  const normalized = normalizeExpire(data.expire)
  if (normalized) data.expire = normalized
  return data
}

export async function fetchUserProfile(): Promise<LoginUser | null> {
  const response = await axios.get<ResultResponse<LoginUser>>('/api/user/info')
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  return null
}

export async function updateUserProfile(payload: Record<string, any>): Promise<boolean> {
  const response = await axios.post<ResultResponse<any>>('/api/user/save', payload)
  return response.data.code === 200
}

export async function logout(): Promise<void> {
  await axios.post('/api/auth/logout', null, {
    withCredentials: true,
  })
}

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
    { params: { status: 0 } },
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
    { params: { commentId, status } },
  )
  return response.data.code === 200 && response.data.data === true
}

export async function deleteComment(commentId: number): Promise<boolean> {
  const response = await axios.delete<ResultResponse<boolean>>('/api/comment/delete', {
    params: { commentId },
  })
  return response.data.code === 200 && response.data.data === true
}

export async function submitComment(body: CommentSubmitRequest): Promise<boolean> {
  const response = await axios.post<ResultResponse<void>>('/api/comment/publish', body)
  return response.data.code === 200
}

export async function checkGateStatus(): Promise<{ status: number } | null> {
  const response = await axios.get<ResultResponse<any>>('/api/access-code/gate', {
    params: { id: 1 },
  })
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

export async function uploadImage(formData: FormData): Promise<UploadImageData | null> {
  const response = await axios.post<ResultResponse<UploadImageData>>(
    '/api/image/upload/with-reference',
    formData,
  )
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  return null
}

export async function fetchImageList(params: ImageQueryDto = {}): Promise<PageResponse<ImageInfoVo>> {
  const response = await axios.get<ResultResponse<PageResponse<ImageInfoVo>>>(
    '/api/image/list',
    { params },
  )
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  return { records: [], total: 0, size: 0, current: 1, pages: 0 }
}

export async function fetchImageReference(imageId: string): Promise<ImageReferenceVo[]> {
  const response = await axios.get<ResultResponse<ImageReferenceVo[]>>(
    '/api/image/reference',
    { params: { imageId } },
  )
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  return []
}

export async function deleteImages(ids: number[]): Promise<ImageDeleteResultVo> {
  const response = await axios.delete<ResultResponse<ImageDeleteResultVo>>(
    '/api/image/delete',
    { data: { ids } },
  )
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  return { successCount: 0, failCount: 0, errorMessages: [] }
}

export async function fetchAnonymousUser(): Promise<{ anonymousId?: string; hasCommented?: boolean } | null> {
  const resp = await axios.get('/api/anonymous/user')
  const payload = resp.data && resp.data.data ? resp.data.data : resp.data
  return payload || null
}

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

export async function chatWithAI(payload: AIChatRequest): Promise<AIChatResponse> {
  const contextKey = payload.contextKey || 'generic'
  const rawContext = typeof payload.context === 'object' && payload.context !== null
    ? payload.context
    : {
        key: contextKey,
        payload: {
          title: payload.title || '',
          content: typeof payload.context === 'string' ? payload.context : '',
        },
      }

  const conversationId = payload.conversationId
  if (!conversationId) {
    const created = await createAIAssistantConversation({
      title: payload.title || '新会话',
      contextKey,
    })
    const nextConversationId = created.id || created.conversationId
    if (!nextConversationId) throw new Error('创建会话失败')
    payload.conversationId = nextConversationId
  }

  const response = await axios.post<ResultResponse<any>>(`/api/agent/chat/${payload.conversationId}`, {
    message: payload.message,
    action: payload.action,
    context: rawContext,
    stream: false,
  })
  const body = response.data
  if (body && typeof body === 'object' && 'code' in body && body.code !== 0 && body.code !== 200) {
    throw new Error('服务暂时繁忙，请稍后再试')
  }
  const raw = (('data' in body && body.data ? body.data : body) as unknown) as {
    content?: unknown
    candidates?: unknown
    action?: unknown
  }
  if (!raw || typeof raw.content !== 'string') {
    throw new Error('服务暂时繁忙，请稍后再试')
  }
  const allowedActions: AIChatAction[] = [
    'chat',
    'generate_title',
    'polish_text',
    'continue_write',
    'generate_summary',
    'check_typo',
    'generate_outline',
  ]
  const action = typeof raw.action === 'string' && allowedActions.includes(raw.action as AIChatAction)
    ? (raw.action as AIChatAction)
    : payload.action

  return {
    content: raw.content,
    candidates: Array.isArray(raw.candidates) ? raw.candidates : undefined,
    action,
  }
}

export async function createAIAssistantConversation(payload: AgentConversationCreateRequest): Promise<AgentConversationResponse> {
  const response = await axios.post<ResultResponse<AgentConversationResponse>>('/api/agent/conversations', payload)
  const body = response.data
  if (body && typeof body === 'object' && 'code' in body && body.code !== 0 && body.code !== 200) {
    throw new Error(body.message || '创建会话失败')
  }
  return (body && typeof body === 'object' && 'data' in body ? body.data : body) as AgentConversationResponse
}

export async function fetchAIAssistantConversations(page = 1, pageSize = 20): Promise<{ records: AgentConversationListItem[]; total: number }> {
  const response = await axios.get<ResultResponse<any>>('/api/agent/conversations', {
    params: { page, pageSize },
  })
  const body = response.data
  const payload = body && typeof body === 'object' && 'data' in body ? body.data : body
  const records = Array.isArray(payload?.records) ? payload.records : []
  return {
    records: records as AgentConversationListItem[],
    total: typeof payload?.total === 'number' ? payload.total : records.length,
  }
}

export async function updateAIAssistantConversation(conversationId: string, title: string): Promise<boolean> {
  const response = await axios.put<ResultResponse<boolean>>(`/api/agent/chat/${conversationId}`, null, {
    params: { title },
  })
  const body = response.data
  if (body && typeof body === 'object' && 'code' in body && body.code !== 0 && body.code !== 200) {
    throw new Error(body.message || '更新会话失败')
  }
  return typeof body.data === 'boolean' ? body.data : false
}

export async function deleteAIAssistantConversation(conversationId: string): Promise<boolean> {
  const response = await axios.delete<ResultResponse<boolean>>(`/api/agent/chat/${conversationId}`)
  const body = response.data
  if (body && typeof body === 'object' && 'code' in body && body.code !== 0 && body.code !== 200) {
    throw new Error(body.message || '删除会话失败')
  }
  return typeof body.data === 'boolean' ? body.data : false
}

export async function chatWithAIAssistantConversation(conversationId: string, payload: AgentChatRequestPayload): Promise<AIChatResponse> {
  const response = await axios.post<ResultResponse<AIChatResponse>>(`/api/agent/chat/${conversationId}`, payload)
  const body = response.data
  if (body && typeof body === 'object' && 'code' in body && body.code !== 0 && body.code !== 200) {
    throw new Error(body.message || '会话聊天失败')
  }
  const raw = (body && typeof body === 'object' && 'data' in body ? body.data : body) as unknown as {
    content?: unknown
    candidates?: unknown
    action?: unknown
  }
  if (!raw || typeof raw.content !== 'string') {
    throw new Error('服务暂时繁忙，请稍后再试')
  }
  return {
    content: raw.content,
    candidates: Array.isArray(raw.candidates) ? raw.candidates : undefined,
    action: typeof raw.action === 'string' ? raw.action as AIChatAction : payload.action,
  }
}

export async function fetchAIAssistantConversationContext(conversationId: string): Promise<AgentMessageVo[]> {
  const response = await axios.get<ResultResponse<AgentMessageVo[]>>(`/api/agent/chat/${conversationId}`)
  const body = response.data
  if (body && typeof body === 'object' && 'code' in body && body.code !== 0 && body.code !== 200) {
    throw new Error(body.message || '加载会话上下文失败')
  }
  return (body && typeof body === 'object' && 'data' in body ? body.data : body) as AgentMessageVo[]
}

/**
 * 获取用户的权限信息 (登录后调用，基于当前 token)
 */
export async function fetchUserPermissions(): Promise<UserPermissionInfo> {
  const response = await axios.get<ResultResponse<UserPermissionInfo>>('/api/admin/role/user/permissions')
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  throw new Error(response.data.message || '获取用户权限失败')
}

export async function fetchRolesPage(
  current = 1,
  size = 10,
  keyword?: string,
): Promise<PageResponse<SysRole>> {
  const response = await axios.get<ResultResponse<PageResponse<SysRole>>>('/api/admin/role/page', {
    params: { current, size, keyword },
  })
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  throw new Error(response.data.message || '获取角色列表失败')
}

export async function fetchRoleList(): Promise<SysRole[]> {
  const response = await axios.get<ResultResponse<SysRole[]>>('/api/admin/role/list')
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  throw new Error(response.data.message || '获取角色列表失败')
}

export async function fetchRoleById(id: number): Promise<SysRole> {
  const response = await axios.get<ResultResponse<SysRole>>(`/api/admin/role/${id}`)
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  throw new Error(response.data.message || '获取角色详情失败')
}

export async function createRole(role: Partial<SysRole>): Promise<SysRole> {
  const response = await axios.post<ResultResponse<SysRole>>('/api/admin/role', role)
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  throw new Error(response.data.message || '创建角色失败')
}

export async function updateRole(role: Partial<SysRole>): Promise<SysRole> {
  const response = await axios.put<ResultResponse<SysRole>>('/api/admin/role', role)
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  throw new Error(response.data.message || '更新角色失败')
}

export async function deleteRole(id: number): Promise<void> {
  const response = await axios.delete<ResultResponse<void>>(`/api/admin/role/${id}`)
  if (response.data.code !== 200) {
    throw new Error(response.data.message || '删除角色失败')
  }
}

export async function fetchUserRoles(userId: number | string): Promise<SysRole[]> {
  const response = await axios.get<ResultResponse<SysRole[]>>(`/api/admin/role/user/${encodeURIComponent(String(userId))}`)
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  throw new Error(response.data.message || '获取用户角色失败')
}

export async function assignRolesToUser(userId: number | string, roleIds: number[]): Promise<void> {
  const uid = String(userId)
  if (!uid) throw new Error('无效用户ID')
  await updateUser(uid, { roleIds })
}

export async function fetchRolePermissionIds(roleId: number): Promise<number[]> {
  const response = await axios.get<ResultResponse<number[]>>(`/api/admin/role/${roleId}/permissions`)
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  throw new Error(response.data.message || '获取角色权限失败')
}

export async function assignPermissionsToRole(roleId: number, permissionIds: number[]): Promise<void> {
  const response = await axios.post<ResultResponse<void>>(
    `/api/admin/role/${roleId}/permissions`,
    null,
    { params: { permissionIds: permissionIds.join(',') } },
  )
  if (response.data.code !== 200) {
    throw new Error(response.data.message || '分配权限失败')
  }
}

export async function fetchRoleUsersList(): Promise<RoleUserItem[]> {
  const response = await axios.get<ResultResponse<RoleUserItem[]>>('/api/admin/role/users')
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  throw new Error(response.data.message || '获取用户列表失败')
}

export async function fetchPermissionPage(
  current = 1,
  size = 10,
  keyword?: string,
  permType?: number,
): Promise<PageResponse<SysPermission>> {
  const response = await axios.get<ResultResponse<PageResponse<SysPermission>>>('/api/admin/permission/page', {
    params: { current, size, keyword, permType },
  })
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  throw new Error(response.data.message || '获取权限列表失败')
}

export async function fetchPermissionList(): Promise<SysPermission[]> {
  const response = await axios.get<ResultResponse<SysPermission[]>>('/api/admin/permission/list')
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  throw new Error(response.data.message || '获取权限列表失败')
}

export async function fetchPermissionTree(query?: PermissionTreeQueryDto): Promise<PermissionTreeVO[]> {
  const params: Record<string, unknown> = {}
  if (query) {
    if (query.parentId !== undefined && query.parentId !== null) params.parentId = query.parentId
    if (query.permType !== undefined && query.permType !== null) params.permType = query.permType
    if (query.onlyEnabled !== undefined) params.onlyEnabled = query.onlyEnabled
  }
  const response = await axios.get<ResultResponse<PermissionTreeVO[]>>('/api/admin/permission/tree', { params })
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  throw new Error(response.data.message || '获取权限树失败')
}

export async function fetchPermissionsByType(permType: number): Promise<SysPermission[]> {
  const response = await axios.get<ResultResponse<SysPermission[]>>(`/api/admin/permission/type/${permType}`)
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  throw new Error(response.data.message || '获取指定类型权限失败')
}

export async function fetchPermissionById(id: number): Promise<SysPermission> {
  const response = await axios.get<ResultResponse<SysPermission>>(`/api/admin/permission/${id}`)
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  throw new Error(response.data.message || '获取权限详情失败')
}

export async function createPermission(permission: Partial<SysPermission>): Promise<SysPermission> {
  const response = await axios.post<ResultResponse<SysPermission>>('/api/admin/permission', permission)
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  throw new Error(response.data.message || '创建权限失败')
}

export async function updatePermission(permission: Partial<SysPermission>): Promise<SysPermission> {
  const response = await axios.put<ResultResponse<SysPermission>>('/api/admin/permission', permission)
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  throw new Error(response.data.message || '更新权限失败')
}

export async function deletePermission(id: number): Promise<void> {
  const response = await axios.delete<ResultResponse<void>>(`/api/admin/permission/${id}`)
  if (response.data.code !== 200) {
    throw new Error(response.data.message || '删除权限失败')
  }
}

export async function fetchUsersPage(
  params: SysUserQueryDto,
): Promise<PageResponse<SysUser>> {
  const response = await axios.get<ResultResponse<PageResponse<SysUser>>>('/api/admin/user/page', { params })
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  throw new Error(response.data.message || '获取用户列表失败')
}

export async function fetchUserList(keyword?: string): Promise<SysUser[]> {
  const response = await axios.get<ResultResponse<SysUser[]>>('/api/admin/user/list', { params: { keyword } })
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  throw new Error(response.data.message || '获取用户列表失败')
}

export async function fetchUserById(id: number): Promise<SysUser> {
  const response = await axios.get<ResultResponse<SysUser>>(`/api/admin/user/${id}`)
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  throw new Error(response.data.message || '获取用户详情失败')
}

export async function createUser(user: SysUserCreateRequest): Promise<SysUser> {
  const response = await axios.post<ResultResponse<SysUser>>('/api/admin/user', user)
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  throw new Error(response.data.message || '创建用户失败')
}

export async function updateUser(userId: number | string, dto: SysUserUpdateRequest): Promise<SysUser> {
  const response = await axios.put<ResultResponse<SysUser>>(`/api/admin/user/${encodeURIComponent(String(userId))}`, dto)
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  throw new Error(response.data.message || '更新用户失败')
}

export async function deleteUser(id: number): Promise<void> {
  const response = await axios.delete<ResultResponse<void>>(`/api/admin/user/${id}`)
  if (response.data.code !== 200) {
    throw new Error(response.data.message || '删除用户失败')
  }
}

export async function resetUserPassword(userId: number | string, newPassword?: string): Promise<void> {
  const parsedUserId = Number(userId)
  if (!Number.isFinite(parsedUserId)) {
    throw new Error('无效用户ID')
  }
  await updateUser(parsedUserId, { password: newPassword || undefined })
}

export async function toggleUserStatus(userId: number, status: number): Promise<void> {
  await updateUser(userId, { status })
}

import type {
  ArticleQueryDto,
  CategoryQueryDto,
  TagQueryDto,
  CommentQueryDto,
} from '../types/blog'

export async function fetchArticlesAdminPage(params: ArticleQueryDto): Promise<PageResponse<ArticleListItem>> {
  const response = await axios.get<ResultResponse<PageResponse<ArticleListItem>>>(
    '/api/articles',
    { params },
  )
  const payload = (response.data as any)?.data ?? response.data
  if (payload && typeof payload === 'object' && Array.isArray(payload.records)) {
    return {
      records: (payload.records || []).map(mapArticleRecord),
      total: typeof payload.total === 'number' ? payload.total : payload.records.length,
      size: typeof payload.size === 'number' ? payload.size : params.pageSize ?? 10,
      current: typeof payload.current === 'number' ? payload.current : params.pageNum ?? 1,
      pages: typeof payload.pages === 'number' ? payload.pages : 1,
    }
  }
  return { records: [], total: 0, size: params.pageSize ?? 10, current: params.pageNum ?? 1, pages: 0 }
}

export async function batchUpdateArticleStatus(ids: number[], status: number): Promise<void> {
  await Promise.all(ids.map((id) => axios.put(`/api/articles/${id}`, { status })))
}

export async function auditArticle(articleId: number, passed: boolean, remark?: string): Promise<void> {
  const status = passed ? 1 : 2
  const fields: Record<string, any> = { status }
  if (remark) fields.rejectRemark = remark
  await axios.put(`/api/articles/${articleId}`, fields)
}

export async function fetchCategoriesPage(params: CategoryQueryDto = {}): Promise<PageResponse<Category>> {
  const pageNum = params.pageNum ?? 1
  const pageSize = params.pageSize ?? 10
  const all = await fetchCategories()
  const filtered = params.keyword
    ? all.filter((c) => c.name.includes(params.keyword as string))
    : all
  filtered.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
  const total = filtered.length
  const start = (pageNum - 1) * pageSize
  const records = filtered.slice(start, start + pageSize)
  return {
    records,
    total,
    size: pageSize,
    current: pageNum,
    pages: Math.max(1, Math.ceil(total / pageSize)),
  }
}

export async function fetchTagsPage(params: TagQueryDto = {}): Promise<PageResponse<Tag>> {
  const pageNum = params.pageNum ?? 1
  const pageSize = params.pageSize ?? 10
  const response = await axios.get<ResultResponse<PageResponse<Tag>>>(
    '/api/tags/page',
    { params: { pageNum, pageSize, keyword: params.keyword } },
  )
  const payload = response.data?.data || response.data
  const records: any[] = Array.isArray(payload?.records) ? payload.records : []
  return {
    records: records.map((t: any) => ({
      id: t.id,
      name: t.name || t.label || String(t.id),
      color: t.color,
      articleCount: typeof t.articleCount === 'number' ? t.articleCount : undefined,
    })),
    total: typeof payload?.total === 'number' ? payload.total : records.length,
    size: typeof payload?.size === 'number' ? payload.size : pageSize,
    current: typeof payload?.current === 'number' ? payload.current : pageNum,
    pages: typeof payload?.pages === 'number' ? payload.pages : 1,
  }
}

export async function fetchCommentsPage(params: CommentQueryDto): Promise<PageResponse<BackendCommentVO>> {
  const pageNum = params.pageNum ?? 1
  const pageSize = params.pageSize ?? 10
  const status = params.status
  try {
    const guestBook = await axios.get<ResultResponse<BackendCommentVO[]>>(
      '/api/comment/list/guest-book',
      { params: status !== undefined ? { status } : undefined },
    )
    let records: BackendCommentVO[] = []
    if (guestBook.data.code === 200) {
      records = guestBook.data.data || []
    }
    if (params.keyword) {
      const kw = String(params.keyword).toLowerCase()
      records = records.filter((c: any) =>
        (c.nickname && String(c.nickname).toLowerCase().includes(kw))
        || (c.content && String(c.content).toLowerCase().includes(kw))
        || (c.email && String(c.email).toLowerCase().includes(kw))
      )
    }
    const total = records.length
    const start = (pageNum - 1) * pageSize
    return {
      records: records.slice(start, start + pageSize),
      total,
      size: pageSize,
      current: pageNum,
      pages: Math.max(1, Math.ceil(total / pageSize)),
    }
  } catch (e) {
    if (axios.isAxiosError(e) && (e.response?.status === 404 || !e.response)) {
      return { records: [], total: 0, size: pageSize, current: pageNum, pages: 1 }
    }
    throw e
  }
}

export async function batchReviewComments(ids: number[], status: number): Promise<void> {
  await Promise.all(ids.map((id) => reviewComment(id, status)))
}

export async function batchDeleteComments(ids: number[]): Promise<void> {
  await Promise.all(ids.map((id) => deleteComment(id)))
}