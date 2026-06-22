import { ref, watchEffect } from 'vue'

const STORAGE_KEY = 'nextify-theme'

const isDark = ref(false)

try {
  isDark.value = localStorage.getItem(STORAGE_KEY) === 'dark'
} catch { /* ignore */ }

watchEffect(() => {
  try {
    localStorage.setItem(STORAGE_KEY, isDark.value ? 'dark' : 'light')
  } catch { /* ignore */ }
})

export function useDarkMode() {
  function toggleDark() {
    isDark.value = !isDark.value
  }

  return { isDark, toggleDark }
}