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

export function getReadingTime(content: string | null | undefined): number {
  if (!content) return 1
  const text = content.replace(/<[^>]+>/g, '').replace(/\s+/g, '')
  return Math.max(1, Math.ceil(text.length / CHARS_PER_MINUTE))
}