<script setup lang="ts">
import { Bold, Code2, Eye, Heading, Image, Italic, List, Quote } from 'lucide-vue-next'
import type { ComponentPublicInstance } from 'vue'
import type { ArticlePublishRequest, Category } from '../types/blog'

defineProps<{
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
}>()

function setContentTextarea(element: Element | ComponentPublicInstance | null) {
  emit('contentTextareaReady', element instanceof HTMLTextAreaElement ? element : null)
}

function setImageInput(element: Element | ComponentPublicInstance | null) {
  emit('imageInputReady', element instanceof HTMLInputElement ? element : null)
}
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-card publish-modal">
      <button class="modal-close" type="button" @click="$emit('close')">×</button>
      <div class="login-intro publish-header">
        <span class="section-label">发布</span>
        <h2>{{ isEditMode ? '编辑文章' : '新建文章' }}</h2>
        <p>
          {{ isEditMode ? '保存后会更新当前文章内容。' : '发布后状态为公开，会出现在首页文章列表中。' }}
        </p>
      </div>

      <form class="login-form publish-form" @submit.prevent="$emit('publish')">
        <div class="publish-body">
          <div class="publish-grid">
            <label class="login-field">
              <span>{{ isEditMode ? '标题（编辑）' : '标题' }}</span>
              <input class="form-input" v-model="publishForm.title" placeholder="文章标题" />
            </label>

            <label class="login-field">
              <span>副标题</span>
              <input class="form-input" v-model="publishForm.subtitle" placeholder="可选" />
            </label>
          </div>

          <label class="login-field">
            <span>摘要</span>
            <textarea class="form-input form-textarea summary-textarea" v-model="publishForm.summary" placeholder="首页卡片摘要"></textarea>
          </label>

          <div class="publish-meta-row">
            <label class="login-field">
              <span>分类</span>
              <select class="form-input" v-model.number="publishForm.categoryId">
                <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.label }}</option>
              </select>
            </label>

            <label class="checkbox-field">
              <input type="checkbox" v-model="publishForm.isTop" :true-value="1" :false-value="0" />
              <span>置顶文章</span>
            </label>
          </div>

          <label class="login-field">
            <span>正文</span>
            <div class="markdown-editor">
              <div class="markdown-toolbar">
                <div class="markdown-tool-group">
                  <button type="button" title="标题" @click="$emit('insertMarkdown', '## ', '', '标题')"><Heading :size="16" /></button>
                  <button type="button" title="加粗" @click="$emit('insertMarkdown', '**', '**', '加粗文本')"><Bold :size="16" /></button>
                  <button type="button" title="斜体" @click="$emit('insertMarkdown', '*', '*', '斜体文本')"><Italic :size="16" /></button>
                  <button type="button" title="引用" @click="$emit('insertMarkdown', '> ', '', '引用内容')"><Quote :size="16" /></button>
                  <button type="button" title="列表" @click="$emit('insertMarkdown', '- ', '', '列表项')"><List :size="16" /></button>
                  <button type="button" title="代码块" @click="$emit('insertMarkdown', '```\\n', '\\n```', 'code')"><Code2 :size="16" /></button>
                  <button type="button" title="插入图片" :disabled="isUploadingImage" @click="$emit('triggerImageUpload')"><Image :size="16" /></button>
                </div>
                <button class="preview-toggle" type="button" @click="$emit('update:isPreviewingMarkdown', !isPreviewingMarkdown)">
                  <Eye :size="16" />
                  <span>{{ isPreviewingMarkdown ? '编辑' : '预览' }}</span>
                </button>
                <input :ref="setImageInput" type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden @change="$emit('uploadMarkdownImage', $event)" />
              </div>
              <textarea
                v-if="!isPreviewingMarkdown"
                :ref="setContentTextarea"
                class="form-input form-textarea content-textarea markdown-textarea"
                v-model="publishForm.content"
                placeholder="支持 Markdown：标题、列表、引用、代码块，以及图片上传。"
              ></textarea>
              <div v-else class="markdown-preview markdown-body" v-html="markdownPreviewHtml"></div>
            </div>
          </label>
        </div>

        <div class="publish-actions">
          <p v-if="publishError" class="form-error">{{ publishError }}</p>
          <div class="publish-action-buttons">
            <button class="action-pill secondary" type="button" @click="$emit('close')">取消</button>
            <button class="contact-button login-submit" type="submit" :disabled="isPublishing">
              {{ isPublishing ? (isEditMode ? '保存中...' : '发布中...') : (isEditMode ? '保存文章' : '发布文章') }}
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>
