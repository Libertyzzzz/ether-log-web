export function toast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  try {
    window.dispatchEvent(new CustomEvent('app-toast', { detail: { message, type } }))
  } catch (e) {
    // fallback to alert if CustomEvent not supported
    // eslint-disable-next-line no-alert
    alert(message)
  }
}
