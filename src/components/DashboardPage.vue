<script setup lang="ts">
import { FileText, MessageSquare, Eye, BookOpen, Edit3, Trash2, ArrowUpRight, Plus, LayoutDashboard, Check, Folder, ChevronLeft, ChevronRight, Search, ArrowRight } from 'lucide-vue-next'
import { computed, ref, onMounted } from 'vue'
import { hasAuthToken } from '../composables/useAuth'
import AppConfirmDialog from './AppConfirmDialog.vue'
import SkeletonLoader from './SkeletonLoader.vue'
import { toast } from '../utils/toast'
import type { ArticleListItem, CommentItem, Tag } from '../types/blog'
import {
  fetchTags as apiFetchTags,
  createTag as apiCreateTag,
  deleteTag as apiDeleteTag,
  fetchCategories as apiFetchCategories,
  createCategory as apiCreateCategory,
  deleteCategory as apiDeleteCategory,
  updateArticleField,
} from '../api'

const props = defineProps<{
  articles: ArticleListItem[]
  isLoadingArticles: boolean
  pendingComments: CommentItem[]
  isLoadingPending: boolean
  commentCount: number
  totalViews: number
  page: number
  total: number
  pageSize: number
}>()

defineEmits<{
  newArticle: []
  editArticle: [article: ArticleListItem]
  deleteArticle: [articleId: number]
  openArticle: [article: ArticleListItem]
  approveComment: [commentId: number]
  deleteComment: [commentId: number]
  'page-change': [page: number]
}>()

// categories management state (for control panel)
const categoriesList = ref<{ id: number; name: string; sort?: number }[]>([])
const isLoadingCategories = ref(false)
const newCategoryName = ref('')
const newCategorySort = ref<number | null>(null)
const showCreateCategoryDialog = ref(false)
const deletingCategory = ref<{ show: boolean; id?: number; name?: string }>({ show: false })
// tags management state
const tagsList = ref<Tag[]>([])
const isLoadingTags = ref(false)
const newTagName = ref('')
const newTagColor = ref('#7c3aed')
const deletingTag = ref<{ show: boolean; id?: number; name?: string }>({ show: false })
const showCreateTagDialog = ref(false)

// dialog-driven create flows (open on header button)
function openCreateTagDialog() {
  showCreateTagDialog.value = true
}

async function fetchTagsForAdmin() {
  isLoadingTags.value = true
  try {
    tagsList.value = await apiFetchTags()
  } catch (e) {
    console.info('加载标签失败或端点不存在', e)
  } finally {
    isLoadingTags.value = false
  }
}

async function createTagAdmin() {
  if (!newTagName.value.trim()) {
    toast('请输入标签名称', 'error')
    return
  }
  try {
    const tag = await apiCreateTag({ name: newTagName.value.trim(), color: newTagColor.value })
    tagsList.value.push(tag)
    newTagName.value = ''
    newTagColor.value = '#7c3aed'
    showCreateTagDialog.value = false
    toast('标签已创建', 'success')
  } catch (e) {
    console.error('创建标签失败', e)
    toast('创建标签失败', 'error')
  }
}

function confirmDeleteTag(tag: { id: number; name: string }) {
  deletingTag.value = { show: true, id: tag.id, name: tag.name }
}

async function performDeleteTag() {
  const id = deletingTag.value.id
  if (!id) { deletingTag.value.show = false; return }
  try {
    await apiDeleteTag(id)
    tagsList.value = tagsList.value.filter((t) => t.id !== id)
    toast('标签已删除', 'success')
  } catch (e) {
    console.error('删除标签失败', e)
    toast('删除标签失败', 'error')
  } finally {
    deletingTag.value.show = false
    await fetchTagsForAdmin()
  }
}

async function fetchCategoriesForAdmin() {
  isLoadingCategories.value = true
  try {
    categoriesList.value = await apiFetchCategories()
  } catch (e) {
    console.error('加载分类失败', e)
  } finally {
    isLoadingCategories.value = false
  }
}

async function createCategoryAdmin() {
  if (!newCategoryName.value.trim()) {
    toast('请输入分类名称', 'error')
    return
  }
  try {
    const payload: any = { name: newCategoryName.value.trim() }
    if (newCategorySort.value !== null) payload.sort = Number(newCategorySort.value)
    const cat = await apiCreateCategory(payload)
    categoriesList.value.push(cat)
    newCategoryName.value = ''
    newCategorySort.value = null
    toast('分类已创建', 'success')
    showCreateCategoryDialog.value = false
  } catch (e) {
    console.error('创建分类失败', e)
    toast('创建分类失败', 'error')
  }
}

function openCreateCategoryDialog() {
  showCreateCategoryDialog.value = true
}

function confirmDeleteCategory(cat: { id: number; name: string }) {
  deletingCategory.value = { show: true, id: cat.id, name: cat.name }
}

async function performDeleteCategoryAdmin() {
  const id = deletingCategory.value.id
  const name = deletingCategory.value.name
  if (!id) {
    deletingCategory.value.show = false
    return
  }
  try {
    // ensure general category
    let general = categoriesList.value.find((c) => c.name === '通用目录')
    if (!general) {
      const cat = await apiCreateCategory({ name: '通用目录', sort: 0 })
      general = cat
      categoriesList.value.push(general)
    }

    // reassign articles locally and backend
    const toMove = props.articles.filter((a: ArticleListItem) => a.categoryName === name)
    for (const a of toMove) {
      try {
        await updateArticleField(a.id, { categoryId: general.id })
      } catch (e) {
        console.error('移动文章失败', a.id, e)
      }
    }

    // delete category
    try {
      await apiDeleteCategory(id)
    } catch (e) {
      console.error('删除分类失败', e)
    }

    categoriesList.value = categoriesList.value.filter((c) => c.id !== id)
    toast('分类已删除并将文章移至通用目录', 'success')
  } catch (e) {
    console.error('删除分类失败', e)
    toast('删除分类失败', 'error')
  } finally {
    deletingCategory.value.show = false
    await fetchCategoriesForAdmin()
  }
}

// fetch categories when dashboard mounts
onMounted(() => {
  fetchCategoriesForAdmin()
  fetchTagsForAdmin()
})

const coverGradients = [
  'linear-gradient(135deg,#1e1b4b,#4338ca)',
  'linear-gradient(135deg,#0f172a,#1d4ed8)',
  'linear-gradient(135deg,#1a1a2e,#0f3460)',
  'linear-gradient(135deg,#0d1117,#21262d)',
  'linear-gradient(135deg,#1e293b,#334155)',
]
function getCover(post: ArticleListItem, i: number) {
  return post.coverImg
    ? `background-image:url('${post.coverImg}')`
    : `background:${coverGradients[i % coverGradients.length]}`
}

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

const draftArticles = computed(() => props.articles.filter((article) => article.status === 0))
const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))

const articleSearch = ref('')
const articleStatusFilter = ref<number | null>(null)
const articleCategoryFilter = ref<string>('')

const articleCategories = computed(() => {
  const names = new Set<string>()
  for (const a of props.articles) {
    if (a.categoryName && a.status !== 0) names.add(a.categoryName)
  }
  return [...names].sort()
})

const visibleArticles = computed(() => {
  let list = props.articles.filter((article) => article.status !== 0)
  if (articleSearch.value.trim()) {
    const q = articleSearch.value.trim().toLowerCase()
    list = list.filter((a) => a.title.toLowerCase().includes(q))
  }
  if (articleStatusFilter.value !== null) {
    if (articleStatusFilter.value === 3) {
      list = list.filter((a) => a.isTop)
    } else {
      list = list.filter((a) => (a.status ?? 1) === articleStatusFilter.value)
    }
  }
  if (articleCategoryFilter.value) {
    list = list.filter((a) => a.categoryName === articleCategoryFilter.value)
  }
  return list
})

function getArticleStatusLabel(post: ArticleListItem) {
  if (post.status === 0) return '草稿'
  if (post.status === 2) return '私密'
  if (post.isTop) return '置顶'
  return '公开'
}

function getArticleStatusClass(post: ArticleListItem) {
  if (post.status === 0) return 'draft'
  if (post.status === 2) return 'private'
  return post.isTop ? 'top' : 'pub'
}
</script>

<template>
  <div class="db-page">

    <!-- ── 顶部 Banner ── -->
    <div class="db-hero">
      <div class="db-hero-bg-wrap">
        <div class="db-hero-bg" aria-hidden="true">
          <div class="db-orb db-orb-1"></div>
          <div class="db-orb db-orb-2"></div>
        </div>
        <div class="db-hero-inner">
          <div class="db-hero-icon">
            <LayoutDashboard :size="28" />
          </div>
          <div class="db-hero-info">
            <h1 class="db-hero-title">控制面板</h1>
            <p class="db-hero-sub">管理你的文章、评论与内容数据</p>
          </div>
          <button class="db-btn-new" type="button" @click="$emit('newArticle')">
            <Plus :size="15" />
            发布文章
          </button>
        </div>
      </div>
    </div>

    <div class="db-body">

      <!-- ── 统计卡片 ── -->
      <div class="db-stats-grid">
        <div class="db-stat-card db-stat-card--clickable" @click="scrollToSection('db-articles')">
          <div class="db-stat-icon" style="background:rgba(99,102,241,0.1);color:#6366f1"><FileText :size="18"/></div>
          <span class="db-stat-label">文章总数</span>
          <strong class="db-stat-value">{{ total }}</strong>
          <ArrowRight class="db-stat-arrow" :size="14" />
          <div class="db-stat-wave db-wave-blue"></div>
        </div>
        <div class="db-stat-card db-stat-card--clickable" @click="scrollToSection('db-comments')">
          <div class="db-stat-icon" style="background:rgba(34,197,94,0.1);color:#22c55e"><MessageSquare :size="18"/></div>
          <span class="db-stat-label">待审核评论</span>
          <strong class="db-stat-value">{{ commentCount }}</strong>
          <ArrowRight class="db-stat-arrow" :size="14" />
          <div class="db-stat-wave db-wave-green"></div>
        </div>
        <div class="db-stat-card">
          <div class="db-stat-icon" style="background:rgba(249,115,22,0.1);color:#f97316"><Eye :size="18"/></div>
          <span class="db-stat-label">总浏览</span>
          <strong class="db-stat-value">{{ totalViews }}</strong>
          <div class="db-stat-wave db-wave-orange"></div>
        </div>
        <div class="db-stat-card db-stat-card--clickable" @click="scrollToSection('db-drafts')">
          <div class="db-stat-icon" style="background:rgba(168,85,247,0.1);color:#a855f7"><BookOpen :size="18"/></div>
          <span class="db-stat-label">草稿</span>
          <strong class="db-stat-value">{{ draftArticles.length }}</strong>
          <ArrowRight class="db-stat-arrow" :size="14" />
          <div class="db-stat-wave db-wave-purple"></div>
        </div>
      </div>

      <!-- ── 文章列表 + 评论管理 ── -->
      <div class="db-main-grid">

        <!-- 文章列表 -->
        <div id="db-articles" class="db-card">
          <div class="db-card-header">
            <div class="db-card-title-row">
              <FileText :size="15" class="db-card-icon" />
              <h2 class="db-card-title">我的文章</h2>
            </div>
            <button class="db-btn-sm" type="button" @click="$emit('newArticle')">
              <Plus :size="13" /> 发布文章
            </button>
          </div>

          <div class="db-filter-bar">
            <div class="db-search-wrap">
              <Search :size="13" class="db-search-icon" />
              <input
                v-model="articleSearch"
                type="text"
                class="db-search-input"
                placeholder="搜索文章标题..."
              />
            </div>
            <select v-model="articleStatusFilter" class="db-filter-select">
              <option :value="null">全部状态</option>
              <option :value="1">公开</option>
              <option :value="2">私密</option>
              <option :value="3">置顶</option>
            </select>
            <select v-model="articleCategoryFilter" class="db-filter-select">
              <option value="">全部分类</option>
              <option v-for="c in articleCategories" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>

          <div class="db-table-head">
            <span>标题</span>
            <span>分类</span>
            <span>状态</span>
            <span>操作</span>
          </div>

          <SkeletonLoader v-if="isLoadingArticles" variant="table" :rows="5" />
          <div v-else-if="!visibleArticles.length" class="db-empty">
            <template v-if="articleSearch || articleStatusFilter !== null || articleCategoryFilter">没有匹配的文章</template>
            <template v-else>暂无已发布文章，点击新建开始写作</template>
          </div>

          <div v-for="(post, i) in visibleArticles" :key="post.id" class="db-table-row">
            <div class="db-row-title">
              <div class="db-row-cover" :style="getCover(post, i)"></div>
              <span>{{ post.title }}</span>
            </div>
            <span class="db-row-cat">{{ post.categoryName || '—' }}</span>
            <span class="db-row-status" :class="getArticleStatusClass(post)">
              {{ getArticleStatusLabel(post) }}
            </span>
            <div class="db-row-actions">
              <button type="button" class="db-action-btn edit" @click="$emit('editArticle', post)">
                <Edit3 :size="11" /> {{ post.status === 0 ? '继续写' : '编辑' }}
              </button>
              <button v-if="post.status !== 0" type="button" class="db-action-btn view" @click="$emit('openArticle', post)">
                <ArrowUpRight :size="11" /> 查看
              </button>
              <button type="button" class="db-action-btn danger" @click="$emit('deleteArticle', post.id)">
                <Trash2 :size="11" />
              </button>
            </div>
          </div>

          <div v-if="totalPages > 1" class="db-pagination">
            <button
              class="db-page-btn"
              :disabled="page <= 1"
              @click="$emit('page-change', page - 1)"
            >
              <ChevronLeft :size="14" />
            </button>
            <span class="db-page-info">{{ page }} / {{ totalPages }}</span>
            <button
              class="db-page-btn"
              :disabled="page >= totalPages"
              @click="$emit('page-change', page + 1)"
            >
              <ChevronRight :size="14" />
            </button>
          </div>
        </div>

        <!-- 草稿箱 -->
        <div id="db-drafts" class="db-card">
          <div class="db-card-header">
            <div class="db-card-title-row">
              <Edit3 :size="15" class="db-card-icon" />
              <h2 class="db-card-title">草稿箱</h2>
            </div>
            <span class="draft-count-badge">{{ draftArticles.length }}</span>
          </div>
          <div v-if="isLoadingArticles" class="draft-empty">
            <span class="draft-empty-icon">⏳</span>
            草稿加载中...
          </div>
          <div v-else-if="!draftArticles.length" class="draft-empty">
            <span class="draft-empty-icon">📝</span>
            <span>暂无草稿，开始写作吧</span>
          </div>
          <div v-else class="draft-list">
            <article v-for="draft in draftArticles" :key="draft.id" class="draft-item">
              <div class="draft-item-left">
                <div class="draft-item-dot"></div>
                <div class="draft-info">
                  <strong>{{ draft.title || '未命名草稿' }}</strong>
                  <span>{{ draft.updateTime?.slice(0, 16) || draft.createTime?.slice(0, 16) || '刚刚保存' }}</span>
                </div>
              </div>
              <div class="draft-actions">
                <button type="button" class="db-action-btn edit" @click="$emit('editArticle', draft)">
                  <Edit3 :size="11" /> 继续写
                </button>
                <button type="button" class="db-action-btn danger" @click="$emit('deleteArticle', draft.id)">
                  <Trash2 :size="11" />
                </button>
              </div>
            </article>
          </div>
        </div>

        <!-- 分类管理 -->
        <div class="db-card">
          <div class="db-card-header">
            <div class="db-card-title-row">
              <Folder :size="15" class="db-card-icon" />
              <h2 class="db-card-title">分类管理</h2>
            </div>
            <button class="db-btn-sm" type="button" @click="openCreateCategoryDialog" v-if="hasAuthToken()">
              <Plus :size="13" /> 新增
            </button>
          </div>

          <div class="db-card-body">
            <div v-if="isLoadingCategories" class="db-empty">加载中...</div>
            <div v-else>
              <div class="cat-list">
                  <div v-for="cat in categoriesList" :key="cat.id" class="cat-row">
                    <span class="cat-name">{{ cat.name }}</span>
                    <div class="cat-actions">
                    <button v-if="hasAuthToken()" class="db-action-btn view" type="button" @click="confirmDeleteCategory(cat)">删除</button>
                    </div>
                  </div>
                </div>

              <!-- creation handled via AppConfirmDialog in header -->
            </div>
          </div>

          <AppConfirmDialog
            :show="deletingCategory.show"
            title="确认删除分类"
            :message="`删除分类 “${deletingCategory.name || ''}” 将把其文章移至通用目录，确定吗？`"
            confirmText="删除"
            cancelText="取消"
            tone="danger"
            @confirm="performDeleteCategoryAdmin"
            @cancel="deletingCategory.show = false"
          />

          <!-- 创建分类弹窗（复用 AppConfirmDialog） -->
          <AppConfirmDialog
            :show="showCreateCategoryDialog"
            title="新建分类"
            confirmText="创建"
            cancelText="取消"
            @confirm="createCategoryAdmin"
            @cancel="showCreateCategoryDialog = false"
          >
            <div style="display:flex;flex-direction:column;gap:0.6rem;margin-top:0.4rem;">
              <input v-model="newCategoryName" placeholder="分类名称" aria-label="分类名称" />
              <input v-model.number="newCategorySort" placeholder="排序 (sort)" type="number" />
            </div>
          </AppConfirmDialog>
        </div>

        <!-- 标签管理 -->
        <div class="db-card">
          <div class="db-card-header">
            <div class="db-card-title-row">
              <BookOpen :size="15" class="db-card-icon" />
              <h2 class="db-card-title">标签管理</h2>
            </div>
            <button class="db-btn-sm" type="button" @click="openCreateTagDialog" v-if="hasAuthToken()">
              <Plus :size="13" /> 新增
            </button>
          </div>

          <div class="db-card-body">
            <div v-if="isLoadingTags" class="db-empty">加载中...</div>
            <div v-else>
              <div class="cat-list">
                <div v-for="tag in tagsList" :key="tag.id" class="cat-row">
                  <div style="display:flex;align-items:center;gap:0.6rem">
                    <span class="tag-badge" :style="{background: tag.color || '#e6eef6'}"></span>
                    <span class="cat-name">{{ tag.name }}</span>
                  </div>
                  <div class="cat-actions">
                    <button class="db-action-btn view" type="button" @click="confirmDeleteTag(tag)">删除</button>
                  </div>
                </div>
              </div>

              <!-- creation handled via AppConfirmDialog in header -->
            </div>
          </div>

          <AppConfirmDialog
            :show="deletingTag.show"
            title="确认删除标签"
            :message="`删除标签 “${deletingTag.name || ''}” 将会移除该标签，确定吗？`"
            confirmText="删除"
            cancelText="取消"
            tone="danger"
            @confirm="performDeleteTag"
            @cancel="deletingTag.show = false"
          />

          <!-- 创建标签弹窗（复用 AppConfirmDialog） -->
          <AppConfirmDialog
            :show="showCreateTagDialog"
            title="新建标签"
            confirmText="创建"
            cancelText="取消"
            @confirm="createTagAdmin"
            @cancel="showCreateTagDialog = false"
          >
            <div style="display:flex;flex-direction:column;gap:0.6rem;margin-top:0.4rem;">
              <input v-model="newTagName" placeholder="标签名称" aria-label="标签名称" />
              <label style="display:flex;gap:0.6rem;align-items:center"><span style="font-size:0.85rem;color:#64748b">颜色</span><input type="color" v-model="newTagColor" style="width:2.2rem;height:2.2rem;border:0;padding:0;background:transparent"/></label>
            </div>
          </AppConfirmDialog>
        </div>

        <!-- 待审核评论 -->
        <div id="db-comments" class="db-card">
          <div class="db-card-header">
            <div class="db-card-title-row">
              <MessageSquare :size="15" class="db-card-icon" />
              <h2 class="db-card-title">待审核评论</h2>
            </div>
          </div>

          <div v-if="isLoadingPending" class="db-empty">加载中...</div>
          <div v-else-if="!pendingComments.length" class="db-empty">暂无待审核的评论</div>

          <div v-for="comment in pendingComments" :key="comment.id" class="db-comment-item">
            <p class="db-comment-text">{{ comment.content }}</p>
            <p class="db-comment-meta">
              {{ comment.author }}
              <template v-if="comment.articleTitle"> · {{ comment.articleTitle }}</template>
              <template v-if="comment.createTime"> · {{ comment.createTime }}</template>
            </p>
            <div class="db-comment-actions">
              <button type="button" class="db-action-btn approve" @click="$emit('approveComment', comment.id)">
                <Check :size="11" /> 通过
              </button>
              <button type="button" class="db-action-btn danger" @click="$emit('deleteComment', comment.id)">
                <Trash2 :size="11" /> 删除
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
.db-page { background:#f5f5f7; min-height:100vh; padding-top: 6rem; }
.db-body { max-width:64rem; margin: 1.5rem auto 0; padding:0 1.5rem 5rem; display:flex; flex-direction:column; gap:2rem; }

/* ── Hero Banner ── */
.db-hero { max-width:64rem; margin:0 auto; padding:0 1.5rem; }
.db-hero-bg-wrap {
  position:relative; overflow:hidden; border-radius:1.75rem;
  background:linear-gradient(160deg,#0a0e1a 0%,#0f172a 40%,#1e1b4b 100%);
  min-height:120px;
}
.db-hero-bg { position:absolute; inset:0; pointer-events:none; }
.db-orb {
  position:absolute; border-radius:50%;
  background:radial-gradient(circle,rgba(99,102,241,0.25),transparent 70%);
}
.db-orb-1 { width:350px;height:350px;top:-120px;right:-60px; }
.db-orb-2 { width:180px;height:180px;bottom:-60px;right:180px;background:radial-gradient(circle,rgba(129,140,248,0.15),transparent 70%); }
.db-hero-inner {
  position:relative; z-index:1;
  padding: 2.5rem 2.5rem;
  display:flex; align-items:center; gap:1.25rem;
}
.db-hero-icon {
  width:56px; height:56px; border-radius:1.1rem; flex-shrink:0;
  background:rgba(129,140,248,0.15); border:1px solid rgba(129,140,248,0.25);
  display:flex; align-items:center; justify-content:center; color:#a5b4fc;
}
.db-hero-title { margin:0; font-size:1.5rem; font-weight:900; color:#f8fafc; }
.db-hero-sub { margin:0; font-size:0.85rem; color:#94a3b8; }
.db-btn-new {
  display:inline-flex; align-items:center; gap:0.4rem;
  padding:0.6rem 1.25rem; border:none; border-radius:9999px;
  background:#4f46e5; color:white; font-size:0.82rem; font-weight:800;
  cursor:pointer; transition:background 0.2s,transform 0.15s; flex-shrink:0;
}
.db-btn-new:hover { background:#4338ca; transform:translateY(-1px); }

/* ── 统计卡片 ── */
.db-stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:1rem; }
.db-stat-card {
  background:white; border-radius:1.25rem; padding:1.25rem 1.25rem 1rem;
  border:1px solid rgba(226,232,240,0.8); box-shadow:0 2px 8px rgba(15,23,42,0.04);
  display:flex; flex-direction:column; gap:0.35rem; position:relative; overflow:hidden;
}
.db-stat-icon { width:2.25rem;height:2.25rem;border-radius:0.65rem;display:flex;align-items:center;justify-content:center;margin-bottom:0.25rem; }
.db-stat-label { font-size:0.75rem;color:#94a3b8;font-weight:600; }
.db-stat-value { font-size:1.75rem;font-weight:900;color:#0f172a;line-height:1; }
.db-stat-wave { position:absolute;bottom:0;left:0;right:0;height:32px;background-repeat:no-repeat;background-size:100% 100%;opacity:0.35; }
.db-stat-card--clickable { cursor:pointer; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); }
.db-stat-card--clickable:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(15,23,42,0.08); border-color: rgba(99,102,241,0.3); }
.db-stat-card--clickable:active { transform: translateY(0); transition: transform 0.1s; }
.db-stat-arrow { position:absolute; top:1rem; right:1rem; color:#cbd5e1; opacity:0; transition: all 0.25s; }
.db-stat-card--clickable:hover .db-stat-arrow { opacity:1; color:#6366f1; transform: translateX(2px); }
.db-wave-blue   { background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 32'%3E%3Cpath d='M0 20 Q25 8 50 20 Q75 32 100 20 Q125 8 150 20 Q175 32 200 20 L200 32 L0 32Z' fill='%236366f1'/%3E%3C/svg%3E"); }
.db-wave-green  { background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 32'%3E%3Cpath d='M0 20 Q25 8 50 20 Q75 32 100 20 Q125 8 150 20 Q175 32 200 20 L200 32 L0 32Z' fill='%2322c55e'/%3E%3C/svg%3E"); }
.db-wave-orange { background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 32'%3E%3Cpath d='M0 20 Q25 8 50 20 Q75 32 100 20 Q125 8 150 20 Q175 32 200 20 L200 32 L0 32Z' fill='%23f97316'/%3E%3C/svg%3E"); }
.db-wave-purple { background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 32'%3E%3Cpath d='M0 20 Q25 8 50 20 Q75 32 100 20 Q125 8 150 20 Q175 32 200 20 L200 32 L0 32Z' fill='%23a855f7'/%3E%3C/svg%3E"); }

/* ── 主内容双栏 ── */
.db-main-grid { display:grid; grid-template-columns:1.4fr 1fr; gap:1.25rem; }
.db-card {
  background:white; border-radius:1.5rem; padding:1.5rem;
  border:1px solid rgba(226,232,240,0.8); box-shadow:0 2px 8px rgba(15,23,42,0.04);
  display:flex; flex-direction:column; gap:0;
}
.db-card-header { display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem; }
.db-card-title-row { display:flex;align-items:center;gap:0.5rem; }
.db-card-icon { color:#4f46e5; }
.db-card-title { margin:0;font-size:0.95rem;font-weight:800;color:#0f172a; }
.db-btn-sm {
  display:inline-flex;align-items:center;gap:0.3rem;
  padding:0.3rem 0.75rem;border:none;border-radius:9999px;
  background:#4f46e5;color:white;font-size:0.72rem;font-weight:800;cursor:pointer;transition:background 0.2s;
}
.db-btn-sm:hover { background:#4338ca; }

/* 筛选栏 */
.db-filter-bar {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
}
.db-search-wrap {
  flex: 1;
  min-width: 140px;
  position: relative;
  display: flex;
  align-items: center;
}
.db-search-icon {
  position: absolute;
  left: 0.65rem;
  color: #94a3b8;
  pointer-events: none;
}
.db-search-input {
  width: 100%;
  padding: 0.45rem 0.65rem 0.45rem 1.85rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.6rem;
  font-size: 0.78rem;
  color: #0f172a;
  background: #f8fafc;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.db-search-input:focus {
  border-color: #818cf8;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  background: #fff;
}
.db-search-input::placeholder {
  color: #94a3b8;
}
.db-filter-select {
  padding: 0.45rem 1.65rem 0.45rem 0.65rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.6rem;
  font-size: 0.78rem;
  color: #475569;
  background: #f8fafc;
  outline: none;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.45rem center;
  transition: border-color 0.15s;
}
.db-filter-select:focus {
  border-color: #818cf8;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  background-color: #fff;
}

/* 草稿箱 */
.draft-count-badge {
  min-width: 1.65rem;
  height: 1.65rem;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(99, 102, 241, 0.08);
  color: #6366f1;
  font-size: 0.78rem;
  font-weight: 750;
  padding: 0 0.35rem;
  flex-shrink: 0;
}
.draft-empty {
  padding: 1.5rem 0.5rem;
  color: #94a3b8;
  font-size: 0.82rem;
  font-weight: 550;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
}
.draft-empty-icon {
  font-size: 1.35rem;
  opacity: 0.5;
}
.draft-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.draft-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.85rem;
  padding: 0.6rem 0.7rem;
  border-radius: 0.7rem;
  transition: background 0.15s;
}
.draft-item:hover {
  background: rgba(99, 102, 241, 0.04);
}
.draft-item-left {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
  flex: 1;
}
.draft-item-dot {
  width: 0.35rem;
  height: 0.35rem;
  border-radius: 50%;
  background: #a5b4fc;
  flex-shrink: 0;
}
.draft-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.draft-info strong {
  color: #0f172a;
  font-size: 0.84rem;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.draft-info span {
  color: #94a3b8;
  font-size: 0.7rem;
  font-weight: 550;
}
.draft-actions {
  display: flex;
  flex-shrink: 0;
  gap: 0.35rem;
}

/* 表格 */
.db-table-head {
  display:grid;grid-template-columns:2fr 1fr 0.7fr 1.4fr;
  padding: 0.75rem 0.5rem; border-bottom:1px solid #f1f5f9;
  font-size:0.7rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.25rem;
}
.db-table-row {
  display:grid;grid-template-columns:2fr 1fr 0.7fr 1.4fr;
  align-items:center; padding: 0.85rem 0.5rem;
  border-bottom:1px solid #f8fafc;gap:0.5rem;
  transition:background 0.15s;border-radius:0.75rem;
}
.db-table-row:hover { background:#f8fafc; }
.db-row-title { display:flex;align-items:center;gap:0.6rem;min-width:0; }
.db-row-cover { width:32px;height:32px;border-radius:0.5rem;flex-shrink:0;background-size:cover;background-position:center; }
.db-row-title span { font-size:0.82rem;font-weight:700;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
.db-row-cat { font-size:0.75rem;color:#64748b; }
.db-row-status { display:inline-flex;padding:0.15rem 0.55rem;border-radius:9999px;font-size:0.68rem;font-weight:800; }
.db-row-status.top { background:#eff6ff;color:#2563eb; }
.db-row-status.pub { background:#f0fdf4;color:#16a34a; }
.db-row-status.draft { background:#fffbeb;color:#d97706; }
.db-row-status.private { background:#f1f5f9;color:#475569; }
.db-row-actions { display:flex;gap:0.3rem;flex-wrap:wrap; }
.db-action-btn {
  display:inline-flex;align-items:center;gap:0.2rem;
  padding:0.22rem 0.55rem;border:none;border-radius:9999px;
  font-size:0.68rem;font-weight:700;cursor:pointer;transition:background 0.2s;
}
.db-action-btn.edit { background:rgba(79,70,229,0.08);color:#4f46e5; }
.db-action-btn.edit:hover { background:rgba(79,70,229,0.15); }
.db-action-btn.view { background:#f1f5f9;color:#475569; }
.db-action-btn.view:hover { background:#e2e8f0; }
.db-action-btn.danger { background:rgba(239,68,68,0.08);color:#dc2626; }
.db-action-btn.danger:hover { background:rgba(239,68,68,0.15); }
.db-action-btn.approve { background:rgba(34,197,94,0.08);color:#16a34a; }
.db-action-btn.approve:hover { background:rgba(34,197,94,0.15); }
.db-action-btn:disabled { opacity:0.4;cursor:not-allowed; }
.db-empty { padding:2rem;text-align:center;color:#94a3b8;font-size:0.85rem; }

/* Category/Tag management UI tweaks */
.cat-row { display:flex; align-items:center; justify-content:space-between; padding:0.4rem 0.5rem; border-bottom:1px solid #f1f5f9; }
.cat-actions { opacity: 0; transition: opacity 0.12s ease; }
.cat-row:hover .cat-actions { opacity: 1; }
.cat-create-row { display:flex; gap:0.5rem; align-items:center; }
.cat-create-row input { padding:0.45rem 0.6rem; border-radius:0.6rem; border:1px solid #e6eef6; }
.cat-create-row button { white-space:nowrap }
.tag-badge { width:0.8rem; height:0.8rem; display:inline-block; border-radius:0.2rem; border:1px solid rgba(0,0,0,0.06) }

/* 评论 */
.db-comment-item { padding:1rem;border-radius:1rem;background:#f8fafc;margin-bottom:0.75rem;display:flex;flex-direction:column;gap:0.4rem; }
.db-comment-text { margin:0;font-size:0.85rem;color:#334155;line-height:1.55; }
.db-comment-meta { margin:0;font-size:0.72rem;color:#94a3b8; }
.db-comment-actions { display:flex;gap:0.4rem; }

/* 分页 */
.db-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding-top: 0.75rem;
  margin-top: 0.25rem;
  border-top: 1px solid #f1f5f9;
}
.db-page-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.6rem;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #475569;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.db-page-btn:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: #cbd5e1;
  color: #0f172a;
}
.db-page-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.db-page-info {
  font-size: 0.8rem;
  font-weight: 700;
  color: #475569;
  min-width: 3rem;
  text-align: center;
}

/* 响应式 */
@media (max-width:900px) {
  .db-stats-grid { grid-template-columns:repeat(2,1fr); }
  .db-main-grid { grid-template-columns:1fr; }
}
@media (max-width:600px) {
  .db-stats-grid { grid-template-columns:repeat(2,1fr); }
  .db-table-head,
  .db-table-row { grid-template-columns:1fr auto; }
  .db-table-head span:nth-child(2),
  .db-table-head span:nth-child(3),
  .db-table-row .db-row-cat,
  .db-table-row .db-row-status { display:none; }
  .db-hero-inner { flex-wrap:wrap; }
  .db-btn-new { width:100%; justify-content:center; }
}

/* 暗色模式 */
</style>