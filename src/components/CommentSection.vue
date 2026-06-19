<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import axios from 'axios'
import type { LoginUser } from '../types/blog'
import CommentItemComponent from './CommentItem.vue'
import { useComments } from '../composables/useComments'
import { useAnonymousProfile } from '../composables/useAnonymousProfile'

const props = defineProps<{
  articleId: number | null
  isLoggedIn: boolean
  loginUser: Partial<LoginUser>
  allowAnonymous?: boolean
}>()
const emit = defineEmits<{ (e: 'require-login'): void }>()

const { comments, isLoading: isLoadingComments, error: commentError, fetchComments, submitComment } = useComments()
const {
  anonymousNickname,
  anonymousEmail,
  anonymousWebsite,
  profileReady: anonymousProfileReady,
  anonymousId,
  loadProfile: loadAnonymousProfile,
  saveProfile: saveAnonymousProfile,
  clearProfile: clearAnonymousProfile,
} = useAnonymousProfile()

const newCommentContent = ref('')
const composerOpen = ref(false)
const isSubmitting = ref(false)
const anonymousChecked = ref(false)
const anonymousHasCommented = ref(false)

const totalComments = computed(() => {
  function count(list: typeof comments.value): number {
    let n = list.length
    for (const c of list) if (c.children) n += count(c.children)
    return n
  }
  return count(comments.value)
})

function openComposer() {
  composerOpen.value = true
  nextTick(() => {
    const ta = document.querySelector('.inline-composer textarea') as HTMLTextAreaElement | null
    if (ta) {
      ta.focus()
      ta.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  })
}

function cancelComposer() {
  composerOpen.value = false
  newCommentContent.value = ''
  commentError.value = ''
}

async function submitFromComposer() {
  if (!props.isLoggedIn && props.allowAnonymous === false) {
    commentError.value = '请登录后发表评论。'
    emit('require-login')
    return
  }
  if (!newCommentContent.value.trim()) {
    commentError.value = '评论内容不能为空。'
    return
  }
  if (props.articleId === null) {
    commentError.value = '无法获取文章ID，请刷新页面。'
    return
  }
  // If not logged in, consult backend check: only require nickname/email when backend indicates user hasn't commented before
  if (!props.isLoggedIn && anonymousChecked.value && anonymousHasCommented.value === false) {
    if (!anonymousNickname.value.trim()) {
      commentError.value = '请填写昵称。'
      return
    }
    if (!anonymousEmail.value.trim()) {
      commentError.value = '请填写邮箱。'
      return
    }
  }

  isSubmitting.value = true

  const ok = await submitComment(
    { articleId: props.articleId, content: newCommentContent.value.trim() },
    props.isLoggedIn,
    props.loginUser,
    anonymousNickname.value,
    anonymousEmail.value,
    anonymousWebsite.value,
    saveAnonymousProfile,
    () => anonymousId.value,
  )

  if (ok) {
    newCommentContent.value = ''
    composerOpen.value = false
    if (props.articleId !== null) fetchComments(props.articleId)
  }

  isSubmitting.value = false
}

function handleChildPosted() {
  if (props.articleId !== null) fetchComments(props.articleId)
}

watch(() => props.articleId, (newId) => {
  if (newId !== null) fetchComments(newId)
  else comments.value = []
}, { immediate: true })

onMounted(() => {
  // When user is not logged in, ask backend for anonymous identity
  if (!props.isLoggedIn) {
    (async () => {
      try {
        const resp = await axios.get('/api/anonymous/user')
        // backend may return { anonymousId, hasCommented } or wrapped in data
        const payload = resp.data && resp.data.data ? resp.data.data : resp.data
        const anonId = payload?.anonymousId || payload?.id || null
        const hasCommented = payload?.hasCommented === true
        if (anonId) {
          try { localStorage.setItem('anonymousCommentId', anonId) } catch (e) {}
        }
        anonymousHasCommented.value = hasCommented
        // if backend says user has commented before, reuse stored profile if any
        if (hasCommented) {
          loadAnonymousProfile()
        }
      } catch (err) {
        // ignore — fallback to local profile/id generation
        loadAnonymousProfile()
      } finally {
        anonymousChecked.value = true
      }
    })()
  } else {
    loadAnonymousProfile()
    anonymousChecked.value = true
  }
})
</script>

<template>
  <div class="comment-section">
    <div class="comment-header-line">
      <h2 class="comment-section-title">留言 ({{ totalComments }})</h2>
      <div v-if="!isLoggedIn" class="comment-login-inline">游客可直接留言</div>
    </div>

    <div class="comment-list-container">
      <p v-if="isLoadingComments" class="loading-message">加载评论中...</p>
      <p v-else-if="commentError && !comments.length" class="error-message">{{ commentError }}</p>
      <p v-else-if="!comments.length" class="no-comments-message">暂无评论，快来发表第一条评论吧！</p>
      <div v-else class="comment-tree">
        <CommentItemComponent
          v-for="comment in comments"
          :key="comment.id"
          :comment="comment"
          :article-id="articleId || 0"
          :is-logged-in="isLoggedIn"
          :login-user="loginUser"
          :allow-anonymous="allowAnonymous"
          @comment-posted="handleChildPosted"
        />
      </div>
    </div>

    <div class="inline-composer">
      <div v-if="!composerOpen" class="composer-placeholder" @click="openComposer">写下你的留言...</div>
      <div v-else class="composer-expanded">
        <div v-if="!isLoggedIn && anonymousChecked && anonymousHasCommented === false" class="anonymous-form">
          <input v-model="anonymousNickname" type="text" placeholder="昵称（必填）" :disabled="isSubmitting" />
          <input v-model="anonymousEmail" type="email" placeholder="邮箱（必填）" :disabled="isSubmitting" />
          <input v-model="anonymousWebsite" type="text" placeholder="个人网站（选填）" :disabled="isSubmitting" />
        </div>
        <div v-else-if="!isLoggedIn && (anonymousProfileReady || anonymousHasCommented)" class="anonymous-identity-hint">
          <span>以 <b>{{ anonymousNickname }}</b> 身份发表</span>
          <span class="identity-switch" @click="clearAnonymousProfile">切换身份</span>
        </div>
        <textarea v-model="newCommentContent" placeholder="发表你的评论..." rows="4" :disabled="isSubmitting"></textarea>
        <div class="composer-actions">
          <button @click="submitFromComposer" :disabled="isSubmitting || !newCommentContent.trim()">发布</button>
          <button @click="cancelComposer" type="button">取消</button>
        </div>
        <div v-if="commentError" class="comment-error">{{ commentError }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.comment-section { margin-top: 12px; padding: 14px; background: #f9fafb; border-radius: 8px; }
.comment-section-title { font-size: 18px; font-weight: 800; margin-bottom: 12px; color: #0f172a; }
.comment-header-line { display: flex; align-items: center; gap: 12px; justify-content: space-between; }
.comment-login-inline { color: #6b7280; font-size: 14px; }

.comment-list-container { margin-bottom: 16px; }
.comment-tree { display: flex; flex-direction: column; }

.loading-message, .no-comments-message, .error-message {
  text-align: center; color: #6b7280; padding: 20px;
}
.error-message { color: #ef4444; }

.inline-composer { margin-top: 12px; }
.composer-placeholder {
  padding: 14px; background: white; border: 1px dashed #e6eef6;
  border-radius: 8px; color: #6b7280; cursor: text; width: 100%;
}
.composer-expanded { width: 100%; }
.composer-expanded textarea {
  width: 100%; padding: 10px; border: 1px solid #e6eef6;
  border-radius: 8px; min-height: 140px; resize: vertical; margin-bottom: 8px;
  font-size: 14px; outline: none; transition: border-color 0.15s;
}
.composer-expanded textarea:focus { border-color: #2563eb; }

.anonymous-form { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 8px; }
.anonymous-form input {
  padding: 8px 10px; border: 1px solid #e6eef6; border-radius: 6px;
  font-size: 14px; outline: none; transition: border-color 0.15s;
}
.anonymous-form input:focus { border-color: #2563eb; }

.anonymous-identity-hint {
  display: flex; align-items: center; gap: 12px;
  padding: 8px 12px; background: #f0f9ff;
  border: 1px solid #bae6fd; border-radius: 6px;
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
  padding: 8px 12px; border-radius: 6px; border: none; cursor: pointer; font-size: 14px;
}
.composer-actions button:first-child { background: #2563eb; color: white; }
.composer-actions button:first-child:hover:not(:disabled) { background: #1d4ed8; }
.composer-actions button:first-child:disabled { background: #93c5fd; cursor: not-allowed; }
.composer-actions button:last-child { background: #e6eef6; color: #334155; }
.composer-actions button:last-child:hover { background: #dbeafe; }

.comment-error { color: #ef4444; font-size: 14px; margin-top: 8px; }

@media (max-width: 720px) {
  .anonymous-form { grid-template-columns: 1fr; }
}
</style>