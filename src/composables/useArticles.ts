import { ref } from 'vue'
import axios from 'axios'
import type { ArticleDetail, ArticleListItem } from '../types/blog'
import { fetchPublicArticles, fetchArticleDetail } from '../api'

export function useArticles() {
  const articles = ref<ArticleListItem[]>([])
  const articleError = ref('')
  const isLoadingArticles = ref(false)
  const selectedArticle = ref<ArticleDetail | null>(null)
  const selectedArticlePreview = ref<ArticleListItem | null>(null)
  const isLoadingArticleDetail = ref(false)

  async function fetchArticles(): Promise<void> {
    articleError.value = ''
    isLoadingArticles.value = true
    try {
      articles.value = await fetchPublicArticles()
    } catch (error) {
      articleError.value =
        axios.isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : '文章列表暂时不可用，请确认后端文章接口是否正常。'
    } finally {
      isLoadingArticles.value = false
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
    articleError,
    isLoadingArticles,
    selectedArticle,
    selectedArticlePreview,
    isLoadingArticleDetail,
    fetchArticles,
    openArticleDetail,
    closeArticleDetail,
  }
}