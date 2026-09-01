<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch, onMounted, onUnmounted } from 'vue'
import { Bold, Code2, Heading, Image, Italic, List, ListOrdered, Quote, X, PenLine, Settings2, ListTree, ChevronRight, Table2, Plus, Minus, Trash2 } from 'lucide-vue-next'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import TiptapImage from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import TurndownService from 'turndown'
import type { ComponentPublicInstance } from 'vue'
import type { ArticlePublishRequest, Category, Tag } from '../types/blog'
import { renderMarkdown } from '../utils/markdown'

type PendingMarkdownImage = {
  id: number
  src: string
  alt: string
}

const props = defineProps<{
  publishForm: ArticlePublishRequest
  categories: Category[]
  tags: Tag[]
  publishError: string
  isPublishing: boolean
  isEditMode: boolean
  isPreviewingMarkdown: boolean
  isUploadingImage: boolean
  markdownPreviewHtml: string
  pendingMarkdownImage: PendingMarkdownImage | null
  draftStatus: string
  hasSavedDraft: boolean
}>()

const emit = defineEmits<{
  close: []
  publish: []
  insertMarkdown: [before: string, after?: string, placeholder?: string]
  triggerImageUpload: []
  uploadMarkdownImage: [event: Event]
  'update:isPreviewingMarkdown': [value: boolean]
  contentTextareaReady: [textarea: HTMLTextAreaElement | null]
  imageInputReady: [input: HTMLInputElement | null]
  uploadCoverImage: [event: Event]
  removeCoverImage: []
  discardDraft: []
  saveDraft: []
}>()

function setImageInput(element: Element | ComponentPublicInstance | null) {
  const input = element instanceof HTMLInputElement ? element : null
  markdownImageInput.value = input
  emit('imageInputReady', input)
}

const coverImageInput = ref<HTMLInputElement | null>(null)
const markdownImageInput = ref<HTMLInputElement | null>(null)
const markdownImageInputId = 'publish-markdown-image-input'
let lastEditorHtml = ''
let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null
let isSyncingFromEditor = false
let isComposing = false

function scheduleSyncToForm() {
  if (syncDebounceTimer) clearTimeout(syncDebounceTimer)
  syncDebounceTimer = setTimeout(() => {
    doSyncToForm()
  }, 500)
}

function doSyncToForm() {
  if (!editor.value) return
  if (isComposing) return
  const html = editor.value.getHTML()
  const isEmpty = editor.value.isEmpty
  lastEditorHtml = html
  isSyncingFromEditor = true
  props.publishForm.contentHtml = isEmpty ? '' : html
  props.publishForm.content = isEmpty ? '' : turndown.turndown(html).trim()
  isSyncingFromEditor = false
}
const turndown = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced'
})

turndown.addRule('fencedCodeBlocks', {
  filter: ['pre'],
  replacement: (_content, node) => {
    const code = node.textContent || ''
    return `\n\n\`\`\`\n${code.replace(/\n$/, '')}\n\`\`\`\n\n`
  }
})

turndown.addRule('tables', {
  filter: ['table'],
  replacement: (_content, node) => {
    const table = node as HTMLTableElement
    const rows = Array.from(table.querySelectorAll('tr'))
    if (rows.length === 0) return ''

    const cells = (row: HTMLTableRowElement) =>
      Array.from(row.cells).map(cell => cell.textContent.trim().replace(/\|/g, '\\|'))

    const headerRow = rows[0]
    const headerCells = cells(headerRow)
    if (headerCells.length === 0) return ''

    const separator = headerCells.map(() => '---').join(' | ')
    const headerLine = `| ${headerCells.join(' | ')} |`
    const separatorLine = `| ${separator} |`

    const dataRows = rows.slice(1).map(row => {
      const rowCells = cells(row)
      return `| ${rowCells.join(' | ')} |`
    })

    return `\n\n${headerLine}\n${separatorLine}\n${dataRows.join('\n')}\n\n`
  }
})

function getEditorHtml() {
  if (props.publishForm.contentHtml) return props.publishForm.contentHtml
  if (props.publishForm.content?.trim()) return renderMarkdown(props.publishForm.content)
  return ''
}

function syncPublishContentFromEditor() {
  if (!editor.value) return
  if (isComposing) return
  lastEditorHtml = editor.value.getHTML()
  scheduleSyncToForm()
}

const editor = useEditor({
  content: getEditorHtml(),
  extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] }
    }),
    TiptapImage.configure({
      inline: false,
      allowBase64: false,
      HTMLAttributes: {
        loading: 'lazy'
      }
    }),
    Link.configure({
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
      HTMLAttributes: {
        target: '_blank',
        rel: 'noopener noreferrer'
      }
    }),
    Placeholder.configure({
      placeholder: '开始写作... 支持直接输入 Markdown 快捷语法'
    }),
    Table.configure({
      resizable: true,
      lastColumnResizable: false,
      HTMLAttributes: {
        class: 'tiptap-table'
      }
    }),
    TableRow,
    TableHeader.configure({
      HTMLAttributes: {
        class: 'tiptap-table-header'
      }
    }),
    TableCell.configure({
      HTMLAttributes: {
        class: 'tiptap-table-cell'
      }
    }),
  ],
  editorProps: {
    attributes: {
      class: 'rich-editor-content markdown-body'
    },
    handleDOMEvents: {
      compositionstart: () => { isComposing = true; return false },
      compositionend: () => {
        isComposing = false
        lastEditorHtml = editor.value?.getHTML() || ''
        if (syncDebounceTimer) clearTimeout(syncDebounceTimer)
        scheduleSyncToForm()
        return false
      },
    }
  },
  onUpdate: syncPublishContentFromEditor
})

watch(
  () => [props.publishForm.contentHtml, props.publishForm.content],
  () => {
    if (!editor.value) return
    if (isSyncingFromEditor) return

    const nextHtml = getEditorHtml()
    const currentHtml = editor.value.getHTML()
    if (nextHtml === currentHtml) {
      lastEditorHtml = currentHtml
      return
    }
    if (nextHtml === lastEditorHtml) return

    lastEditorHtml = nextHtml
    editor.value.commands.setContent(nextHtml, { emitUpdate: false })
  },
  { flush: 'post' }
)

watch(
  () => props.pendingMarkdownImage?.id,
  () => {
    const image = props.pendingMarkdownImage
    if (!image || !editor.value) return

    editor.value
      .chain()
      .focus()
      .setImage({ src: image.src, alt: image.alt })
      .run()
  }
)

onBeforeUnmount(() => {
  if (syncDebounceTimer) clearTimeout(syncDebounceTimer)
  editor.value?.destroy()
})

function setCoverImageInput(element: Element | ComponentPublicInstance | null) {
  coverImageInput.value = element instanceof HTMLInputElement ? element : null
}

function triggerCoverImageUpload() {
  coverImageInput.value?.click()
}

function toggleTag(tagId: number) {
  const idx = props.publishForm.tagIds.indexOf(tagId)
  if (idx >= 0) props.publishForm.tagIds.splice(idx, 1)
  else props.publishForm.tagIds.push(tagId)
}

function tagChipStyle(tag: Tag): Record<string, string> {
  if (!props.publishForm.tagIds.includes(tag.id) || !tag.color) return {}
  return { background: tag.color, borderColor: tag.color, color: '#fff' }
}

function handleCoverImageChange(event: Event) {
  emit('uploadCoverImage', event)
}

function removeCoverImage() {
  emit('removeCoverImage')
}

const isMobile = ref(typeof window !== 'undefined' && window.innerWidth <= 768)
const sidebarCollapsed = ref(true)

const wordCount = computed(() => {
  const text = props.publishForm.content || ''
  return text.replace(/\s+/g, '').length
})

const isHeadingActive = computed(() => editor.value?.isActive('heading', { level: 2 }) || false)
const isBoldActive = computed(() => editor.value?.isActive('bold') || false)
const isItalicActive = computed(() => editor.value?.isActive('italic') || false)
const isQuoteActive = computed(() => editor.value?.isActive('blockquote') || false)
const isListActive = computed(() => editor.value?.isActive('bulletList') || false)
const isOrderedListActive = computed(() => editor.value?.isActive('orderedList') || false)
const isCodeBlockActive = computed(() => editor.value?.isActive('codeBlock') || false)
const isInTable = computed(() => editor.value?.isActive('tableCell') || editor.value?.isActive('tableHeader') || false)

const showTableOps = ref(false)

function toggleTableOps() {
  showTableOps.value = !showTableOps.value
}

const showTableDialog = ref(false)
const tableRows = ref(3)
const tableCols = ref(3)

function insertTable() {
  if (!editor.value) return
  editor.value.chain().focus().insertTable({ rows: tableRows.value, cols: tableCols.value, withHeaderRow: true }).run()
  showTableDialog.value = false
}

function addRowBefore() {
  if (!editor.value) return
  editor.value.chain().focus().addRowBefore().run()
}

function addRowAfter() {
  if (!editor.value) return
  editor.value.chain().focus().addRowAfter().run()
}

function addColumnBefore() {
  if (!editor.value) return
  editor.value.chain().focus().addColumnBefore().run()
}

function addColumnAfter() {
  if (!editor.value) return
  editor.value.chain().focus().addColumnAfter().run()
}

function deleteRow() {
  if (!editor.value) return
  editor.value.chain().focus().deleteRow().run()
}

function deleteColumn() {
  if (!editor.value) return
  editor.value.chain().focus().deleteColumn().run()
}

function deleteTable() {
  if (!editor.value) return
  editor.value.chain().focus().deleteTable().run()
}

type TocItem = { id: string; text: string; level: number; pos: number }

const tocCollapsed = ref(isMobile.value)
const tocItems = ref<TocItem[]>([])
const activeTocId = ref('')
let tocObserver: IntersectionObserver | null = null

function extractTocFromEditor() {
  if (!editor.value) { tocItems.value = []; return }
  const { state } = editor.value
  const items: TocItem[] = []
  state.doc.descendants((node, pos) => {
    if (node.type.name === 'heading') {
      const id = `toc-heading-${items.length}`
      items.push({
        id,
        text: node.textContent || '',
        level: node.attrs.level as number,
        pos,
      })
    }
    return true
  })
  tocItems.value = items
}

function scrollToTocItem(id: string) {
  if (!editor.value) return
  const idx = tocItems.value.findIndex(t => t.id === id)
  if (idx < 0) return
  const headings = editor.value.view.dom.querySelectorAll('h1, h2, h3')
  const target = headings[idx] as HTMLElement | undefined
  if (!target) return
  const editorPane = document.querySelector('.editor-pane') as HTMLElement | null
  if (!editorPane) return
  const targetTop = target.offsetTop - editorPane.offsetTop - 20
  editorPane.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' })
}

function setupTocObserver() {
  if (typeof IntersectionObserver === 'undefined') return
  tocObserver?.disconnect()
  if (!editor.value) return
  const container = editor.value.view.dom
  const headings = container.querySelectorAll('h1, h2, h3')
  headings.forEach((h, i) => {
    if (tocItems.value[i]) {
      h.id = tocItems.value[i].id
    }
  })
  tocObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          activeTocId.value = entry.target.id
          break
        }
      }
    },
    { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
  )
  tocItems.value.forEach((item) => {
    const el = container.querySelector(`#${item.id}`)
    if (el) tocObserver!.observe(el)
  })
}

watch(
  () => props.publishForm.contentHtml,
  () => {
    extractTocFromEditor()
    nextTick(() => setupTocObserver())
  },
  { flush: 'post' }
)

onMounted(() => {
  extractTocFromEditor()
  nextTick(() => setupTocObserver())
  document.addEventListener('click', handleOutsideClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick)
})

function handleOutsideClick(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!target.closest('.table-ops-dropdown')) {
    showTableOps.value = false
  }
}

onBeforeUnmount(() => {
  tocObserver?.disconnect()
})
</script>

<template>
  <!-- 和文章详情页一样：普通文档流，padding-top 避开 navbar -->
  <div class="publish-layout">

    <!-- 面包屑导航行（和文章详情页风格一致） -->
    <div class="publish-breadcrumb-row">
      <div class="publish-breadcrumb">
        <button class="breadcrumb-back" type="button" @click="$emit('close')">
          <X :size="13" />
          <span>关闭</span>
        </button>
        <span class="breadcrumb-sep">/</span>
        <span class="breadcrumb-site">NEXTIFY</span>
        <span class="breadcrumb-sep">/</span>
        <span class="breadcrumb-action">
          <PenLine :size="12" />
          {{ isEditMode ? '编辑文章' : '新建文章' }}
        </span>

        <div class="breadcrumb-spacer"></div>

        <!-- Markdown 工具栏：合并进面包屑行 -->
        <div class="breadcrumb-toolbar">
          <button type="button" class="toolbar-tip" aria-label="标题" data-tooltip="标题" :class="{ active: isHeadingActive }" @click="editor?.chain().focus().toggleHeading({ level: 2 }).run()"><Heading :size="14" /></button>
          <button type="button" class="toolbar-tip" aria-label="加粗" data-tooltip="加粗" :class="{ active: isBoldActive }" @click="editor?.chain().focus().toggleBold().run()"><Bold :size="14" /></button>
          <button type="button" class="toolbar-tip" aria-label="斜体" data-tooltip="斜体" :class="{ active: isItalicActive }" @click="editor?.chain().focus().toggleItalic().run()"><Italic :size="14" /></button>
          <button type="button" class="toolbar-tip" aria-label="引用" data-tooltip="引用" :class="{ active: isQuoteActive }" @click="editor?.chain().focus().toggleBlockquote().run()"><Quote :size="14" /></button>
          <button type="button" class="toolbar-tip" aria-label="无序列表" data-tooltip="无序列表" :class="{ active: isListActive }" @click="editor?.chain().focus().toggleBulletList().run()"><List :size="14" /></button>
          <button type="button" class="toolbar-tip" aria-label="有序列表" data-tooltip="有序列表" :class="{ active: isOrderedListActive }" @click="editor?.chain().focus().toggleOrderedList().run()"><ListOrdered :size="14" /></button>
          <button
            class="toolbar-code-btn toolbar-tip"
            :class="{ active: isCodeBlockActive }"
            type="button"
            aria-label="代码块"
            data-tooltip="代码块"
            @click="editor?.chain().focus().toggleCodeBlock().run()"
          >
            <Code2 :size="14" /><span>Code</span>
          </button>
          <label
            class="toolbar-file-btn"
            :class="{ disabled: isUploadingImage }"
            :for="markdownImageInputId"
            aria-label="插入图片"
            data-tooltip="插入图片"
            :aria-disabled="isUploadingImage"
            @click="isUploadingImage && $event.preventDefault()"
          >
            <Image :size="14" />
          </label>
          <input
            :id="markdownImageInputId"
            :ref="setImageInput"
            class="file-input-hidden"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            :disabled="isUploadingImage"
            @change="$emit('uploadMarkdownImage', $event)"
          />
          <div class="toolbar-divider"></div>
          <button
            type="button"
            class="toolbar-tip"
            aria-label="插入表格"
            data-tooltip="插入表格"
            @click="showTableDialog = true"
          >
            <Table2 :size="14" />
          </button>
          <template v-if="isInTable">
            <div class="toolbar-divider"></div>
            <div class="table-ops-dropdown">
              <button type="button" class="toolbar-tip" :class="{ active: showTableOps }" aria-label="表格操作" data-tooltip="表格操作" @click="toggleTableOps">
                <Settings2 :size="14" />
              </button>
              <div class="table-ops-menu" :class="{ show: showTableOps }">
                <button type="button" @click="addRowBefore(); showTableOps = false"><Plus :size="12" /> 上方插入行</button>
                <button type="button" @click="addRowAfter(); showTableOps = false"><Plus :size="12" /> 下方插入行</button>
                <button type="button" @click="addColumnBefore(); showTableOps = false"><Plus :size="12" /> 左侧插入列</button>
                <button type="button" @click="addColumnAfter(); showTableOps = false"><Plus :size="12" /> 右侧插入列</button>
                <div class="table-ops-divider"></div>
                <button type="button" @click="deleteRow(); showTableOps = false"><Minus :size="12" /> 删除行</button>
                <button type="button" @click="deleteColumn(); showTableOps = false"><Minus :size="12" /> 删除列</button>
                <button type="button" class="danger" @click="deleteTable(); showTableOps = false"><Trash2 :size="12" /> 删除表格</button>
              </div>
            </div>
          </template>
        </div>

        <div class="breadcrumb-spacer"></div>
        <div class="breadcrumb-actions">
          <span v-if="draftStatus" class="draft-status">{{ draftStatus }}</span>
          <button
            v-if="hasSavedDraft"
            class="btn-discard-draft"
            type="button"
            @click="$emit('discardDraft')"
          >
            清除备份
          </button>
          <span class="word-count">{{ wordCount }} 字</span>
          <button class="btn-cancel" type="button" @click="$emit('close')">取消</button>
          <button class="btn-save-draft" type="button" :disabled="isPublishing" @click="$emit('saveDraft')">
            保存草稿
          </button>
          <button class="btn-publish" type="button" :disabled="isPublishing" @click="$emit('publish')">
            {{ isPublishing
              ? (isEditMode ? '保存中...' : '发布中...')
              : '发布文章' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 主体：和文章详情页完全相同的双栏结构 -->
    <div class="publish-layout-inner">

      <!-- 移动端遮罩层 -->
      <div
        v-if="(!sidebarCollapsed || !tocCollapsed) && isMobile"
        class="publish-mobile-overlay"
        @click="sidebarCollapsed = true; tocCollapsed = true"
      ></div>

      <!-- 左侧设置面板（对应文章详情的 sidebar） -->
      <aside class="publish-sidebar" :class="{ collapsed: sidebarCollapsed }">
        <button
          class="sidebar-collapse-btn"
          type="button"
          :title="sidebarCollapsed ? '展开设置' : '收起设置'"
          @click="sidebarCollapsed = !sidebarCollapsed"
        >
          <Settings2 :size="13" />
          <span>{{ sidebarCollapsed ? '设置' : '收起' }}</span>
        </button>

        <template v-if="!sidebarCollapsed">
          <p class="sidebar-section-label">基本信息</p>

          <label class="sidebar-field">
            <span>{{ isEditMode ? '标题（编辑）' : '标题' }}</span>
            <input class="sidebar-input" v-model="publishForm.title" placeholder="文章标题" />
          </label>

          <label class="sidebar-field">
            <span>副标题</span>
            <input class="sidebar-input" v-model="publishForm.subtitle" placeholder="可选" />
          </label>

          <label class="sidebar-field">
            <span>摘要</span>
            <textarea class="sidebar-input sidebar-textarea" v-model="publishForm.summary" placeholder="首页卡片摘要"></textarea>
          </label>

          <div class="sidebar-divider"></div>
          <p class="sidebar-section-label">发布设置</p>

          <label class="sidebar-field">
            <span>分类</span>
            <select class="sidebar-input" v-model.number="publishForm.categoryId">
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
            </select>
          </label>

          <label class="sidebar-field">
            <span>标签</span>
            <div class="tag-selector">
              <span
                v-for="t in tags"
                :key="t.id"
                class="tag-chip"
                :class="{ active: publishForm.tagIds.includes(t.id) }"
                :style="tagChipStyle(t)"
                @click="toggleTag(t.id)"
              >{{ t.name }}</span>
              <span v-if="!tags.length" class="tag-empty">暂无标签，可在数据面板中添加</span>
            </div>
            <span class="tag-hint">点击选择或取消选择</span>
          </label>

          <label class="sidebar-checkbox">
            <input type="checkbox" v-model="publishForm.isTop" :true-value="1" :false-value="0" />
            <span>置顶文章</span>
          </label>

          <div class="sidebar-divider"></div>
          <p class="sidebar-section-label">封面图</p>
          <label class="sidebar-field">
            <span>封面图</span>
            <div class="cover-image-upload" @click="triggerCoverImageUpload">
              <img v-if="publishForm.coverImg" :src="publishForm.coverImg" alt="Cover Image" class="cover-image-preview" />
              <div v-else class="cover-image-placeholder">
                点击上传封面图
              </div>
              <input 
                :ref="setCoverImageInput" 
                type="file" 
                accept="image/jpeg,image/png,image/webp,image/gif" 
                hidden 
                @change="handleCoverImageChange"
                @click.stop
              />
            </div>
            <button v-if="publishForm.coverImg" type="button" class="btn-remove-cover" @click="removeCoverImage">移除封面图</button>
          </label>

          <div v-if="publishError" class="sidebar-error">{{ publishError }}</div>
        </template>
      </aside>

      <!-- 右侧编辑区（对应文章详情的 article-main） -->
      <main class="publish-main">
        <div class="editor-pane">
          <div class="publish-title-block">
            <input
              class="publish-title-input"
              v-model="publishForm.title"
              placeholder="文章标题..."
            />
            <input
              class="publish-subtitle-input"
              v-model="publishForm.subtitle"
              placeholder="副标题（可选）"
            />
          </div>

          <hr class="publish-divider" />

          <EditorContent v-if="editor" v-memo="[editor]" :editor="editor" class="rich-editor-shell" />
        </div>
      </main>

      <!-- 右侧 TOC 目录导航 -->
      <aside class="publish-toc" :class="{ collapsed: tocCollapsed }">
        <button
          class="toc-toggle-btn"
          type="button"
          :title="tocCollapsed ? '展开目录' : '收起目录'"
          @click="tocCollapsed = !tocCollapsed"
        >
          <ListTree :size="13" />
          <span>{{ tocCollapsed ? '目录' : '收起' }}</span>
        </button>

        <template v-if="!tocCollapsed">
          <div class="toc-list" v-if="tocItems.length">
            <button
              v-for="item in tocItems"
              :key="item.id"
              class="toc-item"
              :class="{ active: activeTocId === item.id }"
              :style="{ paddingLeft: `${(item.level - 1) * 0.75 + 0.5}rem` }"
              @click="scrollToTocItem(item.id)"
            >
              <ChevronRight :size="10" class="toc-chevron" />
              <span class="toc-text">{{ item.text }}</span>
            </button>
          </div>
          <div v-else class="toc-empty">
            <span>暂无目录</span>
            <span class="toc-empty-hint">在编辑器中使用标题语法创建章节</span>
          </div>
        </template>
      </aside>

    </div>

    <!-- 表格插入对话框 -->
    <div v-if="showTableDialog" class="table-dialog-overlay" @click.self="showTableDialog = false">
      <div class="table-dialog">
        <h3 class="table-dialog-title">插入表格</h3>
        <div class="table-dialog-row">
          <label class="table-dialog-label">
            <span>行数</span>
            <input type="number" v-model.number="tableRows" min="1" max="20" class="table-dialog-input" />
          </label>
          <label class="table-dialog-label">
            <span>列数</span>
            <input type="number" v-model.number="tableCols" min="1" max="10" class="table-dialog-input" />
          </label>
        </div>
        <div class="table-dialog-actions">
          <button class="btn-cancel" type="button" @click="showTableDialog = false">取消</button>
          <button class="btn-publish" type="button" @click="insertTable">插入</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── 整体：强制锁定为视口高度，禁止全局溢出滚动 ── */
.publish-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f7;
  padding-top: 5rem; /* 对应 navbar 高度 */
  box-sizing: border-box;
  overflow: hidden;
}

/* 面包屑行 */
.publish-breadcrumb-row {
  position: relative;
  z-index: 100;
  background: transparent; /* 移除贯穿全屏的背景 */
  padding: 0.5rem 0;      /* 给悬浮条上下留一点空间 */
  pointer-events: none;   /* 确保点击穿透到背景，但子项要开启 */
}
.publish-breadcrumb {
  flex-shrink: 0;
  max-width: var(--nav-content-max-width);
  width: 100%; /* 确保填满父容器宽度，配合 margin: auto 居中 */
  margin: 0 auto;
  padding: 0 0.9rem;
  height: 3.25rem;       /* 稍微增加高度，让工具栏居中更从容 */
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 1rem;   /* 增加圆角，消除“贯穿感” */
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.05); /* 增加微妙的阴影 */
  pointer-events: auto;  /* 开启点击 */
  box-sizing: border-box;
}
.breadcrumb-back {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
  padding: 0.3rem 0.55rem;
  border-radius: 9999px;
  transition: background 0.2s, color 0.2s;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  flex-shrink: 0;
}
.breadcrumb-back:hover { background: rgba(239, 68, 68, 0.08); color: #dc2626; }
.breadcrumb-sep   { color: #e2e8f0; font-size: 0.72rem; }
.breadcrumb-site  { color: #cbd5e1; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; }
.breadcrumb-action {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  color: #2563eb;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
.breadcrumb-spacer { flex: 1; }

/* 工具栏 */
.breadcrumb-toolbar {
  display: flex;
  align-items: center;
  gap: 0.15rem;
}
.breadcrumb-toolbar button {
  position: relative;
  width: 1.85rem;
  height: 1.85rem;
  border: none;
  border-radius: 0.45rem;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s;
}
.breadcrumb-toolbar button:hover { background: rgba(37, 99, 235, 0.08); color: #2563eb; }
.breadcrumb-toolbar button:disabled { opacity: 0.4; cursor: not-allowed; }
.breadcrumb-toolbar button.active {
  background: #2563eb;
  color: #ffffff;
}
.toolbar-tip,
.toolbar-file-btn {
  position: relative;
}
.toolbar-tip::before,
.toolbar-file-btn::before {
  content: attr(data-tooltip);
  position: absolute;
  left: 50%;
  top: calc(100% + 0.55rem);
  z-index: 30;
  pointer-events: none;
  transform: translate(-50%, -0.25rem);
  min-width: max-content;
  padding: 0.38rem 0.55rem;
  border-radius: 0.45rem;
  background: #0f172a;
  color: #ffffff;
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.22);
  font-size: 0.68rem;
  font-weight: 800;
  line-height: 1;
  letter-spacing: 0.02em;
  opacity: 0;
  transition: opacity 0.14s ease, transform 0.14s ease;
}
.toolbar-tip::after,
.toolbar-file-btn::after {
  content: '';
  position: absolute;
  left: 50%;
  top: calc(100% + 0.28rem);
  z-index: 31;
  pointer-events: none;
  width: 0.45rem;
  height: 0.45rem;
  background: #0f172a;
  transform: translate(-50%, -0.2rem) rotate(45deg);
  opacity: 0;
  transition: opacity 0.14s ease, transform 0.14s ease;
}
.toolbar-tip:hover::before,
.toolbar-tip:focus-visible::before,
.toolbar-file-btn:hover::before,
.toolbar-file-btn:focus-visible::before {
  opacity: 1;
  transform: translate(-50%, 0);
}
.toolbar-tip:hover::after,
.toolbar-tip:focus-visible::after,
.toolbar-file-btn:hover::after,
.toolbar-file-btn:focus-visible::after {
  opacity: 1;
  transform: translate(-50%, 0) rotate(45deg);
}
.toolbar-file-btn {
  width: 1.85rem;
  height: 1.85rem;
  border-radius: 0.45rem;
  color: #64748b;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s;
}
.toolbar-file-btn:hover {
  background: rgba(37, 99, 235, 0.08);
  color: #2563eb;
}
.toolbar-file-btn.disabled {
  cursor: not-allowed;
  opacity: 0.4;
}
.toolbar-code-btn {
  width: auto !important;
  padding: 0 0.55rem !important;
  gap: 0.25rem;
  background: #0f172a !important;
  color: #f8fafc !important;
  font-size: 0.72rem;
  font-weight: 800;
}
.toolbar-code-btn:hover { background: #1e293b !important; color: #fff !important; }
.toolbar-divider {
  width: 1px;
  height: 1.1rem;
  background: rgba(226, 232, 240, 0.9);
  margin: 0 0.25rem;
}
.toolbar-preview-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.7rem;
  border: none;
  border-radius: 9999px;
  background: rgba(37, 99, 235, 0.08);
  color: #2563eb;
  font-size: 0.72rem;
  font-weight: 800;
  cursor: pointer;
  transition: background 0.2s;
  width: auto !important;
}
.toolbar-preview-btn.active { background: #2563eb; color: #fff; }
.toolbar-preview-btn:hover:not(.active) { background: rgba(37, 99, 235, 0.14); }
.toolbar-mode-label {
  color: #94a3b8;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.file-input-hidden {
  position: fixed;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

/* 右侧操作按钮 */
.breadcrumb-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}
.word-count { font-size: 0.72rem; color: #94a3b8; font-weight: 600; }
.draft-status {
  max-width: 8rem;
  color: #64748b;
  font-size: 0.72rem;
  font-weight: 750;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.btn-discard-draft {
  padding: 0.35rem 0.75rem;
  border: 1px solid rgba(245, 158, 11, 0.24);
  border-radius: 9999px;
  background: rgba(245, 158, 11, 0.08);
  color: #b45309;
  font-size: 0.76rem;
  font-weight: 800;
  cursor: pointer;
}
.btn-discard-draft:hover { background: rgba(245, 158, 11, 0.14); }
.btn-save-draft {
  padding: 0.35rem 0.85rem;
  border: 1px solid rgba(37, 99, 235, 0.22);
  border-radius: 9999px;
  background: rgba(37, 99, 235, 0.08);
  color: #2563eb;
  font-size: 0.78rem;
  font-weight: 800;
  cursor: pointer;
  transition: background 0.2s, transform 0.15s;
}
.btn-save-draft:hover:not(:disabled) { background: rgba(37, 99, 235, 0.14); transform: translateY(-1px); }
.btn-save-draft:disabled { opacity: 0.55; cursor: not-allowed; }
.btn-cancel {
  padding: 0.35rem 0.8rem;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 9999px;
  background: white;
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
}
.btn-cancel:hover { border-color: #94a3b8; color: #334155; }
.btn-publish {
  padding: 0.35rem 1rem;
  border: none;
  border-radius: 9999px;
  background: #2563eb;
  color: white;
  font-size: 0.78rem;
  font-weight: 800;
  cursor: pointer;
  transition: background 0.2s, transform 0.15s;
}
.btn-publish:hover:not(:disabled) { background: #1d4ed8; transform: translateY(-1px); }
.btn-publish:disabled { opacity: 0.55; cursor: not-allowed; }

/* ── 主体双栏（和文章详情页完全一致） ── */
.publish-layout-inner {
  flex: 1;
  min-height: 0; /* 允许 Flex item 缩小 */
  max-width: var(--nav-content-max-width);
  width: 100%; /* 确保填满父容器宽度，配合 margin: auto 居中 */
  margin: 0 auto;
  padding: 0; /* 移除外层 padding，让三栏外边缘和面包屑卡片外边缘对齐 */
  display: flex;
  align-items: stretch; /* 确保左右两栏等高 */
  overflow: hidden; /* 隐藏内部滚动条，由子组件控制 */
  box-sizing: border-box;
}

/* 左侧设置面板 */
.publish-sidebar {
  width: 210px;
  flex-shrink: 0;
  height: 100%; /* 填充父容器高度 */
  overflow-y: auto;
  padding: 2rem 1rem 2rem 0.9rem; /* 内部内容的间距 */
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  /* ── 仅调整配色：增加浅灰色背景以示区分 ── */
  background: #f8fafc;
  border-right: 1px solid rgba(226, 232, 240, 0.7);
  scrollbar-width: none;
}
.publish-sidebar::-webkit-scrollbar { display: none; }
.publish-sidebar.collapsed {
  width: 48px;
  overflow: hidden;
}

.sidebar-collapse-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: none;
  background: transparent;
  color: #94a3b8;
  font-size: 0.7rem;
  font-weight: 700;
  cursor: pointer;
  padding: 0.35rem 0.5rem;
  border-radius: 9999px;
  transition: background 0.2s, color 0.2s;
  align-self: flex-start;
  margin-left: -0.35rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.sidebar-collapse-btn:hover { background: rgba(37, 99, 235, 0.08); color: #2563eb; }

.sidebar-section-label {
  margin: 0;
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #94a3b8;
}
.sidebar-divider {
  height: 1px;
  background: rgba(226, 232, 240, 0.9);
}
.sidebar-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.78rem;
  font-weight: 700;
  color: #475569;
}
.sidebar-input {
  width: 100%;
  padding: 0.55rem 0.8rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.6rem;
  background: #ffffff;
  color: #0f172a;
  font-size: 0.85rem;
  font-weight: 500;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
}
.sidebar-input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.06);
}
.sidebar-textarea { min-height: 4.5rem; resize: vertical; line-height: 1.6; }
.sidebar-checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  font-weight: 700;
  color: #475569;
  cursor: pointer;
}
.sidebar-error {
  padding: 0.6rem 0.8rem;
  border-radius: 0.75rem;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #dc2626;
  font-size: 0.8rem;
  line-height: 1.5;
}

.tag-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  padding: 0.55rem 0.65rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.6rem;
  background: #ffffff;
  min-height: 2.5rem;
}
.tag-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.18rem 0.65rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #475569;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  transition: all 0.15s;
  user-select: none;
}
.tag-chip:hover {
  background: #e2e8f0;
}
.tag-chip.active {
  background: #4f46e5;
  color: #ffffff;
  border-color: #4f46e5;
}
.tag-empty {
  font-size: 0.72rem;
  color: #94a3b8;
  font-style: italic;
  padding: 0.25rem 0.35rem;
}
.tag-hint {
  font-size: 0.65rem;
  color: #94a3b8;
  font-weight: 500;
  margin-top: 0.25rem;
}

/* 右侧编辑区（和 article-main 完全对应） */
.publish-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
  overflow: hidden;
  background: #fbfaf6;
}

.editor-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 2rem 1.5rem 2rem 2.5rem;
  overflow-y: auto;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.58), rgba(251, 250, 246, 0.94)),
    #fbfaf6;
  transition: all 0.3s ease;
}

.publish-title-block {
  flex-shrink: 0;
  margin-bottom: 0;
}
.publish-title-input {
  display: block;
  flex-shrink: 0; /* 防止标题输入框被压缩 */
  width: 100%;
  border: none;
  outline: none;
  font-size: clamp(1.8rem, 3.5vw, 2.8rem);
  font-weight: 900;
  color: #151923;
  letter-spacing: -0.03em;
  line-height: 1.1;
  background: transparent;
  padding: 0 0 0.5rem;
}
.publish-title-input::placeholder { color: #cbd5e1; }
.publish-subtitle-input {
  flex-shrink: 0; /* 防止副标题输入框被压缩 */
  display: block;
  width: 100%;
  border: none;
  outline: none;
  font-size: 1.05rem;
  color: #667085;
  background: transparent;
  padding: 0 0 0.5rem;
  line-height: 1.5;
}
.publish-subtitle-input::placeholder { color: #e2e8f0; }

.publish-divider {
  border: none;
  border-top: 1px solid rgba(226, 232, 240, 0.9);
  margin: 1.25rem 0 1.75rem; /* 保持间距 */
  flex-shrink: 0; /* 防止分割线被压缩 */
}

.rich-editor-shell {
  flex: 1;
  min-height: 0;
  display: flex;
}

:deep(.rich-editor-content) {
  width: 100%;
  min-height: 100%;
  outline: none;
  color: #232b35;
  font-size: 1.05rem;
  line-height: 1.68;
  overflow-wrap: break-word;
  word-break: break-word;
}

:deep(.rich-editor-content p) {
  margin: 0 0 0.85rem;
}

:deep(.rich-editor-content p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  height: 0;
  color: #cbd5e1;
  pointer-events: none;
}

:deep(.rich-editor-content > *:first-child) {
  margin-top: 0;
}

:deep(.rich-editor-content img) {
  display: block;
  max-width: 100%;
  max-height: 34rem;
  object-fit: contain;
  border-radius: 0.75rem;
  margin: 1.5rem 0;
  box-shadow: 0 20px 70px rgba(15, 23, 42, 0.12);
}

:deep(.rich-editor-content pre) {
  overflow: auto;
  margin: 1.25rem 0;
  padding: 1.1rem 1.25rem;
  border-radius: 0.75rem;
  background: #0f172a;
  color: #e5e7eb;
  line-height: 1.58;
}

:deep(.rich-editor-content pre code) {
  background: transparent;
  color: inherit;
  padding: 0;
}

:deep(.rich-editor-content blockquote) {
  margin: 1.2rem 0;
  padding: 1rem 1.2rem;
  border-left: 4px solid #2563eb;
  background: #f8fafc;
  border-radius: 0 0.65rem 0.65rem 0;
  color: #475569;
}

:deep(.rich-editor-content ul),
:deep(.rich-editor-content ol) {
  margin: 0.75rem 0 1rem;
  padding-left: 1.45rem;
}

:deep(.rich-editor-content ul) {
  list-style: disc;
}

:deep(.rich-editor-content ol) {
  list-style: decimal;
}

:deep(.rich-editor-content li) {
  margin: 0.28rem 0;
  padding-left: 0.18rem;
}

:deep(.rich-editor-content li p) {
  margin: 0;
}

/* ════════════════════════════════
   右侧 TOC 目录导航
════════════════════════════════ */
.publish-toc {
  width: 200px;
  flex-shrink: 0;
  height: 100%;
  overflow-y: auto;
  padding: 2rem 1rem 2rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background: #f8fafc;
  border-left: 1px solid rgba(226, 232, 240, 0.7);
  scrollbar-width: none;
}
.publish-toc::-webkit-scrollbar { display: none; }
.publish-toc.collapsed {
  width: 48px;
  overflow: hidden;
}

.toc-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: none;
  background: transparent;
  color: #94a3b8;
  font-size: 0.7rem;
  font-weight: 700;
  cursor: pointer;
  padding: 0.35rem 0.5rem;
  border-radius: 9999px;
  transition: background 0.2s, color 0.2s;
  align-self: flex-start;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.toc-toggle-btn:hover { background: rgba(37, 99, 235, 0.08); color: #2563eb; }

.toc-list {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.toc-item {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  width: 100%;
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.35rem 0.5rem;
  border-radius: 0.5rem;
  text-align: left;
  transition: background 0.15s, color 0.15s;
  line-height: 1.4;
}
.toc-item:hover { background: rgba(37, 99, 235, 0.06); color: #2563eb; }
.toc-item.active {
  background: rgba(37, 99, 235, 0.1);
  color: #2563eb;
  font-weight: 700;
}
.toc-chevron {
  flex-shrink: 0;
  opacity: 0.5;
  transition: opacity 0.15s;
}
.toc-item:hover .toc-chevron,
.toc-item.active .toc-chevron { opacity: 1; }
.toc-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toc-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  padding: 1.5rem 0.5rem;
  color: #94a3b8;
  font-size: 0.72rem;
  font-weight: 600;
  text-align: center;
}
.toc-empty-hint {
  font-size: 0.65rem;
  color: #cbd5e1;
  font-weight: 500;
  line-height: 1.5;
}

/* 响应式 */
@media (max-width: 768px) {
  .publish-layout { padding-top: 4.25rem; }
  .publish-breadcrumb-row { padding: 0.4rem 0; }

  /* 核心修复：允许换行 + 自适应高度 */
  .publish-breadcrumb {
    height: auto;
    flex-wrap: wrap;
    gap: 0.35rem;
    padding: 0.55rem 0.85rem;
    border-radius: 0.85rem;
    margin: 0 0.75rem;
  }

  /* 精简：面包屑链接 */
  .breadcrumb-back { padding: 0.28rem 0.55rem; font-size: 0.68rem; }
  .breadcrumb-action { font-size: 0.7rem; letter-spacing: 0.05em; }
  .breadcrumb-action svg { width: 11px; height: 11px; }
  .breadcrumb-site, .breadcrumb-sep { display: none; }

  /* 第一个 spacer 在移动端保留为弹性占位，第二个 spacer 删除 */
  .breadcrumb-spacer:first-of-type { flex: 1 1 auto; min-width: 0; }
  .breadcrumb-spacer + .breadcrumb-spacer { display: none; }

  /* 工具栏在移动端隐藏 */
  .breadcrumb-toolbar { display: none; }

  /* 右侧按钮区：精简，字数隐藏，草稿清除按钮简化 */
  .breadcrumb-actions {
    gap: 0.3rem;
  }
  .word-count { display: none; }
  .draft-status {
    font-size: 0.65rem;
    max-width: 6rem;
  }
  .btn-discard-draft {
    padding: 0.28rem 0.55rem;
    font-size: 0.68rem;
  }
  .btn-cancel {
    padding: 0.28rem 0.6rem;
    font-size: 0.7rem;
  }
  .btn-save-draft {
    padding: 0.3rem 0.65rem;
    font-size: 0.7rem;
  }
  .btn-publish {
    padding: 0.3rem 0.85rem;
    font-size: 0.72rem;
  }

  /* 主体编辑区 */
  .publish-layout-inner { padding: 0 0.75rem; flex-direction: column; }
  .publish-sidebar, .publish-toc { display: none; }
  .publish-main {
    padding: 0.75rem 0 5rem;
    overflow-y: auto;
    min-height: 70vh;
  }
  .editor-pane {
    flex: none;
    min-height: 60vh;
    padding: 1.25rem 0.85rem 1.5rem;
  }
  .publish-title-input { font-size: 1.4rem; }
}

/* 超窄屏：再压缩 */
@media (max-width: 480px) {
  .publish-breadcrumb {
    padding: 0.5rem 0.7rem;
    gap: 0.25rem;
    margin: 0 0.65rem;
  }
  .breadcrumb-back { padding: 0.25rem 0.45rem; font-size: 0.65rem; }
  .breadcrumb-back svg { width: 11px; height: 11px; }
  .breadcrumb-action { font-size: 0.68rem; }
  .btn-cancel,
  .btn-discard-draft,
  .btn-save-draft {
    font-size: 0.65rem;
    padding: 0.25rem 0.5rem;
  }
  .btn-publish {
    font-size: 0.68rem;
    padding: 0.28rem 0.7rem;
  }
  .draft-status { display: none; }
  .publish-title-input { font-size: 1.25rem; }
}

/* ─ 表格样式 ── */
:deep(.rich-editor-content) table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
  font-size: 0.9rem;
  border: 2px solid #cbd5e1;
  border-radius: 4px;
  overflow: hidden;
}

:deep(.rich-editor-content) table th,
:deep(.rich-editor-content) table td {
  border: 1px solid #cbd5e1;
  padding: 0.6rem 0.8rem;
  text-align: left;
  min-width: 80px;
  min-height: 36px;
  position: relative;
}

:deep(.rich-editor-content) table th {
  background: #e2e8f0;
  font-weight: 600;
  color: #1e293b;
}

:deep(.rich-editor-content) table td {
  background: #f8fafc;
  color: #334155;
}

:deep(.rich-editor-content) table td:empty::before {
  content: '\00a0';
  display: inline-block;
  min-width: 20px;
  min-height: 20px;
}

:deep(.rich-editor-content) table tr:hover td {
  background: #e2e8f0;
}

/* Tiptap 表格选中状态 */
:deep(.rich-editor-content) table .selectedCell {
  background: #dbeafe !important;
  outline: 2px solid #3b82f6;
  outline-offset: -2px;
}

:deep(.rich-editor-content) table .column-resize-handle {
  position: absolute;
  right: -2px;
  top: 0;
  bottom: 0;
  width: 4px;
  cursor: col-resize;
  background: #3b82f6;
  z-index: 10;
}

/* 表格操作下拉菜单 */
.table-ops-dropdown {
  position: relative;
  display: inline-block;
}

.table-ops-menu {
  display: none;
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 0.5rem;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 0.4rem 0;
  min-width: 140px;
  z-index: 1000;
}

.table-ops-menu.show {
  display: block;
}

.table-ops-menu button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem 0.8rem;
  font-size: 0.8rem;
  color: #475569;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
}

.table-ops-menu button:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.table-ops-menu button.danger {
  color: #dc2626;
}

.table-ops-menu button.danger:hover {
  background: #fef2f2;
  color: #dc2626;
}

.table-ops-divider {
  height: 1px;
  background: #e2e8f0;
  margin: 0.3rem 0;
}

/* 表格插入对话框 */
.table-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.table-dialog {
  background: #ffffff;
  border-radius: 0.75rem;
  padding: 1.5rem;
  min-width: 280px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.table-dialog-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 1rem;
}

.table-dialog-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.2rem;
}

.table-dialog-label {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.table-dialog-label span {
  font-size: 0.85rem;
  font-weight: 600;
  color: #475569;
}

.table-dialog-input {
  width: 100%;
  padding: 0.5rem 0.7rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  font-size: 0.9rem;
  color: #1e293b;
  background: #f8fafc;
  outline: none;
  transition: all 0.15s;
}

.table-dialog-input:focus {
  border-color: #6366f1;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.table-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.table-dialog-actions .btn-cancel {
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
}

.table-dialog-actions .btn-publish {
  padding: 0.5rem 1.2rem;
  font-size: 0.85rem;
}

</style>