import { ref, computed } from 'vue'
import axios from 'axios'
import type { LoginUser } from '../types/blog'
import {
  hasAuthToken,
  login as apiLogin,
  refreshToken as apiRefreshToken,
  fetchUserProfile as apiFetchUserProfile,
  updateUserProfile as apiUpdateUserProfile,
  logout as apiLogout,
  getTokenExpire,
  setTokenExpire,
  parseJwt,
  normalizeExpire,
} from '../api'

const emptyLoginUser: Partial<LoginUser> = {
  nickname: '',
  username: '',
  email: '',
}

export { hasAuthToken } from '../api'

const MIN_REFRESH_INTERVAL_MS = 5 * 1000
const MAX_REFRESH_INTERVAL_MS = 30 * 60 * 1000

let refreshTimer: ReturnType<typeof setTimeout> | null = null

function clearRefreshTimer() {
  if (refreshTimer !== null) {
    clearTimeout(refreshTimer)
    refreshTimer = null
  }
}

const REFRESH_RETRY_INTERVAL_MS = 60 * 1000

function scheduleRefresh() {
  clearRefreshTimer()
  const expire = getTokenExpire()
  if (!expire) return

  let delay = Math.floor((expire - Date.now()) / 2)
  if (delay < MIN_REFRESH_INTERVAL_MS) delay = MIN_REFRESH_INTERVAL_MS
  if (delay > MAX_REFRESH_INTERVAL_MS) delay = MAX_REFRESH_INTERVAL_MS
  if (delay < 0) delay = 0

  console.debug('[auth] schedule token refresh in', delay, 'ms')
  refreshTimer = setTimeout(executeRefreshOnce, delay)
}

async function executeRefreshOnce(): Promise<void> {
  if (!hasAuthToken()) return
  const success = await runRefresh()
  const expire = getTokenExpire()
  if (success && expire && expire > Date.now()) {
    scheduleRefresh()
    return
  }

  if (expire && expire > Date.now()) {
    console.warn('[auth] token refresh failed, retry in', REFRESH_RETRY_INTERVAL_MS, 'ms')
    refreshTimer = setTimeout(executeRefreshOnce, REFRESH_RETRY_INTERVAL_MS)
    return
  }

  // If we've reached here, token is expired or unrecoverable — notify backend to
  // clear refresh cookie / server-side session, then dispatch expired event so
  // the app can clear local state and prompt the user to login.
  try {
    await apiLogout()
  } catch (e) {
    console.warn('[auth] apiLogout during refresh-failure failed', e)
  } finally {
    try {
      window.dispatchEvent(new CustomEvent('auth:expired', { detail: { message: '登录已过期' } }))
    } catch (e) {
      // ignore
    }
  }
}

async function runRefresh(): Promise<boolean> {
  try {
    const { token, expire: apiExpire } = await apiRefreshToken()
    sessionStorage.setItem('authToken', token)

    let newExpire: number | undefined
    if (typeof apiExpire === 'number') {
      newExpire = apiExpire
    } else {
      const payload = parseJwt<{ exp: number }>(token)
      newExpire = payload?.exp != null ? normalizeExpire(payload.exp) : undefined
    }
    if (typeof newExpire !== 'number') return false

    setTokenExpire(newExpire)
    return true
  } catch (error) {
    console.error('[auth] refreshToken failed', error)
    return false
  }
}

// Single-flight wrapper for refresh to avoid concurrent refresh calls.
let _refreshingPromise: Promise<boolean> | null = null
let _axiosInterceptorInstalled = false

async function runRefreshOnce(): Promise<boolean> {
  if (_refreshingPromise) return _refreshingPromise
  _refreshingPromise = (async () => {
    try {
      return await runRefresh()
    } finally {
      _refreshingPromise = null
    }
  })()
  return _refreshingPromise
}

function runRefreshIfNeeded(): Promise<boolean> | undefined {
  const expire = getTokenExpire()
  const now = Date.now()
  if (!expire) {
    const storedUser = sessionStorage.getItem('authUser')
    if (storedUser) {
      // Attempt to restore session via HttpOnly refresh cookie when access token is absent.
      return runRefreshOnce()
    }
    return undefined
  }
  // If token will expire within the next 60 seconds, refresh
  if (expire - now < 60 * 1000) {
    return runRefreshOnce()
  }
  return undefined
}

function setupAxiosInterceptor() {
  if (_axiosInterceptorInstalled) return
  _axiosInterceptorInstalled = true
  axios.interceptors.response.use(
    (res) => res,
    async (err) => {
      const cfg = err?.config
      if (!cfg) throw err
      if ((cfg as any)._retry) throw err
      const status = err.response?.status
      if (status === 401 && hasAuthToken()) {
        ;(cfg as any)._retry = true
        try {
          await runRefreshOnce()
          return axios(cfg)
        } catch (e) {
          // refresh failed — attempt server logout to clear refresh cookie,
          // then bubble original error so higher-level handlers can react.
          try {
            await apiLogout()
          } catch (e2) {
            console.warn('[auth] apiLogout during interceptor retry failed', e2)
          }
          try {
            window.dispatchEvent(new CustomEvent('auth:expired', { detail: { message: '登录已过期' } }))
          } catch (e3) {
            // ignore
          }
          throw err
        }
      }
      throw err
    }
  )
}

function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    runRefreshIfNeeded()
  }
}

function handleWindowFocus() {
  runRefreshIfNeeded()
}

function handleWindowOnline() {
  runRefreshIfNeeded()
}

function addAuthEventListeners() {
  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('focus', handleWindowFocus)
  window.addEventListener('pageshow', handleWindowFocus)
  window.addEventListener('online', handleWindowOnline)
}

function removeAuthEventListeners() {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  window.removeEventListener('focus', handleWindowFocus)
  window.removeEventListener('pageshow', handleWindowFocus)
  window.removeEventListener('online', handleWindowOnline)
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
    if (!hasAuthToken()) return
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
    scheduleRefresh()
    addAuthEventListeners()
    setupAxiosInterceptor()
  }

  function clearLoginState() {
    isLoggedIn.value = false
    loginUser.value = emptyLoginUser
    loginError.value = ''
    sessionStorage.removeItem('authToken')
    sessionStorage.removeItem('authTokenExpire')
    sessionStorage.removeItem('authUser')
    clearRefreshTimer()
    removeAuthEventListeners()
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
      if (typeof loginData.expire === 'number') setTokenExpire(loginData.expire)
      sessionStorage.setItem('authUser', JSON.stringify(loginData.user))
      loginUser.value = loginData.user
      isLoggedIn.value = true
      scheduleRefresh()
      addAuthEventListeners()
      setupAxiosInterceptor()

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

  async function logout(): Promise<void> {
    try {
      await apiLogout()
    } catch (e) {
      console.warn('[auth] api logout failed', e)
    } finally {
      clearLoginState()
      // Notify other parts of the app that logout occurred
      try {
        window.dispatchEvent(new CustomEvent('auth:logged-out', { detail: { message: '用户已退出登录' } }))
      } catch (e) {
        // ignore
      }
    }
  }

  async function fetchUserProfile(): Promise<void> {
    if (!hasAuthToken()) return
    try {
      const user = await apiFetchUserProfile(loginUser.value.id || 0)
      if (user) {
        loginUser.value = user
        sessionStorage.setItem('authUser', JSON.stringify(user))
      }
    } catch {
      // no-op
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