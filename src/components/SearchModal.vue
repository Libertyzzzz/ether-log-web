<script setup lang="ts">
import { ref, watch } from 'vue'
import { Search, FileText, CornerDownLeft, Command, Loader2 } from 'lucide-vue-next'
import type { ArticleListItem } from '../types/blog'
import { searchArticles } from '../api'

const props = defineProps<{
  show: boolean
  articles: ArticleListItem[]
}>()

const emit = defineEmits<{
  close: []
  select: [article: ArticleListItem]
}>()

const searchQuery = ref('')
const searchInput = ref<HTMLInputElement | null>(null)
const selectedIndex = ref(0)
const results = ref<ArticleListItem[]>([])
const isLoading = ref(false)
let searchTimer: number | null = null

const performSearch = async (query: string) => {
  if (!query.trim()) {
    results.value = []
    return
  }

  // 1. 开启加载状态
  isLoading.value = true

  try {
    results.value = await searchArticles(query)
    selectedIndex.value = 0
  } catch (error) {
    console.error('即时搜索失败:', error)
    // 报错时清空结果或保持不变
    results.value = []
  } finally {
    isLoading.value = false
  }
}

watch(searchQuery, (newQuery) => {
  // 3. 实现防抖逻辑：用户停止输入 300ms 后才执行搜索
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => {
    performSearch(newQuery)
  }, 300)
})

watch(() => props.show, (isShowing) => {
  if (isShowing) {
    searchQuery.value = ''
    setTimeout(() => searchInput.value?.focus(), 50)
  }
})

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectedIndex.value = (selectedIndex.value + 1) % results.value.length
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectedIndex.value = (selectedIndex.value - 1 + results.value.length) % results.value.length
  }
  if (e.key === 'Enter' && results.value[selectedIndex.value]) {
    emit('select', results.value[selectedIndex.value])
  }
}
</script>

<template>
  <Transition name="search-transition">
    <div v-if="show" class="search-overlay" @click.self="emit('close')">
      <div class="search-container" @keydown="handleKeyDown">
        <div class="search-input-wrapper">
          <Search :size="20" class="search-icon" />
          <input
            ref="searchInput"
            v-model="searchQuery"
            type="text"
            placeholder="搜索文章、内容或分类..."
            class="search-input"
          />
          <Loader2 v-if="isLoading" :size="18" class="animate-spin loading-icon" />
          <div class="search-close" @click="emit('close')">
            <kbd>ESC</kbd>
          </div>
        </div>

        <div v-if="results.length > 0" class="search-results">
          <div
            v-for="(item, index) in results"
            :key="item.id"
            :class="['result-item', { active: index === selectedIndex }]"
            @mouseenter="selectedIndex = index"
            @click="emit('select', item)"
          >
            <FileText :size="18" class="item-icon" />
            <div class="item-info">
              <span class="item-title">{{ item.title }}</span>
              <span class="item-desc">{{ item.summary || '无内容摘要' }}</span>
            </div>
            <CornerDownLeft :size="14" class="enter-icon" />
          </div>
        </div>

        <div v-else-if="searchQuery" class="search-empty">
          <p>没有找到与 "{{ searchQuery }}" 相关的结果</p>
        </div>

        <div class="search-footer">
          <div class="footer-tip">
            <span><Command :size="12" /> K</span> 唤起
          </div>
          <div class="footer-tip">按上下键选择，回车确认</div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.search-overlay {
  position: fixed; inset: 0; z-index: 2000;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(8px);
  display: flex; justify-content: center; padding-top: 15vh;
}

.search-container {
  width: min(600px, 90vw); max-height: 70vh;
  background: white; border-radius: 1.25rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  overflow: hidden; display: flex; flex-direction: column;
  border: 1px solid rgba(226, 232, 240, 0.8);
}

.search-input-wrapper {
  display: flex; align-items: center; padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #f1f5f9;
}

.search-icon { color: #94a3b8; margin-right: 1rem; }
.search-input {
  flex: 1; border: none; outline: none; font-size: 1.1rem;
  color: #0f172a; font-weight: 500;
}
.loading-icon { color: #2563eb; margin: 0 1rem; }

.search-close kbd {
  padding: 2px 6px; border-radius: 4px; background: #f1f5f9;
  font-size: 0.7rem; color: #64748b; border: 1px solid #e2e8f0; cursor: pointer;
}

.search-results { flex: 1; overflow-y: auto; padding: 0.75rem; }
.result-item {
  display: flex; align-items: center; padding: 0.85rem 1rem;
  border-radius: 0.75rem; cursor: pointer; transition: all 0.2s;
  gap: 1rem;
}
.result-item.active { background: #f1f5f9; }
.result-item.active .item-title { color: #2563eb; }
.result-item.active .enter-icon { opacity: 1; }

.item-icon { color: #94a3b8; }
.item-info { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.item-title { font-weight: 700; color: #1e293b; font-size: 0.95rem; }
.item-desc {
  font-size: 0.8rem; color: #64748b;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.enter-icon { color: #cbd5e1; opacity: 0; transition: opacity 0.2s; }

.search-empty { padding: 3rem 1.5rem; text-align: center; color: #64748b; font-size: 0.9rem; }

.search-footer {
  padding: 0.75rem 1.5rem; background: #f8fafc;
  border-top: 1px solid #f1f5f9; display: flex; gap: 1.5rem;
}
.footer-tip {
  display: flex; align-items: center; gap: 0.35rem;
  font-size: 0.72rem; color: #94a3b8; font-weight: 600;
}

/* 动画 */
.search-transition-enter-active, .search-transition-leave-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.search-transition-enter-from, .search-transition-leave-to {
  opacity: 0; transform: scale(0.95) translateY(-20px);
}

/* 移动端适配 */
@media (max-width: 768px) {
  .search-overlay { padding-top: 0; align-items: flex-start; }
  .search-container {
    width: 100vw; max-width: 100vw; height: 100vh; max-height: 100vh;
    border-radius: 0; border: none;
  }
  .search-input-wrapper { padding: 1rem; }
  .search-input { font-size: 1rem; }
  .search-close kbd { display: none; }
  .search-results { padding: 0.5rem; }
  .result-item { padding: 0.75rem 0.75rem; }
  .item-title { font-size: 0.9rem; }
  .item-desc { font-size: 0.75rem; }
  .search-footer { padding: 0.75rem 1rem; }
  .footer-tip { font-size: 0.68rem; }
}
</style>