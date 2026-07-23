import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'
import type { ArticleDetail, ArticleListItem } from '../types/blog'
import { fetchPublicArticles, fetchArticleDetail } from '../api'
import { buildArticleUrl, parseArticleIdFromSlug, slugifyTitle } from '../utils/format'

export function useArticles() {
  const router = useRouter()
  const route = useRoute()
  const articles = ref<ArticleListItem[]>([])
  const totalArticles = ref(0)
  const currentPage = ref(1)
  const articleError = ref('')
  const isLoadingArticles = ref(false)
  const isLoadingMore = ref(false)
  const selectedArticle = ref<ArticleDetail | null>(null)
  const selectedArticlePreview = ref<ArticleListItem | null>(null)
  const isLoadingArticleDetail = ref(false)

  const PAGE_SIZE = 9

  async function fetchArticles(): Promise<void> {
    articleError.value = ''
    isLoadingArticles.value = true
    currentPage.value = 1
    try {
      const result = await fetchPublicArticles(1, PAGE_SIZE)
      articles.value = result.records
      totalArticles.value = result.total
    } catch (error) {
      articleError.value =
        axios.isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : '文章列表暂时不可用，请确认后端文章接口是否正常。'
    } finally {
      isLoadingArticles.value = false
    }
  }

  async function loadMoreArticles(): Promise<void> {
    if (isLoadingMore.value) return
    if (articles.value.length >= totalArticles.value) return
    isLoadingMore.value = true
    try {
      const nextPage = currentPage.value + 1
      const result = await fetchPublicArticles(nextPage, PAGE_SIZE)
      articles.value = [...articles.value, ...result.records]
      totalArticles.value = result.total
      currentPage.value = nextPage
    } catch (error) {
      // silently fail, user can retry
    } finally {
      isLoadingMore.value = false
    }
  }

  async function openArticleDetail(article: ArticleListItem): Promise<void> {
    const url = buildArticleUrl(article.id, article.title)
    await router.push(url)
  }

  async function loadArticleById(id: number): Promise<void> {
    selectedArticle.value = null
    isLoadingArticleDetail.value = true
    try {
      const detail = await fetchArticleDetail(id)
      if (detail) {
        selectedArticle.value = detail
        selectedArticlePreview.value = {
          id: detail.id,
          title: detail.title,
          summary: detail.summary,
          coverImg: detail.coverImg,
          viewCount: detail.viewCount,
          isTop: detail.isTop,
          categoryName: detail.categoryName,
          tagNames: detail.tagNames,
          createTime: detail.createTime,
          updateTime: detail.updateTime,
          status: detail.status,
          subtitle: detail.subtitle,
        }
      }
    } finally {
      isLoadingArticleDetail.value = false
    }
  }

  async function loadArticleFromRoute(): Promise<boolean> {
    if (route.name !== 'post-detail') return false
    const articleSlug = route.params.articleSlug
    const slugStr = Array.isArray(articleSlug) ? articleSlug[0] : articleSlug
    
    let id = parseArticleIdFromSlug(slugStr)
    
    if (!id) {
      id = await findArticleIdBySlug(slugStr)
    }
    
    if (!id) {
      return false
    }
    
    await loadArticleById(id)
    return true
  }

  async function findArticleIdBySlug(slugStr: string): Promise<number | null> {
    try {
      const slug = slugStr.split('-').slice(1).join('-')
      if (!slug) return null
      
      const result = await fetchPublicArticles(1, 100)
      const matched = result.records.find(article => {
        const articleSlug = slugifyTitle(article.title)
        return articleSlug === slug || slug.includes(articleSlug)
      })
      
      return matched ? matched.id : null
    } catch {
      return null
    }
  }

  function closeArticleDetail(): void {
    selectedArticle.value = null
    selectedArticlePreview.value = null
  }

  return {
    articles,
    totalArticles,
    articleError,
    isLoadingArticles,
    isLoadingMore,
    selectedArticle,
    selectedArticlePreview,
    isLoadingArticleDetail,
    fetchArticles,
    loadMoreArticles,
    openArticleDetail,
    closeArticleDetail,
    loadArticleFromRoute,
  }
}