import { ref } from 'vue'
import axios from 'axios'
import type { ArticleDetail, ArticleListItem } from '../types/blog'
import { fetchPublicArticles, fetchArticleDetail } from '../api'

export function useArticles() {
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
    selectedArticlePreview.value = article
    selectedArticle.value = null
    isLoadingArticleDetail.value = true
    try {
      const detail = await fetchArticleDetail(article.id)
      if (detail) {
        selectedArticle.value = detail
      }
    } finally {
      isLoadingArticleDetail.value = false
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
  }
}