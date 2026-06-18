import { ref } from 'vue'
import axios from 'axios'
import type { ResultResponse } from '../types/blog'

export function useGate() {
  const accessGranted = ref(false)
  const isCheckingGate = ref(true)

  async function checkGateStatus() {
    try {
      const response = await axios.get<ResultResponse<any>>('/api/access-code/1')
      if (response.data.code === 200 && response.data.data) {
        const status = response.data.data.status
        if (status === 0) {
          accessGranted.value = true
        } else {
          accessGranted.value = sessionStorage.getItem('mainSiteAccessGranted') === 'true'
        }
      }
    } catch (error) {
      console.error('门禁状态获取失败:', error)
      accessGranted.value = sessionStorage.getItem('mainSiteAccessGranted') === 'true'
    } finally {
      isCheckingGate.value = false
    }
  }

  async function validateAccessCode(code: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await axios.get<ResultResponse<boolean>>('/api/access-code/verify', {
        params: { id: 1, accessCode: code },
      })
      if (response.data.code !== 200) {
        return { success: false, message: response.data.message || 'access code 验证失败' }
      }
      if (response.data.data !== true) {
        return { success: false, message: 'access code 不正确，请重新输入。' }
      }
      accessGranted.value = true
      sessionStorage.setItem('mainSiteAccessGranted', 'true')
      return { success: true, message: '' }
    } catch (error) {
      return { success: false, message: 'Access code 校验失败，请稍后重试。' }
    }
  }

  return {
    accessGranted,
    isCheckingGate,
    checkGateStatus,
    validateAccessCode,
  }
}