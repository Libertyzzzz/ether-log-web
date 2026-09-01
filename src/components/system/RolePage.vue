<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  Shield, Plus, Search, Trash2, Pencil, ChevronLeft, ChevronRight,
  Users, KeyRound, Unlock, ArrowLeft,
  FolderOpen, FileText, CircleDot
} from 'lucide-vue-next'
import {
  fetchRolesPage,
  createRole,
  updateRole,
  deleteRole,
  fetchPermissionTree,
  fetchRolePermissionIds,
  assignPermissionsToRole,
  fetchRoleUsersList,
  isForbiddenError,
} from '../../api'
import type { SysRole, PermissionTreeVO } from '../../types/blog'
import { toast } from '../../utils/toast'
import AppConfirmDialog from '../AppConfirmDialog.vue'

defineEmits<{
  back: []
}>()

const loading = ref(false)
const allItems = ref<SysRole[]>([])
const totalRecords = ref(0)
const currentPage = ref(1)
const pageSize = 10
const searchQuery = ref('')

const permissionTree = ref<PermissionTreeVO[]>([])
const roleUsersMap = ref<Map<number, number>>(new Map())

const showAddModal = ref(false)
const showEditModal = ref(false)
const showPermModal = ref(false)
const deletingItem = ref<{ show: boolean; item: SysRole | null }>({ show: false, item: null })

const formData = ref({
  id: 0,
  roleCode: '',
  roleName: '',
  description: '',
  sort: 0,
  dataScope: 1,
  status: 1,
})

const permData = ref({
  roleId: 0,
  roleName: '',
  expandedIds: new Set<number>(),
  checkedIds: new Set<number>(),
  halfCheckedIds: new Set<number>(),
})

let searchTimer: ReturnType<typeof setTimeout> | null = null

async function loadPermissionTree() {
  try {
    permissionTree.value = await fetchPermissionTree({ parentId: 0 })
  } catch (e) {
    permissionTree.value = []
    if (!isForbiddenError(e)) toast('加载权限菜单失败', 'error')
  }
}

async function loadRoleUsers() {
  try {
    const users = await fetchRoleUsersList()
    const map = new Map<number, number>()
    for (const u of users) {
      map.set(u.id, (map.get(u.id) || 0) + 1)
    }
    roleUsersMap.value = map
  } catch {
    roleUsersMap.value = new Map()
  }
}

async function loadData() {
  loading.value = true
  const keyword = searchQuery.value.trim() || undefined
  try {
    const result = await fetchRolesPage(currentPage.value, pageSize, keyword)
    allItems.value = result.records
    totalRecords.value = result.total
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
  loadPermissionTree()
  loadRoleUsers()
})

function openAddModal() {
  formData.value = {
    id: 0,
    roleCode: '',
    roleName: '',
    description: '',
    sort: 0,
    dataScope: 1,
    status: 1,
  }
  showAddModal.value = true
}

function closeAddModal() {
  showAddModal.value = false
}

async function handleCreate() {
  if (!formData.value.roleCode.trim()) {
    toast('请输入角色编码', 'error')
    return
  }
  if (!formData.value.roleName.trim()) {
    toast('请输入角色名称', 'error')
    return
  }
  try {
    await createRole({
      roleCode: formData.value.roleCode.trim().toUpperCase(),
      roleName: formData.value.roleName.trim(),
      description: formData.value.description.trim() || undefined,
      sort: Number(formData.value.sort) || 0,
      dataScope: Number(formData.value.dataScope) || 1,
      status: Number(formData.value.status),
    })
    toast('角色创建成功', 'success')
    closeAddModal()
    currentPage.value = 1
    loadData()
  } catch (e) {
    if (!isForbiddenError(e)) toast('创建角色失败', 'error')
  }
}

function openEditModal(item: SysRole) {
  formData.value = {
    id: item.id,
    roleCode: item.roleCode,
    roleName: item.roleName,
    description: item.description || '',
    sort: item.sort || 0,
    dataScope: item.dataScope || 1,
    status: item.status,
  }
  showEditModal.value = true
}

function closeEditModal() {
  showEditModal.value = false
}

async function handleUpdate() {
  try {
    await updateRole({
      id: formData.value.id,
      roleName: formData.value.roleName.trim(),
      description: formData.value.description.trim() || undefined,
      sort: Number(formData.value.sort) || 0,
      dataScope: Number(formData.value.dataScope) || 1,
      status: Number(formData.value.status),
    })
    toast('角色信息已更新', 'success')
    closeEditModal()
    loadData()
  } catch (e) {
    if (!isForbiddenError(e)) toast('更新角色失败', 'error')
  }
}

function removeRole(item: SysRole) {
  deletingItem.value = { show: true, item }
}

async function confirmDelete() {
  const item = deletingItem.value.item
  if (!item) return
  try {
    await deleteRole(item.id)
    deletingItem.value = { show: false, item: null }
    toast('角色已删除', 'success')
    loadData()
  } catch (e) {
    if (!isForbiddenError(e)) toast('删除角色失败', 'error')
  }
}

function flattenPermTree(list: PermissionTreeVO[]): PermissionTreeVO[] {
  const result: PermissionTreeVO[] = []
  const walk = (nodes: PermissionTreeVO[]) => {
    for (const n of nodes) {
      result.push(n)
      if (n.children && n.children.length) walk(n.children)
    }
  }
  walk(list)
  return result
}

function getPermDescendantIds(node: PermissionTreeVO): number[] {
  const ids: number[] = []
  const walk = (n: PermissionTreeVO) => {
    ids.push(n.id)
    if (n.children) n.children.forEach(walk)
  }
  if (node.children) node.children.forEach(walk)
  return ids
}

async function openPermModal(item: SysRole) {
  permData.value = {
    roleId: item.id,
    roleName: item.roleName,
    expandedIds: new Set<number>(),
    checkedIds: new Set<number>(),
    halfCheckedIds: new Set<number>(),
  }
  permissionTree.value.forEach((lv1) => permData.value.expandedIds.add(lv1.id))
  try {
    const ids = await fetchRolePermissionIds(item.id)
    permData.value.checkedIds = new Set(ids)
    recalcHalfChecked()
  } catch {
    permData.value.checkedIds = new Set()
  }
  showPermModal.value = true
}

function closePermModal() {
  showPermModal.value = false
}

function recalcHalfChecked() {
  permData.value.halfCheckedIds = new Set()
  const walk = (nodes: PermissionTreeVO[]): { total: number; checked: number; hasHalf: boolean } => {
    let total = 0
    let checked = 0
    let hasHalf = false
    for (const n of nodes) {
      total++
      const selfChecked = permData.value.checkedIds.has(n.id)
      if (n.children && n.children.length > 0) {
        const sub = walk(n.children)
        const allChildrenChecked = sub.checked === sub.total && !sub.hasHalf
        const anyChildrenChecked = sub.checked > 0 || sub.hasHalf
        if (allChildrenChecked) {
          checked++
        } else if (anyChildrenChecked || selfChecked) {
          permData.value.halfCheckedIds.add(n.id)
          hasHalf = true
        }
        if (sub.hasHalf) hasHalf = true
      } else {
        if (selfChecked) checked++
      }
    }
    return { total, checked, hasHalf }
  }
  walk(permissionTree.value)
}

function togglePermCheck(perm: PermissionTreeVO) {
  const descendantIds = getPermDescendantIds(perm)
  const hasChildren = perm.children && perm.children.length > 0
  const selfChecked = permData.value.checkedIds.has(perm.id)
  if (!hasChildren) {
    if (selfChecked) permData.value.checkedIds.delete(perm.id)
    else permData.value.checkedIds.add(perm.id)
  } else {
    if (selfChecked) {
      permData.value.checkedIds.delete(perm.id)
      descendantIds.forEach((id) => permData.value.checkedIds.delete(id))
    } else {
      permData.value.checkedIds.add(perm.id)
      descendantIds.forEach((id) => permData.value.checkedIds.add(id))
    }
  }
  recalcHalfChecked()
}

function togglePermExpand(id: number) {
  if (permData.value.expandedIds.has(id)) permData.value.expandedIds.delete(id)
  else permData.value.expandedIds.add(id)
}

async function handleSavePerm() {
  const ids = Array.from(permData.value.checkedIds)
  try {
    await assignPermissionsToRole(permData.value.roleId, ids)
    toast('权限分配成功', 'success')
    closePermModal()
  } catch (e) {
    if (!isForbiddenError(e)) toast('分配权限失败', 'error')
  }
}

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
            <div class="sys-hero-icon" style="background:rgba(139,92,246,0.12);border-color:rgba(139,92,246,0.2);color:#c4b5fd">
              <Shield :size="24" />
            </div>
            <div class="sys-hero-info">
              <h1 class="sys-hero-title">角色管理</h1>
              <p class="sys-hero-sub">管理系统角色、分配菜单与操作权限</p>
            </div>
          </div>
          <button class="sys-btn-new" type="button" @click="openAddModal">
            <Plus :size="15" />
            新增角色
          </button>
        </div>
      </div>
    </div>

    <div class="sys-body">
      <div class="sys-stats-grid">
        <div class="sys-stat-card">
          <div class="sys-stat-icon" style="background:rgba(139,92,246,0.1);color:#8b5cf6">
            <Shield :size="18" />
          </div>
          <span class="sys-stat-label">角色总数</span>
          <strong class="sys-stat-value">{{ totalRecords }}</strong>
        </div>
        <div class="sys-stat-card">
          <div class="sys-stat-icon" style="background:rgba(16,185,129,0.1);color:#10b981">
            <Unlock :size="18" />
          </div>
          <span class="sys-stat-label">启用角色</span>
          <strong class="sys-stat-value">{{ allItems.filter(i => i.status === 1).length }}</strong>
        </div>
        <div class="sys-stat-card">
          <div class="sys-stat-icon" style="background:rgba(99,102,241,0.1);color:#6366f1">
            <KeyRound :size="18" />
          </div>
          <span class="sys-stat-label">权限数</span>
          <strong class="sys-stat-value">{{ flattenPermTree(permissionTree).length }}</strong>
        </div>
        <div class="sys-stat-card">
          <div class="sys-stat-icon" style="background:rgba(245,158,11,0.1);color:#f59e0b">
            <Users :size="18" />
          </div>
          <span class="sys-stat-label">系统用户</span>
          <strong class="sys-stat-value">{{ roleUsersMap.size }}</strong>
        </div>
      </div>

      <div class="sys-card">
        <div class="sys-card-header">
          <div class="sys-card-title-row">
            <Shield :size="15" class="sys-card-icon" style="color:#8b5cf6" />
            <h2 class="sys-card-title">角色列表</h2>
          </div>
          <div class="sys-filter-bar">
            <div class="sys-search-wrap" style="min-width:200px">
              <Search :size="13" class="sys-search-icon" />
              <input
                v-model="searchQuery"
                type="text"
                class="sys-search-input"
                placeholder="搜索角色名/编码..."
              />
            </div>
          </div>
        </div>

        <div class="sys-table-head role-table-head">
          <span style="width:180px">角色信息</span>
          <span>角色编码</span>
          <span style="width:90px">排序</span>
          <span style="width:90px">状态</span>
          <span style="width:160px">创建时间</span>
          <span style="width:280px">操作</span>
        </div>

        <div v-if="loading" class="sys-empty">加载中...</div>
        <div v-else-if="!allItems.length" class="sys-empty">暂无角色数据</div>

        <div v-for="item in allItems" :key="item.id" class="sys-table-row role-table-row">
          <div class="sys-role-info">
            <div class="sys-role-badge" :class="item.isSystem ? 'system' : ''">
              <Shield :size="18" />
            </div>
            <div class="sys-role-meta">
              <div class="sys-role-name-wrap">
                <strong class="sys-role-name">{{ item.roleName }}</strong>
                <span v-if="item.roleCode === 'ROLE_SUPER_ADMIN'" class="sys-role-tag">系统内置</span>
              </div>
              <span v-if="item.description" class="sys-role-desc">{{ item.description }}</span>
            </div>
          </div>
          <span class="sys-role-code">{{ item.roleCode }}</span>
          <span class="sys-row-text">#{{ item.sort ?? 0 }}</span>
          <span class="sys-row-status" :class="item.status === 1 ? 'active' : 'disabled'">
            {{ item.status === 1 ? '正常' : '禁用' }}
          </span>
          <span class="sys-row-text sys-time-cell">
            {{ item.createTime?.slice(0, 16)?.replace('T', ' ') || '—' }}
          </span>
          <div class="sys-row-actions">
            <button type="button" class="sys-action-btn perm" @click="openPermModal(item)">
              <KeyRound :size="11" /> 分配权限
            </button>
            <button type="button" class="sys-action-btn edit" @click="openEditModal(item)">
              <Pencil :size="11" /> 编辑
            </button>
            <button v-if="!item.isSystem" type="button" class="sys-action-btn danger" @click="removeRole(item)">
              <Trash2 :size="11" />
            </button>
          </div>
        </div>

        <div v-if="totalPages > 1" class="sys-pagination">
          <button class="sys-page-btn" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">
            <ChevronLeft :size="14" />
          </button>
          <template v-for="(p, idx) in visiblePages" :key="idx">
            <span v-if="p === 'ellipsis'" class="sys-page-ellipsis">...</span>
            <button
              v-else
              class="sys-page-btn"
              :class="{ active: p === currentPage }"
              @click="goToPage(p as number)"
            >
              {{ p }}
            </button>
          </template>
          <button class="sys-page-btn" :disabled="currentPage >= totalPages" @click="goToPage(currentPage + 1)">
            <ChevronRight :size="14" />
          </button>
          <span class="sys-page-info">{{ currentPage }} / {{ totalPages }}</span>
        </div>
      </div>
    </div>

    <AppConfirmDialog
      :show="showAddModal"
      title="新增角色"
      confirm-text="创建"
      cancel-text="取消"
      @confirm="handleCreate"
      @cancel="closeAddModal"
    >
      <div class="sys-form-stack">
        <div class="sys-form-row">
          <label class="sys-form-item">
            <span class="sys-form-label">角色编码 <span class="sys-required">*</span></span>
            <input v-model="formData.roleCode" type="text" placeholder="如 ROLE_ADMIN" />
          </label>
          <label class="sys-form-item">
            <span class="sys-form-label">角色名称 <span class="sys-required">*</span></span>
            <input v-model="formData.roleName" type="text" placeholder="如 超级管理员" />
          </label>
        </div>
        <div class="sys-form-row">
          <label class="sys-form-item">
            <span class="sys-form-label">排序</span>
            <input v-model.number="formData.sort" type="number" min="0" placeholder="数字越小越靠前" />
          </label>
          <label class="sys-form-item">
            <span class="sys-form-label">状态</span>
            <select v-model.number="formData.status" class="sys-form-select">
              <option :value="1">启用</option>
              <option :value="0">禁用</option>
            </select>
          </label>
        </div>
        <label class="sys-form-item">
          <span class="sys-form-label">数据权限</span>
          <select v-model.number="formData.dataScope" class="sys-form-select">
            <option :value="1">全部数据权限</option>
            <option :value="2">自定义数据权限</option>
            <option :value="3">本部门数据权限</option>
            <option :value="4">本部门及以下数据权限</option>
            <option :value="5">仅本人数据权限</option>
          </select>
        </label>
        <label class="sys-form-item">
          <span class="sys-form-label">角色描述</span>
          <textarea
            v-model="formData.description"
            rows="3"
            placeholder="简要描述该角色的职责与权限范围..."
            style="resize:vertical;min-height:5rem;font-family:inherit"
          ></textarea>
        </label>
      </div>
    </AppConfirmDialog>

    <AppConfirmDialog
      :show="showEditModal"
      title="编辑角色"
      confirm-text="保存"
      cancel-text="取消"
      @confirm="handleUpdate"
      @cancel="closeEditModal"
    >
      <div class="sys-form-stack">
        <div class="sys-form-row">
          <label class="sys-form-item">
            <span class="sys-form-label">角色编码（只读）</span>
            <input v-model="formData.roleCode" type="text" disabled />
          </label>
          <label class="sys-form-item">
            <span class="sys-form-label">角色名称</span>
            <input v-model="formData.roleName" type="text" />
          </label>
        </div>
        <div class="sys-form-row">
          <label class="sys-form-item">
            <span class="sys-form-label">排序</span>
            <input v-model.number="formData.sort" type="number" min="0" />
          </label>
          <label class="sys-form-item">
            <span class="sys-form-label">状态</span>
            <select v-model.number="formData.status" class="sys-form-select">
              <option :value="1">启用</option>
              <option :value="0">禁用</option>
            </select>
          </label>
        </div>
        <label class="sys-form-item">
          <span class="sys-form-label">数据权限</span>
          <select v-model.number="formData.dataScope" class="sys-form-select">
            <option :value="1">全部数据权限</option>
            <option :value="2">自定义数据权限</option>
            <option :value="3">本部门数据权限</option>
            <option :value="4">本部门及以下数据权限</option>
            <option :value="5">仅本人数据权限</option>
          </select>
        </label>
        <label class="sys-form-item">
          <span class="sys-form-label">角色描述</span>
          <textarea
            v-model="formData.description"
            rows="3"
            style="resize:vertical;min-height:5rem;font-family:inherit"
          ></textarea>
        </label>
      </div>
    </AppConfirmDialog>

    <AppConfirmDialog
      :show="showPermModal"
      title="分配权限"
      confirm-text="保存"
      cancel-text="取消"
      @confirm="handleSavePerm"
      @cancel="closePermModal"
    >
      <div class="sys-form-stack">
        <p class="sys-form-tip">
          为角色 <strong>{{ permData.roleName }}</strong> 分配权限。
          已选 <span style="color:#4f46e5;font-weight:800">{{ permData.checkedIds.size }}</span> 项
        </p>
        <div v-if="!permissionTree.length" class="sys-roles-empty">
          暂无权限数据，请先在权限管理中创建
        </div>
        <div v-else class="sys-perm-tree">
          <template v-for="node in permissionTree" :key="node.id">
            <div class="perm-tree-node perm-tree-node--level-1">
              <div class="perm-node-row">
                <button
                  v-if="node.children?.length"
                  type="button"
                  class="perm-expand-btn"
                  :class="{ open: permData.expandedIds.has(node.id) }"
                  @click="togglePermExpand(node.id)"
                >
                  <ChevronRight :size="12" />
                </button>
                <span v-else class="perm-expand-placeholder"></span>
                <label class="perm-check">
                  <input
                    type="checkbox"
                    :checked="permData.checkedIds.has(node.id)"
                    :indeterminate.prop="permData.halfCheckedIds.has(node.id)"
                    @change="togglePermCheck(node)"
                  />
                </label>
                <FolderOpen v-if="node.permType === 1" :size="14" class="perm-icon type-menu" />
                <FileText v-else-if="node.permType === 2" :size="14" class="perm-icon type-btn" />
                <CircleDot v-else :size="14" class="perm-icon type-api" />
                <span class="perm-name">{{ node.permName }}</span>
                <span class="perm-type-tag" :class="permTypeClass(node.permType)">
                  {{ permTypeLabel(node.permType) }}
                </span>
                <span class="perm-code">{{ node.permCode }}</span>
              </div>
            </div>
            <template v-if="node.children?.length && permData.expandedIds.has(node.id)">
              <template v-for="child in node.children" :key="child.id">
                <div class="perm-tree-node perm-tree-node--level-2">
                  <div class="perm-node-row">
                    <button
                      v-if="child.children?.length"
                      type="button"
                      class="perm-expand-btn"
                      :class="{ open: permData.expandedIds.has(child.id) }"
                      @click="togglePermExpand(child.id)"
                    >
                      <ChevronRight :size="12" />
                    </button>
                    <span v-else class="perm-expand-placeholder"></span>
                    <label class="perm-check">
                      <input
                        type="checkbox"
                        :checked="permData.checkedIds.has(child.id)"
                        :indeterminate.prop="permData.halfCheckedIds.has(child.id)"
                        @change="togglePermCheck(child)"
                      />
                    </label>
                    <FolderOpen v-if="child.permType === 1" :size="13" class="perm-icon type-menu" />
                    <FileText v-else-if="child.permType === 2" :size="13" class="perm-icon type-btn" />
                    <CircleDot v-else :size="13" class="perm-icon type-api" />
                    <span class="perm-name">{{ child.permName }}</span>
                    <span class="perm-type-tag" :class="permTypeClass(child.permType)">
                      {{ permTypeLabel(child.permType) }}
                    </span>
                    <span class="perm-code">{{ child.permCode }}</span>
                  </div>
                </div>
                <template v-if="child.children?.length && permData.expandedIds.has(child.id)">
                  <template v-for="leaf in child.children" :key="leaf.id">
                    <div class="perm-tree-node perm-tree-node--level-3">
                      <div class="perm-node-row">
                        <button
                          v-if="leaf.children?.length"
                          type="button"
                          class="perm-expand-btn"
                          :class="{ open: permData.expandedIds.has(leaf.id) }"
                          @click="togglePermExpand(leaf.id)"
                        >
                          <ChevronRight :size="12" />
                        </button>
                        <span v-else class="perm-expand-placeholder"></span>
                        <label class="perm-check">
                          <input
                            type="checkbox"
                            :checked="permData.checkedIds.has(leaf.id)"
                            :indeterminate.prop="permData.halfCheckedIds.has(leaf.id)"
                            @change="togglePermCheck(leaf)"
                          />
                        </label>
                        <FolderOpen v-if="leaf.permType === 1" :size="12" class="perm-icon type-menu" />
                        <FileText v-else-if="leaf.permType === 2" :size="12" class="perm-icon type-btn" />
                        <CircleDot v-else :size="12" class="perm-icon type-api" />
                        <span class="perm-name">{{ leaf.permName }}</span>
                        <span class="perm-type-tag" :class="permTypeClass(leaf.permType)">
                          {{ permTypeLabel(leaf.permType) }}
                        </span>
                        <span class="perm-code">{{ leaf.permCode }}</span>
                      </div>
                    </div>
                    <template v-if="leaf.children?.length && permData.expandedIds.has(leaf.id)">
                      <template v-for="lv4 in leaf.children" :key="lv4.id">
                        <div class="perm-tree-node perm-tree-node--level-4">
                          <div class="perm-node-row">
                            <span class="perm-expand-placeholder"></span>
                            <label class="perm-check">
                              <input
                                type="checkbox"
                                :checked="permData.checkedIds.has(lv4.id)"
                                :indeterminate.prop="permData.halfCheckedIds.has(lv4.id)"
                                @change="togglePermCheck(lv4)"
                              />
                            </label>
                            <FolderOpen v-if="lv4.permType === 1" :size="12" class="perm-icon type-menu" />
                            <FileText v-else-if="lv4.permType === 2" :size="12" class="perm-icon type-btn" />
                            <CircleDot v-else :size="12" class="perm-icon type-api" />
                            <span class="perm-name">{{ lv4.permName }}</span>
                            <span class="perm-type-tag" :class="permTypeClass(lv4.permType)">
                              {{ permTypeLabel(lv4.permType) }}
                            </span>
                            <span class="perm-code">{{ lv4.permCode }}</span>
                          </div>
                        </div>
                      </template>
                    </template>
                  </template>
                </template>
              </template>
            </template>
          </template>
        </div>
      </div>
    </AppConfirmDialog>

    <AppConfirmDialog
      :show="deletingItem.show"
      title="确认删除角色"
      :message="'确定要删除角色「' + (deletingItem.item?.roleName || '') + '」吗？分配了该角色的用户将失去对应权限，此操作不可恢复。'"
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

.role-table-head,
.role-table-row {
  grid-template-columns: 180px 1fr 90px 90px 160px 280px !important;
}

.sys-role-info { display: flex; align-items: center; gap: 0.65rem; min-width: 0; }
.sys-role-badge {
  width: 2.25rem; height: 2.25rem;
  border-radius: 0.6rem;
  background: rgba(139,92,246,0.08);
  color: #8b5cf6;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.sys-role-badge.system {
  background: rgba(99,102,241,0.12);
  color: #6366f1;
}
.sys-role-meta { display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; }
.sys-role-name-wrap { display: flex; align-items: center; gap: 0.4rem; min-width: 0; }
.sys-role-name {
  font-size: 0.85rem; font-weight: 750; color: #0f172a;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  flex-shrink: 0;
}
.sys-role-desc {
  font-size: 0.7rem; color: #94a3b8;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  max-width: 140px;
}
.sys-role-tag {
  flex-shrink: 0;
  font-size: 0.6rem;
  line-height: 1;
  padding: 0.12rem 0.42rem;
  border-radius: 999px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  font-weight: 700;
  letter-spacing: 0.02em;
}
.sys-role-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.75rem;
  color: #6366f1;
  font-weight: 600;
  background: rgba(99,102,241,0.06);
  padding: 0.25rem 0.55rem;
  border-radius: 0.4rem;
  width: fit-content;
}

.sys-action-btn.perm { background: rgba(16,185,129,0.08); color: #10b981; }
.sys-action-btn.perm:hover { background: rgba(16,185,129,0.15); }

.sys-perm-tree {
  display: flex;
  flex-direction: column;
  max-height: 22rem;
  overflow-y: auto;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  background: #fafafa;
  padding: 0.35rem;
}
.perm-tree-node {
  display: block;
}
.perm-tree-node--level-1 > .perm-node-row { padding-left: 0.25rem; }
.perm-tree-node--level-2 > .perm-node-row { padding-left: 1.75rem; }
.perm-tree-node--level-3 > .perm-node-row { padding-left: 3.5rem; }
.perm-tree-node--level-4 > .perm-node-row { padding-left: 5.25rem; }

.perm-node-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.5rem;
  border-radius: 0.5rem;
  transition: background 0.12s;
}
.perm-node-row:hover {
  background: rgba(99,102,241,0.05);
}

.perm-expand-btn {
  width: 1.2rem; height: 1.2rem;
  border: none; background: transparent;
  color: #94a3b8;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  border-radius: 0.3rem;
  transition: all 0.15s;
  flex-shrink: 0;
}
.perm-expand-btn:hover {
  background: rgba(99,102,241,0.08);
  color: #6366f1;
}
.perm-expand-btn.open { transform: rotate(90deg); color: #6366f1; }
.perm-expand-placeholder { width: 1.2rem; height: 1.2rem; flex-shrink: 0; }

.perm-check {
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.perm-check input[type="checkbox"] {
  width: 0.95rem;
  height: 0.95rem;
  accent-color: #4f46e5;
  cursor: pointer;
}

.perm-icon { flex-shrink: 0; }
.perm-icon.type-menu { color: #6366f1; }
.perm-icon.type-btn { color: #10b981; }
.perm-icon.type-api { color: #f59e0b; }

.perm-name {
  font-size: 0.8rem;
  color: #0f172a;
  font-weight: 600;
  min-width: 0;
  flex-shrink: 0;
}
.perm-type-tag {
  font-size: 0.62rem;
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
  font-weight: 700;
  flex-shrink: 0;
}
.perm-type-tag.type-menu { background: rgba(99,102,241,0.1); color: #6366f1; }
.perm-type-tag.type-btn { background: rgba(16,185,129,0.1); color: #10b981; }
.perm-type-tag.type-api { background: rgba(245,158,11,0.1); color: #f59e0b; }

.perm-code {
  margin-left: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.68rem;
  color: #94a3b8;
  font-weight: 500;
  background: rgba(148,163,184,0.08);
  padding: 0.1rem 0.4rem;
  border-radius: 0.25rem;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  max-width: 160px;
}

textarea {
  padding: 0.5rem 0.7rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.6rem;
  font-size: 0.82rem;
  color: #0f172a;
  background: #f8fafc;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
  width: 100%;
  box-sizing: border-box;
}
textarea:focus {
  border-color: #818cf8;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  background: #fff;
}

@media (max-width: 960px) {
  .role-table-head,
  .role-table-row {
    grid-template-columns: 160px 1fr 80px 80px 280px !important;
  }
  .role-table-head > span:nth-child(5),
  .role-table-row > span:nth-child(5) { display: none; }
}
@media (max-width: 640px) {
  .role-table-head { display: none; }
  .role-table-row {
    grid-template-columns: 1fr !important;
    gap: 0.5rem;
  }
}
</style>