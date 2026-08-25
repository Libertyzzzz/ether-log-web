<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import {
  FileText,
  Folder,
  Home,
  Info,
  MoveRight,
  Plus,
  BookOpen,
} from 'lucide-vue-next'
import type { ArticleDirectory, ArticleListItem, Category } from '../types/blog'

const props = defineProps<{
  articles: ArticleListItem[]
  categories: Category[]
}>()

const emit = defineEmits<{
  navigate: [page: string]
  openArticle: [article: ArticleListItem]
  'filter-category': [label: string]
}>()

const isOpen = ref(false)
const isMobile = ref(false)
const shellRef = ref<HTMLElement | null>(null)
const activeDirectoryId = ref<number | null>(null)
// 支持多个目录同时展开：Set 存放已展开的目录 id
const expandedDirectoryIds = ref<Set<number>>(new Set())

function checkMobile() {
  isMobile.value = typeof window !== 'undefined' && window.innerWidth <= 1024
}

const route = useRoute()
const blockedPages = new Set(['profile', 'dashboard', 'guestbook'])
const allowSidebar = computed(() => {
  const page = (route.meta.page as string) || ''
  return !blockedPages.has(page)
})

const navItems = [
  { id: 'home', label: '首页', icon: Home, filled: true },
  { id: 'posts', label: '文章', icon: FileText, filled: true },
  { id: 'about', label: '关于我', icon: Info, filled: true },
]

const directories = computed<ArticleDirectory[]>(() => {
  return props.categories.map((c) => {
    const matchedArticles = props.articles.filter(
      (a) => a.categoryName === (c.name || String(c.id)),
    )
    // 优先使用后端返回的 articleCount；如果后端没返回，则用全量文章列表统计
    const count =
      typeof c.articleCount === 'number' && c.articleCount >= 0
        ? c.articleCount
        : matchedArticles.length
    return {
      id: c.id,
      name: c.name || String(c.id),
      description: '',
      // articleIds 始终使用全量文章匹配（用于展开列表）
      articleIds: matchedArticles.map((a) => a.id),
      sortOrder: c.sort || 0,
      // 后端返回的真实文章总数（展示 & 排序用）
      count,
    }
  })
})

const articleMap = computed(() => new Map(props.articles.map((article) => [article.id, article])))

function dirArticleCount(d: ArticleDirectory): number {
  return typeof d.count === 'number' ? d.count : d.articleIds.length
}

const sortedDirectories = computed(() =>
  [...directories.value]
    .filter((d) => dirArticleCount(d) > 0)
    .sort((a, b) => {
      const la = dirArticleCount(a)
      const lb = dirArticleCount(b)
      if (lb !== la) return lb - la
      return a.sortOrder - b.sortOrder
    }),
)

const activeNavId = computed(() => (route.meta?.page as string) || 'home')
const isNavActive = (id: string) => activeNavId.value === id

function handleNavigate(page: string) {
  emit('navigate', page)
  closeSidebar()
}

function handleArticle(article: ArticleListItem) {
  emit('openArticle', article)
  closeSidebar()
}

function getDirectoryArticles(directory: ArticleDirectory) {
  return directory.articleIds
    .map((articleId) => articleMap.value.get(articleId))
    .filter((article): article is ArticleListItem => Boolean(article))
}

function isDirectoryExpanded(directoryId: number): boolean {
  return expandedDirectoryIds.value.has(directoryId)
}

function selectDirectory(directoryId: number) {
  // 1. 切换展开状态（支持多开，互不影响）
  if (expandedDirectoryIds.value.has(directoryId)) {
    expandedDirectoryIds.value.delete(directoryId)
  } else {
    expandedDirectoryIds.value.add(directoryId)
  }
  // 2. 记录当前高亮选中的目录（用于筛选和 active 样式）
  // 只有在展开时才触发筛选
  if (expandedDirectoryIds.value.has(directoryId)) {
    activeDirectoryId.value = directoryId
    const dir = directories.value.find((d) => d.id === directoryId)
    if (dir) emit('filter-category', dir.name)
  } else {
    // 如果闭合了当前高亮的目录，取消高亮
    if (activeDirectoryId.value === directoryId) {
      activeDirectoryId.value = null
    }
  }
}

function addDirectory() {
  emit('navigate', 'dashboard')
}

function moveArticle(_articleId: number, _targetDirectoryId: number) {}

let mouseMoveListener: ((e: MouseEvent) => void) | null = null
let lastMouseX: number | null = null

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)

  mouseMoveListener = (e: MouseEvent) => {
    if (isMobile.value || isOpen.value || !allowSidebar.value || !shellRef.value) return
    const threshold = window.innerWidth * 0.2
    const prevX = lastMouseX ?? e.clientX
    const delta = e.clientX - prevX
    lastMouseX = e.clientX
    if (delta < 0 && e.clientX <= threshold) openSidebar()
  }
  window.addEventListener('mousemove', mouseMoveListener)
})

watch(() => route.fullPath, () => {
  if (!allowSidebar.value) isOpen.value = false
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
  if (mouseMoveListener) window.removeEventListener('mousemove', mouseMoveListener)
})

function openSidebar() {
  isOpen.value = true
  lastMouseX = null
}

function closeSidebar() {
  isOpen.value = false
  lastMouseX = null
}

function toggleSidebar() {
  isOpen.value ? closeSidebar() : openSidebar()
}
</script>

<template>
  <div
    v-if="isOpen && isMobile"
    class="sidebar-backdrop"
    @click="closeSidebar"
    @touchstart.prevent="closeSidebar"
  ></div>

  <div
    ref="shellRef"
    class="smart-sidebar-shell"
    :class="{ open: isOpen, mobile: isMobile }"
    @mouseenter="!isMobile && openSidebar()"
    @mouseleave="!isMobile && closeSidebar()"
  >
    <div class="sidebar-hover-bridge" aria-hidden="true"></div>
    <div
      class="sidebar-hotspot"
      aria-hidden="true"
      :style="{ display: allowSidebar ? 'block' : 'none' }"
      @click.stop="toggleSidebar"
    >
      <span></span>
    </div>

    <aside class="smart-sidebar" :aria-hidden="!isOpen" aria-label="侧边目录导航栏">
      <nav class="sidebar-section nav-section" aria-label="页面导航">
        <p class="section-label">
          <span class="section-label-dot"></span>
          导航
          <span class="section-label-en">Navigate</span>
        </p>
        <button
          v-for="item in navItems"
          :key="item.id"
          class="nav-row"
          :class="{ active: isNavActive(item.id) }"
          type="button"
          @click="handleNavigate(item.id)"
        >
          <component :is="item.icon" :size="15" :fill="item.filled ? 'currentColor' : 'none'" />
          <span>{{ item.label }}</span>
        </button>
      </nav>

      <div class="sidebar-section directory-section">
        <div class="section-title-row">
          <p class="section-label">
            <BookOpen :size="11" class="section-label-icon" />
            目录
            <span class="section-label-en">Categories</span>
          </p>
          <button class="add-directory-button" type="button" title="新建目录" @click="addDirectory">
            <Plus :size="13" />
          </button>
        </div>
        <div class="directory-list">
          <section
            v-for="directory in sortedDirectories"
            :key="directory.id"
            class="directory-group"
            :class="{ active: activeDirectoryId === directory.id }"
          >
            <button class="directory-button" type="button" @click="selectDirectory(directory.id)">
              <Folder :size="15" />
              <span class="directory-copy">
                <strong>{{ directory.name }}</strong>
                <small>{{ directory.description }}</small>
              </span>
              <span
                v-if="dirArticleCount(directory) > 0"
                class="directory-count"
              >{{ dirArticleCount(directory) }}</span>
            </button>

            <div v-if="isDirectoryExpanded(directory.id)" class="directory-articles">
              <div
                v-for="article in getDirectoryArticles(directory)"
                :key="article.id"
                class="directory-article-row"
              >
                <button class="article-link" type="button" @click="handleArticle(article)">
                  {{ article.title }}
                </button>
                <label class="move-control" title="移动文章">
                  <MoveRight :size="12" />
                  <select
                    :value="directory.id"
                    @click.stop
                    @change="moveArticle(article.id, Number(($event.target as HTMLSelectElement).value))"
                  >
                    <option
                      v-for="targetDirectory in sortedDirectories"
                      :key="targetDirectory.id"
                      :value="targetDirectory.id"
                    >
                      {{ targetDirectory.name }}
                    </option>
                  </select>
                </label>
              </div>
              <p v-if="!getDirectoryArticles(directory).length" class="empty-directory">
                暂无文章，可从其他目录移动过来。
              </p>
            </div>
          </section>
        </div>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.sidebar-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1190;
  background: rgba(0, 0, 0, 0.35);
  animation: backdropIn 0.18s ease;
}
@keyframes backdropIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.smart-sidebar-shell {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  z-index: 1200;
  width: 14.5rem;
  pointer-events: none;
}

.sidebar-hover-bridge {
  position: absolute;
  inset: 0;
  width: 14.5rem;
  pointer-events: none;
}
.smart-sidebar-shell.open .sidebar-hover-bridge {
  pointer-events: auto;
}

.sidebar-hotspot {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 1.5rem;
  z-index: 1210;
  pointer-events: auto;
}
.sidebar-hotspot span {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 2rem;
  height: 0.22rem;
  border-radius: 999px;
  background: rgba(99, 102, 241, 0.35);
  opacity: 0;
  transform: translate(-50%, -50%);
  transition: opacity 0.12s ease, transform 0.12s ease;
}
.smart-sidebar-shell:not(.open) .sidebar-hotspot:hover span {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1.05);
}
.smart-sidebar-shell.open .sidebar-hotspot { opacity: 0; pointer-events: none; }

.smart-sidebar {
  width: 13rem;
  height: 100%;
  margin: 0;
  padding: 5.6rem 0.65rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  border-radius: 0;
  background:
    radial-gradient(circle at 12% 5%, rgba(68, 105, 255, 0.14), transparent 32rem),
    radial-gradient(circle at 88% 0%, rgba(255, 223, 207, 0.42), transparent 30rem),
    linear-gradient(180deg, #eaf0fb 0%, #f8faff 48%, #eef3fb 100%);
  color: #0f172a;
  border-right: none;
  box-shadow: none;
  pointer-events: auto;
  overflow: hidden auto;
  scrollbar-width: none;
  transform: translateX(-100%);
  opacity: 0;
  transition: transform 0.18s ease, opacity 0.14s ease;
  position: relative;
}
.smart-sidebar::-webkit-scrollbar {
  display: none;
}
.smart-sidebar-shell.open .smart-sidebar {
  transform: translateX(0);
  opacity: 1;
}

.nav-row,
.directory-button,
.article-link,
.add-directory-button {
  border: 0;
  font: inherit;
  cursor: pointer;
}

.sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}
.directory-section { margin-top: 0.6rem; }

.section-label {
  margin: 0;
  padding: 0.15rem 0.55rem 0.28rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #94a3b8;
  line-height: 1;
  text-transform: uppercase;
}
.section-label-dot {
  width: 0.28rem;
  height: 0.28rem;
  border-radius: 999px;
  background: linear-gradient(135deg, #6366f1, #a78bfa);
  flex-shrink: 0;
}
.section-label-icon {
  color: #a78bfa;
  flex-shrink: 0;
  opacity: 0.9;
}
.section-label-en {
  margin-left: auto;
  font-size: 0.56rem;
  font-weight: 600;
  color: #cbd5e1;
  letter-spacing: 0.1em;
}
.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.1rem;
}
.add-directory-button {
  width: 1.5rem;
  height: 1.5rem;
  display: grid;
  place-items: center;
  border-radius: 0.55rem;
  background: rgba(255, 255, 255, 0.55);
  color: #94a3b8;
  border: 1px solid rgba(226, 232, 240, 0.65);
}
.add-directory-button:hover {
  background: rgba(255, 255, 255, 0.85);
  color: #64748b;
}

.nav-row,
.directory-button {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  border-radius: 9999px;
  padding: 0.52rem 0.8rem 0.52rem 0.95rem;
  background: rgba(255, 255, 255, 0.45);
  border: 1px solid rgba(203, 213, 225, 0.35);
  color: #64748b;
  text-align: left;
  transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease, transform 0.12s ease;
}
.nav-row-indicator { display: none; }
.nav-row:hover,
.directory-button:hover {
  background: #ffffff;
  border-color: rgba(99, 102, 241, 0.25);
  color: #4f46e5;
}
.nav-row.active,
.directory-group.active .directory-button {
  background: #111827;
  border-color: #111827;
  color: #ffffff;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.16);
}
.nav-row span {
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.01em;
}
.nav-row.active > svg,
.directory-group.active .directory-button > svg {
  color: #a78bfa;
}

.directory-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.directory-group {
  border-radius: 0.7rem;
}
.directory-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.08rem;
}
.directory-copy strong {
  font-size: 0.78rem;
  line-height: 1.2;
  font-weight: 700;
}
.directory-copy small {
  font-size: 0.62rem;
  color: #94a3b8;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.directory-group.active .directory-copy strong {
  font-weight: 700;
}
.directory-group.active .directory-copy small,
.directory-button:hover .directory-copy small {
  color: rgba(255, 255, 255, 0.72);
}
.directory-button:hover .directory-copy small {
  color: #4f46e5;
}
.directory-count {
  min-width: 1.35rem;
  height: 1.15rem;
  padding: 0 0.4rem;
  display: grid;
  place-items: center;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.65);
  color: #64748b;
  font-size: 0.62rem;
  font-weight: 700;
  line-height: 1;
  border: 1px solid rgba(203, 213, 225, 0.55);
}
.directory-group.active .directory-count {
  background: rgba(255, 255, 255, 0.12);
  color: #c4b5fd;
  border-color: rgba(167, 139, 250, 0.35);
}
.directory-button:hover .directory-count {
  background: #ffffff;
  color: #4f46e5;
  border-color: rgba(99, 102, 241, 0.3);
}

.directory-articles {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin: 0.35rem 0 0.15rem 1.05rem;
  padding-left: 0.75rem;
  border-left: 1px solid rgba(203, 213, 225, 0.72);
}
.directory-article-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 2rem;
  align-items: center;
  gap: 0.25rem;
}
.article-link {
  max-width: 100%;
  padding: 0.32rem 0.45rem;
  border-radius: 0.48rem;
  background: transparent;
  color: #64748b;
  font-size: 0.68rem;
  font-weight: 650;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.article-link:hover {
  background: rgba(79, 124, 255, 0.08);
  color: #2563eb;
}
.move-control {
  position: relative;
  width: 1.75rem;
  height: 1.75rem;
  display: grid;
  place-items: center;
  border-radius: 0.5rem;
  color: #94a3b8;
}
.move-control:hover {
  background: rgba(79, 124, 255, 0.08);
  color: #2563eb;
}
.move-control select {
  position: absolute;
  inset: 0;
  width: 100%;
  opacity: 0;
  cursor: pointer;
}
.empty-directory {
  margin: 0;
  padding: 0.4rem 0.45rem;
  color: #94a3b8;
  font-size: 0.68rem;
  line-height: 1.45;
}

@media (max-width: 1024px) {
  .smart-sidebar-shell,
  .sidebar-backdrop {
    display: none !important;
  }
}

</style>