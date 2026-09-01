<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  Tag, Plus, Search, Trash2, Pencil, ChevronLeft, ChevronRight,
  ArrowLeft, Hash, X, Check, Palette
} from 'lucide-vue-next'
import {
  fetchTagsPage,
  fetchTags,
  createTag,
  updateTag,
  deleteTag,
  isForbiddenError,
} from '../../api'
import type { Tag as TagType } from '../../types/blog'
import { toast } from '../../utils/toast'
import AppConfirmDialog from '../AppConfirmDialog.vue'

const emit = defineEmits<{
  back: []
}>()

const loading = ref(false)
const allItems = ref<TagType[]>([])
const totalRecords = ref(0)
const currentPage = ref(1)
const pageSize = 24
const searchQuery = ref('')

const showAddModal = ref(false)
const showEditModal = ref(false)
const deletingItem = ref<{ show: boolean; item: TagType | null }>({ show: false, item: null })

const formData = ref({
  id: 0,
  name: '',
  color: '#7c3aed',
})

const presetColors = [
  '#7c3aed', '#6366f1', '#3b82f6', '#0ea5e9', '#14b8a6',
  '#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444',
  '#ec4899', '#f43f5e', '#64748b', '#0f172a',
]

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
    const result = await fetchTagsPage(params)
    if (result.records.length || result.total > 0) {
      allItems.value = result.records
      totalRecords.value = result.total
    } else {
      const list = await fetchTags()
      allItems.value = list
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

const colorUsage = computed(() => {
  const map = new Map<string, number>()
  for (const t of allItems.value) {
    const c = t.color || '#94a3b8'
    map.set(c, (map.get(c) || 0) + 1)
  }
  return map
})

function openAddModal() {
  formData.value = {
    id: 0,
    name: '',
    color: presetColors[Math.floor(Math.random() * presetColors.length)],
  }
  showAddModal.value = true
}

function closeAddModal() {
  showAddModal.value = false
}

async function handleCreate() {
  if (!formData.value.name.trim()) {
    toast('请输入标签名称', 'error')
    return
  }
  try {
    await createTag({
      name: formData.value.name.trim(),
      color: formData.value.color,
    })
    toast('标签创建成功', 'success')
    closeAddModal()
    currentPage.value = 1
    loadData()
  } catch (e) {
    if (!isForbiddenError(e)) toast('创建标签失败', 'error')
  }
}

function openEditModal(item: TagType) {
  formData.value = {
    id: item.id,
    name: item.name,
    color: item.color || '#7c3aed',
  }
  showEditModal.value = true
}

function closeEditModal() {
  showEditModal.value = false
}

async function handleUpdate() {
  if (!formData.value.name.trim()) {
    toast('请输入标签名称', 'error')
    return
  }
  if (!formData.value.id) return
  try {
    await updateTag(formData.value.id, {
      name: formData.value.name.trim(),
      color: formData.value.color,
    })
    toast('标签更新成功', 'success')
    closeEditModal()
    loadData()
  } catch (e) {
    if (!isForbiddenError(e)) toast('更新标签失败', 'error')
  }
}

function confirmDelete(item: TagType) {
  deletingItem.value = { show: true, item }
}

async function handleDelete() {
  const item = deletingItem.value.item
  if (!item) { deletingItem.value.show = false; return }
  try {
    await deleteTag(item.id)
    toast('标签已删除', 'success')
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
            <div class="sys-hero-icon" style="background:rgba(168,85,247,0.12);border-color:rgba(168,85,247,0.2);color:#c084fc">
              <Tag :size="22" />
            </div>
            <div class="sys-hero-info">
              <h2 class="sys-hero-title">标签管理</h2>
              <p class="sys-hero-sub">自定义标签颜色，丰富文章卡片展示</p>
            </div>
          </div>
          <button type="button" class="sys-btn-new" @click="openAddModal">
            <Plus :size="14" />
            新增标签
          </button>
        </div>
      </div>
    </div>

    <div class="sys-body">
      <div class="sys-stats-grid">
        <div class="sys-stat-card">
          <div class="sys-stat-icon" style="background:rgba(168,85,247,0.1);color:#a855f7">
            <Hash :size="18" />
          </div>
          <div class="sys-stat-label">标签总数</div>
          <div class="sys-stat-value">{{ totalRecords }}</div>
        </div>
        <div class="sys-stat-card">
          <div class="sys-stat-icon" style="background:rgba(236,72,153,0.1);color:#ec4899">
            <Palette :size="18" />
          </div>
          <div class="sys-stat-label">颜色种类</div>
          <div class="sys-stat-value">{{ colorUsage.size }}</div>
        </div>
        <div class="sys-stat-card">
          <div class="sys-stat-icon" style="background:rgba(14,165,233,0.1);color:#0ea5e9">
            <Tag :size="18" />
          </div>
          <div class="sys-stat-label">本月新增</div>
          <div class="sys-stat-value">0</div>
        </div>
        <div class="sys-stat-card">
          <div class="sys-stat-icon" style="background:rgba(34,197,94,0.1);color:#22c55e">
            <Tag :size="18" />
          </div>
          <div class="sys-stat-label">高频标签</div>
          <div class="sys-stat-value">{{ colorUsage.size > 0 ? Math.max(...colorUsage.values()) : 0 }}</div>
        </div>
      </div>

      <div class="sys-card">
        <div class="sys-card-header">
          <div class="sys-card-title-row">
            <Tag :size="16" class="sys-card-icon" />
            <h3 class="sys-card-title">标签列表</h3>
          </div>
          <div class="sys-filter-bar">
            <div class="sys-search-wrap">
              <Search :size="13" class="sys-search-icon" />
              <input v-model="searchQuery" class="sys-search-input" type="text" placeholder="搜索标签名称" />
            </div>
          </div>
        </div>

        <div v-if="loading" class="sys-empty">加载中...</div>
        <div v-else-if="!allItems.length" class="sys-empty">暂无标签，点击右上角「新增标签」开始创建</div>

        <div class="tag-cloud-grid">
          <div v-for="item in allItems" :key="item.id" class="tag-card" :style="{'--tag-color': item.color || '#7c3aed'}">
            <div class="tag-card-top">
              <span class="tag-chip">
                <Hash :size="11" />
                {{ item.name }}
              </span>
              <div class="tag-card-actions">
                <button type="button" class="tag-action edit" title="编辑" @click="openEditModal(item)">
                  <Pencil :size="11" />
                </button>
                <button type="button" class="tag-action delete" title="删除" @click="confirmDelete(item)">
                  <Trash2 :size="11" />
                </button>
              </div>
            </div>
            <div class="tag-card-meta">
              <span class="tag-meta-item">
                <Palette :size="10" />
                #{{ item.id }}
              </span>
              <span v-if="item.createTime" class="tag-meta-item">{{ item.createTime.split(' ')[0] }}</span>
            </div>
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
              <h3>新增标签</h3>
              <button type="button" class="sys-modal-close" @click="closeAddModal">
                <X :size="16" />
              </button>
            </div>
            <div class="sys-modal-body">
              <div class="sys-form-stack">
                <div class="sys-form-item">
                  <label class="sys-form-label"><span class="sys-required">*</span> 标签名称</label>
                  <input v-model="formData.name" type="text" placeholder="请输入标签名，如「Vue3」" />
                </div>
                <div class="sys-form-item">
                  <label class="sys-form-label">标签颜色</label>
                  <div class="color-picker-wrap">
                    <div class="color-preview" :style="{background: formData.color}">
                      <Palette :size="16" />
                    </div>
                    <input v-model="formData.color" type="color" class="sys-color-input" />
                  </div>
                  <div class="preset-colors">
                    <button
                      v-for="c in presetColors"
                      :key="c"
                      type="button"
                      class="preset-color"
                      :class="{ active: formData.color === c }"
                      :style="{background: c}"
                      @click="formData.color = c"
                    ></button>
                  </div>
                </div>
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
              <h3>编辑标签</h3>
              <button type="button" class="sys-modal-close" @click="closeEditModal">
                <X :size="16" />
              </button>
            </div>
            <div class="sys-modal-body">
              <div class="sys-form-stack">
                <div class="sys-form-item">
                  <label class="sys-form-label"><span class="sys-required">*</span> 标签名称</label>
                  <input v-model="formData.name" type="text" placeholder="请输入标签名称" />
                </div>
                <div class="sys-form-item">
                  <label class="sys-form-label">标签颜色</label>
                  <div class="color-picker-wrap">
                    <div class="color-preview" :style="{background: formData.color}">
                      <Palette :size="16" />
                    </div>
                    <input v-model="formData.color" type="color" class="sys-color-input" />
                  </div>
                  <div class="preset-colors">
                    <button
                      v-for="c in presetColors"
                      :key="c"
                      type="button"
                      class="preset-color"
                      :class="{ active: formData.color === c }"
                      :style="{background: c}"
                      @click="formData.color = c"
                    ></button>
                  </div>
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
      :message="'确认删除标签「' + (deletingItem.item?.name || '') + '」？关联文章中的该标签会被一并解除。'"
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

.tag-cloud-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.75rem;
  padding: 0.25rem 0;
}
.tag-card {
  padding: 0.85rem 0.95rem;
  border-radius: 0.9rem;
  border: 1px solid #e2e8f0;
  background: white;
  transition: all 0.18s ease;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  position: relative;
  overflow: hidden;
}
.tag-card::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  background: var(--tag-color);
  opacity: 0.75;
}
.tag-card:hover {
  border-color: color-mix(in srgb, var(--tag-color) 35%, #e2e8f0);
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06);
  transform: translateY(-1px);
}
.tag-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding-left: 0.35rem;
}
.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.28rem 0.65rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--tag-color) 12%, white);
  color: var(--tag-color);
  font-size: 0.78rem;
  font-weight: 750;
  border: 1px solid color-mix(in srgb, var(--tag-color) 20%, #e2e8f0);
  max-width: 70%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.tag-card-actions {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
}
.tag-action {
  width: 1.65rem;
  height: 1.65rem;
  display: grid;
  place-items: center;
  border-radius: 0.45rem;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
}
.tag-action.edit {
  background: rgba(99, 102, 241, 0.08);
  color: #6366f1;
}
.tag-action.edit:hover {
  background: rgba(99, 102, 241, 0.15);
}
.tag-action.delete {
  background: rgba(248, 113, 113, 0.08);
  color: #f87171;
}
.tag-action.delete:hover {
  background: rgba(248, 113, 113, 0.15);
}
.tag-card-meta {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding-left: 0.35rem;
}
.tag-meta-item {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.65rem;
  color: #94a3b8;
  font-weight: 550;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.color-picker-wrap {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}
.color-preview {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.65rem;
  display: grid;
  place-items: center;
  color: white;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.2), 0 2px 6px rgba(15,23,42,0.1);
  flex-shrink: 0;
}
.sys-color-input {
  width: 3rem;
  height: 2.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.6rem;
  padding: 0.2rem;
  cursor: pointer;
  background: #f8fafc;
}
.preset-colors {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.6rem;
}
.preset-color {
  width: 1.65rem;
  height: 1.65rem;
  border-radius: 999px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 0.15s, border-color 0.15s;
  box-shadow: 0 1px 3px rgba(15,23,42,0.1);
}
.preset-color:hover {
  transform: scale(1.12);
}
.preset-color.active {
  border-color: #0f172a;
  transform: scale(1.05);
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