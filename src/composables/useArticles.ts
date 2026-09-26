import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'
import type { ArticleDetail, ArticleListItem } from '../types/blog'
import { fetchPublicArticles, fetchArticleDetail, fetchTrendingArticles, fetchFeaturedArticles } from '../api'
import { buildArticleUrl, parseArticleIdFromSlug, slugifyTitle } from '../utils/format'

export function useArticles() {
  const router = useRouter()
  const route = useRoute()
  const articles = ref<ArticleListItem[]>([])
  const allArticles = ref<ArticleListItem[]>([])
  const trendingArticles = ref<ArticleListItem[]>([])
  const featuredArticles = ref<ArticleListItem[]>([])
  const totalArticles = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(9)
  const articleError = ref('')
  const isLoadingArticles = ref(true)
  const isLoadingMore = ref(false)
  const selectedArticle = ref<ArticleDetail | null>(null)
  const selectedArticlePreview = ref<ArticleListItem | null>(null)
  const isLoadingArticleDetail = ref(false)

  const SIDEBAR_PAGE_SIZE = 1000

  async function fetchAllArticlesForSidebar(): Promise<void> {
    try {
      const result = await fetchPublicArticles(1, SIDEBAR_PAGE_SIZE)
      allArticles.value = result.records
    } catch {
      // 拉取失败时保持原有值或空值，不影响主流程
    }
  }

  async function fetchArticles(page?: number, size?: number): Promise<void> {
    articleError.value = ''
    isLoadingArticles.value = true
    const targetPage = page ?? currentPage.value
    const targetSize = size ?? pageSize.value
    currentPage.value = targetPage
    pageSize.value = targetSize
    try {
      const result = await fetchPublicArticles(targetPage, targetSize)
      articles.value = result.records
      totalArticles.value = result.total
      if (!allArticles.value.length) {
        allArticles.value = result.records
      }
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
    const nextPage = currentPage.value + 1
    await fetchArticles(nextPage, pageSize.value)
  }

  async function fetchTrending(): Promise<void> {
    try {
      trendingArticles.value = await fetchTrendingArticles(6)
    } catch {
      trendingArticles.value = []
    }
  }

  async function fetchFeatured(): Promise<void> {
    try {
      featuredArticles.value = await fetchFeaturedArticles(5, 0)
    } catch {
      featuredArticles.value = []
    }
  }

  async function openArticleDetail(article: ArticleListItem): Promise<void> {
    const id = typeof article.id === 'number' ? article.id : Number(article.id)
    if (!id || Number.isNaN(id)) return
    const url = buildArticleUrl(id, article.title)
    const preloadPromise = loadArticleById(id)
    try {
      await router.push(url)
    } catch {
      /* 防止 navigation aborted 吞掉 preload */
    }
    await preloadPromise
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
    if (route.name !== 'post-detail' && route.name !== 'blog-post-detail') return false
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
    if (route.name === 'post-detail' || route.name === 'blog-post-detail') {
      router.push({ name: 'blog' })
    }
  }

  return {
    articles,
    allArticles,
    trendingArticles,
    featuredArticles,
    totalArticles,
    currentPage,
    pageSize,
    articleError,
    isLoadingArticles,
    isLoadingMore,
    selectedArticle,
    selectedArticlePreview,
    isLoadingArticleDetail,
    fetchArticles,
    fetchAllArticlesForSidebar,
    fetchTrending,
    fetchFeatured,
    loadMoreArticles,
    openArticleDetail,
    closeArticleDetail,
    loadArticleFromRoute,
  }
}