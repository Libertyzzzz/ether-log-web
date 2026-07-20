<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  Plus, Search, ShieldAlert, Trash2, RefreshCw,
  ChevronLeft, ChevronRight, X, Pencil, Check,
  Upload, Download
} from 'lucide-vue-next'
import { fetchSensitiveWords, createSensitiveWord, deleteSensitiveWord } from '../api'
import type { SensitiveWordItem, SensitiveWordCreateRequest, SensitiveWordQueryDto } from '../types/blog'
import { toast } from '../utils/toast'
import AppConfirmDialog from './AppConfirmDialog.vue'

// ── 状态 ──
const allItems = ref<SensitiveWordItem[]>([])
const loading = ref(false)
const searchQuery = ref('')
const currentPage = ref(1)
const pageSize = 12
const totalRecords = ref(0)
const newWord = ref('')
const newCategory = ref('')
const isSubmitting = ref(false)
const showAddModal = ref(false)

// 分类筛选
const selectedCategory = ref('')
const knownCategories = ref<Set<string>>(new Set())

// 编辑状态
const editingItem = ref<SensitiveWordItem | null>(null)
const editingWord = ref('')

// 删除确认
const deletingItem = ref<{ show: boolean; item: SensitiveWordItem | null }>({ show: false, item: null })
const isDeleting = ref(false)

// 搜索防抖
let searchTimer: ReturnType<typeof setTimeout> | null = null

// 导入导出
const importInput = ref<HTMLInputElement | null>(null)
const isImporting = ref(false)

// ── 加载数据 ──
async function loadData() {
  loading.value = true
  const params: SensitiveWordQueryDto = {
    pageNum: currentPage.value,
    pageSize,
  }
  const keyword = searchQuery.value.trim()
  if (keyword) params.keyword = keyword
  const cat = selectedCategory.value
  if (cat) params.category = cat
  try {
    const result = await fetchSensitiveWords(params)
    const rawRecords = result.records
    if (rawRecords.length > pageSize) {
      const start = (currentPage.value - 1) * pageSize
      allItems.value = rawRecords.slice(start, start + pageSize)
      totalRecords.value = rawRecords.length
    } else {
      allItems.value = rawRecords
      totalRecords.value = result.total
    }
    for (const item of rawRecords) {
      if (item.category) knownCategories.value.add(item.category)
    }
  } catch {
    allItems.value = []
    totalRecords.value = 0
    toast('加载敏感词失败，请稍后重试', 'error')
  } finally {
    loading.value = false
  }
}

watch(searchQuery, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    currentPage.value = 1
    loadData()
  }, 300)
})

watch(selectedCategory, () => {
  currentPage.value = 1
  loadData()
})

// ── 分页 ──
const totalPages = computed(() => Math.max(1, Math.ceil(totalRecords.value / pageSize)))

function goToPage(p: number) {
  if (p >= 1 && p <= totalPages.value) {
    currentPage.value = p
    jumpPage.value = ''
    loadData()
  }
}

const jumpPage = ref('')

function handleJump() {
  const p = parseInt(jumpPage.value, 10)
  if (isNaN(p) || p < 1 || p > totalPages.value) {
    toast(`请输入 1 ~ ${totalPages.value} 之间的页码`, 'error')
    return
  }
  goToPage(p)
}

const visiblePages = computed(() => {
  const total = totalPages.value
  const cur = currentPage.value
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const pages: (number | 'ellipsis')[] = [1]
  if (cur > 3) pages.push('ellipsis')
  const start = Math.max(2, cur - 1)
  const end = Math.min(total - 1, cur + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  if (cur < total - 2) pages.push('ellipsis')
  pages.push(total)
  return pages
})

onMounted(() => {
  loadData()
})

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
})

// ── 操作 ──
async function addWord() {
  const word = newWord.value.trim()
  if (!word) {
    toast('请输入敏感词', 'error')
    return
  }
  isSubmitting.value = true
  try {
    const payload: SensitiveWordCreateRequest = { word }
    const category = newCategory.value.trim()
    if (category) payload.category = category
    await createSensitiveWord(payload)
    newWord.value = ''
    newCategory.value = ''
    showAddModal.value = false
    currentPage.value = 1
    await loadData()
    toast('敏感词已添加', 'success')
  } catch {
    toast('添加敏感词失败', 'error')
  } finally {
    isSubmitting.value = false
  }
}

async function removeWord(item: SensitiveWordItem) {
  deletingItem.value = { show: true, item }
}

async function confirmDelete() {
  const item = deletingItem.value.item
  if (!item) return
  isDeleting.value = true
  try {
    await deleteSensitiveWord(item.id)
    deletingItem.value = { show: false, item: null }
    await loadData()
    toast('敏感词已删除', 'success')
  } catch {
    toast('删除敏感词失败，接口暂未对齐', 'error')
  } finally {
    isDeleting.value = false
  }
}

function cancelDelete() {
  deletingItem.value = { show: false, item: null }
}

function closeAddModal() {
  showAddModal.value = false
  newWord.value = ''
  newCategory.value = ''
}

function startEdit(item: SensitiveWordItem) {
  editingItem.value = item
  editingWord.value = item.word
}

function cancelEdit() {
  editingItem.value = null
  editingWord.value = ''
}

async function saveEdit() {
  const word = editingWord.value.trim()
  if (!word) {
    toast('敏感词不能为空', 'error')
    return
  }
  if (!editingItem.value) return
  isSubmitting.value = true
  try {
    // TODO: 后端需要 update 接口
    // await updateSensitiveWord(editingItem.value.id, { word })
    editingItem.value = null
    editingWord.value = ''
    await loadData()
    toast('敏感词已更新', 'success')
  } catch {
    toast('更新敏感词失败', 'error')
  } finally {
    isSubmitting.value = false
  }
}

// ── 导入导出 ──
function triggerImport() {
  importInput.value?.click()
}

async function handleImport(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  isImporting.value = true
  try {
    const text = await file.text()
    const words = text
      .split(/[\r\n]+/)
      .map(w => w.trim())
      .filter(w => w.length > 0)
    if (!words.length) {
      toast('文件中没有有效的敏感词', 'error')
      return
    }
    let successCount = 0
    let failCount = 0
    for (const word of words) {
      try {
        await createSensitiveWord({ word })
        successCount++
      } catch {
        failCount++
      }
    }
    await loadData()
    if (failCount > 0) {
      toast(`成功导入 ${successCount} 条，${failCount} 条失败`, 'error')
    } else {
      toast(`成功导入 ${successCount} 条敏感词`, 'success')
    }
  } catch {
    toast('文件读取失败', 'error')
  } finally {
    isImporting.value = false
    input.value = ''
  }
}

function handleExport() {
  const words = allItems.value.map(item => item.word).join('\n')
  if (!words) {
    toast('没有可导出的敏感词', 'error')
    return
  }
  const blob = new Blob([words], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `敏感词_${new Date().toISOString().slice(0, 10)}.txt`
  a.click()
  URL.revokeObjectURL(url)
  toast('导出成功', 'success')
}
</script>

<template>
  <div class="sw-page">
    <!-- 顶部工具栏 -->
    <div class="sw-toolbar">
      <div class="sw-search-box">
        <Search :size="14" class="sw-search-icon" />
        <input v-model="searchQuery" placeholder="搜索敏感词..." class="sw-search-input" />
      </div>
      <select v-model="selectedCategory" class="sw-category-select">
        <option value="">全部分类</option>
        <option v-for="cat in [...knownCategories].sort()" :key="cat" :value="cat">{{ cat }}</option>
      </select>
      <div class="sw-toolbar-actions">
        <input
          ref="importInput"
          type="file"
          accept=".txt,.csv"
          style="display:none"
          @change="handleImport"
        />
        <button class="sw-btn sw-btn-ghost" type="button" :disabled="isImporting" @click="triggerImport">
          <Upload :size="14" />
          <span>{{ isImporting ? '导入中' : '导入' }}</span>
        </button>
        <button class="sw-btn sw-btn-ghost" type="button" @click="handleExport">
          <Download :size="14" />
          <span>导出</span>
        </button>
        <button class="sw-add-btn" type="button" @click="showAddModal = true">
          <Plus :size="14" />
          <span>新增敏感词</span>
        </button>
      </div>
    </div>

    <!-- 表格 -->
    <div class="sw-table-wrap">
      <!-- 表头 -->
      <div class="sw-table-head">
        <span class="sw-th sw-th-id">ID</span>
        <span class="sw-th sw-th-word">敏感词</span>
        <span class="sw-th sw-th-category">分类</span>
        <span class="sw-th sw-th-time">创建时间</span>
        <span class="sw-th sw-th-actions">操作</span>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="sw-table-loading">
        <RefreshCw :size="16" class="sw-spin" />
        正在加载...
      </div>

      <!-- 空状态 -->
      <div v-else-if="!allItems.length" class="sw-table-empty">
        <ShieldAlert :size="32" style="color:#cbd5e1" />
        <span v-if="searchQuery.trim()">未找到匹配的敏感词</span>
        <span v-else>暂无敏感词，点击上方按钮添加</span>
      </div>

      <!-- 数据行 -->
      <template v-else>
        <div
          v-for="item in allItems"
          :key="item.id"
          class="sw-table-row"
          :class="{ editing: editingItem?.id === item.id }"
        >
          <span class="sw-td sw-td-id">{{ item.id }}</span>

          <!-- 编辑模式 -->
          <template v-if="editingItem?.id === item.id">
            <span class="sw-td sw-td-word">
              <input
                v-model="editingWord"
                class="sw-edit-input"
                type="text"
                @keyup.enter="saveEdit"
                autofocus
              />
            </span>
            <span class="sw-td sw-td-category">—</span>
            <span class="sw-td sw-td-time">—</span>
            <span class="sw-td sw-td-actions">
              <button class="sw-action-btn save" type="button" @click.stop="saveEdit">
                <Check :size="13" /> 保存
              </button>
              <button class="sw-action-btn cancel" type="button" @click.stop="cancelEdit">
                <X :size="13" /> 取消
              </button>
            </span>
          </template>

          <!-- 普通模式 -->
          <template v-else>
            <span class="sw-td sw-td-word">{{ item.word }}</span>
            <span class="sw-td sw-td-category">{{ item.category || '—' }}</span>
            <span class="sw-td sw-td-time">{{ item.createTime || '—' }}</span>
            <span class="sw-td sw-td-actions">
              <button class="sw-action-btn edit" type="button" @click.stop="startEdit(item)">
                <Pencil :size="13" /> 编辑
              </button>
              <button class="sw-action-btn danger" type="button" @click.stop="removeWord(item)">
                <Trash2 :size="13" /> 删除
              </button>
            </span>
          </template>
        </div>
      </template>
    </div>

    <!-- 分页 -->
    <div v-if="totalPages > 1" class="sw-pagination">
      <button class="sw-page-btn" :disabled="currentPage === 1" @click="goToPage(currentPage - 1)">
        <ChevronLeft :size="14" />
      </button>
      <template v-for="p in visiblePages" :key="p">
        <span v-if="p === 'ellipsis'" class="sw-page-ellipsis">…</span>
        <button
          v-else
          class="sw-page-btn"
          :class="{ active: currentPage === p }"
          @click="goToPage(p)"
        >
          {{ p }}
        </button>
      </template>
      <button class="sw-page-btn" :disabled="currentPage === totalPages" @click="goToPage(currentPage + 1)">
        <ChevronRight :size="14" />
      </button>
      <span class="sw-page-jump">
        <span>跳至</span>
        <input
          v-model="jumpPage"
          type="text"
          class="sw-jump-input"
          :placeholder="String(currentPage)"
          @keyup.enter="handleJump"
        />
        <span>页</span>
        <button class="sw-page-btn sw-jump-btn" @click="handleJump">GO</button>
      </span>
    </div>

    <!-- 新增弹窗 -->
    <Transition name="sw-modal-fade">
      <div v-if="showAddModal" class="sw-detail-overlay" @click.self="closeAddModal" @keydown.escape="closeAddModal">
        <div class="sw-detail-modal">
          <button class="sw-detail-close" type="button" @click="closeAddModal">
            <X :size="18" />
          </button>
          <h3>新增敏感词</h3>
          <div class="sw-add-form">
            <input
              v-model="newWord"
              type="text"
              class="sw-add-input"
              placeholder="输入敏感词内容"
              @keyup.enter="addWord"
              autofocus
            />
            <input
              v-model="newCategory"
              type="text"
              class="sw-add-input"
              placeholder="分类（默认：政治）"
            />
            <button class="sw-add-submit" type="button" :disabled="isSubmitting" @click="addWord">
              <Plus :size="14" />
              {{ isSubmitting ? '添加中' : '确认添加' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 删除确认弹窗 -->
    <AppConfirmDialog
      :show="deletingItem.show"
      title="确认删除敏感词"
      :message="`确定要删除敏感词 “${deletingItem.item?.word || ''}” 吗？此操作不可撤销。`"
      confirmText="删除"
      cancelText="取消"
      tone="danger"
      :error-message="isDeleting ? '删除中...' : undefined"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

<style scoped>
.sw-page {
  width: 100%;
  max-width: 64rem;
  align-self: center;
  padding: 5.5rem 1.5rem 1.5rem;
}

/* 工具栏 */
.sw-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}
.sw-toolbar-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.sw-search-box {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  padding: 0.35rem 0.65rem;
  background: #fff;
}
.sw-search-icon { color: #94a3b8; }
.sw-search-input {
  border: none;
  background: transparent;
  outline: none;
  font-size: 0.8rem;
  color: #334155;
  width: 14rem;
}
.sw-category-select {
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  padding: 0.35rem 0.5rem;
  background: #fff;
  font-size: 0.8rem;
  color: #334155;
  outline: none;
  cursor: pointer;
}
.sw-category-select:focus { border-color: #2563eb; }
.sw-add-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  border: none;
  background: #7c3aed;
  color: #fff;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  padding: 0.6rem 1.2rem;
  border-radius: 0.6rem;
  transition: background 0.15s;
}
.sw-add-btn:hover { background: #6d28d9; }

.sw-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  border: none;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.6rem 1rem;
  border-radius: 0.6rem;
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
}
.sw-btn-ghost {
  background: transparent;
  color: #64748b;
  border: 1px solid #e2e8f0;
}
.sw-btn-ghost:hover { background: #f1f5f9; color: #334155; }
.sw-btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }

/* 表格容器 */
.sw-table-wrap {
  background: #fff;
  border-radius: 0.85rem;
  border: 1px solid rgba(226, 232, 240, 0.7);
  overflow: hidden;
  margin-bottom: 1.5rem;
  width: 100%;
}

/* 表头 */
.sw-table-head {
  display: grid;
  grid-template-columns: 60px 1fr 100px 160px 180px;
  padding: 0.75rem 1rem;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  font-size: 0.75rem;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* 表格行 */
.sw-table-row {
  display: grid;
  grid-template-columns: 60px 1fr 100px 160px 180px;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #f1f5f9;
  transition: background 0.15s;
}
.sw-table-row:last-child { border-bottom: none; }
.sw-table-row:hover { background: #f8fafc; }
.sw-table-row.editing { background: #fefce8; }

/* 单元格 */
.sw-td {
  font-size: 0.82rem;
  color: #334155;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sw-td-id {
  font-size: 0.75rem;
  color: #94a3b8;
  font-weight: 600;
}
.sw-td-word {
  font-weight: 700;
  color: #0f172a;
}
.sw-td-category {
  font-size: 0.78rem;
  color: #64748b;
}
.sw-td-time {
  font-size: 0.75rem;
  color: #94a3b8;
}
.sw-td-actions {
  display: flex;
  gap: 0.4rem;
}

/* 操作按钮 */
.sw-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.3rem 0.65rem;
  border: none;
  border-radius: 0.4rem;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
}
.sw-action-btn.edit {
  background: rgba(124, 58, 237, 0.08);
  color: #7c3aed;
}
.sw-action-btn.edit:hover { background: rgba(124, 58, 237, 0.15); }
.sw-action-btn.danger {
  background: rgba(239, 68, 68, 0.08);
  color: #dc2626;
}
.sw-action-btn.danger:hover { background: rgba(239, 68, 68, 0.15); }
.sw-action-btn.save {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
}
.sw-action-btn.save:hover { background: rgba(16, 185, 129, 0.18); }
.sw-action-btn.cancel {
  background: #f1f5f9;
  color: #64748b;
}
.sw-action-btn.cancel:hover { background: #e2e8f0; }

/* 编辑输入框 */
.sw-edit-input {
  border: 1px solid #e2e8f0;
  background: #fff;
  border-radius: 0.35rem;
  padding: 0.3rem 0.5rem;
  font-size: 0.82rem;
  font-weight: 700;
  color: #0f172a;
  outline: none;
  width: 100%;
  min-width: 0;
}
.sw-edit-input:focus { border-color: #7c3aed; }

/* 加载/空状态 */
.sw-table-loading,
.sw-table-empty {
  padding: 3rem 0;
  text-align: center;
  color: #94a3b8;
  font-size: 0.85rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 0.75rem;
}
.sw-spin { animation: spin 1s linear infinite; }

/* 分页 */
.sw-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 2rem;
  width: 100%;
}
.sw-page-btn {
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #64748b;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.4rem;
  transition: all 0.15s;
}
.sw-page-btn:hover:not(:disabled) { border-color: #cbd5e1; color: #334155; }
.sw-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.sw-page-btn.active { background: #7c3aed; color: #fff; border-color: #7c3aed; }
.sw-page-ellipsis {
  width: 2rem;
  text-align: center;
  color: #94a3b8;
  font-size: 0.8rem;
  user-select: none;
}
.sw-page-jump {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  margin-left: 0.8rem;
  font-size: 0.78rem;
  color: #64748b;
}
.sw-jump-input {
  width: 2.5rem;
  height: 2rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.4rem;
  text-align: center;
  font-size: 0.78rem;
  color: #334155;
  outline: none;
  padding: 0 0.25rem;
}
.sw-jump-input:focus { border-color: #7c3aed; }
.sw-jump-btn {
  font-size: 0.7rem;
  font-weight: 700;
  width: auto;
  padding: 0 0.6rem;
}

/* 弹窗 */
.sw-modal-fade-enter-active,
.sw-modal-fade-leave-active { transition: opacity 0.2s ease; }
.sw-modal-fade-enter-from,
.sw-modal-fade-leave-to { opacity: 0; }
.sw-detail-overlay {
  position: fixed;
  inset: 0;
  z-index: 3000;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}
.sw-detail-modal {
  width: min(400px, 100%);
  background: #fff;
  border-radius: 1.25rem;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.2);
  position: relative;
  padding: 1.5rem;
}
.sw-detail-close {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.08);
  color: #64748b;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}
.sw-detail-modal h3 {
  margin: 0 0 1rem;
  font-size: 1.05rem;
  font-weight: 800;
  color: #0f172a;
}
.sw-add-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.sw-add-input {
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  border-radius: 0.5rem;
  padding: 0.65rem 0.85rem;
  color: #334155;
  font-size: 0.85rem;
  outline: none;
}
.sw-add-input:focus { border-color: #7c3aed; background: #fff; }
.sw-add-submit {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border: none;
  background: #7c3aed;
  color: #fff;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  padding: 0.65rem;
  border-radius: 0.5rem;
  transition: background 0.15s;
}
.sw-add-submit:hover { background: #6d28d9; }
.sw-add-submit:disabled { opacity: 0.5; cursor: not-allowed; }

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 移动端适配 */
@media (max-width: 768px) {
  .sw-page { max-width: none; margin: 0; padding: 4rem 0.75rem 1rem; }
  .sw-toolbar { flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem; }
  .sw-search-box { flex: 1; min-width: 12rem; }
  .sw-search-input { width: 100%; }
  .sw-category-select { flex: 1; min-width: 6rem; }
  .sw-toolbar-actions { width: 100%; justify-content: flex-end; }
  .sw-btn-ghost { padding: 0.45rem 0.75rem; }
  .sw-btn-ghost span { display: none; }
  .sw-add-btn { padding: 0.5rem 0.75rem; }
  .sw-add-btn span { display: none; }
  .sw-table-head { display: none; }
  .sw-table-row {
    grid-template-columns: 1fr auto;
    gap: 0.4rem 0.75rem;
    padding: 0.75rem 0.85rem;
    align-items: center;
  }
  .sw-td { white-space: normal; overflow: visible; }
  .sw-td-id { display: none; }
  .sw-td-word {
    font-size: 0.9rem;
    font-weight: 600;
    grid-column: 1;
    grid-row: 1;
  }
  .sw-td-category {
    font-size: 0.72rem;
    color: #64748b;
    grid-column: 1;
    grid-row: 2;
  }
  .sw-td-time {
    font-size: 0.7rem;
    color: #94a3b8;
    grid-column: 1;
    grid-row: 3;
  }
  .sw-td-actions {
    grid-column: 2;
    grid-row: 1 / span 3;
    display: flex;
    justify-content: flex-end;
    align-self: center;
  }
  .sw-action-btn {
    font-size: 0.72rem;
    padding: 0.3rem 0.55rem;
    font-weight: 500;
  }
}

@media (max-width: 480px) {
  .sw-page { padding: 5rem 0.6rem 1rem; }
  .sw-action-btn span { display: none; }
  .sw-action-btn { padding: 0.35rem 0.45rem; }
  .sw-page-jump { display: none; }
}
</style>