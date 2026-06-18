import { ref } from 'vue'
import axios from 'axios'
import type {
  BackendCommentVO,
  CommentItem,
  CommentSubmitRequest,
  LoginUser,
  ResultResponse,
} from '../types/blog'
import { formatTime } from '../utils/format'
import { getAuthHeaders } from './useAuth'

const LS_KEY_ID = 'anonymousCommentId'
const LS_KEY_NICK = 'anonymousNickname'
const LS_KEY_EMAIL = 'anonymousEmail'
const LS_KEY_SITE = 'anonymousWebsite'

function mapComments(vos: BackendCommentVO[] | null | undefined): CommentItem[] {
  if (!vos || !Array.isArray(vos)) return []
  return vos.map((v) => ({
    id: v.id,
    author: v.nickname || '匿名用户',
    nickname: v.nickname || undefined,
    avatar: v.avatarUrl || undefined,
    articleTitle: v.articleTitle || undefined,
    articleId: v.articleId || undefined,
    content: v.content,
    status:
      v.status === 1
        ? 'approved'
        : v.status === 0
          ? 'pending'
          : v.status === 2
            ? 'rejected'
            : 'approved',
    createTime: formatTime(v.createTime),
    website: v.website || undefined,
    parentNickname: v.parentNickname || undefined,
    children: v.children && v.children.length ? mapComments(v.children) : undefined,
  }))
}

function ensureAnonymousId(): string {
  let id = localStorage.getItem(LS_KEY_ID)
  if (!id) {
    id = 'anon_' + Math.random().toString(36).slice(2, 10)
    localStorage.setItem(LS_KEY_ID, id)
  }
  return id
}

function isAnonymousProfileReady(): boolean {
  return (
    !!localStorage.getItem(LS_KEY_ID) &&
    !!localStorage.getItem(LS_KEY_NICK) &&
    !!localStorage.getItem(LS_KEY_EMAIL)
  )
}

function saveAnonymousProfile(nickname: string, email: string, website: string): void {
  localStorage.setItem(LS_KEY_NICK, nickname)
  localStorage.setItem(LS_KEY_EMAIL, email)
  localStorage.setItem(LS_KEY_SITE, website || '')
}

function clearAnonymousProfile(): void {
  localStorage.removeItem(LS_KEY_ID)
  localStorage.removeItem(LS_KEY_NICK)
  localStorage.removeItem(LS_KEY_EMAIL)
  localStorage.removeItem(LS_KEY_SITE)
}

function loadAnonymousProfile(): { nickname: string; email: string; website: string } {
  return {
    nickname: localStorage.getItem(LS_KEY_NICK) || '',
    email: localStorage.getItem(LS_KEY_EMAIL) || '',
    website: localStorage.getItem(LS_KEY_SITE) || '',
  }
}

export function useComments() {
  const comments = ref<CommentItem[]>([])
  const pendingComments = ref<CommentItem[]>([])
  const isLoading = ref(false)
  const isLoadingPending = ref(false)
  const error = ref('')

  async function fetchComments(articleId: number): Promise<void> {
    isLoading.value = true
    error.value = ''
    try {
      const url = articleId === 0 ? '/api/comment/list/guest-book' : `/api/comment/list/${articleId}`
      const response = await axios.get<ResultResponse<BackendCommentVO[]>>(url)
      if (response.data.code === 200) {
        comments.value = mapComments(response.data.data || [])
      } else {
        error.value = response.data.message || '评论加载失败。'
        comments.value = []
      }
    } catch (err) {
      error.value =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : '评论接口暂时不可用，请稍后重试。'
      comments.value = []
    } finally {
      isLoading.value = false
    }
  }

  async function fetchPendingComments(): Promise<void> {
    isLoadingPending.value = true
    error.value = ''
    try {
      const response = await axios.get<ResultResponse<BackendCommentVO[]>>(
        '/api/comment/list/guest-book',
        {
          headers: getAuthHeaders(),
          params: { status: 0 },
        },
      )
      if (response.data.code === 200) {
        pendingComments.value = mapComments(response.data.data || [])
      } else {
        error.value = response.data.message || '待审核评论加载失败。'
        pendingComments.value = []
      }
    } catch (err) {
      error.value =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : '评论管理接口暂时不可用，请稍后重试。'
      pendingComments.value = []
    } finally {
      isLoadingPending.value = false
    }
  }

  async function reviewComment(commentId: number, status: number): Promise<boolean> {
    try {
      const response = await axios.put<ResultResponse<boolean>>(
        '/api/comment/review',
        null,
        {
          headers: getAuthHeaders(),
          params: { commentId, status },
        },
      )
      return response.data.code === 200 && response.data.data === true
    } catch (err) {
      error.value =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : '操作失败，请稍后重试。'
      return false
    }
  }

  async function deleteComment(commentId: number): Promise<boolean> {
    try {
      const response = await axios.delete<ResultResponse<boolean>>('/api/comment/delete', {
        headers: getAuthHeaders(),
        params: { commentId },
      })
      return response.data.code === 200 && response.data.data === true
    } catch (err) {
      error.value =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : '删除失败，请稍后重试。'
      return false
    }
  }

  async function submitComment(
    payload: Omit<CommentSubmitRequest, 'nickname' | 'avatarUrl' | 'email' | 'website' | 'anonymousId'> & {
      nickname?: string
      avatarUrl?: string
      email?: string
      website?: string
      anonymousId?: string
    },
    isLoggedIn: boolean,
    loginUser: Partial<LoginUser>,
    anonymousNickname: string,
    anonymousEmail: string,
    anonymousWebsite: string,
    saveProfile?: (nickname: string, email: string, website: string) => void,
    getAnonymousId?: () => string,
  ): Promise<boolean> {
    const body: CommentSubmitRequest = {
      articleId: payload.articleId,
      content: payload.content,
    }
    if (payload.parentId) body.parentId = payload.parentId

    if (isLoggedIn) {
      body.nickname = loginUser.nickname || loginUser.username || undefined
      body.avatarUrl = loginUser.avatar || undefined
    } else {
      body.nickname = anonymousNickname.trim()
      body.email = anonymousEmail.trim()
      body.website = anonymousWebsite.trim() || undefined
      body.anonymousId = getAnonymousId ? getAnonymousId() : ensureAnonymousId()
      if (saveProfile) {
        saveProfile(anonymousNickname.trim(), anonymousEmail.trim(), anonymousWebsite.trim())
      } else {
        saveAnonymousProfile(anonymousNickname.trim(), anonymousEmail.trim(), anonymousWebsite.trim())
      }
    }

    try {
      const response = await axios.post<ResultResponse<void>>('/api/comment/publish', body, {
        headers: getAuthHeaders(),
      })
      return response.data.code === 200
    } catch (err) {
      error.value =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : '提交失败，请稍后重试。'
      return false
    }
  }

  return {
    comments,
    pendingComments,
    isLoading,
    isLoadingPending,
    error,
    fetchComments,
    fetchPendingComments,
    reviewComment,
    deleteComment,
    submitComment,
    ensureAnonymousId,
    isAnonymousProfileReady,
    saveAnonymousProfile,
    clearAnonymousProfile,
    loadAnonymousProfile,
  }
}