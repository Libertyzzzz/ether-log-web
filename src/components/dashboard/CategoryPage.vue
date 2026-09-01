<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  Folder, Plus, Search, Trash2, Pencil, ChevronLeft, ChevronRight,
  ArrowLeft, GripVertical, FileText, X, Check
} from 'lucide-vue-next'
import {
  fetchCategoriesPage,
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  isForbiddenError,
} from '../../api'
import type { Category } from '../../types/blog'
import { toast } from '../../utils/toast'
import AppConfirmDialog from '../AppConfirmDialog.vue'

const emit = defineEmits<{
  back: []
}>()

const loading = ref(false)
const allItems = ref<Category[]>([])
const totalRecords = ref(0)
const currentPage = ref(1)
const pageSize = 10
const searchQuery = ref('')

const showAddModal = ref(false)
const showEditModal = ref(false)
const deletingItem = ref<{ show: boolean; item: Category | null }>({ show: false, item: null })

const formData = ref({
  id: 0,
  name: '',
  sort: 0,
})

let searchTimer: ReturnType<typeof setTimeout> | null = null

async function loadData() {
  loading.value = true
  const params: any = {
    pageNum: currentPage.value,
    pageSize,
  }
  const keyword = searchQuery.value.trim()
  if (keyword) params.keyword = keyword
  try {
    const result = await fetchCategoriesPage(params)
    if (result.records.length || result.total > 0) {
      allItems.value = result.records
      totalRecords.value = result.total
    } else {
      const list = await fetchCategories()
      allItems.value = list.sort((a, b) => (a.sort || 0) - (b.sort || 0))
      totalRecords.value = list.length
    }
  } catch (e) {
    if (!isForbiddenError(e)) {
      allItems.value = []
      totalRecords.value = 0
    }
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

const totalPages = computed(() => Math.max(1, Math.ceil(totalRecords.value / pageSize)))
const visiblePages = computed(() => {
  const total = totalPages.value
  const cur = currentPage.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | 'ellipsis')[] = [1]
  if (cur > 3) pages.push('ellipsis')
  const start = Math.max(2, cur - 1)
  const end = Math.min(total - 1, cur + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  if (cur < total - 2) pages.push('ellipsis')
  pages.push(total)
  return pages
})

function goToPage(p: number) {
  if (p >= 1 && p <= totalPages.value) {
    currentPage.value = p
    loadData()
  }
}

onMounted(() => {
  loadData()
})

const maxSort = computed(() => {
  if (!allItems.value.length) return 0
  return Math.max(...allItems.value.map((c) => c.sort || 0))
})

function openAddModal() {
  formData.value = {
    id: 0,
    name: '',
    sort: maxSort.value + 1,
  }
  showAddModal.value = true
}

function closeAddModal() {
  showAddModal.value = false
}

async function handleCreate() {
  if (!formData.value.name.trim()) {
    toast('请输入分类名称', 'error')
    return
  }
  try {
    await createCategory({
      name: formData.value.name.trim(),
      sort: formData.value.sort,
    })
    toast('分类创建成功', 'success')
    closeAddModal()
    currentPage.value = 1
    loadData()
  } catch (e) {
    if (!isForbiddenError(e)) toast('创建分类失败', 'error')
  }
}

function openEditModal(item: Category) {
  formData.value = {
    id: item.id,
    name: item.name,
    sort: item.sort ?? 0,
  }
  showEditModal.value = true
}

function closeEditModal() {
  showEditModal.value = false
}

async function handleUpdate() {
  if (!formData.value.name.trim()) {
    toast('请输入分类名称', 'error')
    return
  }
  if (!formData.value.id) return
  try {
    await updateCategory(formData.value.id, {
      name: formData.value.name.trim(),
      sort: formData.value.sort,
    })
    toast('分类更新成功', 'success')
    closeEditModal()
    loadData()
  } catch (e) {
    if (!isForbiddenError(e)) toast('更新分类失败', 'error')
  }
}

function confirmDelete(item: Category) {
  deletingItem.value = { show: true, item }
}

async function handleDelete() {
  const item = deletingItem.value.item
  if (!item) { deletingItem.value.show = false; return }
  try {
    await deleteCategory(item.id)
    toast('分类已删除', 'success')
    loadData()
  } catch (e) {
    if (!isForbiddenError(e)) toast('删除失败，请稍后重试', 'error')
  } finally {
    deletingItem.value.show = false
  }
}
</script>

<template>
  <div class="sys-page">
    <div class="sys-hero">
      <div class="sys-hero-bg-wrap">
        <div class="sys-hero-bg">
          <div class="sys-orb sys-orb-1"></div>
          <div class="sys-orb sys-orb-2"></div>
        </div>
        <div class="sys-hero-inner">
          <div class="sys-hero-left">
            <button type="button" class="sys-back-btn" aria-label="返回" @click="emit('back')">
              <ArrowLeft :size="18" />
            </button>
            <div class="sys-hero-icon" style="background:rgba(34,197,94,0.12);border-color:rgba(34,197,94,0.2);color:#4ade80">
              <Folder :size="22" />
            </div>
            <div class="sys-hero-info">
              <h2 class="sys-hero-title">分类管理</h2>
              <p class="sys-hero-sub">组织文章目录结构，配置排序与层级</p>
            </div>
          </div>
          <button type="button" class="sys-btn-new" @click="openAddModal">
            <Plus :size="14" />
            新增分类
          </button>
        </div>
      </div>
    </div>

    <div class="sys-body">
      <div class="sys-stats-grid">
        <div class="sys-stat-card">
          <div class="sys-stat-icon" style="background:rgba(34,197,94,0.1);color:#22c55e">
            <Folder :size="18" />
          </div>
          <div class="sys-stat-label">分类总数</div>
          <div class="sys-stat-value">{{ totalRecords }}</div>
        </div>
        <div class="sys-stat-card">
          <div class="sys-stat-icon" style="background:rgba(99,102,241,0.1);color:#6366f1">
            <FileText :size="18" />
          </div>
          <div class="sys-stat-label">已使用分类</div>
          <div class="sys-stat-value">{{ allItems.filter((c) => (c.articleCount ?? 0) > 0).length }}</div>
        </div>
        <div class="sys-stat-card">
          <div class="sys-stat-icon" style="background:rgba(245,158,11,0.1);color:#f59e0b">
            <GripVertical :size="18" />
          </div>
          <div class="sys-stat-label">最大排序号</div>
          <div class="sys-stat-value">{{ maxSort }}</div>
        </div>
        <div class="sys-stat-card">
          <div class="sys-stat-icon" style="background:rgba(236,72,153,0.1);color:#ec4899">
            <FileText :size="18" />
          </div>
          <div class="sys-stat-label">关联文章数</div>
          <div class="sys-stat-value">{{ allItems.reduce((s, c) => s + (c.articleCount || 0), 0) }}</div>
        </div>
      </div>

      <div class="sys-card">
        <div class="sys-card-header">
          <div class="sys-card-title-row">
            <Folder :size="16" class="sys-card-icon" />
            <h3 class="sys-card-title">分类列表</h3>
          </div>
          <div class="sys-filter-bar">
            <div class="sys-search-wrap">
              <Search :size="13" class="sys-search-icon" />
              <input v-model="searchQuery" class="sys-search-input" type="text" placeholder="搜索分类名称" />
            </div>
          </div>
        </div>

        <div class="sys-table-head" style="grid-template-columns: 80px 1fr 120px 120px 160px;">
          <span>排序号</span>
          <span>分类名称</span>
          <span>别名</span>
          <span>文章数</span>
          <span style="text-align:right">操作</span>
        </div>

        <div v-if="loading" class="sys-empty">加载中...</div>
        <div v-else-if="!allItems.length" class="sys-empty">暂无分类，点击右上角「新增分类」开始创建</div>

        <div v-for="item in allItems" :key="item.id" class="sys-table-row" style="grid-template-columns: 80px 1fr 120px 120px 160px;">
          <span class="sys-row-sort">
            <GripVertical :size="12" />
            #{{ item.sort ?? 0 }}
          </span>
          <div class="sys-cat-info">
            <Folder :size="15" class="sys-cat-icon" />
            <strong class="sys-cat-name">{{ item.name }}</strong>
          </div>
          <span class="sys-row-text">—</span>
          <span class="sys-row-text">{{ item.articleCount ?? 0 }}</span>
          <div class="sys-row-actions" style="justify-content:flex-end">
            <button type="button" class="sys-action-btn edit" @click="openEditModal(item)">
              <Pencil :size="11" /> 编辑
            </button>
            <button type="button" class="sys-action-btn danger" @click="confirmDelete(item)">
              <Trash2 :size="11" />
            </button>
          </div>
        </div>

        <div v-if="totalPages > 1" class="sys-pagination">
          <button type="button" class="sys-page-btn" :disabled="currentPage === 1" @click="goToPage(currentPage - 1)">
            <ChevronLeft :size="14" />
          </button>
          <template v-for="(p, idx) in visiblePages" :key="idx">
            <span v-if="p === 'ellipsis'" class="sys-page-ellipsis">...</span>
            <button
              v-else
              type="button"
              class="sys-page-btn"
              :class="{ active: p === currentPage }"
              @click="goToPage(p)"
            >{{ p }}</button>
          </template>
          <button type="button" class="sys-page-btn" :disabled="currentPage === totalPages" @click="goToPage(currentPage + 1)">
            <ChevronRight :size="14" />
          </button>
          <span class="sys-page-info">共 {{ totalRecords }} 条</span>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="showAddModal" class="sys-modal-overlay" @click.self="closeAddModal">
          <div class="sys-modal">
            <div class="sys-modal-header">
              <h3>新增分类</h3>
              <button type="button" class="sys-modal-close" @click="closeAddModal">
                <X :size="16" />
              </button>
            </div>
            <div class="sys-modal-body">
              <div class="sys-form-stack">
                <div class="sys-form-item">
                  <label class="sys-form-label"><span class="sys-required">*</span> 分类名称</label>
                  <input v-model="formData.name" type="text" placeholder="请输入分类名称，如「技术分享」" />
                </div>
                <div class="sys-form-item">
                  <label class="sys-form-label">排序号</label>
                  <input v-model.number="formData.sort" type="number" placeholder="数字越小越靠前，留空为追加末尾" />
                </div>
                <p class="sys-form-tip">
                  <strong>提示：</strong>建议先查看列表中的最大排序号，新增时使用比最大值大的序号即可追加到末尾。
                </p>
              </div>
            </div>
            <div class="sys-modal-footer">
              <button type="button" class="sys-btn-cancel" @click="closeAddModal">取消</button>
              <button type="button" class="sys-btn-confirm" @click="handleCreate">
                <Check :size="13" /> 确认创建
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="showEditModal" class="sys-modal-overlay" @click.self="closeEditModal">
          <div class="sys-modal">
            <div class="sys-modal-header">
              <h3>编辑分类</h3>
              <button type="button" class="sys-modal-close" @click="closeEditModal">
                <X :size="16" />
              </button>
            </div>
            <div class="sys-modal-body">
              <div class="sys-form-stack">
                <div class="sys-form-item">
                  <label class="sys-form-label"><span class="sys-required">*</span> 分类名称</label>
                  <input v-model="formData.name" type="text" placeholder="请输入分类名称" />
                </div>
                <div class="sys-form-item">
                  <label class="sys-form-label">排序号</label>
                  <input v-model.number="formData.sort" type="number" placeholder="数字越小越靠前" />
                </div>
              </div>
            </div>
            <div class="sys-modal-footer">
              <button type="button" class="sys-btn-cancel" @click="closeEditModal">取消</button>
              <button type="button" class="sys-btn-confirm" @click="handleUpdate">
                <Check :size="13" /> 保存修改
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <AppConfirmDialog
      :show="deletingItem.show"
      title="确认删除"
      :message="'确认删除分类「' + (deletingItem.item?.name || '') + '」？该分类下的文章将被迁移到「通用目录」。'"
      confirm-text="删除"
      cancel-text="取消"
      tone="danger"
      @confirm="handleDelete"
      @cancel="deletingItem.show = false"
    />
  </div>
</template>

<style scoped>
@import '../system-shared.css';

.sys-row-sort {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.78rem;
  color: #6366f1;
  font-weight: 700;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.sys-cat-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}
.sys-cat-icon {
  color: #f59e0b;
  flex-shrink: 0;
}
.sys-cat-name {
  font-size: 0.85rem;
  color: #0f172a;
  font-weight: 700;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
.sys-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(8px);
  display: grid;
  place-items: center;
  padding: 1.5rem;
  animation: fadeIn 0.2s ease;
}
.sys-modal {
  background: white;
  border-radius: 1.25rem;
  width: min(480px, 100%);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.25);
  border: 1px solid rgba(226, 232, 240, 0.8);
  animation: modalIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes modalIn {
  from { opacity: 0; transform: translateY(12px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.sys-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #f1f5f9;
}
.sys-modal-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 800;
  color: #0f172a;
}
.sys-modal-close {
  width: 2rem;
  height: 2rem;
  display: grid;
  place-items: center;
  border-radius: 0.5rem;
  border: none;
  background: #f8fafc;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.15s;
}
.sys-modal-close:hover {
  background: #f1f5f9;
  color: #64748b;
}
.sys-modal-body {
  padding: 1.25rem 1.5rem;
  overflow-y: auto;
  flex: 1;
}
.sys-modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #f1f5f9;
  background: #fafbfc;
}
.sys-btn-cancel {
  padding: 0.5rem 1rem;
  border-radius: 0.6rem;
  border: 1px solid #e2e8f0;
  background: white;
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
}
.sys-btn-cancel:hover {
  background: #f8fafc;
  color: #475569;
}
.sys-btn-confirm {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.5rem 1.1rem;
  border-radius: 0.6rem;
  border: none;
  background: #4f46e5;
  color: white;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s;
}
.sys-btn-confirm:hover {
  background: #4338ca;
}
</style>