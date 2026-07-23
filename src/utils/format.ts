export function formatTime(t: string | null | undefined): string {
  if (!t) return ''
  try {
    const d = new Date(t)
    if (isNaN(d.getTime())) return t
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return t || ''
  }
}

export function getUploadedImageUrl(data: { url?: string; fullUrl?: string; fileUrl?: string; imageUrl?: string; path?: string } | string | null | undefined): string {
  if (!data) return ''
  if (typeof data === 'string') return data
  return [data.url, data.fullUrl, data.fileUrl, data.imageUrl, data.path]
    .find(v => typeof v === 'string' && v.trim().length > 0) as string || ''
}

const CHARS_PER_MINUTE = 450

const ID_SALT = 28473

function encodeId(id: number): string {
  const obfuscated = id ^ ID_SALT
  return obfuscated.toString(36)
}

function decodeId(encoded: string): number | null {
  try {
    const obfuscated = parseInt(encoded, 36)
    if (isNaN(obfuscated)) return null
    const id = obfuscated ^ ID_SALT
    return Number.isFinite(id) && id > 0 ? id : null
  } catch {
    return null
  }
}

export function getReadingTime(content: string | null | undefined): number {
  if (!content) return 1
  const text = content.replace(/<[^>]+>/g, '').replace(/\s+/g, '')
  return Math.max(1, Math.ceil(text.length / CHARS_PER_MINUTE))
}

export function slugifyTitle(title: string | null | undefined): string {
  if (!title) return ''
  let s = title.trim()
    .toLowerCase()
    .replace(/[\s，。！？、；：""''（）【】《》\[\](){}<>\\/.,!?;:'"@#$%^&*+=|`~_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (s.length > 60) s = s.slice(0, 60).replace(/-[^-]*$/, '')
  return s
}

export function buildArticleUrl(id: number): string {
  const encodedId = encodeId(id)
  return `/read?p=${encodedId}`
}

export function parseArticleIdFromSlug(articleSlug: string | number | null | undefined): number | null {
  if (articleSlug == null) return null
  const raw = String(articleSlug)
  
  const firstPart = raw.split('-')[0]
  
  const decodedId = decodeId(firstPart)
  if (decodedId) return decodedId
  
  const numericId = Number(firstPart)
  if (Number.isFinite(numericId) && numericId > 0) return numericId
  
  return null
}