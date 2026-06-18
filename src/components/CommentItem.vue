<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import type { CommentItem as CommentItemType, LoginUser } from '../types/blog'
import { useComments } from '../composables/useComments'

const props = defineProps<{
  comment: CommentItemType
  articleId: number
  isLoggedIn: boolean
  loginUser: Partial<LoginUser>
}>()
const emit = defineEmits<{ (e: 'comment-posted'): void }>()

const {
  isLoading: _isLoading,
  error,
  submitComment,
  ensureAnonymousId,
  isAnonymousProfileReady,
  saveAnonymousProfile,
  clearAnonymousProfile,
  loadAnonymousProfile,
} = useComments()

const collapsed = ref(false)
const showReplyBox = ref(false)
const replyContent = ref('')
const anonymousNickname = ref('')
const anonymousEmail = ref('')
const anonymousWebsite = ref('')
const isSubmitting = ref(false)
const errorMsg = ref('')

const hasChildren = computed(() => props.comment.children && props.comment.children.length > 0)
const childCount = computed(() => props.comment.children?.length || 0)
const anonymousProfileReadyItem = computed(() => isAnonymousProfileReady())

function toggleCollapse() {
  collapsed.value = !collapsed.value
}

function openReply() {
  showReplyBox.value = true
  const stored = loadAnonymousProfile()
  anonymousNickname.value = stored.nickname
  anonymousEmail.value = stored.email
  anonymousWebsite.value = stored.website
  nextTick(() => {
    const ta = document.querySelector(`.reply-box-${props.comment.id} textarea`) as HTMLTextAreaElement | null
    if (ta) ta.focus()
  })
}

function cancelReply() {
  showReplyBox.value = false
  replyContent.value = ''
  errorMsg.value = ''
}

function clearAnonymousProfileItem() {
  clearAnonymousProfile()
  anonymousNickname.value = ''
  anonymousEmail.value = ''
  anonymousWebsite.value = ''
}

async function submitReply(): Promise<boolean> {
  if (!replyContent.value.trim()) {
    errorMsg.value = '回复内容不能为空。'
    return false
  }
  if (!props.isLoggedIn && !anonymousNickname.value.trim()) {
    errorMsg.value = '请填写昵称。'
    return false
  }
  if (!props.isLoggedIn && !anonymousEmail.value.trim()) {
    errorMsg.value = '请填写邮箱。'
    return false
  }

  isSubmitting.value = true
  errorMsg.value = ''

  const ok = await submitComment(
    { articleId: props.articleId, content: replyContent.value.trim(), parentId: props.comment.id },
    props.isLoggedIn,
    props.loginUser,
    anonymousNickname.value,
    anonymousEmail.value,
    anonymousWebsite.value,
    (nick, email, site) => saveAnonymousProfile(nick, email, site),
    () => ensureAnonymousId()
  )

  if (ok) {
    showReplyBox.value = false
    replyContent.value = ''
    anonymousEmail.value = ''
    anonymousWebsite.value = ''
    emit('comment-posted')
  } else {
    errorMsg.value = error.value || '回复提交失败，请稍后重试。'
  }

  isSubmitting.value = false
  return ok
}
</script>

<template>
  <div class="comment-tree-item">
    <div class="comment-main">
      <div class="comment-header">
        <img
          :src="comment.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.author || comment.id}`"
          alt=""
          class="comment-avatar"
        />
        <span class="comment-author">{{ comment.nickname || comment.author }}</span>
        <span v-if="comment.parentNickname" class="comment-reply-to">@{{ comment.parentNickname }}</span>
        <span class="comment-time">{{ comment.createTime }}</span>
        <span class="comment-reply-btn" @click="openReply">回复</span>
      </div>
      <p class="comment-content">{{ comment.content }}</p>

      <div v-if="showReplyBox" :class="['reply-box', `reply-box-${comment.id}`]">
        <div class="reply-box-header">
          回复 <span class="reply-box-target">@{{ comment.nickname || comment.author }}</span>
        </div>
        <div v-if="!isLoggedIn && !anonymousProfileReadyItem" class="anonymous-form">
          <input
            v-model="anonymousNickname"
            type="text"
            placeholder="昵称（必填）"
            :disabled="isSubmitting"
          />
          <input v-model="anonymousEmail" type="email" placeholder="邮箱（必填）" :disabled="isSubmitting" />
          <input
            v-model="anonymousWebsite"
            type="text"
            placeholder="个人网站（选填）"
            :disabled="isSubmitting"
          />
        </div>
        <div v-else-if="!isLoggedIn && anonymousProfileReadyItem" class="anonymous-identity-hint">
          <span>以 <b>{{ anonymousNickname }}</b> 身份回复</span>
          <span class="identity-switch" @click="clearAnonymousProfileItem">切换身份</span>
        </div>
        <textarea
          v-model="replyContent"
          placeholder="写下你的回复..."
          rows="3"
          :disabled="isSubmitting"
        ></textarea>
        <div class="composer-actions">
          <button @click="submitReply" :disabled="isSubmitting || !replyContent.trim()">发布回复</button>
          <button @click="cancelReply" type="button">取消</button>
        </div>
        <div v-if="errorMsg" class="comment-error">{{ errorMsg }}</div>
      </div>
    </div>

    <div v-if="hasChildren" class="comment-children-wrapper">
      <div class="comment-collapse-bar" @click="toggleCollapse">
        <span class="collapse-icon">{{ collapsed ? '▸' : '▾' }}</span>
        <span class="collapse-text"
          >{{ collapsed ? `展开 ${childCount} 条回复` : `收起 ${childCount} 条回复` }}</span
        >
      </div>
      <div v-if="!collapsed" class="comment-children">
        <CommentItem
          v-for="child in comment.children"
          :key="child.id"
          :comment="child"
          :article-id="articleId"
          :is-logged-in="isLoggedIn"
          :login-user="loginUser"
          @comment-posted="emit('comment-posted')"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.comment-tree-item { margin-bottom: 12px; }
.comment-main { background: white; border: 1px solid #eef2f7; border-radius: 8px; padding: 12px; }
.comment-header { display: flex; align-items: center; margin-bottom: 8px; }
.comment-avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; margin-right: 10px; }
.comment-author { font-weight: 700; color: #0f172a; margin-right: 10px; font-size: 14px; }
.comment-reply-to { color: #2563eb; font-size: 12px; margin-right: 10px; font-weight: 500; }
.comment-time { font-size: 12px; color: #6b7280; }
.comment-reply-btn {
  margin-left: auto; font-size: 12px; color: #2563eb; cursor: pointer;
  padding: 2px 8px; border-radius: 4px; transition: background 0.15s;
}
.comment-reply-btn:hover { background: #dbeafe; }
.comment-content { color: #374151; line-height: 1.5; font-size: 14px; margin: 0; }

.comment-children-wrapper { margin-top: 12px; }
.comment-collapse-bar {
  display: flex; align-items: center; gap: 6px; font-size: 12px;
  color: #2563eb; cursor: pointer; padding: 4px 8px; border-radius: 4px;
  margin-bottom: 8px; transition: background 0.15s; background: #f1f5f9;
}
.comment-collapse-bar:hover { background: #dbeafe; }
.collapse-icon { font-size: 10px; }
.comment-children { display: flex; flex-direction: column; gap: 8px; }

.reply-box {
  margin-top: 12px; padding: 12px; background: #f8fafc;
  border-radius: 6px; border: 1px solid #e6eef6;
}
.reply-box-header { font-size: 13px; color: #475569; margin-bottom: 8px; }
.reply-box-target { color: #2563eb; font-weight: 600; }
.reply-box textarea {
  width: 100%; padding: 8px; border: 1px solid #e6eef6;
  border-radius: 6px; min-height: 80px; resize: vertical;
  margin-bottom: 8px; font-size: 14px; outline: none;
  transition: border-color 0.15s;
}
.reply-box textarea:focus { border-color: #2563eb; }

.anonymous-form { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 8px; }
.anonymous-form input {
  padding: 8px 10px; border: 1px solid #e6eef6; border-radius: 6px;
  font-size: 14px; outline: none; transition: border-color 0.15s;
}
.anonymous-form input:focus { border-color: #2563eb; }

.anonymous-identity-hint {
  display: flex; align-items: center; gap: 12px; padding: 8px 12px;
  background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px;
  font-size: 14px; color: #0c4a6e; margin-bottom: 8px;
}
.anonymous-identity-hint b { color: #0c4a6e; font-weight: 600; }
.identity-switch {
  margin-left: auto; color: #2563eb; cursor: pointer;
  text-decoration: underline; font-size: 13px;
}
.identity-switch:hover { color: #1d4ed8; }

.composer-actions { display: flex; gap: 8px; justify-content: flex-end; }
.composer-actions button {
  padding: 6px 12px; font-size: 13px; border-radius: 6px;
  border: none; cursor: pointer;
}
.composer-actions button:first-child { background: #2563eb; color: white; }
.composer-actions button:first-child:hover:not(:disabled) { background: #1d4ed8; }
.composer-actions button:first-child:disabled { background: #93c5fd; cursor: not-allowed; }
.composer-actions button:last-child { background: #e6eef6; color: #334155; }
.composer-actions button:last-child:hover { background: #dbeafe; }

.comment-error { color: #ef4444; font-size: 13px; margin-top: 8px; }

@media (max-width: 720px) {
  .anonymous-form { grid-template-columns: 1fr; }
  .comment-children-wrapper { margin-left: 8px; padding-left: 8px; }
}
</style>