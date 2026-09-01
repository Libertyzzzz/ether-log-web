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
  name: string
  sort?: number
  articleCount?: number
}

export interface ArticleDirectory {
  id: number
  name: string
  description: string
  articleIds: number[]
  sortOrder: number
  /** 后端返回的真实文章总数，优先使用；展开列表仍从 articleIds 读取 */
  count?: number
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
  updateTime?: string | null
  status?: number
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
  imageIds: number[]
}

export interface LoginUser {
  id: number
  userId: number
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
  expire: number
  user: LoginUser
}

export interface RefreshTokenData {
  token: string
  expire: number
}

export interface AgentMessageVo {
  conversationId: string
  content: string
  role: string
  createTime: string
}

export interface UploadImageData {
  id: number
  url: string
  path: string
  name: string
}

export interface CommentItem {
  id: number
  author: string
  articleTitle?: string
  articleId?: number
  content: string
  status: string
  createTime: string
  nickname?: string
  avatar?: string
  children?: CommentItem[]
  parentNickname?: string
  website?: string
}

export interface BackendCommentVO {
  id: number
  parentId: number | null
  articleId: number | null
  articleTitle?: string | null
  nickname: string | null
  avatarUrl: string | null
  content: string
  website: string | null
  isAdmin: number | null
  status: number | null
  createTime: string
  children: BackendCommentVO[] | null
  parentNickname: string | null
}

export interface CommentSubmitRequest {
  articleId: number
  content: string
  parentId?: number
  nickname?: string
  email?: string
  avatarUrl?: string
  website?: string
  anonymousId?: string
}

export interface Tag {
  id: number
  name: string
  color?: string
  createTime?: string
}

export interface ImageInfoVo {
  id: number
  fileName: string
  originalName: string
  url: string
  size: number
  mimeType: string
  width: number
  height: number
  altText: string
  title: string
  referenceCount: number
  usageType: string
  usageId: number
  isTemporary: boolean
  createTime: string
}

export interface ImageQueryDto {
  keyword?: string
  usageType?: string
  isTemporary?: boolean
  mimeType?: string
  pageNum?: number
  pageSize?: number
}

export interface ImageReferenceVo {
  usageType: number
  usageId: number
  sourceTitle: string
  sourceUrl: string
}

export interface SensitiveWordItem {
  id: number
  word: string
  category?: string
  createTime?: string
}

export interface SensitiveWordCreateRequest {
  word: string
  category?: string
}

export interface SensitiveWordQueryDto {
  keyword?: string
  category?: string
  pageNum?: number
  pageSize?: number
}

export interface ImageDeleteResultVo {
  successCount: number
  failCount: number
  errorMessages: string[]
}

export type AIChatRole = 'user' | 'assistant'
export type AIChatAction =
  | 'chat'
  | 'generate_title'
  | 'polish_text'
  | 'continue_write'
  | 'generate_summary'
  | 'check_typo'
  | 'generate_outline'

export interface AIChatMessage {
  id: string
  role: AIChatRole
  content: string
  timestamp: number
  action?: AIChatAction
  originalText?: string
  candidates?: string[]
}

export interface AIChatRequest {
  action: AIChatAction
  message: string
  context?: string | AgentChatRequestContext
  title?: string
  style?: AIStyleKey
  conversationId?: string
  contextKey?: string
}

export interface AgentChatRequestContext {
  key?: string
  payload?: Record<string, unknown>
}

export interface AgentChatRequestPayload {
  message: string
  action: AIChatAction
  context?: AgentChatRequestContext
  stream?: boolean
}

export interface AgentConversationCreateRequest {
  title?: string
  contextKey?: string
}

export interface AgentConversationListItem {
  id?: string
  conversationId?: string
  title?: string
  createdAt?: string
  updatedAt?: string
}

export interface AgentConversationResponse {
  id?: string
  conversationId?: string
  title?: string
  createdAt?: string
  updatedAt?: string
}

export type AIStyleKey = 'humor' | 'academic' | 'minimal' | 'viral' | 'casual'

export interface AIChatResponse {
  content: string
  candidates?: string[]
  action?: AIChatAction
}

export interface SysRole {
  id: number
  roleCode: string
  roleName: string
  description?: string
  sort?: number
  dataScope?: number
  status: number
  isSystem?: number
  createTime?: string
  updateTime?: string
}

export interface SysPermission {
  id: number
  parentId: number
  permCode: string
  permName: string
  permType: 1 | 2 | 3 // 1: 菜单, 2: 按钮, 3: API接口
  path?: string
  component?: string
  icon?: string
  sort?: number
  visible?: number
  status?: number
  children?: SysPermission[]
  createTime?: string
  updateTime?: string
}

/**
 * 权限树查询入参
 *  - parentId: 起始节点 parentId，0/null 从根节点开始
 *  - permType: 权限类型过滤 1=菜单 2=按钮 3=API接口, null=不过滤
 *  - onlyEnabled: 是否只查启用状态 (默认 true)
 */
export interface PermissionTreeQueryDto {
  parentId?: number | null
  permType?: 1 | 2 | 3 | null
  onlyEnabled?: boolean
}

/**
 * 权限树出参 VO
 *  - 与数据库实体解耦
 *  - children 非空时才存在
 */
export interface PermissionTreeVO {
  id: number
  parentId: number
  permCode: string
  permName: string
  permType: 1 | 2 | 3
  path?: string
  component?: string
  icon?: string
  sort?: number
  visible?: number
  status?: number
  children?: PermissionTreeVO[]
}

export interface UserPermissionInfo {
  userId: number
  roleCodes: string[]
  permissionCodes: string[]
  dataScope?: number
  isSuperAdmin?: boolean
  expireAt?: number
}

export interface SysLoginLog {
  id: number
  userId?: number
  username: string
  loginType: number // 1=密码 2=扫码 3=第三方
  status: number // 1=成功 0=失败
  ip?: string
  userAgent?: string
  message?: string
  loginTime?: string
}

export interface RoleUserItem {
  id: number
  username: string
  nickname?: string
  avatar?: string
}

export interface SysUser {
  id: number
  userId: number
  username: string
  nickname?: string
  avatar?: string
  email?: string
  phone?: string
  gender?: number
  status: number
  isSystem?: number
  createTime?: string
  updateTime?: string
  lastLoginTime?: string
  roles?: SysRole[]
  roleIds?: number[]
}

export interface SysUserCreateRequest {
  username: string
  password?: string
  nickname?: string
  email?: string
  phone?: string
  gender?: number
  status?: number
  roleIds?: number[]
}

export interface SysUserUpdateRequest {
  nickname?: string
  email?: string
  phone?: string
  gender?: number
  status?: number
  avatar?: string
  motto?: string
  password?: string
  roleIds?: number[]
}

export interface SysUserQueryDto {
  pageNum: number
  pageSize: number
  keyword?: string
  status?: number
  roleId?: number
}

export interface ArticleQueryDto {
  pageNum: number
  pageSize: number
  keyword?: string
  categoryId?: number
  status?: number
  isTop?: number
}

export interface CategoryQueryDto {
  pageNum?: number
  pageSize?: number
  keyword?: string
}

export interface TagQueryDto {
  pageNum?: number
  pageSize?: number
  keyword?: string
}

export interface CommentQueryDto {
  pageNum: number
  pageSize: number
  keyword?: string
  status?: number
  articleId?: number
}