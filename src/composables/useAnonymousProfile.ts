import { ref, computed } from 'vue'

const LS_KEY_ID = 'anonymousCommentId'
const LS_KEY_NICK = 'anonymousNickname'
const LS_KEY_EMAIL = 'anonymousEmail'
const LS_KEY_SITE = 'anonymousWebsite'

function ensureAnonymousId(): string {
  let id = localStorage.getItem(LS_KEY_ID)
  if (!id) {
    id = 'anon_' + Math.random().toString(36).slice(2, 10)
    localStorage.setItem(LS_KEY_ID, id)
  }
  return id
}

export function useAnonymousProfile() {
  const anonymousNickname = ref('')
  const anonymousEmail = ref('')
  const anonymousWebsite = ref('')

  const profileReady = computed(
    () =>
      !!localStorage.getItem(LS_KEY_ID) &&
      !!localStorage.getItem(LS_KEY_NICK) &&
      !!localStorage.getItem(LS_KEY_EMAIL)
  )

  const anonymousId = computed(() => ensureAnonymousId())

  function loadProfile() {
    anonymousNickname.value = localStorage.getItem(LS_KEY_NICK) || ''
    anonymousEmail.value = localStorage.getItem(LS_KEY_EMAIL) || ''
    anonymousWebsite.value = localStorage.getItem(LS_KEY_SITE) || ''
  }

  function saveProfile(nickname: string, email: string, website: string) {
    localStorage.setItem(LS_KEY_NICK, nickname)
    localStorage.setItem(LS_KEY_EMAIL, email)
    localStorage.setItem(LS_KEY_SITE, website || '')
  }

  function clearProfile() {
    localStorage.removeItem(LS_KEY_ID)
    localStorage.removeItem(LS_KEY_NICK)
    localStorage.removeItem(LS_KEY_EMAIL)
    localStorage.removeItem(LS_KEY_SITE)
    anonymousNickname.value = ''
    anonymousEmail.value = ''
    anonymousWebsite.value = ''
  }

  return {
    anonymousId,
    anonymousNickname,
    anonymousEmail,
    anonymousWebsite,
    profileReady,
    loadProfile,
    saveProfile,
    clearProfile,
  }
}