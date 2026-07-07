<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
  ArrowLeft, Upload, Image, Trash2, Link2, Download,
  X, ChevronLeft, ChevronRight, Search,
  HardDrive, FileWarning, CheckCircle, Clock
} from 'lucide-vue-next'
import { fetchImageList, fetchImageReference, deleteImages } from '../api'
import type { ImageInfoVo, ImageQueryDto, ImageReferenceVo, ImageDeleteResultVo, PageResponse } from '../types/blog'
import { toast } from '../utils/toast'

defineEmits<{
  back: []
}>()

// ── 类型定义 ──
type MediaStatus = 'temporary' | 'permanent' | 'orphan'
type FileType = 'jpg' | 'png' | 'webp' | 'gif'
type UsageType = 'article' | 'avatar' | 'ad' | 'other'

interface MediaItem {
  id: number
  fileName: string
  url: string
  thumbUrl: string
  fileSize: number
  width: number
  height: number
  format: FileType
  status: MediaStatus
  usageType: UsageType
  usageTypeCode: number
  usageId?: number
  usageTitle?: string
  uploadTime: string
}

// ── 转换后端数据 ──
function mapImageVo(item: ImageInfoVo): MediaItem {
  const isTemp = item.isTemporary
  const status: MediaStatus = isTemp ? 'temporary' : (item.referenceCount === 0 ? 'orphan' : 'permanent')
  const ext = item.mimeType?.split('/').pop() || 'jpg'
  const format = (['jpg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg') as FileType
  const usageTypeMap: Record<string, UsageType> = {
    '1': 'article', '2': 'avatar', '3': 'article', '4': 'other', '100': 'other',
  }
  const usageType = usageTypeMap[String(item.usageType)] || 'other'
  return {
    id: item.id,
    fileName: item.originalName || item.fileName,
    url: item.url,
    thumbUrl: item.url,
    fileSize: item.size,
    width: item.width,
    height: item.height,
    format,
    status,
    usageType,
    usageTypeCode: Number(item.usageType) || 100,
    usageId: item.usageId || undefined,
    usageTitle: item.title || undefined,
    uploadTime: item.createTime?.split('T')[0] || '',
  }
}

// ─ 状态 ──
const allItems = ref<MediaItem[]>([])
const totalRecords = ref(0)
const loading = ref(false)
const selectedStatus = ref<'all' | MediaStatus>('all')
const selectedFormat = ref<'all' | FileType>('all')
const selectedUsage = ref<string>('all')
const sortBy = ref<'newest' | 'oldest' | 'largest' | 'smallest'>('newest')
const searchQuery = ref('')
const currentPage = ref(1)
const pageSize = 12
const selectedItems = ref<Set<number>>(new Set())
const showDetailModal = ref(false)
const detailItem = ref<MediaItem | null>(null)
const detailReferences = ref<ImageReferenceVo[]>([])
const showUploadModal = ref(false)

//  加载数据 ──
async function loadData() {
  loading.value = true
  const params: ImageQueryDto = {
    pageNum: currentPage.value,
    pageSize,
  }
  if (searchQuery.value.trim()) params.keyword = searchQuery.value.trim()
  if (selectedStatus.value !== 'all') {
    if (selectedStatus.value === 'temporary') params.isTemporary = true
    else if (selectedStatus.value === 'permanent') params.isTemporary = false
  }
  if (selectedUsage.value !== 'all') {
    params.usageType = selectedUsage.value
  }
  if (selectedFormat.value !== 'all') {
    const mimeMap: Record<FileType, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' }
    params.mimeType = mimeMap[selectedFormat.value]
  }

  try {
    const result: PageResponse<ImageInfoVo> = await fetchImageList(params)
    allItems.value = result.records.map(mapImageVo)
    totalRecords.value = result.total
  } catch {
    allItems.value = []
    totalRecords.value = 0
  } finally {
    loading.value = false
  }
}

// ── 存储统计 ──
const storageStats = computed(() => {
  const total = totalRecords.value
  const totalSize = allItems.value.reduce((s, i) => s + i.fileSize, 0)
  const orphanCount = allItems.value.filter(i => i.status === 'orphan').length
  const tempCount = allItems.value.filter(i => i.status === 'temporary').length
  return { total, totalSize, orphanCount, tempCount }
})

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB'
  return (bytes / 1073741824).toFixed(2) + ' GB'
}

// ── 排序（前端对当前页排序） ──
const sortedItems = computed(() => {
  const items = [...allItems.value]
  switch (sortBy.value) {
    case 'newest': items.sort((a, b) => b.uploadTime.localeCompare(a.uploadTime)); break
    case 'oldest': items.sort((a, b) => a.uploadTime.localeCompare(b.uploadTime)); break
    case 'largest': items.sort((a, b) => b.fileSize - a.fileSize); break
    case 'smallest': items.sort((a, b) => a.fileSize - b.fileSize); break
  }
  return items
})

const totalPages = computed(() => Math.ceil(totalRecords.value / pageSize))
const paginatedItems = computed(() => sortedItems.value)

// ── 过滤条件变化时重新加载 ──
watch([selectedStatus, selectedFormat, selectedUsage, searchQuery], () => {
  currentPage.value = 1
  loadData()
})

watch(currentPage, () => {
  loadData()
})

// ── 操作 ──
async function openDetail(item: MediaItem) {
  detailItem.value = item
  detailReferences.value = []
  showDetailModal.value = true
  try {
    detailReferences.value = await fetchImageReference(String(item.id))
  } catch {
    detailReferences.value = []
  }
}

function toggleSelect(id: number) {
  if (selectedItems.value.has(id)) selectedItems.value.delete(id)
  else selectedItems.value.add(id)
}

function selectAll() {
  if (selectedItems.value.size === paginatedItems.value.length) {
    selectedItems.value.clear()
  } else {
    paginatedItems.value.forEach(i => selectedItems.value.add(i.id))
  }
}

async function deleteSelected() {
  if (selectedItems.value.size === 0) return
  const ids = Array.from(selectedItems.value)
  try {
    const result: ImageDeleteResultVo = await deleteImages(ids)
    if (result.successCount > 0) {
      toast(`成功删除 ${result.successCount} 张图片`, 'success')
      loadData()
    }
    if (result.errorMessages.length > 0) {
      toast(result.errorMessages.join('; '), 'error')
    }
  } catch {
    toast('删除失败，请稍后重试', 'error')
  } finally {
    selectedItems.value.clear()
  }
}

async function deleteFromDetail() {
  if (!detailItem.value) return
  try {
    const result: ImageDeleteResultVo = await deleteImages([detailItem.value.id])
    if (result.successCount > 0) {
      toast('删除成功', 'success')
      showDetailModal.value = false
      loadData()
    }
    if (result.errorMessages.length > 0) {
      toast(result.errorMessages.join('; '), 'error')
    }
  } catch {
    toast('删除失败，请稍后重试', 'error')
  }
}

function copyLink() {
  if (!detailItem.value) return
  navigator.clipboard.writeText(detailItem.value.url).then(() => {
    toast('链接已复制', 'success')
  }).catch(() => {
    toast('复制失败', 'error')
  })
}

function downloadFile() {
  if (!detailItem.value) return
  const a = document.createElement('a')
  a.href = detailItem.value.url
  a.download = detailItem.value.fileName
  a.target = '_blank'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

function cleanOrphans() {
  // TODO: 调用后端清理孤儿图片接口
  loadData()
}

function statusLabel(s: MediaStatus): string {
  return s === 'temporary' ? '临时' : s === 'permanent' ? '持久' : '孤儿'
}

function statusColor(s: MediaStatus): string {
  return s === 'temporary' ? '#f59e0b' : s === 'permanent' ? '#22c55e' : '#ef4444'
}

function usageLabelFromCode(code: number): string {
  const map: Record<number, string> = { 1: '文章封面', 2: '用户头像', 3: '文章内容', 4: '评估图像', 100: '其他' }
  return map[code] || '其他'
}

function formatColor(f: FileType): string {
  return f === 'jpg' ? '#3b82f6' : f === 'png' ? '#8b5cf6' : f === 'webp' ? '#06b6d4' : '#f97316'
}

// ── 分页 ──
function goToPage(p: number) {
  if (p >= 1 && p <= totalPages.value) currentPage.value = p
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="media-hub">
    <!-- 顶部工具栏 -->
    <div class="mh-toolbar">
      <button class="mh-back-btn" type="button" @click="$emit('back')">
        <ArrowLeft :size="16" />
        <span>返回控制面板</span>
      </button>
      <h1 class="mh-title">媒体资源管理</h1>
      <button class="mh-upload-btn" type="button" @click="showUploadModal = true">
        <Upload :size="14" />
        <span>上传图片</span>
      </button>
    </div>

    <!-- 存储概览 -->
    <div class="mh-stats">
      <div class="mh-stat-card">
        <HardDrive :size="18" class="mh-stat-icon" style="color:#2563eb" />
        <div class="mh-stat-info">
          <span class="mh-stat-value">{{ storageStats.total }}</span>
          <span class="mh-stat-label">总文件数</span>
        </div>
      </div>
      <div class="mh-stat-card">
        <Image :size="18" class="mh-stat-icon" style="color:#7c3aed" />
        <div class="mh-stat-info">
          <span class="mh-stat-value">{{ formatSize(storageStats.totalSize) }}</span>
          <span class="mh-stat-label">总占用空间</span>
        </div>
      </div>
      <div class="mh-stat-card">
        <FileWarning :size="18" class="mh-stat-icon" style="color:#ef4444" />
        <div class="mh-stat-info">
          <span class="mh-stat-value">{{ storageStats.orphanCount }}</span>
          <span class="mh-stat-label">孤儿图片</span>
        </div>
        <button v-if="storageStats.orphanCount > 0" class="mh-clean-btn" type="button" @click="cleanOrphans">
          清理
        </button>
      </div>
      <div class="mh-stat-card">
        <Clock :size="18" class="mh-stat-icon" style="color:#f59e0b" />
        <div class="mh-stat-info">
          <span class="mh-stat-value">{{ storageStats.tempCount }}</span>
          <span class="mh-stat-label">临时图片</span>
        </div>
      </div>
    </div>

    <!-- 过滤栏 -->
    <div class="mh-filters">
      <div class="mh-filter-group">
        <span class="mh-filter-label">状态</span>
        <button
          v-for="s in ['all', 'temporary', 'permanent', 'orphan']"
          :key="s"
          class="mh-filter-chip"
          :class="{ active: selectedStatus === s }"
          @click="selectedStatus = s as any; currentPage = 1"
        >
          {{ s === 'all' ? '全部' : statusLabel(s as MediaStatus) }}
        </button>
      </div>
      <div class="mh-filter-group">
        <span class="mh-filter-label">格式</span>
        <button
          v-for="f in ['all', 'jpg', 'png', 'webp', 'gif']"
          :key="f"
          class="mh-filter-chip"
          :class="{ active: selectedFormat === f }"
          @click="selectedFormat = f as any; currentPage = 1"
        >
          {{ f === 'all' ? '全部' : f.toUpperCase() }}
        </button>
      </div>
      <div class="mh-filter-group">
        <span class="mh-filter-label">用途</span>
        <button
          v-for="u in [
            { key: 'all', label: '全部' },
            { key: '1', label: '文章封面' },
            { key: '2', label: '用户头像' },
            { key: '3', label: '文章内容' },
            { key: '4', label: '评估图像' },
            { key: '100', label: '其他' },
          ]"
          :key="u.key"
          class="mh-filter-chip"
          :class="{ active: selectedUsage === u.key }"
          @click="selectedUsage = u.key; currentPage = 1"
        >
          {{ u.label }}
        </button>
      </div>
      <div class="mh-filter-group mh-sort-group">
        <span class="mh-filter-label">排序</span>
        <select v-model="sortBy" class="mh-sort-select">
          <option value="newest">最新上传</option>
          <option value="oldest">最早上传</option>
          <option value="largest">最大文件</option>
          <option value="smallest">最小文件</option>
        </select>
      </div>
      <div class="mh-search-box">
        <Search :size="14" class="mh-search-icon" />
        <input v-model="searchQuery" placeholder="搜索文件名..." class="mh-search-input" @input="currentPage = 1" />
      </div>
    </div>

    <!-- 批量操作栏 -->
    <div v-if="selectedItems.size > 0" class="mh-bulk-bar">
      <span>已选择 {{ selectedItems.size }} 项</span>
      <button class="mh-bulk-btn danger" type="button" @click="deleteSelected">
        <Trash2 :size="13" />
        批量删除
      </button>
    </div>

    <!-- 图片网格 -->
    <div class="mh-grid">
      <!-- 全选 -->
      <div class="mh-grid-item mh-select-all" @click="selectAll">
        <CheckCircle :size="20" :class="{ checked: selectedItems.size === paginatedItems.length && paginatedItems.length > 0 }" />
        <span>全选</span>
      </div>
      <!-- 图片卡片 -->
      <div
        v-for="item in paginatedItems"
        :key="item.id"
        class="mh-grid-item"
        :class="{ selected: selectedItems.has(item.id) }"
        @click="openDetail(item)"
      >
        <div class="mh-item-thumb">
          <img :src="item.url" :alt="item.fileName" class="mh-item-img" loading="lazy" />
          <div class="mh-item-status" :style="{ background: statusColor(item.status) }">
            {{ statusLabel(item.status) }}
          </div>
          <div class="mh-item-check" @click.stop="toggleSelect(item.id)">
            <CheckCircle :size="16" :class="{ checked: selectedItems.has(item.id) }" />
          </div>
        </div>
        <div class="mh-item-info">
          <span class="mh-item-name" :title="item.fileName">{{ item.fileName }}</span>
          <span class="mh-item-meta">{{ formatSize(item.fileSize) }} · {{ item.width }}×{{ item.height }}</span>
          <span class="mh-item-usage-type">{{ usageLabelFromCode(item.usageTypeCode) }}</span>
          <span v-if="item.usageTitle" class="mh-item-usage">
            <Link2 :size="10" />
            {{ item.usageTitle }}
          </span>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="totalPages > 1" class="mh-pagination">
      <button class="mh-page-btn" :disabled="currentPage === 1" @click="goToPage(currentPage - 1)">
        <ChevronLeft :size="14" />
      </button>
      <button
        v-for="p in totalPages"
        :key="p"
        class="mh-page-btn"
        :class="{ active: currentPage === p }"
        @click="goToPage(p)"
      >
        {{ p }}
      </button>
      <button class="mh-page-btn" :disabled="currentPage === totalPages" @click="goToPage(currentPage + 1)">
        <ChevronRight :size="14" />
      </button>
    </div>

    <!-- 图片详情弹窗 -->
    <Transition name="mh-modal-fade">
      <div v-if="showDetailModal && detailItem" class="mh-detail-overlay" @click.self="showDetailModal = false">
        <div class="mh-detail-modal">
          <button class="mh-detail-close" type="button" @click="showDetailModal = false">
            <X :size="18" />
          </button>
          <div class="mh-detail-preview">
            <img :src="detailItem.url" :alt="detailItem.fileName" class="mh-detail-img" />
          </div>
          <div class="mh-detail-info">
            <h3>{{ detailItem.fileName }}</h3>
            <div class="mh-detail-grid">
              <div class="mh-detail-row">
                <span class="mh-detail-label">大小</span>
                <span class="mh-detail-value">{{ formatSize(detailItem.fileSize) }}</span>
              </div>
              <div class="mh-detail-row">
                <span class="mh-detail-label">尺寸</span>
                <span class="mh-detail-value">{{ detailItem.width }} × {{ detailItem.height }}</span>
              </div>
              <div class="mh-detail-row">
                <span class="mh-detail-label">格式</span>
                <span class="mh-detail-value" :style="{ color: formatColor(detailItem.format) }">{{ detailItem.format.toUpperCase() }}</span>
              </div>
              <div class="mh-detail-row">
                <span class="mh-detail-label">上传时间</span>
                <span class="mh-detail-value">{{ detailItem.uploadTime }}</span>
              </div>
              <div class="mh-detail-row">
                <span class="mh-detail-label">状态</span>
                <span class="mh-detail-value" :style="{ color: statusColor(detailItem.status) }">
                  {{ statusLabel(detailItem.status) }}
                </span>
              </div>
              <div class="mh-detail-row">
                <span class="mh-detail-label">用途</span>
                <span class="mh-detail-value">{{ usageLabelFromCode(detailItem.usageTypeCode) }}</span>
              </div>
            </div>
            <div v-if="detailReferences.length > 0" class="mh-detail-references">
              <p class="mh-ref-title">引用信息</p>
              <div v-for="(ref, idx) in detailReferences" :key="idx" class="mh-ref-item">
                <span class="mh-ref-type">{{ usageLabelFromCode(ref.usageType) }}</span>
                <span class="mh-ref-title-text">{{ ref.sourceTitle || '—' }}</span>
                <a v-if="ref.sourceUrl" :href="ref.sourceUrl" target="_blank" class="mh-ref-link">查看</a>
              </div>
            </div>
            <div class="mh-detail-actions">
              <button class="mh-detail-action-btn" type="button" @click="copyLink">
                <Link2 :size="13" />
                复制链接
              </button>
              <button class="mh-detail-action-btn" type="button" @click="downloadFile">
                <Download :size="13" />
                下载
              </button>
              <button class="mh-detail-action-btn danger" type="button" @click="deleteFromDetail">
                <Trash2 :size="13" />
                删除
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 上传弹窗（占位） -->
    <Transition name="mh-modal-fade">
      <div v-if="showUploadModal" class="mh-detail-overlay" @click.self="showUploadModal = false">
        <div class="mh-detail-modal mh-upload-modal">
          <button class="mh-detail-close" type="button" @click="showUploadModal = false">
            <X :size="18" />
          </button>
          <h3>上传图片</h3>
          <div class="mh-upload-dropzone">
            <Upload :size="32" style="color:#94a3b8" />
            <p>拖拽图片到此处，或点击上传</p>
            <span class="mh-upload-hint">支持 JPG、PNG、WebP、GIF，最大 10MB</span>
            <!-- TODO: 接入实际上传逻辑 -->
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.media-hub {
  max-width: 64rem;
  margin: 0 auto;
  padding: 1.5rem;
}

/* 工具栏 */
.mh-toolbar {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.mh-back-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  transition: background 0.15s, color 0.15s;
}
.mh-back-btn:hover { background: #f1f5f9; color: #0f172a; }
.mh-title {
  flex: 1;
  font-size: 1.35rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
}
.mh-upload-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  border: none;
  background: #2563eb;
  color: #fff;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  padding: 0.6rem 1.2rem;
  border-radius: 0.6rem;
  transition: background 0.15s;
}
.mh-upload-btn:hover { background: #1d4ed8; }

/* 存储概览 */
.mh-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.mh-stat-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  background: #fff;
  border-radius: 0.85rem;
  border: 1px solid rgba(226, 232, 240, 0.7);
  position: relative;
}
.mh-stat-info { display: flex; flex-direction: column; }
.mh-stat-value { font-size: 1.25rem; font-weight: 800; color: #0f172a; }
.mh-stat-label { font-size: 0.75rem; color: #94a3b8; font-weight: 600; }
.mh-clean-btn {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  background: #fef2f2;
  color: #dc2626;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  padding: 0.3rem 0.65rem;
  border-radius: 0.4rem;
  transition: background 0.15s;
}
.mh-clean-btn:hover { background: #fee2e2; }

/* 过滤栏 */
.mh-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1.25rem;
  padding: 1rem 1.25rem;
  background: #fff;
  border-radius: 0.85rem;
  border: 1px solid rgba(226, 232, 240, 0.7);
  margin-bottom: 1rem;
}
.mh-filter-group { display: flex; align-items: center; gap: 0.4rem; }
.mh-filter-label { font-size: 0.75rem; color: #94a3b8; font-weight: 700; white-space: nowrap; }
.mh-filter-chip {
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #64748b;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.3rem 0.65rem;
  border-radius: 999px;
  transition: all 0.15s;
}
.mh-filter-chip:hover { border-color: #cbd5e1; color: #334155; }
.mh-filter-chip.active { background: #2563eb; color: #fff; border-color: #2563eb; }
.mh-sort-select {
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #334155;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.3rem 0.5rem;
  border-radius: 0.4rem;
  cursor: pointer;
}
.mh-search-box {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  padding: 0.35rem 0.65rem;
  background: #f8fafc;
}
.mh-search-icon { color: #94a3b8; }
.mh-search-input {
  border: none;
  background: transparent;
  outline: none;
  font-size: 0.8rem;
  color: #334155;
  width: 10rem;
}

/* 批量操作栏 */
.mh-bulk-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.6rem 1rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 0.6rem;
  margin-bottom: 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #dc2626;
}
.mh-bulk-btn {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  border: none;
  background: #dc2626;
  color: #fff;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  padding: 0.4rem 0.8rem;
  border-radius: 0.4rem;
}

/* 图片网格 */
.mh-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.mh-grid-item {
  border-radius: 0.75rem;
  border: 2px solid transparent;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
  background: #fff;
}
.mh-grid-item:hover { box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08); }
.mh-grid-item.selected { border-color: #2563eb; }
.mh-select-all {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 180px;
  background: #f8fafc;
  border: 2px dashed #e2e8f0;
  color: #94a3b8;
  font-size: 0.8rem;
  font-weight: 600;
}
.mh-select-all .checked { color: #2563eb; }
.mh-item-thumb {
  position: relative;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: #f1f5f9;
}
.mh-item-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.mh-item-placeholder { display: flex; align-items: center; justify-content: center; }
.mh-item-status {
  position: absolute;
  top: 0.4rem;
  left: 0.4rem;
  font-size: 0.6rem;
  font-weight: 700;
  color: #fff;
  padding: 0.15rem 0.4rem;
  border-radius: 0.3rem;
}
.mh-item-check {
  position: absolute;
  top: 0.4rem;
  right: 0.4rem;
  width: 1.4rem;
  height: 1.4rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
}
.mh-item-check .checked { color: #2563eb; }
.mh-item-info {
  padding: 0.6rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.mh-item-name {
  font-size: 0.78rem;
  font-weight: 700;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mh-item-meta {
  font-size: 0.68rem;
  color: #94a3b8;
  font-weight: 500;
}
.mh-item-usage-type {
  display: inline-flex;
  align-items: center;
  padding: 0.1rem 0.4rem;
  background: #eef2ff;
  color: #6366f1;
  border-radius: 0.25rem;
  font-size: 0.65rem;
  font-weight: 700;
  width: fit-content;
}
.mh-item-usage {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.68rem;
  color: #2563eb;
  font-weight: 600;
}

/* 分页 */
.mh-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  margin-bottom: 2rem;
}
.mh-page-btn {
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
.mh-page-btn:hover:not(:disabled) { border-color: #cbd5e1; color: #334155; }
.mh-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.mh-page-btn.active { background: #2563eb; color: #fff; border-color: #2563eb; }

/* 详情弹窗 */
.mh-detail-overlay {
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
.mh-detail-modal {
  width: min(480px, 100%);
  max-height: 90vh;
  overflow-y: auto;
  background: #fff;
  border-radius: 1.25rem;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.2);
  position: relative;
}
.mh-detail-close {
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
.mh-detail-preview {
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: #f1f5f9;
}
.mh-detail-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}
.mh-detail-info { padding: 1.25rem 1.5rem 1.5rem; }
.mh-detail-info h3 {
  margin: 0 0 1rem;
  font-size: 1.05rem;
  font-weight: 800;
  color: #0f172a;
  word-break: break-all;
}
.mh-detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem 1.5rem;
  margin-bottom: 1rem;
}
.mh-detail-row { display: flex; flex-direction: column; gap: 0.15rem; }
.mh-detail-label { font-size: 0.7rem; color: #94a3b8; font-weight: 600; }
.mh-detail-value { font-size: 0.85rem; color: #334155; font-weight: 700; }
.mh-detail-usage {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 0.75rem;
  background: #f0f9ff;
  border-radius: 0.5rem;
  font-size: 0.8rem;
  color: #2563eb;
  font-weight: 600;
  margin-bottom: 1rem;
}
.mh-detail-references {
  margin-bottom: 1rem;
}
.mh-ref-title {
  margin: 0 0 0.5rem;
  font-size: 0.75rem;
  color: #94a3b8;
  font-weight: 700;
}
.mh-ref-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: #f8fafc;
  border-radius: 0.5rem;
  margin-bottom: 0.4rem;
  font-size: 0.8rem;
}
.mh-ref-type {
  flex-shrink: 0;
  padding: 0.15rem 0.5rem;
  background: #eef2ff;
  color: #6366f1;
  border-radius: 0.25rem;
  font-size: 0.7rem;
  font-weight: 700;
}
.mh-ref-title-text {
  flex: 1;
  color: #334155;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mh-ref-link {
  flex-shrink: 0;
  color: #2563eb;
  font-size: 0.75rem;
  font-weight: 700;
  text-decoration: none;
}
.mh-ref-link:hover { text-decoration: underline; }
.mh-detail-link-btn {
  margin-left: auto;
  border: none;
  background: #2563eb;
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
  cursor: pointer;
  padding: 0.25rem 0.6rem;
  border-radius: 0.3rem;
}
.mh-detail-actions { display: flex; gap: 0.5rem; position: relative; z-index: 1; }
.mh-detail-action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #475569;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  padding: 0.55rem 0.5rem;
  border-radius: 0.5rem;
  transition: all 0.15s;
  position: relative;
  z-index: 1;
}
.mh-detail-action-btn:hover { background: #f8fafc; border-color: #cbd5e1; }
.mh-detail-action-btn.danger { color: #dc2626; border-color: #fecaca; }
.mh-detail-action-btn.danger:hover { background: #fef2f2; }

/* 上传弹窗 */
.mh-upload-modal { padding: 1.5rem; }
.mh-upload-modal h3 {
  margin: 0 0 1rem;
  font-size: 1.05rem;
  font-weight: 800;
  color: #0f172a;
}
.mh-upload-dropzone {
  border: 2px dashed #e2e8f0;
  border-radius: 0.85rem;
  padding: 2.5rem 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.mh-upload-dropzone:hover { border-color: #2563eb; background: #f0f9ff; }
.mh-upload-dropzone p { margin: 0; font-size: 0.9rem; color: #475569; font-weight: 600; }
.mh-upload-hint { font-size: 0.75rem; color: #94a3b8; }

/* 动画 */
.mh-modal-fade-enter-active, .mh-modal-fade-leave-active { transition: opacity 0.2s ease; }
.mh-modal-fade-enter-from, .mh-modal-fade-leave-to { opacity: 0; }

/* 响应式 */
@media (max-width: 768px) {
  .media-hub { padding: 1rem 0.75rem; }
  .mh-stats { grid-template-columns: repeat(2, 1fr); }
  .mh-filters { flex-direction: column; align-items: flex-start; gap: 0.75rem; }
  .mh-filter-group { flex-wrap: wrap; }
  .mh-filter-label { width: 100%; margin-bottom: 0.25rem; }
  .mh-search-box { margin-left: 0; width: 100%; }
  .mh-search-input { width: 100%; }
  .mh-grid { grid-template-columns: repeat(2, 1fr); gap: 0.75rem; }
  .mh-toolbar { flex-wrap: wrap; }
  .mh-title { font-size: 1.1rem; }
  .mh-detail-modal { width: 100vw; max-width: 100vw; border-radius: 1rem 1rem 0 0; max-height: 90vh; overflow-y: auto; }
  .mh-detail-overlay { align-items: flex-end; padding: 0; }
}
</style>