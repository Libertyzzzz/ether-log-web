import { ref, computed } from 'vue'
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
  }
}

async function runRefresh(): Promise<boolean> {
  if (!hasAuthToken()) return false
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
      if (typeof loginData.expire === 'number') setTokenExpire(loginData.expire)
      sessionStorage.setItem('authUser', JSON.stringify(loginData.user))
      loginUser.value = loginData.user
      isLoggedIn.value = true
      scheduleRefresh()

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