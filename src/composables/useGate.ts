import { ref } from 'vue'
import { checkGateStatus as apiCheckGateStatus, verifyAccessCode as apiVerifyAccessCode } from '../api'

export function useGate() {
  const accessGranted = ref(false)
  const isCheckingGate = ref(true)

  async function checkGateStatus() {
    try {
      const data = await apiCheckGateStatus()
      if (data) {
        const status = data.status
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
      const ok = await apiVerifyAccessCode(code)
      if (!ok) {
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