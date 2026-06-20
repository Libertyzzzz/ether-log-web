import { ref, computed } from 'vue'
import axios from 'axios'
import type { LoginUser } from '../types/blog'
import {
  hasAuthToken,
  login as apiLogin,
  fetchUserProfile as apiFetchUserProfile,
  updateUserProfile as apiUpdateUserProfile,
} from '../api'

const emptyLoginUser: Partial<LoginUser> = {
  nickname: '',
  username: '',
  email: '',
}

export { hasAuthToken, getAuthHeaders } from '../api'

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
      const stored = localStorage.getItem('authUser')
      if (stored) {
        try {
          loginUser.value = JSON.parse(stored)
          isLoggedIn.value = true
        } catch {
          clearLoginState()
        }
      } else {
        isLoggedIn.value = true
      }
    }
  }

  function clearLoginState() {
    isLoggedIn.value = false
    loginUser.value = emptyLoginUser
    loginError.value = ''
    localStorage.removeItem('authToken')
    localStorage.removeItem('authUser')
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
      localStorage.setItem('authUser', JSON.stringify(loginData.user))
      loginUser.value = loginData.user
      isLoggedIn.value = true

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