<script setup lang="ts">
import { ref, computed } from 'vue'
import { Bold, Code2, Eye, Heading, Image, Italic, List, Quote, X, PenLine, Settings2, EyeOff } from 'lucide-vue-next'
import type { ComponentPublicInstance } from 'vue'
import type { ArticlePublishRequest, Category } from '../types/blog'

const props = defineProps<{
  publishForm: ArticlePublishRequest
  categories: Category[]
  publishError: string
  isPublishing: boolean
  isEditMode: boolean
  isPreviewingMarkdown: boolean
  isUploadingImage: boolean
  markdownPreviewHtml: string
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
  uploadCoverImage: [event: Event] // 新增：上传封面图事件
  removeCoverImage: [] // 新增：移除封面图事件
}>()

function setContentTextarea(element: Element | ComponentPublicInstance | null) {
  emit('contentTextareaReady', element instanceof HTMLTextAreaElement ? element : null)
}

function setImageInput(element: Element | ComponentPublicInstance | null) {
  emit('imageInputReady', element instanceof HTMLInputElement ? element : null)
}

const coverImageInput = ref<HTMLInputElement | null>(null) // 新增：封面图文件输入框的引用

function setCoverImageInput(element: Element | ComponentPublicInstance | null) {
  coverImageInput.value = element instanceof HTMLInputElement ? element : null
}

function triggerCoverImageUpload() {
  coverImageInput.value?.click()
}

function handleCoverImageChange(event: Event) {
  emit('uploadCoverImage', event)
}

function removeCoverImage() {
  emit('removeCoverImage')
}

const sidebarCollapsed = ref(false)

const wordCount = computed(() => {
  const text = props.publishForm.content || ''
  return text.replace(/\s+/g, '').length
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
        <span class="breadcrumb-site">ETHERLOG</span>
        <span class="breadcrumb-sep">/</span>
        <span class="breadcrumb-action">
          <PenLine :size="12" />
          {{ isEditMode ? '编辑文章' : '新建文章' }}
        </span>

        <div class="breadcrumb-spacer"></div>

        <!-- Markdown 工具栏：合并进面包屑行 -->
        <div class="breadcrumb-toolbar">
          <button type="button" title="标题" @click="$emit('insertMarkdown', '## ', '', '标题')"><Heading :size="14" /></button>
          <button type="button" title="加粗" @click="$emit('insertMarkdown', '**', '**', '加粗文本')"><Bold :size="14" /></button>
          <button type="button" title="斜体" @click="$emit('insertMarkdown', '*', '*', '斜体文本')"><Italic :size="14" /></button>
          <button type="button" title="引用" @click="$emit('insertMarkdown', '> ', '', '引用内容')"><Quote :size="14" /></button>
          <button type="button" title="列表" @click="$emit('insertMarkdown', '- ', '', '列表项')"><List :size="14" /></button>
          <button
            class="toolbar-code-btn"
            type="button"
            title="代码块"
            @click="$emit('insertMarkdown', '```ts\n', '\n```', 'const value = await nextify.run()')"
          >
            <Code2 :size="14" /><span>Code</span>
          </button>
          <button type="button" title="插入图片" :disabled="isUploadingImage" @click="$emit('triggerImageUpload')">
            <Image :size="14" />
          </button>
          <input :ref="setImageInput" type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden @change="$emit('uploadMarkdownImage', $event)" />
          <div class="toolbar-divider"></div>
          <button
            class="toolbar-preview-btn"
            :class="{ active: isPreviewingMarkdown }"
            type="button"
            @click="$emit('update:isPreviewingMarkdown', !isPreviewingMarkdown)"
          >
            <Eye v-if="!isPreviewingMarkdown" :size="14" />
            <EyeOff v-else :size="14" />
            <span>{{ isPreviewingMarkdown ? '编辑' : '预览' }}</span>
          </button>
        </div>

        <div class="breadcrumb-spacer"></div>
        <div class="breadcrumb-actions">
          <span class="word-count">{{ wordCount }} 字</span>
          <button class="btn-cancel" type="button" @click="$emit('close')">取消</button>
          <button class="btn-publish" type="button" :disabled="isPublishing" @click="$emit('publish')">
            {{ isPublishing
              ? (isEditMode ? '保存中...' : '发布中...')
              : (isEditMode ? '保存文章' : '发布文章') }}
          </button>
        </div>
      </div>
    </div>

    <!-- 主体：和文章详情页完全相同的双栏结构 -->
    <div class="publish-layout-inner">

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
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.label }}</option>
            </select>
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
        <!-- 标题输入区 -->
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

        <!-- 编辑 / 预览区 -->
        <textarea
          v-if="!isPreviewingMarkdown"
          :ref="setContentTextarea"
          class="publish-textarea"
          v-model="publishForm.content"
          placeholder="开始写作... 支持 Markdown 语法"
        ></textarea>
        <div
          v-else
          class="publish-preview markdown-body"
          v-html="markdownPreviewHtml"
        ></div>
      </main>

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
  max-width: 64rem;
  width: 100%; /* 确保填满父容器宽度，配合 margin: auto 居中 */
  margin: 0 auto;
  padding: 0 1.5rem;
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

/* 右侧操作按钮 */
.breadcrumb-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}
.word-count { font-size: 0.72rem; color: #94a3b8; font-weight: 600; }
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
  max-width: 64rem;
  width: 100%; /* 确保填满父容器宽度，配合 margin: auto 居中 */
  margin: 0 auto;
  padding: 0; /* 移除容器 padding，让子组件背景能贴边 */
  display: flex;
  align-items: stretch; /* 确保左右两栏等高 */
  overflow: hidden; /* 隐藏内部滚动条，由子组件控制 */
}

/* 左侧设置面板 */
.publish-sidebar {
  width: 210px;
  flex-shrink: 0;
  height: 100%; /* 填充父容器高度 */
  overflow-y: auto;
  padding: 2rem 1.25rem 2rem 1.5rem; /* 左 padding 设为 1.5rem，对齐面包屑文字 */
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

/* 右侧编辑区（和 article-main 完全对应） */
.publish-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
  overflow-y: auto;
  padding: 2rem 1.5rem 2rem 2.5rem;
  background: #ffffff;
  overflow-wrap: break-word;
  word-break: break-word;
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
  color: #0f172a;
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
  color: #64748b;
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

.publish-textarea {
  display: block;
  width: 100%;
  flex: 1; /* 填充剩余高度 */
  min-height: 0; /* 允许 Flex item 缩小 */
  border: none;
  outline: none;
  resize: none;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.95rem;
  line-height: 1.85;
  color: #1e293b;
  background: transparent;
  overflow-wrap: break-word;
  word-break: break-word;
}
.publish-textarea::placeholder { color: #cbd5e1; }

.publish-preview {
  flex: 1;
  min-height: 0; /* 允许 Flex item 缩小 */
  color: #1f2937;
  font-size: 1.05rem;
  line-height: 1.9;
  overflow-wrap: break-word;
  word-break: break-word;
}

/* 响应式 */
@media (max-width: 768px) {
  .publish-layout { padding-top: 4.5rem; }
  .publish-layout-inner { padding: 0 1rem; }
  .publish-sidebar { display: none; }
  .publish-main { padding: 1.5rem 0 4rem; }
  .breadcrumb-toolbar { display: none; }
  .breadcrumb-site,
  .breadcrumb-sep { display: none; }
  .word-count { display: none; }
}
</style>
