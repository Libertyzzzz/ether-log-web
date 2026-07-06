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
  X,
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
  { id: 'home', label: '首页', icon: Home },
  { id: 'posts', label: '文章', icon: FileText },
  { id: 'about', label: '关于我', icon: Info },
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
  return mapped.sort((a, b) => a.sortOrder - b.sortOrder)
})

const articleMap = computed(() => new Map(props.articles.map((article) => [article.id, article])))

const sortedDirectories = computed(() =>
  [...directories.value].sort((a, b) => a.sortOrder - b.sortOrder)
)

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
      <!-- Close button -->
      <button class="sidebar-close-btn" type="button" @click="closeSidebar" :aria-label="'关闭侧边栏'">
        <X :size="18" />
      </button>
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
  height: 100%;
  margin: 0;
  padding: 1rem 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 1.05rem;
  border-radius: 0;
  background: #f8fafc;
  color: #0f172a;
  border-right: 1px solid rgba(226, 232, 240, 0.8);
  box-shadow: 2px 0 20px rgba(0, 0, 0, 0.06);
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

/* ── Close button ── */
.sidebar-close-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  width: 2rem;
  height: 2rem;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 0.5rem;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  z-index: 2;
}
.sidebar-close-btn:hover {
  background: rgba(0, 0, 0, 0.06);
  color: #334155;
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

/* ── Mobile / Tablet: full-height drawer ── */
@media (max-width: 1024px) {
  .smart-sidebar-shell {
    top: 0;
    width: 100%;
    z-index: 1210;
    pointer-events: none;
  }
  .smart-sidebar-shell.open {
    pointer-events: auto;
  }
  .smart-sidebar-shell.mobile .sidebar-hover-bridge {
    display: none;
  }
  .sidebar-hotspot {
    top: 0.75rem;
    bottom: auto;
    left: 0.5rem;
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 0.5rem;
    background: rgba(255, 255, 255, 0.92);
    border: 1px solid rgba(226, 232, 240, 0.7);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1220;
  }
  .sidebar-hotspot span {
    position: static;
    width: 1.1rem;
    height: 0.12rem;
    border-radius: 999px;
    background: #64748b;
    transform: none;
    box-shadow: 0 -0.28rem 0 #64748b, 0 0.28rem 0 #64748b;
  }
  .smart-sidebar-shell.open .sidebar-hotspot {
    opacity: 0;
    pointer-events: none;
  }
  .smart-sidebar {
    width: 80%;
    max-width: 320px;
    height: 100%;
    border-radius: 0 0.75rem 0.75rem 0;
    box-shadow: 4px 0 30px rgba(0, 0, 0, 0.15);
    padding-top: 2.5rem;
  }
  .sidebar-close-btn {
    top: 0.5rem;
    right: 0.5rem;
  }
}

</style>