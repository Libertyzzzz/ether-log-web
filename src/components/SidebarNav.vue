<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { fetchCategories as apiFetchCategories } from '../api'
import {
  FileText,
  Folder,
  Home,
  Info,
  MoveRight,
  Plus,
  X,
} from 'lucide-vue-next'
import type { ArticleDirectory, ArticleListItem } from '../types/blog'

const props = defineProps<{
  articles: ArticleListItem[]
}>()

const emit = defineEmits<{
  navigate: [page: string]
  openArticle: [article: ArticleListItem]
  'filter-category': [label: string]
}>()

const isOpen = ref(false)
const shellRef = ref<HTMLElement | null>(null)
const activeDirectoryId = ref(101)

const route = useRoute()
const blockedPages = new Set(['profile', 'dashboard', 'guestbook'])
const allowSidebar = computed(() => {
  const page = (route.meta.page as string) || ''
  return !blockedPages.has(page)
})

const navItems = [
  { id: 'home', label: '首页', icon: Home },
  { id: 'posts', label: '文章', icon: FileText },
  { id: 'about', label: '关于我', icon: Info },
]

const directories = ref<ArticleDirectory[]>([])

async function fetchCategories() {
  try {
    const data = await apiFetchCategories()
    if (Array.isArray(data)) {
      // map backend categories to local directory shape and include article ids by matching category name
      const mapped = data.map((c: any) => ({
        id: c.id,
        name: c.name || c.label || String(c.id),
        description: c.icon || '',
        articleIds: props.articles ? props.articles.filter(a => a.categoryName === (c.name || c.label)).map(a => a.id) : [],
        sortOrder: c.sort || 0,
      }))
      directories.value = mapped.sort((a, b) => a.sortOrder - b.sortOrder)
    }
  } catch (error) {
    // fallback to local mock if API fails
    console.error('无法加载分类列表，使用本地数据', error)
    if (!directories.value.length) {
      directories.value = [
        { id: 101, name: '灵感笔记', description: '随手记录的想法', articleIds: [], sortOrder: 1 },
        { id: 102, name: '项目复盘', description: '开发过程与经验', articleIds: [], sortOrder: 2 },
        { id: 103, name: '长期主题', description: '持续打磨的议题', articleIds: [], sortOrder: 3 },
      ]
      syncMockDirectoryArticles()
    }
  }
}

const articleMap = computed(() => new Map(props.articles.map((article) => [article.id, article])))

const sortedDirectories = computed(() =>
  [...directories.value].sort((a, b) => a.sortOrder - b.sortOrder)
)

// open/close are implemented later to also reset mouse tracking

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
  const dir = directories.value.find(d => d.id === directoryId)
  if (dir) emit('filter-category', dir.name)
}

function addDirectory() {
  // redirect to control panel for category management
  emit('navigate', 'dashboard')
}

// Sidebar is read-only for categories; management is in control panel
// creation/deletion handled in control panel; keep sidebar read-only

// creation/deletion are moved to control panel (Dashboard)

function moveArticle(articleId: number, targetDirectoryId: number) {
  directories.value = directories.value.map((directory) => {
    const articleIds = directory.articleIds.filter((id) => id !== articleId)
    if (directory.id === targetDirectoryId) articleIds.push(articleId)
    return { ...directory, articleIds }
  })
  activeDirectoryId.value = targetDirectoryId
}

function syncMockDirectoryArticles() {
  if (!props.articles.length) return

  const validArticleIds = new Set(props.articles.map((article) => article.id))
  const hasExistingAssignments = directories.value.some((directory) => directory.articleIds.length)

  if (!hasExistingAssignments) {
    directories.value = directories.value.map((directory, directoryIndex) => ({
      ...directory,
      articleIds: props.articles
        .filter((_, articleIndex) => articleIndex % directories.value.length === directoryIndex)
        .map((article) => article.id),
    }))
    return
  }

  const assignedIds = new Set<number>()
  directories.value = directories.value.map((directory) => {
    const articleIds = directory.articleIds.filter((articleId) => validArticleIds.has(articleId))
    articleIds.forEach((articleId) => assignedIds.add(articleId))
    return { ...directory, articleIds }
  })

  const unassignedArticleIds = props.articles
    .map((article) => article.id)
    .filter((articleId) => !assignedIds.has(articleId))

  if (unassignedArticleIds.length) {
    directories.value = directories.value.map((directory, index) =>
      index === 0
        ? { ...directory, articleIds: [...directory.articleIds, ...unassignedArticleIds] }
        : directory
    )
  }
}

watch(() => props.articles.map((article) => article.id).join(','), syncMockDirectoryArticles, { immediate: true })
// rebuild directory article assignments when articles change
watch(() => props.articles.map((article) => article.id).join(','), () => {
  // update articleIds for each directory based on category names
  if (directories.value.length) {
    directories.value = directories.value.map((directory) => ({
      ...directory,
      articleIds: props.articles
        .filter((a) => a.categoryName === directory.name)
        .map((a) => a.id),
    }))
  }
}, { immediate: true })

let mouseMoveListener: ((e: MouseEvent) => void) | null = null
let lastMouseX: number | null = null

onMounted(() => {
  fetchCategories()

  // open when cursor moves leftwards and crosses left 20% of the viewport
  mouseMoveListener = (e: MouseEvent) => {
    if (isOpen.value) return
    if (!allowSidebar.value) return
    const shell = shellRef.value
    if (!shell) return
    const threshold = window.innerWidth * 0.2 // left 20% of viewport
    const prevX = lastMouseX ?? e.clientX
    const delta = e.clientX - prevX
    lastMouseX = e.clientX
    // only trigger when moving left (delta < 0) and within threshold
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
</script>

<template>
  <div ref="shellRef" class="smart-sidebar-shell" :class="{ open: isOpen }" @mouseenter="openSidebar" @mouseleave="closeSidebar">
    <div class="sidebar-hover-bridge" aria-hidden="true"></div>
    <div class="sidebar-hotspot" aria-hidden="true" :style="{ display: allowSidebar ? 'block' : 'none' }">
      <span></span>
    </div>

    <aside class="smart-sidebar" :aria-hidden="!isOpen" aria-label="侧边目录导航栏">
      <div class="sidebar-top">
        <button class="brand-button" type="button" @click="handleNavigate('home')">
          <span class="brand-mark">E</span>
          <span class="brand-text">NEXTIFY</span>
        </button>
        <button class="close-button" type="button" aria-label="折叠侧边栏" @click="closeSidebar">
          <X :size="14" />
        </button>
      </div>

      <nav class="sidebar-section" aria-label="页面导航">
        <p class="section-label">导航</p>
        <button
          v-for="item in navItems"
          :key="item.id"
          class="nav-row"
          type="button"
          @click="handleNavigate(item.id)"
        >
          <component :is="item.icon" :size="15" />
          <span>{{ item.label }}</span>
        </button>
      </nav>

      <div class="sidebar-section directory-section">
        <div class="section-title-row">
          <p class="section-label">目录</p>
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
              <span class="directory-count">{{ directory.articleIds.length }}</span>
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

      <div class="sidebar-footer">
        <span>目录数据为本地模拟，后续可接后端接口。</span>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.smart-sidebar-shell {
  position: fixed;
  /* place the sidebar shell below the top navigation (nav height = 5rem) */
  top: 5rem;
  bottom: 0;
  left: 0;
  z-index: 1200;
  width: 18rem;
  pointer-events: none;
}

.sidebar-hover-bridge {
  position: absolute;
  inset: 0;
  width: 18rem;
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
  width: 15.5rem;
  /* fill the shell (which already starts below the nav) */
  height: 100%;
  margin: 0 0 0 0;
  padding: 1rem 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 1.05rem;
  /* remove rounded corners and heavy shadow for edge-aligned seamless look */
  border-radius: 0;
  background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.98));
  color: #0f172a;
  border: none;
  box-shadow: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  pointer-events: auto;
  overflow: hidden auto;
  scrollbar-width: none;
  /* hide off-canvas by translating full width; animate quickly for near-instant feel */
  transform: translateX(-100%);
  opacity: 0;
  transition: transform 0.12s linear, opacity 0.08s linear;
}
.smart-sidebar::-webkit-scrollbar {
  display: none;
}
.smart-sidebar-shell.open .smart-sidebar {
  transform: translateX(0);
  opacity: 1;
}

.sidebar-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}
.brand-button,
.close-button,
.nav-row,
.directory-button,
.article-link,
.add-directory-button {
  border: 0;
  font: inherit;
  cursor: pointer;
}
.brand-button {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
  padding: 0;
  background: transparent;
  color: #0f172a;
}
.brand-mark {
  width: 1.55rem;
  height: 1.55rem;
  border-radius: 0.42rem;
  display: grid;
  place-items: center;
  background: #0f172a;
  color: #ffffff;
  font-size: 0.8rem;
  font-weight: 950;
}
.brand-text {
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  font-weight: 900;
}
.close-button {
  width: 1.65rem;
  height: 1.65rem;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: rgba(241, 245, 249, 0.86);
  color: #64748b;
}
.close-button:hover {
  background: rgba(226, 232, 240, 0.92);
  color: #0f172a;
}

.sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}
.section-label {
  margin: 0;
  padding: 0 0.45rem;
  font-size: 0.62rem;
  font-weight: 800;
  color: #94a3b8;
}
.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.add-directory-button {
  width: 1.55rem;
  height: 1.55rem;
  display: grid;
  place-items: center;
  border-radius: 0.5rem;
  background: rgba(239, 246, 255, 0.9);
  color: #2563eb;
}
.add-directory-button:hover {
  background: rgba(219, 234, 254, 0.96);
}
.nav-row,
.directory-button {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.65rem;
  border-radius: 0.62rem;
  padding: 0.62rem 0.65rem;
  background: transparent;
  color: #334155;
  text-align: left;
  transition: background 0.18s ease, color 0.18s ease;
}
.nav-row:hover,
.directory-button:hover,
.directory-group.active .directory-button {
  background: linear-gradient(135deg, rgba(79, 124, 255, 0.96), rgba(124, 58, 237, 0.9));
  color: #ffffff;
  box-shadow: 0 10px 22px rgba(79, 124, 255, 0.22);
}
.nav-row span {
  font-size: 0.78rem;
  font-weight: 800;
}

.directory-list {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}
.directory-group {
  border-radius: 0.75rem;
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
}
.directory-copy small {
  font-size: 0.62rem;
  color: #94a3b8;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.directory-group.active .directory-copy small,
.directory-button:hover .directory-copy small {
  color: rgba(255, 255, 255, 0.68);
}
.directory-count {
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.35rem;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: rgba(226, 232, 240, 0.78);
  color: #64748b;
  font-size: 0.62rem;
  font-weight: 900;
}
.newdir-overlay {
  position: fixed; inset: 0; display: grid; place-items: center; z-index: 4200;
  background: rgba(2,6,23,0.4);
}
.newdir-card { width: 20rem; padding: 1rem; border-radius: 0.8rem; background: #fff; box-shadow: 0 20px 50px rgba(2,6,23,0.24); }
.newdir-card h4 { margin: 0 0 0.6rem; }
.newdir-card input { width: 100%; padding: 8px 10px; border: 1px solid #e6eef6; border-radius: 6px; margin-bottom: 0.6rem; }
.newdir-actions { display:flex; gap:0.5rem; justify-content:flex-end; }
.btn { padding: 8px 12px; border-radius: 8px; border: 0; cursor: pointer; }
.btn.ghost { background: #f1f5f9; color: #374151; }
.btn.primary { background: #2563eb; color: #fff; }
.directory-button:hover .directory-count,
.directory-group.active .directory-count {
  background: rgba(255, 255, 255, 0.18);
  color: #ffffff;
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

.sidebar-footer {
  margin-top: auto;
  padding: 0.45rem 0.2rem 0;
  border-top: 1px solid rgba(226, 232, 240, 0.82);
}
.sidebar-footer span {
  display: block;
  color: #64748b;
  font-size: 0.66rem;
  line-height: 1.55;

/* 新建目录模态 */
/* 新建目录模态 */
}

@media (max-width: 768px) {
  .smart-sidebar-shell {
    display: none;
  }
}

</style>