import { ref, computed } from 'vue'
import axios from 'axios'
import type { LoginUser, LoginData, ResultResponse } from '../types/blog'

const emptyLoginUser: Partial<LoginUser> = {
  nickname: '',
  username: '',
  email: '',
}

export function hasAuthToken(): boolean {
  return !!localStorage.getItem('authToken')
}

export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('authToken')
  return token ? { Authorization: token } : {}
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
      const response = await axios.post<ResultResponse<LoginData>>('/api/auth/login', {
        username: email,
        password,
      })

      if (response.data.code !== 200) {
        loginError.value = response.data.message || '登录失败，请稍后重试。'
        return false
      }

      const loginData = response.data.data
      if (!loginData?.token || !loginData.user) {
        loginError.value = '登录返回数据格式不正确，请检查后端接口。'
        return false
      }

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
      const response = await axios.get<ResultResponse<LoginUser>>(
        `/api/user/${loginUser.value.id || 0}`,
        { headers: getAuthHeaders() }
      )
      if (response.data.code === 200 && response.data.data) {
        loginUser.value = response.data.data
        localStorage.setItem('authUser', JSON.stringify(response.data.data))
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

      const response = await axios.post<ResultResponse<any>>('/api/user/save', payload, {
        headers: getAuthHeaders(),
      })

      if (response.data.code === 200) {
        await fetchUserProfile()
        return true
      }
      if (!silent) loginError.value = response.data.message || '信息更新失败'
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