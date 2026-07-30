import { ref, computed, onUnmounted } from 'vue'
import axios from 'axios'
import type { LoginUser } from '../types/blog'
import {
  hasAuthToken,
  login as apiLogin,
  refreshToken as apiRefreshToken,
  fetchUserProfile as apiFetchUserProfile,
  updateUserProfile as apiUpdateUserProfile,
  getTokenExpire,
  setTokenExpire,
  parseJwt,
} from '../api'

const emptyLoginUser: Partial<LoginUser> = {
  nickname: '',
  username: '',
  email: '',
}

export { hasAuthToken, getAuthHeaders } from '../api'

// Token 自动续约机制
// 触发时机：token 过期前一半时间点（最少 5s，最多 30min）
// 续约成功 → 重置失败计数，用新 token 的过期时间重新排定时器
// 续约失败 → 停止续约，等 token 真正过期时由请求拦截器触发重新登录
// 连续失败 3 次后放弃续约（防止无效重试）
const MIN_REFRESH_INTERVAL_MS = 5 * 1000

let refreshTimer: ReturnType<typeof setTimeout> | null = null
let isRefreshing = false
let lastRefreshAt = 0
let refreshFailCount = 0
const MAX_REFRESH_FAILS = 3

function clearRefreshTimer() {
  if (refreshTimer !== null) {
    clearTimeout(refreshTimer)
    refreshTimer = null
  }
}

function scheduleRefresh() {
  clearRefreshTimer()
  const expire = getTokenExpire()
  if (!expire) return

  const now = Date.now()
  const msUntilExpire = expire - now
  if (msUntilExpire <= 0) return

  // 过期前一半时间点触发，最少 5s，最多 30min
  let delay = Math.floor(msUntilExpire / 2)
  if (delay < MIN_REFRESH_INTERVAL_MS) delay = MIN_REFRESH_INTERVAL_MS
  const MAX_REFRESH_INTERVAL_MS = 30 * 60 * 1000
  if (delay > MAX_REFRESH_INTERVAL_MS) delay = MAX_REFRESH_INTERVAL_MS

  const minAllowed = Math.max(0, lastRefreshAt + MIN_REFRESH_INTERVAL_MS - now)
  if (delay < minAllowed) delay = minAllowed

  refreshTimer = setTimeout(async () => {
    console.log('[Token Refresh] Timer triggered, attempting refresh...')
    const ok = await runRefresh()
    if (ok) {
      console.log('[Token Refresh] Success, rescheduling...')
      refreshFailCount = 0
      scheduleRefresh()
    } else {
      console.warn('[Token Refresh] Failed, timer stopped. Will rely on request interceptor.')
    }
  }, delay)
}

async function runRefresh(): Promise<boolean> {
  if (isRefreshing) return false
  if (!hasAuthToken()) return false
  if (refreshFailCount >= MAX_REFRESH_FAILS) return false
  const now = Date.now()
  if (now - lastRefreshAt < MIN_REFRESH_INTERVAL_MS) return false

  isRefreshing = true
  try {
    const { token, expire: apiExpire } = await apiRefreshToken()
    sessionStorage.setItem('authToken', token)
    
    // 【关键】确保获取新 token 的过期时间
    // 优先使用 API 返回的 expire（已由 refreshToken 内部 normalizeExpire 转为毫秒）；
    // 如果没有或无效，从 JWT payload 解析（exp 单位是秒，需转为毫秒）
    let newExpire: number | undefined = typeof apiExpire === 'number' ? apiExpire : undefined
    if (typeof newExpire !== 'number') {
      const payload = parseJwt<{ exp: number }>(token)
      newExpire = payload?.exp != null ? payload.exp * 1000 : undefined
    }
    
    if (typeof newExpire === 'number') {
      setTokenExpire(newExpire)
    } else {
      console.warn('[Token Refresh] No valid expire time from API or JWT')
      return false
    }
    
    lastRefreshAt = Date.now()
    return true
  } catch (e) {
    console.error('[Token Refresh] Failed:', e)
    refreshFailCount++
    return false
  } finally {
    isRefreshing = false
  }
}

export function useAuth() {
  const isLoggedIn = ref(false)
  const loginUser = ref<Partial<LoginUser>>(emptyLoginUser)
  const isLoggingIn = ref(false)
  const loginError = ref('')

  const userName = computed(() => {
    const u = loginUser.value
    return u.nickname || u.username || u.email || 'User'
  })

  function initFromLocalStorage() {
    if (hasAuthToken()) {
      const stored = sessionStorage.getItem('authUser')
      if (stored) {
        try {
          loginUser.value = JSON.parse(stored)
          isLoggedIn.value = true
        } catch {
          clearLoginState()
          return
        }
      } else {
        isLoggedIn.value = true
      }
      // 已有登录态 → 立刻安排下一次刷新
      scheduleRefresh()
    }
  }

  function clearLoginState() {
    isLoggedIn.value = false
    loginUser.value = emptyLoginUser
    loginError.value = ''
    sessionStorage.removeItem('authToken')
    sessionStorage.removeItem('authTokenExpire')
    sessionStorage.removeItem('authUser')
    clearRefreshTimer()
  }

  async function login(email: string, password: string): Promise<boolean> {
    if (!email || !password) {
      loginError.value = '请输入邮箱和密码后再尝试登录。'
      return false
    }
    isLoggingIn.value = true
    loginError.value = ''

    try {
      const loginData = await apiLogin(email, password)

      sessionStorage.setItem('authToken', loginData.token)
      if (typeof loginData.expire === 'number') {
        setTokenExpire(loginData.expire)
      }
      sessionStorage.setItem('authUser', JSON.stringify(loginData.user))
      loginUser.value = loginData.user
      isLoggedIn.value = true

      // 安排 token 自动续约
      scheduleRefresh()

      // 静默更新最后登录时间
      const lastLoginTime = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 19)
      updateUserProfile({ lastLoginTime }, true)

      return true
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        loginError.value = '账号或密码错误，请重新检查。'
      } else if (axios.isAxiosError(error) && error.response?.status === 403) {
        loginError.value = '登录请求被后端权限配置拦截，请确认登录接口已放行并检查 CSRF 配置。'
      } else if (axios.isAxiosError(error) && error.response?.data?.message) {
        loginError.value = error.response.data.message
      } else if (error instanceof Error) {
        loginError.value = error.message
      } else {
        loginError.value = '登录接口暂不可用，请确认后端服务和代理配置是否正常。'
      }
      return false
    } finally {
      isLoggingIn.value = false
    }
  }

  function logout() {
    clearLoginState()
  }

  async function fetchUserProfile(): Promise<void> {
    if (!hasAuthToken()) return
    try {
      const user = await apiFetchUserProfile(loginUser.value.id || 0)
      if (user) {
        loginUser.value = user
        sessionStorage.setItem('authUser', JSON.stringify(user))
      }
    } catch (error) {
      console.warn('[auth] fetchUserProfile failed')
    }
  }

  async function updateUserProfile(
    data: Partial<LoginUser> & { lastLoginTime?: string },
    silent = false
  ): Promise<boolean> {
    if (!isLoggedIn.value || !loginUser.value.id) {
      if (!silent) loginError.value = '请登录后再修改个人信息'
      return false
    }

    try {
      const payload = {
        id: loginUser.value.id,
        nickname: data.nickname !== undefined ? data.nickname : loginUser.value.nickname,
        motto: data.motto !== undefined ? data.motto : loginUser.value.motto,
        email: data.email !== undefined ? data.email : loginUser.value.email,
        avatar: data.avatar !== undefined ? data.avatar : loginUser.value.avatar,
        lastLoginTime: data.lastLoginTime || loginUser.value.lastLoginTime,
        username: loginUser.value.username,
      }

      const ok = await apiUpdateUserProfile(payload)
      if (ok) {
        await fetchUserProfile()
        return true
      }
      if (!silent) loginError.value = '信息更新失败'
      return false
    } catch {
      if (!silent) loginError.value = '网络异常，无法保存个人信息'
      return false
    }
  }

  onUnmounted(() => {
    clearRefreshTimer()
  })

  return {
    isLoggedIn,
    loginUser,
    isLoggingIn,
    loginError,
    userName,
    initFromLocalStorage,
    clearLoginState,
    login,
    logout,
    fetchUserProfile,
    updateUserProfile,
  }
}