<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  KeyRound, Plus, Search, Trash2, Pencil, ChevronLeft, ChevronRight,
  ArrowLeft, FolderOpen, FileText, CircleDot, GripVertical
} from 'lucide-vue-next'
import {
  fetchPermissionPage,
  fetchPermissionList,
  createPermission,
  updatePermission,
  deletePermission,
  isForbiddenError,
} from '../../api'
import type { SysPermission } from '../../types/blog'
import { toast } from '../../utils/toast'
import AppConfirmDialog from '../AppConfirmDialog.vue'

defineEmits<{
  back: []
}>()

const loading = ref(false)
const allPermissions = ref<SysPermission[]>([])
const pageRecords = ref<SysPermission[]>([])
const searchQuery = ref('')
const permTypeFilter = ref<number | ''>('')
const statusFilter = ref<number | ''>('')
const currentPage = ref(1)
const pageSize = 10
const totalRecords = ref(0)

const showAddModal = ref(false)
const showEditModal = ref(false)
const deletingItem = ref<{ show: boolean; item: SysPermission | null }>({ show: false, item: null })

const formData = ref({
  id: 0,
  parentId: 0,
  permCode: '',
  permName: '',
  permType: 1 as 1 | 2 | 3,
  path: '',
  component: '',
  icon: '',
  sort: 0,
  visible: 1,
  status: 1,
})

let searchTimer: ReturnType<typeof setTimeout> | null = null

const menuCount = computed(() => allPermissions.value.filter((p) => p.permType === 1).length)
const btnCount = computed(() => allPermissions.value.filter((p) => p.permType === 2).length)
const enabledCount = computed(() => allPermissions.value.filter((p) => (p.status ?? 1) === 1).length)

const filteredPermissions = computed(() => pageRecords.value)

const totalPages = computed(() => Math.max(1, Math.ceil(totalRecords.value / pageSize)))
const visiblePages = computed(() => {
  const total = totalPages.value
  const current = currentPage.value
  const pages: number[] = []
  const range = 2
  for (let i = current - range; i <= current + range; i++) {
    if (i >= 1 && i <= total) pages.push(i)
  }
  return pages
})

async function loadData() {
  loading.value = true
  try {
    const [listResult, pageResult] = await Promise.all([
      fetchPermissionList().catch(() => [] as SysPermission[]),
      fetchPermissionPage(
        currentPage.value,
        pageSize,
        searchQuery.value.trim() || undefined,
        permTypeFilter.value !== '' ? Number(permTypeFilter.value) : undefined,
      ),
    ])
    allPermissions.value = listResult
    pageRecords.value = pageResult.records.filter((p) => {
      if (statusFilter.value === '') return true
      return (p.status ?? 1) === Number(statusFilter.value)
    })
    totalRecords.value = pageResult.total
  } catch (e) {
    if (!isForbiddenError(e)) {
      allPermissions.value = []
      pageRecords.value = []
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
  }, 350)
})

watch([permTypeFilter, statusFilter], () => {
  currentPage.value = 1
  loadData()
})

onMounted(() => {
  loadData()
})

function permTypeLabel(t: number | undefined) {
  if (t === 1) return '菜单'
  if (t === 2) return '按钮'
  if (t === 3) return '接口'
  return '未知'
}

function permTypeClass(t: number | undefined) {
  if (t === 1) return 'type-menu'
  if (t === 2) return 'type-btn'
  if (t === 3) return 'type-api'
  return ''
}

function openAddModal(parentId = 0) {
  formData.value = {
    id: 0,
    parentId,
    permCode: '',
    permName: '',
    permType: parentId === 0 ? 1 : (parentId > 0 && allPermissions.value.find((p) => p.id === parentId)?.permType === 1 ? 1 : 2),
    path: '',
    component: '',
    icon: '',
    sort: 0,
    visible: 1,
    status: 1,
  }
  showAddModal.value = true
}

function closeAddModal() {
  showAddModal.value = false
}

async function handleCreate() {
  if (!formData.value.permCode.trim()) {
    toast('请输入权限编码', 'error')
    return
  }
  if (!formData.value.permName.trim()) {
    toast('请输入权限名称', 'error')
    return
  }
  try {
    await createPermission({
      parentId: formData.value.parentId,
      permCode: formData.value.permCode.trim(),
      permName: formData.value.permName.trim(),
      permType: formData.value.permType,
      path: formData.value.path.trim() || undefined,
      component: formData.value.component.trim() || undefined,
      icon: formData.value.icon.trim() || undefined,
      sort: Number(formData.value.sort) || 0,
      visible: Number(formData.value.visible),
      status: Number(formData.value.status),
    })
    toast('权限创建成功', 'success')
    closeAddModal()
    loadData()
  } catch (e) {
    if (!isForbiddenError(e)) toast('创建权限失败', 'error')
  }
}

function openEditModal(item: SysPermission) {
  formData.value = {
    id: item.id,
    parentId: item.parentId || 0,
    permCode: item.permCode,
    permName: item.permName,
    permType: item.permType,
    path: item.path || '',
    component: item.component || '',
    icon: item.icon || '',
    sort: item.sort || 0,
    visible: item.visible ?? 1,
    status: item.status ?? 1,
  }
  showEditModal.value = true
}

function closeEditModal() {
  showEditModal.value = false
}

async function handleUpdate() {
  try {
    await updatePermission({
      id: formData.value.id,
      parentId: formData.value.parentId,
      permName: formData.value.permName.trim(),
      permType: formData.value.permType,
      path: formData.value.path.trim() || undefined,
      component: formData.value.component.trim() || undefined,
      icon: formData.value.icon.trim() || undefined,
      sort: Number(formData.value.sort) || 0,
      visible: Number(formData.value.visible),
      status: Number(formData.value.status),
    })
    toast('权限信息已更新', 'success')
    closeEditModal()
    loadData()
  } catch (e) {
    if (!isForbiddenError(e)) toast('更新权限失败', 'error')
  }
}

function removeItem(item: SysPermission) {
  deletingItem.value = { show: true, item }
}

async function confirmDelete() {
  const item = deletingItem.value.item
  if (!item) return
  try {
    await deletePermission(item.id)
    deletingItem.value = { show: false, item: null }
    toast('权限已删除', 'success')
    loadData()
  } catch (e) {
    if (!isForbiddenError(e)) toast('删除权限失败', 'error')
  }
}

function getParentName(parentId: number): string {
  if (!parentId) return '顶级菜单'
  const p = allPermissions.value.find((x) => x.id === parentId)
  return p?.permName || '—'
}
</script>

<template>
  <div class="sys-page">
    <div class="sys-hero">
      <div class="sys-hero-bg-wrap">
        <div class="sys-hero-bg" aria-hidden="true">
          <div class="sys-orb sys-orb-1"></div>
          <div class="sys-orb sys-orb-2"></div>
        </div>
        <div class="sys-hero-inner">
          <div class="sys-hero-left">
            <button class="sys-back-btn" type="button" @click="$emit('back')">
              <ArrowLeft :size="18" />
            </button>
            <div class="sys-hero-icon" style="background:rgba(245,158,11,0.12);border-color:rgba(245,158,11,0.2);color:#fcd34d">
              <KeyRound :size="24" />
            </div>
            <div class="sys-hero-info">
              <h1 class="sys-hero-title">权限管理</h1>
              <p class="sys-hero-sub">管理系统菜单、按钮与接口权限配置</p>
            </div>
          </div>
          <button class="sys-btn-new" type="button" @click="openAddModal(0)">
            <Plus :size="15" />
            新增权限
          </button>
        </div>
      </div>
    </div>

    <div class="sys-body">
      <div class="sys-stats-grid">
        <div class="sys-stat-card">
          <div class="sys-stat-icon" style="background:rgba(245,158,11,0.1);color:#f59e0b">
            <KeyRound :size="18" />
          </div>
          <span class="sys-stat-label">权限总数</span>
          <strong class="sys-stat-value">{{ totalRecords }}</strong>
        </div>
        <div class="sys-stat-card">
          <div class="sys-stat-icon" style="background:rgba(99,102,241,0.1);color:#6366f1">
            <FolderOpen :size="18" />
          </div>
          <span class="sys-stat-label">菜单权限</span>
          <strong class="sys-stat-value">{{ menuCount }}</strong>
        </div>
        <div class="sys-stat-card">
          <div class="sys-stat-icon" style="background:rgba(16,185,129,0.1);color:#10b981">
            <FileText :size="18" />
          </div>
          <span class="sys-stat-label">按钮权限</span>
          <strong class="sys-stat-value">{{ btnCount }}</strong>
        </div>
        <div class="sys-stat-card">
          <div class="sys-stat-icon" style="background:rgba(239,68,68,0.1);color:#ef4444">
            <CircleDot :size="18" />
          </div>
          <span class="sys-stat-label">启用权限</span>
          <strong class="sys-stat-value">{{ enabledCount }}</strong>
        </div>
      </div>

      <div class="sys-card">
        <div class="sys-card-header">
          <div class="sys-card-title-row">
            <KeyRound :size="15" class="sys-card-icon" style="color:#f59e0b" />
            <h2 class="sys-card-title">权限列表</h2>
          </div>
          <div class="sys-filter-bar">
            <div class="sys-search-wrap" style="min-width:220px">
              <Search :size="13" class="sys-search-icon" />
              <input
                v-model="searchQuery"
                type="text"
                class="sys-search-input"
                placeholder="搜索权限名/编码/路径..."
              />
            </div>
            <select v-model="permTypeFilter" class="sys-filter-select">
              <option :value="''">全部类型</option>
              <option :value="1">菜单</option>
              <option :value="2">按钮</option>
              <option :value="3">接口</option>
            </select>
            <select v-model="statusFilter" class="sys-filter-select">
              <option :value="''">全部状态</option>
              <option :value="1">启用</option>
              <option :value="0">禁用</option>
            </select>
          </div>
        </div>

        <div class="sys-table-head perm-table-head">
          <span style="width:60px">排序</span>
          <span style="width:220px">权限名称</span>
          <span>权限编码</span>
          <span style="width:100px">类型</span>
          <span style="width:120px">上级</span>
          <span style="width:90px">状态</span>
          <span style="width:220px">操作</span>
        </div>

        <div v-if="loading" class="sys-empty">加载中...</div>
        <div v-else-if="!filteredPermissions.length" class="sys-empty">暂无权限数据</div>

        <div v-for="item in filteredPermissions" :key="item.id" class="sys-table-row perm-table-row">
          <span class="sys-row-sort">
            <GripVertical :size="12" />
            #{{ item.sort ?? 0 }}
          </span>
          <div class="sys-perm-info">
            <FolderOpen v-if="item.permType === 1" :size="15" class="perm-icon type-menu" />
            <FileText v-else-if="item.permType === 2" :size="15" class="perm-icon type-btn" />
            <CircleDot v-else :size="15" class="perm-icon type-api" />
            <div class="sys-perm-meta">
              <strong class="sys-perm-name">{{ item.permName }}</strong>
              <span v-if="item.path" class="sys-perm-path">{{ item.path }}</span>
            </div>
          </div>
          <span class="sys-perm-code">{{ item.permCode }}</span>
          <span class="perm-type-tag" :class="permTypeClass(item.permType)">
            {{ permTypeLabel(item.permType) }}
          </span>
          <span class="sys-row-text">{{ getParentName(item.parentId) }}</span>
          <span class="sys-row-status" :class="(item.status ?? 1) === 1 ? 'active' : 'disabled'">
            {{ (item.status ?? 1) === 1 ? '启用' : '禁用' }}
          </span>
          <div class="sys-row-actions">
            <button type="button" class="sys-action-btn sub" @click="openAddModal(item.id)">
              <Plus :size="11" /> 子权限
            </button>
            <button type="button" class="sys-action-btn edit" @click="openEditModal(item)">
              <Pencil :size="11" /> 编辑
            </button>
            <button v-if="!item.children?.length" type="button" class="sys-action-btn danger" @click="removeItem(item)">
              <Trash2 :size="11" />
            </button>
          </div>
        </div>

        <div v-if="totalRecords > 0" class="sys-pagination-wrap">
          <div class="sys-pagination-info">共 {{ totalRecords }} 条 · 第 {{ currentPage }}/{{ totalPages }} 页</div>
          <div class="sys-pagination">
            <button
              type="button"
              class="sys-page-btn"
              :disabled="currentPage <= 1"
              @click="currentPage > 1 && (currentPage--, loadData())"
            >
              <ChevronLeft :size="14" />
            </button>
            <button
              v-if="visiblePages[0] > 1"
              type="button"
              class="sys-page-btn"
              @click="currentPage = 1; loadData()"
            >1</button>
            <span v-if="visiblePages[0] > 2" class="sys-page-ellipsis">···</span>
            <button
              v-for="p in visiblePages"
              :key="p"
              type="button"
              class="sys-page-btn"
              :class="{ active: p === currentPage }"
              @click="currentPage !== p && (currentPage = p, loadData())"
            >{{ p }}</button>
            <span v-if="visiblePages[visiblePages.length - 1] < totalPages - 1" class="sys-page-ellipsis">···</span>
            <button
              v-if="visiblePages[visiblePages.length - 1] < totalPages"
              type="button"
              class="sys-page-btn"
              @click="currentPage = totalPages; loadData()"
            >{{ totalPages }}</button>
            <button
              type="button"
              class="sys-page-btn"
              :disabled="currentPage >= totalPages"
              @click="currentPage < totalPages && (currentPage++, loadData())"
            >
              <ChevronRight :size="14" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <AppConfirmDialog
      :show="showAddModal"
      title="新增权限"
      confirm-text="创建"
      cancel-text="取消"
      @confirm="handleCreate"
      @cancel="closeAddModal"
    >
      <div class="sys-form-stack">
        <div class="sys-form-row">
          <label class="sys-form-item">
            <span class="sys-form-label">权限编码 <span class="sys-required">*</span></span>
            <input v-model="formData.permCode" type="text" placeholder="如 system:user:add" />
          </label>
          <label class="sys-form-item">
            <span class="sys-form-label">权限名称 <span class="sys-required">*</span></span>
            <input v-model="formData.permName" type="text" placeholder="如 新增用户" />
          </label>
        </div>
        <div class="sys-form-row">
          <label class="sys-form-item">
            <span class="sys-form-label">上级权限</span>
            <select v-model.number="formData.parentId" class="sys-form-select">
              <option :value="0">顶级菜单</option>
              <option
                v-for="p in allPermissions.filter(x => x.permType === 1)"
                :key="p.id"
                :value="p.id"
              >
                {{ p.permName }}
              </option>
            </select>
          </label>
          <label class="sys-form-item">
            <span class="sys-form-label">权限类型</span>
            <select v-model.number="formData.permType" class="sys-form-select">
              <option :value="1">菜单</option>
              <option :value="2">按钮</option>
              <option :value="3">接口</option>
            </select>
          </label>
        </div>
        <div class="sys-form-row">
          <label class="sys-form-item">
            <span class="sys-form-label">路由路径</span>
            <input v-model="formData.path" type="text" placeholder="菜单类型必填，如 /system/user" />
          </label>
          <label class="sys-form-item">
            <span class="sys-form-label">组件路径</span>
            <input v-model="formData.component" type="text" placeholder="如 system/UserPage" />
          </label>
        </div>
        <div class="sys-form-row">
          <label class="sys-form-item">
            <span class="sys-form-label">图标</span>
            <input v-model="formData.icon" type="text" placeholder="Lucide 图标名，如 Users" />
          </label>
          <label class="sys-form-item">
            <span class="sys-form-label">排序</span>
            <input v-model.number="formData.sort" type="number" min="0" placeholder="数字越小越靠前" />
          </label>
        </div>
        <div class="sys-form-row">
          <label class="sys-form-item">
            <span class="sys-form-label">显示状态</span>
            <select v-model.number="formData.visible" class="sys-form-select">
              <option :value="1">显示</option>
              <option :value="0">隐藏</option>
            </select>
          </label>
          <label class="sys-form-item">
            <span class="sys-form-label">启用状态</span>
            <select v-model.number="formData.status" class="sys-form-select">
              <option :value="1">启用</option>
              <option :value="0">禁用</option>
            </select>
          </label>
        </div>
      </div>
    </AppConfirmDialog>

    <AppConfirmDialog
      :show="showEditModal"
      title="编辑权限"
      confirm-text="保存"
      cancel-text="取消"
      @confirm="handleUpdate"
      @cancel="closeEditModal"
    >
      <div class="sys-form-stack">
        <div class="sys-form-row">
          <label class="sys-form-item">
            <span class="sys-form-label">权限编码（只读）</span>
            <input v-model="formData.permCode" type="text" disabled />
          </label>
          <label class="sys-form-item">
            <span class="sys-form-label">权限名称</span>
            <input v-model="formData.permName" type="text" />
          </label>
        </div>
        <div class="sys-form-row">
          <label class="sys-form-item">
            <span class="sys-form-label">上级权限</span>
            <select v-model.number="formData.parentId" class="sys-form-select">
              <option :value="0">顶级菜单</option>
              <option
                v-for="p in allPermissions.filter(x => x.permType === 1 && x.id !== formData.id)"
                :key="p.id"
                :value="p.id"
              >
                {{ p.permName }}
              </option>
            </select>
          </label>
          <label class="sys-form-item">
            <span class="sys-form-label">权限类型</span>
            <select v-model.number="formData.permType" class="sys-form-select">
              <option :value="1">菜单</option>
              <option :value="2">按钮</option>
              <option :value="3">接口</option>
            </select>
          </label>
        </div>
        <div class="sys-form-row">
          <label class="sys-form-item">
            <span class="sys-form-label">路由路径</span>
            <input v-model="formData.path" type="text" />
          </label>
          <label class="sys-form-item">
            <span class="sys-form-label">组件路径</span>
            <input v-model="formData.component" type="text" />
          </label>
        </div>
        <div class="sys-form-row">
          <label class="sys-form-item">
            <span class="sys-form-label">图标</span>
            <input v-model="formData.icon" type="text" />
          </label>
          <label class="sys-form-item">
            <span class="sys-form-label">排序</span>
            <input v-model.number="formData.sort" type="number" min="0" />
          </label>
        </div>
        <div class="sys-form-row">
          <label class="sys-form-item">
            <span class="sys-form-label">显示状态</span>
            <select v-model.number="formData.visible" class="sys-form-select">
              <option :value="1">显示</option>
              <option :value="0">隐藏</option>
            </select>
          </label>
          <label class="sys-form-item">
            <span class="sys-form-label">启用状态</span>
            <select v-model.number="formData.status" class="sys-form-select">
              <option :value="1">启用</option>
              <option :value="0">禁用</option>
            </select>
          </label>
        </div>
      </div>
    </AppConfirmDialog>

    <AppConfirmDialog
      :show="deletingItem.show"
      title="确认删除权限"
      :message="'确定要删除权限「' + (deletingItem.item?.permName || '') + '」吗？分配了该权限的角色将失去对应能力，此操作不可恢复。'"
      confirm-text="删除"
      cancel-text="取消"
      tone="danger"
      @confirm="confirmDelete"
      @cancel="deletingItem.show = false"
    />
  </div>
</template>

<style scoped>
@import '../system-shared.css';

.perm-table-head,
.perm-table-row {
  grid-template-columns: 60px 220px 1fr 100px 120px 90px 220px !important;
}

.sys-row-sort {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.72rem;
  color: #94a3b8;
  font-weight: 600;
}

.sys-perm-info {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
}
.perm-icon {
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  border-radius: 0.55rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
.perm-icon.type-menu {
  background: rgba(99, 102, 241, 0.08);
  color: #6366f1;
}
.perm-icon.type-btn {
  background: rgba(16, 185, 129, 0.08);
  color: #10b981;
}
.perm-icon.type-api {
  background: rgba(245, 158, 11, 0.08);
  color: #f59e0b;
}

.sys-perm-meta {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}
.sys-perm-name {
  font-size: 0.83rem;
  font-weight: 750;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sys-perm-path {
  font-size: 0.68rem;
  color: #94a3b8;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sys-perm-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.74rem;
  color: #6366f1;
  font-weight: 600;
  background: rgba(99, 102, 241, 0.06);
  padding: 0.25rem 0.55rem;
  border-radius: 0.4rem;
  width: fit-content;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 240px;
}

.perm-type-tag {
  display: inline-flex;
  font-size: 0.65rem;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-weight: 700;
  width: fit-content;
}
.perm-type-tag.type-menu {
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
}
.perm-type-tag.type-btn {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}
.perm-type-tag.type-api {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.sys-action-btn.sub {
  background: rgba(59, 130, 246, 0.08);
  color: #3b82f6;
}
.sys-action-btn.sub:hover {
  background: rgba(59, 130, 246, 0.15);
}

.sys-form-item select,
.sys-form-item input {
  width: 100%;
}

@media (max-width: 960px) {
  .perm-table-head,
  .perm-table-row {
    grid-template-columns: 60px 200px 1fr 80px 80px 220px !important;
  }
  .perm-table-head > span:nth-child(5),
  .perm-table-head > span:nth-child(6),
  .perm-table-row > span:nth-child(5),
  .perm-table-row > span:nth-child(6) {
    display: none;
  }
}
@media (max-width: 640px) {
  .perm-table-head {
    display: none;
  }
  .perm-table-row {
    grid-template-columns: 1fr !important;
    gap: 0.5rem;
  }
}
</style>