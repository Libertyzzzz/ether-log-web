<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  LayoutDashboard,
  FileText,
  Folder,
  Tag,
  MessageSquare,
  Image,
  Sparkles,
  ShieldAlert,
  Users,
  Shield,
  KeyRound,
  ArrowUpLeft,
  LogOut,
  Menu,
  X,
  Link2,
  Copy,
  RefreshCw,
  Check,
} from 'lucide-vue-next'
import type { LoginUser } from '../../types/blog'
import { hasPermission, hasRole, isSuperAdmin, isReadOnlyViewer } from '../../composables/useAuth'
import { fetchPreviewLinkConfig, updatePreviewLinkConfig } from '../../api'
import { toast } from '../../utils/toast'

const props = defineProps<{
  currentPage: string
  loginUser: Partial<LoginUser>
  pendingCommentCount?: number
}>()

const emit = defineEmits<{
  newArticle: []
  logout: []
}>()

const router = useRouter()
const mobileMenuOpen = ref(false)

// ── 预览链接管理弹窗状态 ──
const showPreviewModal = ref(false)
const previewConfig = ref({ enabled: true, code: 'nx_preview_2026' })
const isLoadingPreview = ref(false)
const isCopied = ref(false)

const fullPreviewUrl = computed(() => {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://nextify.cn'
  return `${origin}/?preview=${previewConfig.value.code}`
})

async function openPreviewLinkModal() {
  showPreviewModal.value = true
  mobileMenuOpen.value = false
  isLoadingPreview.value = true
  try {
    previewConfig.value = await fetchPreviewLinkConfig()
  } catch {
    // 保持默认或本地缓存配置
  } finally {
    isLoadingPreview.value = false
  }
}

async function handleCopyPreviewUrl() {
  try {
    await navigator.clipboard.writeText(fullPreviewUrl.value)
    isCopied.value = true
    toast('已复制只读预览链接', 'success')
    setTimeout(() => {
      isCopied.value = false
    }, 2000)
  } catch {
    toast('复制失败，请手动选中复制', 'error')
  }
}

async function handleResetPreviewCode() {
  isLoadingPreview.value = true
  try {
    previewConfig.value = await updatePreviewLinkConfig('reset')
    toast('已生成新的预览链接，旧链接已失效', 'success')
  } finally {
    isLoadingPreview.value = false
  }
}

async function handleTogglePreviewEnabled() {
  isLoadingPreview.value = true
  try {
    const nextEnabled = !previewConfig.value.enabled
    previewConfig.value = await updatePreviewLinkConfig('toggle', nextEnabled)
    toast(nextEnabled ? '预览链接已开启访问' : '预览链接已关闭访问', 'info')
  } finally {
    isLoadingPreview.value = false
  }
}

interface NavItem {
  key: string
  path: string
  label: string
  desc: string
  icon: any
  badge?: number
  visible: boolean
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const canArticle = computed(() => isSuperAdmin.value || hasPermission('dashboard:article') || hasRole(['ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_EDITOR']))
const canCategory = computed(() => isSuperAdmin.value || hasPermission('dashboard:category') || hasRole(['ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_EDITOR']))
const canTag = computed(() => isSuperAdmin.value || hasPermission('dashboard:tag') || hasRole(['ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_EDITOR']))
const canComment = computed(() => isSuperAdmin.value || hasPermission('dashboard:comment') || hasRole(['ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_EDITOR']))
const canMedia = computed(() => isSuperAdmin.value || hasPermission('dashboard:media') || hasRole(['ROLE_ADMIN', 'ROLE_SUPER_ADMIN']))
const canKnowledge = computed(() => isSuperAdmin.value || hasPermission('dashboard:knowledge') || hasRole(['ROLE_ADMIN', 'ROLE_SUPER_ADMIN']))
const canSensitive = computed(() => isSuperAdmin.value || hasPermission('dashboard:sensitive') || hasRole(['ROLE_ADMIN', 'ROLE_SUPER_ADMIN']))
const canUser = computed(() => isSuperAdmin.value || hasPermission('system:user') || hasRole(['ROLE_ADMIN', 'ROLE_SUPER_ADMIN']))
const canRole = computed(() => isSuperAdmin.value || hasPermission('system:role') || hasRole(['ROLE_ADMIN', 'ROLE_SUPER_ADMIN']))
const canPerm = computed(() => isSuperAdmin.value || hasPermission('system:permission') || hasRole(['ROLE_ADMIN', 'ROLE_SUPER_ADMIN']))
const canManagePreviewLink = computed(() => !isReadOnlyViewer.value && (isSuperAdmin.value || hasPermission('system:permission')))

const avatarError = ref(false)
const userInitial = computed(() => {
  const name = props.loginUser.nickname || props.loginUser.username || 'A'
  return name.trim().charAt(0).toUpperCase()
})

const navGroups = computed<NavGroup[]>(() => {
  const groups: NavGroup[] = [
    {
      title: '概览',
      items: [
        {
          key: 'dashboard',
          path: '/dashboard',
          label: '数据面板',
          desc: '全站核心指标、文章动态与快捷待办看板',
          icon: LayoutDashboard,
          visible: true,
        },
      ],
    },
    {
      title: '内容管理',
      items: [
        {
          key: 'dashboard-article',
          path: '/dashboard/article',
          label: '文章管理',
          desc: '管理已发布文章、草稿箱、置顶与状态流转',
          icon: FileText,
          visible: canArticle.value,
        },
        {
          key: 'dashboard-category',
          path: '/dashboard/category',
          label: '分类管理',
          desc: '维护文章分类目录结构与展示排序',
          icon: Folder,
          visible: canCategory.value,
        },
        {
          key: 'dashboard-tag',
          path: '/dashboard/tag',
          label: '标签管理',
          desc: '配置文章多维标签与主题色标',
          icon: Tag,
          visible: canTag.value,
        },
        {
          key: 'dashboard-comment',
          path: '/dashboard/comment',
          label: '评论审核',
          desc: '审核读者留言与文章评论互动',
          icon: MessageSquare,
          badge: props.pendingCommentCount || 0,
          visible: canComment.value,
        },
        {
          key: 'dashboard-media',
          path: '/dashboard/media',
          label: '媒体资源库',
          desc: '管理上传图片、引用计数追踪与清理',
          icon: Image,
          visible: canMedia.value,
        },
      ],
    },
    {
      title: '智能与风控',
      items: [
        {
          key: 'dashboard-knowledge',
          path: '/dashboard/knowledge',
          label: '向量知识库',
          desc: '管理全站文章分块切片、Embedding 索引与热缓存',
          icon: Sparkles,
          visible: canKnowledge.value,
        },
        {
          key: 'dashboard-sensitive-words',
          path: '/dashboard/sensitive-words',
          label: '敏感词管理',
          desc: '维护 DFA 内存词树过滤规则',
          icon: ShieldAlert,
          visible: canSensitive.value,
        },
      ],
    },
    {
      title: '系统与权限',
      items: [
        {
          key: 'system-user',
          path: '/system/user',
          label: '用户管理',
          desc: '管理系统账号、启用状态与角色分配',
          icon: Users,
          visible: canUser.value,
        },
        {
          key: 'system-role',
          path: '/system/role',
          label: '角色管理',
          desc: '配置 RBAC 角色体系与权限集授权',
          icon: Shield,
          visible: canRole.value,
        },
        {
          key: 'system-permission',
          path: '/system/permission',
          label: '权限配置',
          desc: '维护树形菜单路由与细粒度操作权限码',
          icon: KeyRound,
          visible: canPerm.value,
        },
      ],
    },
  ]

  return groups
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => i.visible),
    }))
    .filter((g) => g.items.length > 0)
})

const activeItem = computed(() => {
  for (const g of navGroups.value) {
    const found = g.items.find((i) => i.key === props.currentPage)
    if (found) return found
  }
  return navGroups.value[0]?.items[0] || { label: '管理后台', desc: '' }
})

function navigateTo(path: string) {
  mobileMenuOpen.value = false
  router.push(path)
}
</script>

<template>
  <div class="admin-shell">
    <!-- Mobile Backdrop -->
    <div
      v-if="mobileMenuOpen"
      class="admin-mobile-backdrop"
      @click="mobileMenuOpen = false"
    ></div>

    <!-- ── Left Persistent Sidebar ── -->
    <aside class="admin-sidebar" :class="{ 'is-open': mobileMenuOpen }">
      <div class="admin-sidebar-top">
        <button class="admin-brand" type="button" @click="navigateTo('/')">
          <span class="admin-brand-mark">N</span>
          <div class="admin-brand-text">
            <strong>NEXTIFY</strong>
            <span>Admin Console</span>
          </div>
        </button>
        <button class="admin-mobile-close" type="button" @click="mobileMenuOpen = false">
          <X :size="18" />
        </button>
      </div>

      <nav class="admin-nav-scroll" aria-label="后台管理导航">
        <div v-for="group in navGroups" :key="group.title" class="admin-nav-group">
          <div class="admin-nav-group-label">{{ group.title }}</div>
          <button
            v-for="item in group.items"
            :key="item.key"
            type="button"
            class="admin-nav-item"
            :class="{ active: currentPage === item.key }"
            @click="navigateTo(item.path)"
          >
            <component :is="item.icon" :size="16" class="admin-nav-icon" />
            <span class="admin-nav-label">{{ item.label }}</span>
            <span v-if="item.badge && item.badge > 0" class="admin-nav-badge">{{ item.badge }}</span>
          </button>
        </div>

        <!-- 预览链接管理入口（仅超管/具备权限管理权限的正式管理员可见） -->
        <div v-if="canManagePreviewLink" class="admin-nav-group">
          <div class="admin-nav-group-label">访问控制</div>
          <button
            type="button"
            class="admin-nav-item"
            :class="{ active: showPreviewModal }"
            @click="openPreviewLinkModal"
          >
            <Link2 :size="16" class="admin-nav-icon" />
            <span class="admin-nav-label">预览链接管理</span>
          </button>
        </div>
      </nav>

      <div class="admin-sidebar-footer">
        <div class="admin-user-card">
          <img
            v-if="loginUser.avatar && !avatarError"
            class="admin-user-avatar"
            :src="loginUser.avatar"
            alt=""
            @error="avatarError = true"
          />
          <div v-else class="admin-user-avatar-fallback">
            {{ userInitial }}
          </div>
          <div class="admin-user-meta">
            <strong>{{ loginUser.nickname || loginUser.username || '管理员' }}</strong>
            <span class="admin-role-pill" :class="{ viewer: isReadOnlyViewer }">
              {{ isReadOnlyViewer ? '只读预览' : isSuperAdmin ? '超级管理员' : '管理员' }}
            </span>
          </div>
        </div>

        <div class="admin-footer-actions">
          <button class="admin-footer-btn" type="button" @click="navigateTo('/blog')">
            <ArrowUpLeft :size="14" />
            <span>返回前台</span>
          </button>
          <button class="admin-footer-btn danger" type="button" title="退出登录" @click="emit('logout')">
            <LogOut :size="14" />
            <span>退出</span>
          </button>
        </div>
      </div>
    </aside>

    <!-- ── Right Workspace Area ── -->
    <div class="admin-workspace">
      <!-- Top Workspace Header Bar -->
      <header class="admin-topbar">
        <div class="admin-topbar-left">
          <button class="admin-mobile-trigger" type="button" @click="mobileMenuOpen = true">
            <Menu :size="18" />
          </button>
          <div class="admin-breadcrumb">
            <span class="crumb-root">Console</span>
            <span class="crumb-sep">/</span>
            <strong class="crumb-current">{{ activeItem.label }}</strong>
          </div>
        </div>

        <div class="admin-topbar-right">
          <span v-if="isReadOnlyViewer" class="admin-viewer-pill">
            <span class="viewer-dot"></span>
            只读预览权限
          </span>

          <button
            v-if="canManagePreviewLink"
            type="button"
            class="admin-preview-btn"
            @click="openPreviewLinkModal"
          >
            <Link2 :size="14" />
            <span>预览链接管理</span>
          </button>
        </div>
      </header>

      <!-- Main Subpage Content -->
      <main class="admin-workspace-content">
        <slot />
      </main>
    </div>

    <!-- ── 预览链接管理弹窗 ── -->
    <Teleport to="body">
      <div v-if="showPreviewModal" class="preview-modal-backdrop" @click.self="showPreviewModal = false">
        <div class="preview-modal-card">
          <div class="preview-modal-head">
            <div>
              <span class="preview-modal-badge">ACCESS CONTROL</span>
              <h3>预览链接管理</h3>
              <p>通过该链接访问网站将自动获得「全局只读权限」，可完整浏览所有后台模块与量化功能，但无法修改或删除任何数据。</p>
            </div>
            <button class="preview-modal-close" type="button" @click="showPreviewModal = false">
              <X :size="18" />
            </button>
          </div>

          <div class="preview-status-row">
            <div>
              <strong>链接访问状态</strong>
              <span>{{ previewConfig.enabled ? '已开启 · 持链接者可免密以只读权限访问' : '已关闭 · 任何预览链接均无法进入只读模式' }}</span>
            </div>
            <button
              type="button"
              class="preview-switch-btn"
              :class="{ enabled: previewConfig.enabled }"
              :disabled="isLoadingPreview"
              @click="handleTogglePreviewEnabled"
            >
              {{ previewConfig.enabled ? '已启用' : '已禁用' }}
            </button>
          </div>

          <div class="preview-url-box">
            <label>当前生效的专属预览链接</label>
            <div class="preview-url-input-group">
              <input :value="fullPreviewUrl" type="text" readonly @focus="($event.target as HTMLInputElement).select()" />
              <button type="button" class="preview-copy-btn" @click="handleCopyPreviewUrl">
                <Check v-if="isCopied" :size="14" />
                <Copy v-else :size="14" />
                <span>{{ isCopied ? '已复制' : '复制链接' }}</span>
              </button>
            </div>
          </div>

          <div class="preview-modal-footer">
            <button
              type="button"
              class="preview-reset-btn"
              :disabled="isLoadingPreview"
              @click="handleResetPreviewCode"
            >
              <RefreshCw :size="14" />
              <span>重置链接凭证（使旧链接失效）</span>
            </button>
            <button type="button" class="preview-done-btn" @click="showPreviewModal = false">
              完成
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.admin-shell {
  display: grid;
  grid-template-columns: 236px minmax(0, 1fr);
  min-height: 100dvh;
  background: #f8fafc;
  color: #0f172a;
}

/* ── Refined Light Editorial Sidebar ── */
.admin-sidebar {
  position: sticky;
  top: 0;
  height: 100dvh;
  background: #ffffff;
  color: #0f172a;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e2e8f0;
  z-index: 1100;
  user-select: none;
}

.admin-sidebar-top {
  height: 56px;
  padding: 0 1.1rem;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.admin-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  background: transparent;
  border: 0;
  padding: 0;
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.admin-brand-mark {
  width: 1.85rem;
  height: 1.85rem;
  border-radius: 7px;
  background: #0f172a;
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.92rem;
  font-weight: 900;
  flex-shrink: 0;
}

.admin-brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}

.admin-brand-text strong {
  font-size: 0.84rem;
  font-weight: 850;
  letter-spacing: 0.03em;
  color: #0f172a;
}

.admin-brand-text span {
  font-size: 0.65rem;
  color: #64748b;
  font-weight: 600;
}

.admin-mobile-close {
  display: none;
  background: transparent;
  border: 0;
  color: #64748b;
  cursor: pointer;
}

.admin-nav-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 0.85rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.admin-nav-group {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.admin-nav-group-label {
  padding: 0 0.65rem 0.28rem;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #94a3b8;
}

.admin-nav-item {
  width: 100%;
  min-height: 2.2rem;
  padding: 0.42rem 0.65rem;
  border-radius: 8px;
  border: 0;
  background: transparent;
  color: #475569;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease, color 0.15s ease;
}

.admin-nav-item:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.admin-nav-item.active {
  background: #0f172a;
  color: #ffffff;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.12);
}

.admin-nav-item.active .admin-nav-icon {
  color: #ffffff;
}

.admin-nav-icon {
  flex-shrink: 0;
  color: #64748b;
  transition: color 0.15s ease;
}

.admin-nav-item:hover .admin-nav-icon {
  color: #0f172a;
}

.admin-nav-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-nav-badge {
  padding: 0.08rem 0.42rem;
  border-radius: 999px;
  background: #ef4444;
  color: #ffffff;
  font-size: 0.66rem;
  font-weight: 800;
}

/* ── Sidebar Footer ── */
.admin-sidebar-footer {
  padding: 0.85rem;
  border-top: 1px solid #f1f5f9;
  background: #fafafa;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.admin-user-card {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.15rem 0.1rem;
}

.admin-user-avatar {
  width: 2.1rem;
  height: 2.1rem;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid #e2e8f0;
  background: #f1f5f9;
  flex-shrink: 0;
}

.admin-user-avatar-fallback {
  width: 2.1rem;
  height: 2.1rem;
  border-radius: 50%;
  background: #0f172a;
  color: #ffffff;
  font-size: 0.82rem;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.admin-user-meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
}

.admin-user-meta strong {
  font-size: 0.8rem;
  font-weight: 750;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-role-pill {
  width: max-content;
  padding: 0.1rem 0.42rem;
  border-radius: 4px;
  background: #e2e8f0;
  color: #475569;
  font-size: 0.62rem;
  font-weight: 750;
}

.admin-role-pill.viewer {
  background: #fef9c3;
  color: #854d0e;
}

.admin-footer-actions {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.45rem;
}

.admin-footer-btn {
  min-height: 2rem;
  padding: 0 0.65rem;
  border-radius: 7px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #475569;
  font-size: 0.75rem;
  font-weight: 650;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.admin-footer-btn:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
  color: #0f172a;
}

.admin-footer-btn.danger:hover {
  background: #fef2f2;
  border-color: #fecaca;
  color: #dc2626;
}

/* ── Topbar & Workspace ── */
.admin-workspace {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.admin-topbar {
  position: sticky;
  top: 0;
  z-index: 900;
  height: 56px;
  padding: 0 1.5rem;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.07);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.admin-topbar-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.admin-mobile-trigger {
  display: none;
  width: 2.1rem;
  height: 2.1rem;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: #ffffff;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.admin-breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.86rem;
}

.crumb-root {
  color: #64748b;
  font-weight: 600;
}

.crumb-sep {
  color: #cbd5e1;
}

.crumb-current {
  color: #111111;
  font-weight: 800;
}

.admin-topbar-right {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.admin-viewer-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.75rem;
  border-radius: 999px;
  background: #f8fafc;
  border: 1px solid rgba(0, 0, 0, 0.1);
  color: #475569;
  font-size: 0.74rem;
  font-weight: 700;
}

.viewer-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
}

.admin-preview-btn {
  min-height: 2rem;
  padding: 0 0.85rem;
  border-radius: 999px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  background: #ffffff;
  color: #111111;
  font-size: 0.76rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.admin-preview-btn:hover {
  background: #111111;
  border-color: #111111;
  color: #FDF800;
}

/* ── Preview Link Modal ── */
.preview-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2500;
  background: rgba(15, 23, 42, 0.48);
  backdrop-filter: blur(8px);
  display: grid;
  place-items: center;
  padding: 1.25rem;
}

.preview-modal-card {
  width: min(500px, 100%);
  background: #ffffff;
  border-radius: 18px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  padding: 1.5rem;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
}

.preview-modal-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.preview-modal-badge {
  display: inline-block;
  padding: 0.2rem 0.65rem;
  border-radius: 999px;
  background: #FDF800;
  color: #111111;
  font-size: 0.66rem;
  font-weight: 850;
  letter-spacing: 0.06em;
  margin-bottom: 0.45rem;
}

.preview-modal-head h3 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
  color: #111111;
}

.preview-modal-head p {
  margin: 0.35rem 0 0;
  font-size: 0.82rem;
  line-height: 1.55;
  color: #64748b;
}

.preview-modal-close {
  background: transparent;
  border: 0;
  color: #94a3b8;
  cursor: pointer;
  padding: 0.25rem;
}

.preview-status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.9rem 1rem;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.preview-status-row strong {
  display: block;
  font-size: 0.85rem;
  color: #0f172a;
  margin-bottom: 0.15rem;
}

.preview-status-row span {
  font-size: 0.76rem;
  color: #64748b;
}

.preview-switch-btn {
  min-height: 2rem;
  padding: 0 0.85rem;
  border-radius: 999px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #64748b;
  font-size: 0.76rem;
  font-weight: 750;
  cursor: pointer;
  flex-shrink: 0;
}

.preview-switch-btn.enabled {
  background: #10b981;
  border-color: #10b981;
  color: #ffffff;
}

.preview-url-box {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.preview-url-box label {
  font-size: 0.76rem;
  font-weight: 750;
  color: #475569;
}

.preview-url-input-group {
  display: flex;
  gap: 0.5rem;
}

.preview-url-input-group input {
  flex: 1;
  min-width: 0;
  min-height: 2.5rem;
  padding: 0 0.8rem;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #0f172a;
  font-size: 0.82rem;
  font-family: "SF Mono", Menlo, Consolas, monospace;
  outline: none;
}

.preview-copy-btn {
  min-height: 2.5rem;
  padding: 0 1rem;
  border-radius: 10px;
  border: 0;
  background: #111111;
  color: #ffffff;
  font-size: 0.8rem;
  font-weight: 750;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
  white-space: nowrap;
}

.preview-copy-btn:hover {
  background: #27272a;
}

.preview-modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding-top: 0.4rem;
  border-top: 1px solid #f1f5f9;
}

.preview-reset-btn {
  min-height: 2.25rem;
  padding: 0 0.85rem;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #475569;
  font-size: 0.78rem;
  font-weight: 650;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
}

.preview-reset-btn:hover:not(:disabled) {
  border-color: #0f172a;
  color: #0f172a;
}

.preview-done-btn {
  min-height: 2.25rem;
  padding: 0 1.1rem;
  border-radius: 8px;
  border: 0;
  background: #f1f5f9;
  color: #0f172a;
  font-size: 0.8rem;
  font-weight: 750;
  cursor: pointer;
}

/* ── Normalize Legacy Child Page Headers & Spacing (Vercel / Linear Minimalist) ── */
.admin-workspace-content {
  flex: 1;
  min-width: 0;
}

.admin-workspace-content :deep(.db-page),
.admin-workspace-content :deep(.sys-page),
.admin-workspace-content :deep(.mh-page),
.admin-workspace-content :deep(.sw-page) {
  padding-top: 0 !important;
  min-height: auto !important;
  background: transparent !important;
}

/* Hide redundant "Back to Dashboard" button since left sidebar is persistent */
.admin-workspace-content :deep(.sys-back-btn),
.admin-workspace-content :deep(.mh-back-btn),
.admin-workspace-content :deep(.sw-back-btn) {
  display: none !important;
}

/* Strip heavy dark hero banners into crisp, full-width light editorial headers */
.admin-workspace-content :deep(.db-hero),
.admin-workspace-content :deep(.sys-hero) {
  max-width: none !important;
  margin: 0 !important;
  padding: 1.35rem 1.75rem 0 !important;
}

.admin-workspace-content :deep(.db-hero-bg-wrap),
.admin-workspace-content :deep(.sys-hero-bg-wrap) {
  border-radius: 0 !important;
  background: transparent !important;
  min-height: auto !important;
  box-shadow: none !important;
  border-bottom: 1px solid #e2e8f0 !important;
}

.admin-workspace-content :deep(.db-orb),
.admin-workspace-content :deep(.sys-orb) {
  display: none !important;
}

.admin-workspace-content :deep(.db-hero-inner),
.admin-workspace-content :deep(.sys-hero-inner) {
  padding: 0 0 1.15rem !important;
}

.admin-workspace-content :deep(.db-hero-icon),
.admin-workspace-content :deep(.sys-hero-icon) {
  width: 2.5rem !important;
  height: 2.5rem !important;
  border-radius: 10px !important;
  background: #ffffff !important;
  border: 1px solid #e2e8f0 !important;
  color: #0f172a !important;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04) !important;
}

.admin-workspace-content :deep(.db-hero-title),
.admin-workspace-content :deep(.sys-hero-title) {
  color: #0f172a !important;
  font-size: 1.35rem !important;
  font-weight: 800 !important;
  letter-spacing: -0.02em !important;
}

.admin-workspace-content :deep(.db-hero-sub),
.admin-workspace-content :deep(.sys-hero-sub),
.admin-workspace-content :deep(.sys-hero-subtitle) {
  color: #64748b !important;
  font-size: 0.84rem !important;
}

.admin-workspace-content :deep(.sys-badge) {
  background: #f1f5f9 !important;
  color: #334155 !important;
  border-color: #e2e8f0 !important;
}

.admin-workspace-content :deep(.db-btn-new),
.admin-workspace-content :deep(.sys-btn-primary) {
  background: #0f172a !important;
  color: #ffffff !important;
  border-radius: 8px !important;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08) !important;
}

.admin-workspace-content :deep(.db-btn-new:hover),
.admin-workspace-content :deep(.sys-btn-primary:hover:not(:disabled)) {
  background: #1e293b !important;
}

.admin-workspace-content :deep(.sys-hero-right .sys-btn-secondary) {
  background: #ffffff !important;
  color: #0f172a !important;
  border-color: #e2e8f0 !important;
  border-radius: 8px !important;
}

.admin-workspace-content :deep(.sys-hero-right .sys-btn-secondary:hover:not(:disabled)) {
  background: #f8fafc !important;
  border-color: #cbd5e1 !important;
}

/* Full-width workspace body & unified 12px card radii */
.admin-workspace-content :deep(.db-body),
.admin-workspace-content :deep(.sys-body),
.admin-workspace-content :deep(.mh-body),
.admin-workspace-content :deep(.sw-body) {
  max-width: none !important;
  margin: 1.25rem 0 0 !important;
  padding: 0 1.75rem 3rem !important;
}

.admin-workspace-content :deep(.db-card),
.admin-workspace-content :deep(.db-stat-card),
.admin-workspace-content :deep(.sys-card),
.admin-workspace-content :deep(.kb-metric-card),
.admin-workspace-content :deep(.kb-table-card) {
  border-radius: 12px !important;
  border-color: #e2e8f0 !important;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03) !important;
}

/* ── Responsive ── */
@media (max-width: 900px) {
  .admin-shell {
    grid-template-columns: 1fr;
  }

  .admin-mobile-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    z-index: 1090;
  }

  .admin-sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    width: 260px;
    transform: translateX(-100%);
    transition: transform 0.22s ease;
  }

  .admin-sidebar.is-open {
    transform: translateX(0);
  }

  .admin-mobile-close {
    display: inline-flex;
  }

  .admin-mobile-trigger {
    display: inline-flex;
  }

  .admin-topbar {
    padding: 0 1rem;
  }
}

@media (max-width: 640px) {
  .admin-viewer-pill {
    display: none;
  }
  .preview-url-input-group {
    flex-direction: column;
  }
  .preview-modal-footer {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
