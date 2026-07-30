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
const activeDirectoryId = ref(101)

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

// directories 由 props.categories 计算，文章归属按 categoryName 匹配
const directories = computed<ArticleDirectory[]>(() => {
  const mapped = props.categories.map((c) => ({
    id: c.id,
    name: c.name || String(c.id),
    description: '',
    articleIds: props.articles
      .filter((a) => a.categoryName === (c.name || String(c.id)))
      .map((a) => a.id),
    sortOrder: c.sort || 0,
  }))
  return mapped
})

const articleMap = computed(() => new Map(props.articles.map((article) => [article.id, article])))

// 排序规则：1. 有文章的置顶  2. 文章数倒序  3. sortOrder 升序
const sortedDirectories = computed(() =>
  [...directories.value]
    .filter((d) => d.articleIds.length > 0)
    .sort((a, b) => {
      if (b.articleIds.length !== a.articleIds.length) return b.articleIds.length - a.articleIds.length
      return a.sortOrder - b.sortOrder
    })
)

// 当前页面高亮（从 route.meta.page 读取）
const activeNavId = computed(() => (route.meta?.page as string) || 'home')
const isNavActive = (id: string) => {
  if (id === 'home') return activeNavId.value === 'home'
  if (id === 'posts') return activeNavId.value === 'posts'
  if (id === 'about') return activeNavId.value === 'about'
  return false
}

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

function selectDirectory(directoryId: number) {
  activeDirectoryId.value = directoryId
  const dir = directories.value.find((d) => d.id === directoryId)
  if (dir) emit('filter-category', dir.name)
}

function addDirectory() {
  emit('navigate', 'dashboard')
}

function moveArticle(_articleId: number, _targetDirectoryId: number) {
  // 仅前端操作：文章归属由后端 categoryName 决定，这里不做本地目录改动
}

let mouseMoveListener: ((e: MouseEvent) => void) | null = null
let lastMouseX: number | null = null

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)

  // open when cursor moves leftwards and crosses left 20% of the viewport (desktop only)
  mouseMoveListener = (e: MouseEvent) => {
    if (isMobile.value) return
    if (isOpen.value) return
    if (!allowSidebar.value) return
    if (!shellRef.value) return
    const threshold = window.innerWidth * 0.2
    const prevX = lastMouseX ?? e.clientX
    const delta = e.clientX - prevX
    lastMouseX = e.clientX
    if (delta < 0 && e.clientX <= threshold) {
      openSidebar()
    }
  }
  window.addEventListener('mousemove', mouseMoveListener)
})

// when route changes, ensure sidebar is closed if not allowed
watch(() => route.fullPath, () => {
  if (!allowSidebar.value) {
    isOpen.value = false
  }
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
  if (isOpen.value) {
    closeSidebar()
  } else {
    openSidebar()
  }
}
</script>

<template>
  <!-- Backdrop overlay (mobile/tablet only) -->
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
          <span class="nav-row-indicator" aria-hidden="true"></span>
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
              <span class="nav-row-indicator" aria-hidden="true"></span>
              <Folder :size="15" />
              <span class="directory-copy">
                <strong>{{ directory.name }}</strong>
                <small>{{ directory.description }}</small>
              </span>
              <span
                v-if="directory.articleIds.length > 0"
                class="directory-count"
              >{{ directory.articleIds.length }}</span>
            </button>

            <div v-if="activeDirectoryId === directory.id" class="directory-articles">
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

      <!-- 目录的新增/删除在控制面板中管理 -->
    </aside>
  </div>
</template>

<style scoped>
/* ── Backdrop overlay ── */
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
  top: 5rem;
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
  /* hotspot flush to the left edge for predictable hover */
  left: 0;
  width: 1.5rem;
  /* subtle visible handle to indicate interactive edge */
  background: linear-gradient(90deg, rgba(79,124,255,0.06), rgba(79,124,255,0));
  border-right: 1px solid rgba(79,124,255,0.06);
  z-index: 1210;
  pointer-events: auto;
}
.sidebar-hotspot:hover { background: linear-gradient(90deg, rgba(79,124,255,0.12), rgba(79,124,255,0)); }
.sidebar-hotspot span {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 2rem;
  height: 0.22rem;
  border-radius: 999px;
  background: rgba(79,124,255,0.42);
  opacity: 0.6;
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
  padding: 1rem 0.7rem;
  display: flex;
  flex-direction: column;
  gap: 1.05rem;
  border-radius: 0;
  background: transparent;
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
  /* 右侧羽化边缘：向右边透明渐变，完全融入背景 */
  -webkit-mask-image: linear-gradient(90deg, rgba(0,0,0,1) 92%, rgba(0,0,0,0.5) 97%, rgba(0,0,0,0) 100%);
  mask-image: linear-gradient(90deg, rgba(0,0,0,1) 92%, rgba(0,0,0,0.5) 97%, rgba(0,0,0,0) 100%);
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
  gap: 0.5rem;
}
.directory-section { margin-top: 0.75rem; }

.section-label {
  margin: 0;
  padding: 0.15rem 0.45rem 0.35rem;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  color: #94a3b8;
  line-height: 1;
  text-transform: none;
}
.section-label-dot {
  width: 0.28rem;
  height: 0.28rem;
  border-radius: 999px;
  background: #cbd5e1;
  flex-shrink: 0;
}
.section-label-icon {
  color: #94a3b8;
  flex-shrink: 0;
  opacity: 0.85;
}
.section-label-en {
  margin-left: auto;
  font-size: 0.58rem;
  font-weight: 500;
  color: #cbd5e1;
  letter-spacing: 0.08em;
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
  background: rgba(255, 255, 255, 0.5);
  color: #94a3b8;
  border: 1px solid rgba(226, 232, 240, 0.6);
}
.add-directory-button:hover {
  background: rgba(255, 255, 255, 0.8);
  color: #64748b;
}

.nav-row,
.directory-button {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.65rem;
  border-radius: 0.62rem;
  padding: 0.6rem 0.7rem 0.6rem 0.85rem;
  background: transparent;
  color: #475569;
  text-align: left;
  transition: background 0.16s ease, color 0.16s ease;
  overflow: hidden;
}
.nav-row-indicator {
  position: absolute;
  left: 0.12rem;
  top: 50%;
  width: 2px;
  height: 0;
  border-radius: 999px;
  background: #94a3b8;
  transform: translateY(-50%);
  transition: height 0.18s ease, opacity 0.18s ease, background 0.18s ease;
  opacity: 0;
}
.nav-row:hover,
.directory-button:hover {
  background: rgba(255, 255, 255, 0.45);
  color: #334155;
}
.nav-row:hover .nav-row-indicator,
.directory-button:hover .nav-row-indicator {
  height: 50%;
  opacity: 0.5;
}
.nav-row.active,
.directory-group.active .directory-button {
  background: rgba(255, 255, 255, 0.7);
  color: #0f172a;
  font-weight: 600;
}
.nav-row.active .nav-row-indicator,
.directory-group.active .directory-button .nav-row-indicator {
  height: 62%;
  opacity: 1;
  background: #475569;
}
.nav-row span {
  font-size: 0.8rem;
  font-weight: 500;
}
.nav-row.active span {
  font-weight: 600;
}
.nav-row.active > svg {
  color: #1e293b;
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
  font-weight: 500;
}
.directory-copy small {
  font-size: 0.62rem;
  color: #94a3b8;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.directory-group.active .directory-copy strong {
  font-weight: 600;
}
.directory-group.active .directory-copy small,
.directory-button:hover .directory-copy small {
  color: #64748b;
}
.directory-count {
  min-width: 1.3rem;
  height: 1.15rem;
  padding: 0 0.38rem;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.6);
  color: #64748b;
  font-size: 0.62rem;
  font-weight: 600;
  line-height: 1;
  border: 1px solid rgba(226, 232, 240, 0.55);
}
.directory-group.active .directory-count {
  background: rgba(148, 163, 184, 0.14);
  color: #334155;
  border-color: rgba(148, 163, 184, 0.2);
}
.directory-button:hover .directory-count {
  background: rgba(255, 255, 255, 0.85);
  color: #475569;
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

/* ── Mobile / Tablet: hide sidebar entirely ── */
@media (max-width: 1024px) {
  .smart-sidebar-shell,
  .sidebar-backdrop {
    display: none !important;
  }
}

</style>