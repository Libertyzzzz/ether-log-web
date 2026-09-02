<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  Users, Plus, Search, Trash2, Pencil, ChevronLeft, ChevronRight,
  UserX, UserCheck, KeyRound, Shield, ArrowLeft,
  Phone, UserCircle, Calendar, Lock
} from 'lucide-vue-next'
import {
  fetchUsersPage,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  fetchRoleList,
  assignRolesToUser,
  fetchUserRoles,
  isForbiddenError,
} from '../../api'
import type { SysUser, SysRole, SysUserQueryDto } from '../../types/blog'
import { toast } from '../../utils/toast'
import AppConfirmDialog from '../AppConfirmDialog.vue'

defineEmits<{
  back: []
}>()

const loading = ref(false)
const allItems = ref<SysUser[]>([])
const totalRecords = ref(0)
const currentPage = ref(1)
const pageSize = 10
const searchQuery = ref('')
const statusFilter = ref<number | ''>('')
const roleFilter = ref<number | ''>('')

const roleList = ref<SysRole[]>([])
const userRoleMap = ref<Record<string, string[]>>({})

const showAddModal = ref(false)
const showEditModal = ref(false)
const showAssignRoleModal = ref(false)
const showResetPwdModal = ref(false)
const deletingItem = ref<{ show: boolean; item: SysUser | null }>({ show: false, item: null })

const formData = ref({
  id: 0,
  userId: '' as string,
  username: '',
  password: '',
  nickname: '',
  email: '',
  phone: '',
  gender: 0,
  status: 1,
  roleIds: [] as number[],
})

const resetPwdData = ref({
  userId: '' as number | string,
  username: '',
  newPassword: '',
})

const assignRoleData = ref({
  userId: '' as number | string,
  username: '',
  selectedRoleIds: [] as number[],
})

let searchTimer: ReturnType<typeof setTimeout> | null = null

async function loadRoles() {
  try {
    roleList.value = await fetchRoleList()
  } catch {
    roleList.value = []
  }
}

async function loadRolesForUsers(records: SysUser[]) {
  if (!records.length) {
    userRoleMap.value = {}
    return
  }

  const entries = await Promise.all(records.map(async (item) => {
    const userId = String(item.userId)
    try {
      const roles = await fetchUserRoles(userId)
      return [userId, roles.map((role) => role.roleName).filter(Boolean)] as const
    } catch {
      const fallbackRoles = Array.isArray(item.roles)
        ? item.roles.map((role) => role.roleName).filter(Boolean)
        : []
      return [userId, fallbackRoles] as const
    }
  }))

  userRoleMap.value = Object.fromEntries(entries)
}

async function loadData() {
  loading.value = true
  const params: SysUserQueryDto = {
    pageNum: currentPage.value,
    pageSize,
  }
  const keyword = searchQuery.value.trim()
  if (keyword) params.keyword = keyword
  if (statusFilter.value !== '') params.status = Number(statusFilter.value)
  if (roleFilter.value !== '') params.roleId = Number(roleFilter.value)
  try {
    const result = await fetchUsersPage(params)
    allItems.value = result.records
    totalRecords.value = result.total
    await loadRolesForUsers(result.records)
  } catch (e) {
    if (!isForbiddenError(e)) {
      allItems.value = []
      totalRecords.value = 0
      userRoleMap.value = {}
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

watch([statusFilter, roleFilter], () => {
  currentPage.value = 1
  loadData()
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
  loadRoles()
  loadData()
})

function openAddModal() {
  formData.value = {
    id: 0,
    userId: '',
    username: '',
    password: '',
    nickname: '',
    email: '',
    phone: '',
    gender: 0,
    status: 1,
    roleIds: [],
  }
  showAddModal.value = true
}

function closeAddModal() {
  showAddModal.value = false
}

async function handleCreate() {
  if (!formData.value.username.trim()) {
    toast('请输入用户名', 'error')
    return
  }
  if (!formData.value.password?.trim()) {
    toast('请输入初始密码', 'error')
    return
  }
  try {
    await createUser({
      username: formData.value.username.trim(),
      password: formData.value.password,
      nickname: formData.value.nickname.trim() || undefined,
      email: formData.value.email.trim() || undefined,
      phone: formData.value.phone.trim() || undefined,
      gender: formData.value.gender,
      status: formData.value.status,
      roleIds: formData.value.roleIds.length ? formData.value.roleIds : undefined,
    })
    toast('用户创建成功', 'success')
    closeAddModal()
    currentPage.value = 1
    loadData()
  } catch (e) {
    if (!isForbiddenError(e)) toast('创建用户失败', 'error')
  }
}

function openEditModal(item: SysUser) {
  formData.value = {
    id: item.id ?? item.userId,
    userId: String(item.userId),
    username: item.username,
    password: '',
    nickname: item.nickname || '',
    email: item.email || '',
    phone: item.phone || '',
    gender: item.gender ?? 0,
    status: typeof item.status === 'number' ? item.status : 1,
    roleIds: Array.isArray(item.roleIds) ? [...item.roleIds] : [],
  }
  showEditModal.value = true
}

function closeEditModal() {
  showEditModal.value = false
}

const editSubmitting = ref(false)

async function handleUpdate() {
  if (!formData.value.userId) {
    toast('用户信息缺失，请关闭后重试', 'error')
    return
  }
  if (editSubmitting.value) return
  editSubmitting.value = true
  try {
    await updateUser(formData.value.userId, {
      nickname: formData.value.nickname.trim() || undefined,
      email: formData.value.email.trim() || undefined,
      phone: formData.value.phone.trim() || undefined,
      gender: formData.value.gender,
      status: formData.value.status,
    })
    toast('用户信息已更新', 'success')
    closeEditModal()
    loadData()
  } catch (e: any) {
    const msg = e?.response?.data?.message || e?.message || '更新用户失败'
    if (!isForbiddenError(e)) toast(msg, 'error')
  } finally {
    editSubmitting.value = false
  }
}

function removeUser(item: SysUser) {
  deletingItem.value = { show: true, item }
}

async function confirmDelete() {
  const item = deletingItem.value.item
  if (!item) return
  try {
    await deleteUser(item.id)
    deletingItem.value = { show: false, item: null }
    toast('用户已删除', 'success')
    loadData()
  } catch (e) {
    if (!isForbiddenError(e)) toast('删除用户失败', 'error')
  }
}

function openResetPwd(item: SysUser) {
  resetPwdData.value = {
    userId: String(item.userId),
    username: item.username,
    newPassword: '',
  }
  showResetPwdModal.value = true
}

function closeResetPwd() {
  showResetPwdModal.value = false
}

async function handleResetPwd() {
  if (!resetPwdData.value.newPassword.trim()) {
    toast('请输入新密码', 'error')
    return
  }
  try {
    await resetUserPassword(
      resetPwdData.value.userId,
      resetPwdData.value.newPassword.trim(),
    )
    toast('密码重置成功', 'success')
    closeResetPwd()
  } catch (e) {
    if (!isForbiddenError(e)) toast('重置密码失败', 'error')
  }
}

async function openAssignRole(item: SysUser) {
  const targetUserId = getUserId(item)
  assignRoleData.value = {
    userId: targetUserId,
    username: item.username,
    selectedRoleIds: [],
  }
  try {
    const roles = await fetchUserRoles(targetUserId)
    assignRoleData.value.selectedRoleIds = roles.map((r) => r.id)
  } catch {
    assignRoleData.value.selectedRoleIds = item.roleIds || []
  }
  showAssignRoleModal.value = true
}

function closeAssignRole() {
  showAssignRoleModal.value = false
}

async function handleAssignRole() {
  try {
    await assignRolesToUser(
      assignRoleData.value.userId,
      assignRoleData.value.selectedRoleIds,
    )
    toast('角色分配成功', 'success')
    closeAssignRole()
    loadData()
  } catch (e) {
    if (!isForbiddenError(e)) toast('分配角色失败', 'error')
  }
}

function toggleRoleSelect(roleId: number) {
  const idx = formData.value.roleIds.indexOf(roleId)
  if (idx === -1) formData.value.roleIds.push(roleId)
  else formData.value.roleIds.splice(idx, 1)
}

function toggleAssignRoleSelect(roleId: number) {
  const idx = assignRoleData.value.selectedRoleIds.indexOf(roleId)
  if (idx === -1) assignRoleData.value.selectedRoleIds.push(roleId)
  else assignRoleData.value.selectedRoleIds.splice(idx, 1)
}

function getGenderLabel(g: number | undefined) {
  if (g === 1) return '男'
  if (g === 2) return '女'
  return '未知'
}

function getUserId(item: SysUser) {
  return String(item.userId)
}

function getUserRoleNames(item: SysUser) {
  const userId = getUserId(item)
  const roles = userRoleMap.value[userId] ?? []
  return roles.length ? roles : ['未分配']
}

function getStatusLabel(s: number) {
  return s === 1 ? '正常' : '禁用'
}

function getStatusText(value: number | '') {
  if (value === '') return '全部状态'
  return value === 1 ? '正常' : '禁用'
}

function getRoleText(value: number | '') {
  if (value === '') return '全部角色'
  const match = roleList.value.find((item) => item.id === Number(value))
  return match ? match.roleName : '全部角色'
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
            <div class="sys-hero-icon">
              <Users :size="24" />
            </div>
            <div class="sys-hero-info">
              <h1 class="sys-hero-title">用户管理</h1>
              <p class="sys-hero-sub">管理系统用户账号、角色分配与状态</p>
            </div>
          </div>
          <button class="sys-btn-new" type="button" @click="openAddModal">
            <Plus :size="15" />
            新增用户
          </button>
        </div>
      </div>
    </div>

    <div class="sys-body">
      <div class="sys-stats-grid">
        <div class="sys-stat-card">
          <div class="sys-stat-icon" style="background:rgba(99,102,241,0.1);color:#6366f1">
            <Users :size="18" />
          </div>
          <span class="sys-stat-label">用户总数</span>
          <strong class="sys-stat-value">{{ totalRecords }}</strong>
        </div>
        <div class="sys-stat-card">
          <div class="sys-stat-icon" style="background:rgba(16,185,129,0.1);color:#10b981">
            <UserCheck :size="18" />
          </div>
          <span class="sys-stat-label">正常用户</span>
          <strong class="sys-stat-value">{{ allItems.filter(i => i.status === 1).length }}</strong>
        </div>
        <div class="sys-stat-card">
          <div class="sys-stat-icon" style="background:rgba(248,113,113,0.1);color:#f87171">
            <UserX :size="18" />
          </div>
          <span class="sys-stat-label">已禁用</span>
          <strong class="sys-stat-value">{{ allItems.filter(i => i.status === 0).length }}</strong>
        </div>
        <div class="sys-stat-card">
          <div class="sys-stat-icon" style="background:rgba(139,92,246,0.1);color:#8b5cf6">
            <Shield :size="18" />
          </div>
          <span class="sys-stat-label">角色数</span>
          <strong class="sys-stat-value">{{ roleList.length }}</strong>
        </div>
      </div>

      <div class="sys-card">
        <div class="sys-card-header">
          <div class="sys-card-title-row">
            <Users :size="15" class="sys-card-icon" />
            <h2 class="sys-card-title">用户列表</h2>
          </div>
          <div class="sys-filter-bar">
            <div class="sys-search-wrap">
              <Search :size="13" class="sys-search-icon" />
              <input
                v-model="searchQuery"
                type="text"
                class="sys-search-input"
                placeholder="搜索用户名/昵称..."
                title="搜索用户名或昵称"
              />
            </div>
            <div class="sys-filter-field">
              <select
                v-model="statusFilter"
                class="sys-filter-select"
                :title="getStatusText(statusFilter)"
              >
                <option :value="''">全部状态</option>
                <option :value="1">正常</option>
                <option :value="0">禁用</option>
              </select>
            </div>
            <div class="sys-filter-field">
              <select
                v-model="roleFilter"
                class="sys-filter-select"
                :title="getRoleText(roleFilter)"
              >
                <option :value="''">全部角色</option>
                <option v-for="r in roleList" :key="r.id" :value="r.id">{{ r.roleName }}</option>
              </select>
            </div>
          </div>
        </div>

        <div class="sys-table-head">
          <span>用户信息</span>
          <span>电话</span>
          <span>性别</span>
          <span>状态</span>
          <span>用户角色</span>
          <span>创建时间</span>
          <span>操作</span>
        </div>

        <div v-if="loading" class="sys-empty">加载中...</div>
        <div v-else-if="!allItems.length" class="sys-empty">暂无用户数据</div>

        <div v-for="item in allItems" :key="item.id" class="sys-table-row">
          <div class="sys-row-main">
            <div class="sys-user-info">
              <div class="sys-user-avatar">
                <UserCircle :size="32" />
              </div>
              <div class="sys-user-meta">
                <strong class="sys-user-name">{{ item.nickname || item.username }}</strong>
                <span class="sys-user-sub">@{{ item.username }}</span>
              </div>
            </div>
            <div class="sys-user-contact">
              <span v-if="item.phone" class="sys-contact-item">
                <Phone :size="11" /> {{ item.phone }}
              </span>
              <span v-else class="sys-contact-empty">—</span>
            </div>
            <span class="sys-row-text">{{ getGenderLabel(item.gender) }}</span>
            <span class="sys-row-status" :class="item.status === 1 ? 'active' : 'disabled'">
              {{ getStatusLabel(item.status) }}
            </span>
            <div class="sys-row-role">
              <template v-if="getUserRoleNames(item).length && getUserRoleNames(item)[0] !== '未分配'">
                <span
                  v-for="(roleName, index) in getUserRoleNames(item).slice(0, 2)"
                  :key="`${item.id}-${roleName}-${index}`"
                  class="sys-role-tag"
                >
                  {{ roleName }}
                </span>
                <span
                  v-if="getUserRoleNames(item).length > 2"
                  class="sys-role-tag sys-role-tag-more"
                >
                  +{{ getUserRoleNames(item).length - 2 }}
                </span>
              </template>
              <span v-else class="sys-role-empty">未分配</span>
            </div>
            <div class="sys-row-text sys-time-cell">
              <Calendar :size="11" />
              {{ item.createTime?.slice(0, 10) || '—' }}
            </div>
          </div>
          <div class="sys-row-actions">
            <button type="button" class="sys-action-btn edit" @click="openEditModal(item)">
              <Pencil :size="11" /> 编辑
            </button>
            <button type="button" class="sys-action-btn role" @click="openAssignRole(item)">
              <Shield :size="11" /> 分配角色
            </button>
            <button type="button" class="sys-action-btn pwd" @click="openResetPwd(item)">
              <KeyRound :size="11" /> 重置密码
            </button>
            <button v-if="!item.isSystem" type="button" class="sys-action-btn danger" @click="removeUser(item)">
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
      title="新增用户"
      confirm-text="创建"
      cancel-text="取消"
      @confirm="handleCreate"
      @cancel="closeAddModal"
    >
      <div class="sys-form-stack">
        <label class="sys-form-item">
          <span class="sys-form-label">用户名 <span class="sys-required">*</span></span>
          <input v-model="formData.username" type="text" placeholder="请输入登录用户名" />
        </label>
        <label class="sys-form-item">
          <span class="sys-form-label">初始密码 <span class="sys-required">*</span></span>
          <div class="sys-pwd-wrap">
            <Lock :size="14" class="sys-pwd-icon" />
            <input v-model="formData.password" type="password" placeholder="请输入初始密码" />
          </div>
        </label>
        <div class="sys-form-row">
          <label class="sys-form-item">
            <span class="sys-form-label">昵称</span>
            <input v-model="formData.nickname" type="text" placeholder="用户显示名" />
          </label>
          <label class="sys-form-item">
            <span class="sys-form-label">性别</span>
            <select v-model.number="formData.gender" class="sys-form-select">
              <option :value="0">未知</option>
              <option :value="1">男</option>
              <option :value="2">女</option>
            </select>
          </label>
        </div>
        <label class="sys-form-item">
          <span class="sys-form-label">邮箱</span>
          <input v-model="formData.email" type="email" placeholder="user@example.com" />
        </label>
        <label class="sys-form-item">
          <span class="sys-form-label">手机号</span>
          <input v-model="formData.phone" type="tel" placeholder="请输入手机号" />
        </label>
        <label class="sys-form-item">
          <span class="sys-form-label">账号状态</span>
          <select v-model.number="formData.status" class="sys-form-select">
            <option :value="1">正常</option>
            <option :value="0">禁用</option>
          </select>
        </label>
        <div class="sys-form-item">
          <span class="sys-form-label">分配角色</span>
          <div v-if="!roleList.length" class="sys-roles-empty">暂无可用角色</div>
          <div v-else class="sys-role-chips">
            <button
              v-for="role in roleList"
              :key="role.id"
              type="button"
              class="sys-role-chip"
              :class="{ checked: formData.roleIds.includes(role.id) }"
              @click="toggleRoleSelect(role.id)"
            >
              {{ role.roleName }}
            </button>
          </div>
        </div>
      </div>
    </AppConfirmDialog>

    <AppConfirmDialog
      :show="showEditModal"
      title="编辑用户"
      confirm-text="保存"
      cancel-text="取消"
      @confirm="handleUpdate"
      @cancel="closeEditModal"
    >
      <div class="sys-form-stack">
        <label class="sys-form-item">
          <span class="sys-form-label">用户名（只读）</span>
          <input v-model="formData.username" type="text" disabled />
        </label>
        <div class="sys-form-row">
          <label class="sys-form-item">
            <span class="sys-form-label">昵称</span>
            <input v-model="formData.nickname" type="text" placeholder="用户显示名" />
          </label>
          <label class="sys-form-item">
            <span class="sys-form-label">性别</span>
            <select v-model.number="formData.gender" class="sys-form-select">
              <option :value="0">未知</option>
              <option :value="1">男</option>
              <option :value="2">女</option>
            </select>
          </label>
        </div>
        <label class="sys-form-item">
          <span class="sys-form-label">邮箱</span>
          <input v-model="formData.email" type="email" placeholder="user@example.com" />
        </label>
        <label class="sys-form-item">
          <span class="sys-form-label">手机号</span>
          <input v-model="formData.phone" type="tel" placeholder="请输入手机号" />
        </label>
        <label class="sys-form-item">
          <span class="sys-form-label">账号状态</span>
          <select v-model.number="formData.status" class="sys-form-select">
            <option :value="1">正常</option>
            <option :value="0">禁用</option>
          </select>
        </label>
      </div>
    </AppConfirmDialog>

    <AppConfirmDialog
      :show="showResetPwdModal"
      title="重置密码"
      confirm-text="确认重置"
      cancel-text="取消"
      @confirm="handleResetPwd"
      @cancel="closeResetPwd"
    >
      <div class="sys-form-stack">
        <p class="sys-form-tip">即将为用户 <strong>{{ resetPwdData.username }}</strong> 重置密码：</p>
        <label class="sys-form-item">
          <span class="sys-form-label">新密码 <span class="sys-required">*</span></span>
          <div class="sys-pwd-wrap">
            <Lock :size="14" class="sys-pwd-icon" />
            <input v-model="resetPwdData.newPassword" type="password" placeholder="请输入新密码" />
          </div>
        </label>
      </div>
    </AppConfirmDialog>

    <AppConfirmDialog
      :show="showAssignRoleModal"
      title="分配角色"
      confirm-text="保存"
      cancel-text="取消"
      @confirm="handleAssignRole"
      @cancel="closeAssignRole"
    >
      <div class="sys-form-stack">
        <p class="sys-form-tip">为用户 <strong>{{ assignRoleData.username }}</strong> 分配角色：</p>
        <div v-if="!roleList.length" class="sys-roles-empty">暂无可用角色，请先到角色管理创建</div>
        <div v-else class="sys-role-checklist">
          <label
            v-for="role in roleList"
            :key="role.id"
            class="sys-role-check"
            :class="{ checked: assignRoleData.selectedRoleIds.includes(role.id) }"
          >
            <input
              type="checkbox"
              :checked="assignRoleData.selectedRoleIds.includes(role.id)"
              @change="toggleAssignRoleSelect(role.id)"
            />
            <div class="sys-role-check-info">
              <strong>{{ role.roleName }}</strong>
              <span>{{ role.roleCode }}</span>
            </div>
          </label>
        </div>
      </div>
    </AppConfirmDialog>

    <AppConfirmDialog
      :show="deletingItem.show"
      title="确认删除用户"
      :message="'确定要删除用户「' + (deletingItem.item?.username || '') + '」吗？此操作不可恢复。'"
      confirm-text="删除"
      cancel-text="取消"
      tone="danger"
      @confirm="confirmDelete"
      @cancel="deletingItem.show = false"
    />
  </div>
</template>

<style scoped>
.sys-page {
  background: #f5f5f7;
  min-height: 100vh;
  padding-top: 4.5rem;
}
.sys-body {
  max-width: var(--nav-content-max-width);
  margin: 1.5rem auto 0;
  padding: 0 0.9rem 5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* ── Hero Banner ── */
.sys-hero {
  max-width: var(--nav-content-max-width);
  margin: 1rem auto 0;
  padding: 0 0.9rem;
}
.sys-hero-bg-wrap {
  position: relative;
  overflow: hidden;
  border-radius: 1.75rem;
  background: linear-gradient(160deg, #0a0e1a 0%, #0f172a 40%, #1e1b4b 100%);
  min-height: 100px;
}
.sys-hero-bg { position: absolute; inset: 0; pointer-events: none; }
.sys-orb {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(99,102,241,0.25), transparent 70%);
}
.sys-orb-1 { width: 300px; height: 300px; top: -100px; right: -40px; }
.sys-orb-2 {
  width: 160px; height: 160px; bottom: -50px; right: 160px;
  background: radial-gradient(circle, rgba(129,140,248,0.15), transparent 70%);
}
.sys-hero-inner {
  position: relative;
  z-index: 1;
  padding: 1.75rem 2.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.25rem;
}
.sys-hero-left { display: flex; align-items: center; gap: 1rem; }
.sys-back-btn {
  width: 2.5rem; height: 2.5rem;
  border-radius: 0.75rem;
  background: rgba(148,163,184,0.12);
  border: 1px solid rgba(148,163,184,0.18);
  color: #94a3b8;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}
.sys-back-btn:hover {
  background: rgba(129,140,248,0.15);
  border-color: rgba(129,140,248,0.3);
  color: #a5b4fc;
}
.sys-hero-icon {
  width: 3.25rem; height: 3.25rem; border-radius: 0.9rem; flex-shrink: 0;
  background: rgba(129,140,248,0.12);
  border: 1px solid rgba(129,140,248,0.2);
  display: flex; align-items: center; justify-content: center;
  color: #a5b4fc;
}
.sys-hero-info { display: flex; flex-direction: column; gap: 0.15rem; }
.sys-hero-title { margin: 0; font-size: 1.25rem; font-weight: 900; color: #f8fafc; }
.sys-hero-sub { margin: 0; font-size: 0.78rem; color: #94a3b8; }
.sys-btn-new {
  display: inline-flex; align-items: center; gap: 0.4rem;
  padding: 0.6rem 1.25rem; border: none; border-radius: 9999px;
  background: #4f46e5; color: white; font-size: 0.82rem; font-weight: 800;
  cursor: pointer; transition: background 0.2s, transform 0.15s;
  flex-shrink: 0;
}
.sys-btn-new:hover { background: #4338ca; transform: translateY(-1px); }

/* ── Stats cards ── */
.sys-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
.sys-stat-card {
  background: white;
  border-radius: 1.25rem;
  padding: 1.25rem 1.25rem 1rem;
  border: 1px solid rgba(226,232,240,0.8);
  box-shadow: 0 2px 8px rgba(15,23,42,0.04);
  display: flex; flex-direction: column; gap: 0.35rem;
  position: relative; overflow: hidden;
}
.sys-stat-icon {
  width: 2.25rem; height: 2.25rem; border-radius: 0.65rem;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 0.25rem;
}
.sys-stat-label { font-size: 0.75rem; color: #94a3b8; font-weight: 600; }
.sys-stat-value { font-size: 1.75rem; font-weight: 900; color: #0f172a; line-height: 1; }

/* ── Card ── */
.sys-card {
  background: white;
  border-radius: 1.5rem;
  padding: 1.5rem;
  border: 1px solid rgba(226,232,240,0.8);
  box-shadow: 0 2px 8px rgba(15,23,42,0.04);
  display: flex;
  flex-direction: column;
  gap: 0;
}
.sys-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  flex-wrap: nowrap;
  gap: 1rem;
}
.sys-card-title-row { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }
.sys-card-icon { color: #4f46e5; }
.sys-card-title { margin: 0; font-size: 0.95rem; font-weight: 800; color: #0f172a; white-space: nowrap; }

.sys-filter-bar {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  gap: 0.45rem;
  flex: 1 1 auto;
  min-width: 0;
  flex-wrap: nowrap;
}
.sys-filter-field {
  flex: 0 0 auto;
  min-width: 7.5rem;
  max-width: 9.5rem;
}
.sys-search-wrap {
  position: relative;
  display: flex;
  align-items: center;
  flex: 0 1 18rem;
  min-width: 10rem;
  max-width: 20rem;
}
.sys-search-icon {
  position: absolute;
  left: 0.65rem;
  color: #94a3b8;
  pointer-events: none;
}
.sys-search-input {
  width: 100%;
  padding: 0.45rem 0.65rem 0.45rem 1.85rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.6rem;
  font-size: 0.78rem;
  color: #0f172a;
  background: #f8fafc;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.sys-search-input:focus {
  border-color: #818cf8;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  background: #fff;
}
.sys-filter-select {
  width: 100%;
  min-width: 0;
  max-width: 100%;
  padding: 0.45rem 1.85rem 0.45rem 0.7rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.6rem;
  font-size: 0.78rem;
  color: #475569;
  background: #f8fafc url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E") no-repeat right 0.45rem center;
  outline: none;
  cursor: pointer;
  appearance: none;
  transition: border-color 0.15s;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sys-filter-select:focus {
  border-color: #818cf8;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  background-color: #fff;
}

/* ── Table ── */
.sys-table-head {
  display: grid;
  grid-template-columns: minmax(200px, 1.7fr) minmax(170px, 1.25fr) 90px 90px minmax(150px, 1.1fr) 170px minmax(200px, 1.3fr);
  align-items: center;
  padding: 0.6rem 0.85rem;
  border-bottom: 1px solid #e2e8f0;
  font-size: 0.72rem;
  font-weight: 700;
  color: #94a3b8;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}
.sys-table-head > span:nth-child(2) { padding-left: 0.9rem; }
.sys-table-row {
  display: grid;
  grid-template-columns: minmax(200px, 1.7fr) minmax(170px, 1.25fr) 90px 90px minmax(150px, 1.1fr) 170px minmax(200px, 1.3fr);
  align-items: center;
  padding: 1.05rem 0.95rem;
  border-bottom: 1px solid #f1f5f9;
  transition: background 0.15s;
}
.sys-table-row:hover {
  background: rgba(99,102,241,0.03);
}
.sys-table-row:last-child { border-bottom: none; }
.sys-row-main {
  display: contents;
}

.sys-user-info { display: flex; align-items: center; gap: 0.65rem; min-width: 0; }
.sys-user-avatar {
  width: 2.25rem; height: 2.25rem;
  border-radius: 0.6rem;
  background: rgba(99,102,241,0.08);
  color: #6366f1;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.sys-user-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.1rem;
  min-width: 0;
  flex-wrap: nowrap;
}
.sys-user-name {
  font-size: 0.92rem; font-weight: 780; color: #0f172a;
  line-height: 1.15;
  white-space: nowrap;
}
.sys-user-sub {
  font-size: 0.76rem; color: #94a3b8; font-weight: 500;
  line-height: 1.2;
  white-space: nowrap;
}
.sys-user-contact { display: flex; flex-direction: column; gap: 0.25rem; min-width: 0; padding-left: 0.9rem; }
.sys-contact-item {
  display: inline-flex; align-items: center; gap: 0.25rem;
  font-size: 0.75rem; color: #64748b;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.sys-contact-empty { color: #cbd5e1; font-size: 0.82rem; }

.sys-row-text { font-size: 0.86rem; font-weight: 500; color: #334155; }
.sys-row-role {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-wrap: wrap;
  min-height: 2.1rem;
}
.sys-role-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.28rem 0.75rem;
  border-radius: 0.55rem;
  background: rgba(99, 102, 241, 0.08);
  color: #4f46e5;
  border: 1px solid rgba(99, 102, 241, 0.18);
  font-size: 0.75rem;
  font-weight: 750;
}
.sys-role-tag-more {
  background: rgba(148, 163, 184, 0.12);
  color: #475569;
  border-color: rgba(148, 163, 184, 0.18);
}
.sys-role-empty {
  color: #94a3b8;
  font-size: 0.8rem;
}
.sys-time-cell { display: inline-flex; align-items: center; gap: 0.32rem; color: #64748b; font-size: 0.8rem; }
.sys-row-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.3rem 0.85rem;
  border-radius: 0.65rem;
  font-size: 0.72rem;
  font-weight: 750;
  width: fit-content;
  letter-spacing: 0.01em;
}
.sys-row-status.active { background: rgba(16,185,129,0.1); color: #10b981; }
.sys-row-status.disabled { background: rgba(248,113,113,0.1); color: #f87171; }

.sys-row-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  gap: 0.3rem 0.4rem;
  min-width: 0;
  padding-top: 0;
  border-top: none;
}
.sys-action-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.2rem;
  padding: 0.36rem 0.55rem;
  border: none;
  border-radius: 0.45rem;
  font-size: 0.68rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  line-height: 1.1;
  width: fit-content;
}
.sys-action-btn svg { width: 11px; height: 11px; }
.sys-action-btn.edit { background: rgba(99,102,241,0.08); color: #6366f1; }
.sys-action-btn.edit:hover { background: rgba(99,102,241,0.15); }
.sys-action-btn.role { background: rgba(139,92,246,0.08); color: #8b5cf6; }
.sys-action-btn.role:hover { background: rgba(139,92,246,0.15); }
.sys-action-btn.pwd { background: rgba(245,158,11,0.08); color: #f59e0b; }
.sys-action-btn.pwd:hover { background: rgba(245,158,11,0.15); }
.sys-action-btn.danger {
  background: rgba(248,113,113,0.08);
  color: #f87171;
  padding: 0.36rem 0.45rem;
  min-width: 1.9rem;
}
.sys-action-btn.danger svg { width: 12px; height: 12px; }
.sys-action-btn.danger:hover { background: rgba(248,113,113,0.15); }

.sys-empty {
  padding: 2.5rem 0.5rem;
  color: #94a3b8;
  font-size: 0.82rem;
  font-weight: 550;
  text-align: center;
}

/* ── Pagination ── */
.sys-pagination {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  justify-content: center;
  padding-top: 1rem;
  margin-top: 0.5rem;
  border-top: 1px solid #f1f5f9;
  flex-wrap: wrap;
}
.sys-page-btn {
  min-width: 2rem;
  height: 2rem;
  padding: 0 0.55rem;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 0.5rem;
  color: #475569;
  font-size: 0.78rem;
  font-weight: 650;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.sys-page-btn:hover:not(:disabled):not(.active) {
  border-color: #818cf8;
  color: #6366f1;
}
.sys-page-btn.active {
  background: #4f46e5;
  border-color: #4f46e5;
  color: white;
}
.sys-page-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.sys-page-ellipsis { color: #94a3b8; font-size: 0.82rem; padding: 0 0.1rem; }
.sys-page-info { color: #94a3b8; font-size: 0.75rem; margin-left: 0.5rem; }

/* ── Form ── */
.sys-form-stack {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  margin-top: 0.4rem;
}
.sys-form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
}
.sys-form-item {
  display: flex;
  flex-direction: column;
  gap: 0.28rem;
}
.sys-form-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: #475569;
}
.sys-required { color: #f87171; }
.sys-form-item input,
.sys-form-item select {
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
.sys-form-item input:focus,
.sys-form-item select:focus {
  border-color: #818cf8;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  background: #fff;
}
.sys-form-item input:disabled {
  background: #f1f5f9;
  color: #94a3b8;
  cursor: not-allowed;
}
.sys-form-select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.55rem center;
  padding-right: 2rem !important;
}
.sys-pwd-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.sys-pwd-wrap input {
  padding-left: 2rem;
}
.sys-pwd-icon {
  position: absolute;
  left: 0.6rem;
  color: #94a3b8;
  pointer-events: none;
}
.sys-form-tip {
  margin: 0;
  padding: 0.6rem 0.75rem;
  background: rgba(99,102,241,0.06);
  border-radius: 0.6rem;
  color: #475569;
  font-size: 0.82rem;
  line-height: 1.5;
}
.sys-form-tip strong { color: #4f46e5; }

.sys-roles-empty {
  padding: 0.85rem;
  background: #f8fafc;
  border-radius: 0.6rem;
  color: #94a3b8;
  font-size: 0.78rem;
  text-align: center;
}
.sys-role-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.sys-role-chip {
  padding: 0.35rem 0.75rem;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #64748b;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.sys-role-chip:hover {
  border-color: #a5b4fc;
  color: #6366f1;
}
.sys-role-chip.checked {
  background: rgba(99,102,241,0.1);
  border-color: #818cf8;
  color: #4f46e5;
}

.sys-role-checklist {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  max-height: 18rem;
  overflow-y: auto;
}
.sys-role-check {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.65rem;
  cursor: pointer;
  transition: all 0.15s;
  background: #fff;
}
.sys-role-check:hover {
  border-color: #a5b4fc;
  background: rgba(99,102,241,0.03);
}
.sys-role-check.checked {
  border-color: #818cf8;
  background: rgba(99,102,241,0.08);
}
.sys-role-check input[type="checkbox"] {
  width: 1rem;
  height: 1rem;
  accent-color: #4f46e5;
  flex-shrink: 0;
}
.sys-role-check-info {
  display: flex;
  flex-direction: column;
  gap: 0.05rem;
  flex: 1;
  min-width: 0;
}
.sys-role-check-info strong {
  font-size: 0.82rem;
  color: #0f172a;
  font-weight: 750;
}
.sys-role-check-info span {
  font-size: 0.7rem;
  color: #94a3b8;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

@media (max-width: 960px) {
  .sys-stats-grid { grid-template-columns: repeat(2, 1fr); }
  .sys-table-head,
  .sys-table-row {
    grid-template-columns: minmax(180px, 1.5fr) minmax(110px, 0.9fr) 80px 80px minmax(120px, 1fr) 200px;
  }
  .sys-table-head > span:nth-child(7),
  .sys-table-row > div:nth-child(7),
  .sys-table-row > span:nth-child(7) { min-width: 0; }
}
@media (max-width: 640px) {
  .sys-stats-grid { grid-template-columns: 1fr 1fr; }
  .sys-hero-inner { padding: 1.25rem 1rem; flex-wrap: wrap; }
  .sys-hero-title { font-size: 1rem; }
  .sys-btn-new { padding: 0.5rem 1rem; font-size: 0.75rem; }
  .sys-card { padding: 1rem; }
  .sys-filter-bar {
    display: flex;
    flex-direction: row;
    width: 100%;
    gap: 0.4rem;
  }
  .sys-filter-field,
  .sys-search-wrap {
    flex: 1 1 0;
    min-width: 0;
  }
  .sys-table-head { display: none; }
  .sys-table-row {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.7rem;
    padding: 1rem 0.9rem;
  }
  .sys-row-main {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.45rem;
    overflow: hidden;
    white-space: nowrap;
    flex-wrap: nowrap;
  }
  .sys-user-info {
    width: auto;
    flex: 1 1 34%;
    display: flex;
    align-items: center;
    gap: 0.55rem;
    min-width: 0;
  }
  .sys-user-meta {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.35rem;
    flex-wrap: nowrap;
    min-width: 0;
    overflow: hidden;
  }
  .sys-user-name,
  .sys-user-sub {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sys-user-contact,
  .sys-row-role,
  .sys-time-cell,
  .sys-row-status,
  .sys-row-text {
    display: inline-flex;
    align-items: center;
    justify-content: flex-start;
    flex: 0 0 auto;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sys-row-role {
    flex: 1 1 auto;
    min-width: 0;
  }
  .sys-user-contact,
  .sys-time-cell,
  .sys-row-status,
  .sys-row-text {
    max-width: 26vw;
  }
  .sys-user-contact {
    flex-shrink: 1;
  }
  .sys-row-actions {
    flex-wrap: wrap;
    justify-content: flex-start;
  }
  .sys-action-btn {
    flex: 1 1 calc(50% - 0.25rem);
    justify-content: center;
    min-width: 0;
  }
  .sys-form-row {
    grid-template-columns: 1fr;
  }
}
</style>