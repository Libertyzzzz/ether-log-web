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
} from '../api'

const emptyLoginUser: Partial<LoginUser> = {
  nickname: '',
  username: '',
  email: '',
}

export { hasAuthToken, getAuthHeaders } from '../api'

// token 续约定时器：只要 token 还没过期就排 refresh
//   - 过期前一半时间点触发，最少 5s，最多 30s
//   - 已过期 → 不主动刷，等后端返回 1004
// 续约成功 → 覆盖本地 token 并重新排下一次
// 续约失败（code=1003/1004）→ 由响应拦截器清登录态
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
    const ok = await runRefresh()
    if (ok) {
      refreshFailCount = 0
      scheduleRefresh()
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
    const { token, expire } = await apiRefreshToken()
    localStorage.setItem('authToken', token)
    if (typeof expire === 'number') {
      setTokenExpire(expire)
    }
    lastRefreshAt = Date.now()
    return true
  } catch (e) {
    refreshFailCount++
    console.warn(`[auth] token 续约失败 (${refreshFailCount}/${MAX_REFRESH_FAILS}):`, e)
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
      const expire = getTokenExpire()
      if (expire && Date.now() >= expire) {
        clearLoginState()
        return
      }
      const stored = localStorage.getItem('authUser')
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
    localStorage.removeItem('authToken')
    localStorage.removeItem('authTokenExpire')
    localStorage.removeItem('authUser')
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

      localStorage.setItem('authToken', loginData.token)
      if (typeof loginData.expire === 'number') {
        setTokenExpire(loginData.expire)
      }
      localStorage.setItem('authUser', JSON.stringify(loginData.user))
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
        localStorage.setItem('authUser', JSON.stringify(user))
      }
    } catch (error) {
      console.error('无法同步最新用户信息:', error)
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