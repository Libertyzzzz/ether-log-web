<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import type { LoginUser } from '../types/blog'
import CommentItemComponent from './CommentItem.vue'
import { useComments } from '../composables/useComments'
import { useAnonymousProfile } from '../composables/useAnonymousProfile'
import { fetchAnonymousUser } from '../api'

const props = defineProps<{
  articleId: number | null
  isLoggedIn: boolean
  loginUser: Partial<LoginUser>
  allowAnonymous?: boolean
  variant?: 'card' | 'inline'
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
        const payload = await fetchAnonymousUser()
        const anonId = payload?.anonymousId || null
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
  <div :class="['comment-section', `variant-${variant || 'card'}`]">
    <div class="comment-header-line">
      <div class="comment-title-group">
        <h2 class="comment-section-title">{{ variant === 'inline' ? '评论' : '全部留言' }}</h2>
        <span class="comment-count-pill">{{ totalComments }}</span>
      </div>
      <div v-if="!isLoggedIn" class="comment-login-inline">游客可直接留言</div>
    </div>

    <!-- 留言板模式：输入框置顶，无需翻过所有留言才能写 -->
    <div v-if="variant !== 'inline'" class="inline-composer top-composer">
      <div v-if="!composerOpen" class="composer-placeholder" @click="openComposer">
        <span>写下你的留言、建议或技术交流...</span>
        <span class="composer-trigger-pill">写留言</span>
      </div>
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
        <textarea v-model="newCommentContent" placeholder="支持 Markdown 语法，写下你的留言..." rows="4" :disabled="isSubmitting"></textarea>
        <div class="composer-actions">
          <button @click="submitFromComposer" :disabled="isSubmitting || !newCommentContent.trim()">发布留言</button>
          <button @click="cancelComposer" type="button">取消</button>
        </div>
        <div v-if="commentError" class="comment-error">{{ commentError }}</div>
      </div>
    </div>

    <div class="comment-list-container">
      <p v-if="isLoadingComments" class="loading-message">加载留言中...</p>
      <p v-else-if="commentError && !comments.length" class="error-message">{{ commentError }}</p>
      <p v-else-if="!comments.length" class="no-comments-message">{{ variant === 'inline' ? '还没有评论，来抢沙发吧 ☕' : '暂无留言，快来留下第一条足迹吧！' }}</p>
      <div v-else class="comment-tree">
        <CommentItemComponent
          v-for="comment in comments"
          :key="comment.id"
          :comment="comment"
          :article-id="articleId || 0"
          :is-logged-in="isLoggedIn"
          :login-user="loginUser"
          :allow-anonymous="allowAnonymous"
          :variant="variant || 'card'"
          @comment-posted="handleChildPosted"
        />
      </div>
    </div>

    <!-- 文章详情页 inline 模式：输入框保持在底部 -->
    <div v-if="variant === 'inline'" class="inline-composer">
      <div v-if="!composerOpen" class="composer-placeholder" @click="openComposer">写下你的评论...</div>
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
.comment-section { padding: 0; background: transparent; border-radius: 0; }
.comment-header-line {
  display: flex; align-items: center; gap: 12px; justify-content: space-between;
  margin-bottom: 1rem;
}
.comment-title-group { display: flex; align-items: center; gap: 0.55rem; }
.comment-section-title { font-size: 1.08rem; font-weight: 800; margin: 0; color: #111111; }
.comment-count-pill {
  padding: 0.12rem 0.55rem; border-radius: 999px;
  background: #f1f5f9; color: #475569; font-size: 0.76rem; font-weight: 750;
}
.comment-login-inline {
  padding: 0.22rem 0.65rem; border-radius: 999px;
  background: #f8fafc; border: 1px solid rgba(0, 0, 0, 0.08);
  color: #64748b; font-size: 0.74rem; font-weight: 600;
}

.comment-list-container { margin-bottom: 16px; }
.comment-tree { display: flex; flex-direction: column; gap: 0.75rem; }

.loading-message, .no-comments-message, .error-message {
  text-align: center; color: #64748b; padding: 28px 20px;
  background: #fafaf9; border: 1px dashed rgba(0, 0, 0, 0.1); border-radius: 14px;
  font-size: 0.88rem;
}
.error-message { color: #ef4444; }

.inline-composer { margin-top: 12px; }
.top-composer { margin-top: 0; margin-bottom: 1.25rem; }
.composer-placeholder {
  display: flex; align-items: center; justify-content: space-between; gap: 1rem;
  padding: 0.9rem 1.1rem; background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 14px; color: #64748b; cursor: pointer; width: 100%;
  box-sizing: border-box; font-size: 0.88rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.composer-placeholder:hover {
  border-color: #111111;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
}
.composer-trigger-pill {
  padding: 0.32rem 0.85rem; border-radius: 999px;
  background: #111111; color: #ffffff; font-size: 0.76rem; font-weight: 700;
  flex-shrink: 0;
}
.composer-expanded {
  width: 100%; padding: 1rem 1.1rem; background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.12); border-radius: 14px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.04); box-sizing: border-box;
}
.composer-expanded textarea {
  width: 100%; padding: 0.75rem 0.85rem; border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 10px; min-height: 110px; resize: vertical; margin-bottom: 0.75rem;
  font-size: 0.88rem; outline: none; transition: border-color 0.15s; box-sizing: border-box;
}
.composer-expanded textarea:focus { border-color: #111111; }

.anonymous-form { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 10px; }
.anonymous-form input {
  padding: 8px 10px; border: 1px solid rgba(0, 0, 0, 0.1); border-radius: 8px;
  font-size: 0.84rem; outline: none; transition: border-color 0.15s;
}
.anonymous-form input:focus { border-color: #111111; }

.anonymous-identity-hint {
  display: flex; align-items: center; gap: 12px;
  padding: 8px 12px; background: #fafaf9;
  border: 1px solid rgba(0, 0, 0, 0.08); border-radius: 8px;
  font-size: 0.82rem; color: #334155; margin-bottom: 10px;
}
.anonymous-identity-hint b { color: #111111; font-weight: 700; }
.identity-switch {
  margin-left: auto; color: #111111; cursor: pointer;
  text-decoration: underline; font-size: 0.78rem; font-weight: 600;
}

.composer-actions { display: flex; gap: 8px; justify-content: flex-end; }
.composer-actions button {
  padding: 0.48rem 1.1rem; border-radius: 999px; border: 1px solid transparent;
  cursor: pointer; font-size: 0.82rem; font-weight: 700; transition: all 0.15s ease;
}
.composer-actions button:first-child { background: #111111; color: #ffffff; }
.composer-actions button:first-child:hover:not(:disabled) { background: #27272a; }
.composer-actions button:first-child:disabled { opacity: 0.45; cursor: not-allowed; }
.composer-actions button:last-child {
  background: #ffffff; border-color: rgba(0, 0, 0, 0.12); color: #475569;
}
.composer-actions button:last-child:hover { border-color: #111111; color: #111111; }

.comment-error { color: #ef4444; font-size: 14px; margin-top: 8px; }

/* ════════════════════════════════
   iOS 移动端评论表单
   ════════════════════════════════ */
@media (max-width: 720px) {
  .anonymous-form { grid-template-columns: 1fr; gap: 0.5rem; }
  .anonymous-form input {
    min-height: 44px;
    padding: 0.55rem 0.75rem;
    font-size: 0.95rem;
    border-radius: 10px;
  }
  .comment-section { padding: 0.75rem; border-radius: 12px; }
  .comment-section-title { font-size: 1rem; margin-bottom: 0.65rem; }
  .composer-placeholder {
    padding: 0.85rem 0.9rem;
    border-radius: 12px;
    font-size: 0.92rem;
    min-height: 44px;
  }
  .composer-expanded textarea {
    min-height: 120px;
    padding: 0.75rem;
    font-size: 0.95rem;
    border-radius: 12px;
  }
  .composer-actions button {
    min-height: 44px;
    padding: 0.55rem 1.1rem;
    font-size: 0.9rem;
    border-radius: 12px;
    font-weight: 600;
  }
  .anonymous-identity-hint {
    font-size: 0.82rem;
    padding: 0.6rem 0.75rem;
    border-radius: 10px;
  }
}

/* ════════════════════════════════
   inline 极简内嵌样式（文章详情页）
   ════════════════════════════════ */
.variant-inline.comment-section {
  margin-top: 2.5rem;
  padding: 0;
  background: transparent;
  border-radius: 0;
  border-top: 1px solid #f1f5f9;
  padding-top: 2rem;
}

.variant-inline .comment-header-line {
  margin-bottom: 1.5rem;
}

.variant-inline .comment-section-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 0;
}

.variant-inline .comment-login-inline {
  font-size: 0.82rem;
  color: #94a3b8;
}

.variant-inline .comment-list-container {
  margin-bottom: 1.5rem;
}

.variant-inline .no-comments-message,
.variant-inline .loading-message {
  text-align: left;
  padding: 2rem 0;
  color: #94a3b8;
  font-size: 0.9rem;
}

.variant-inline .inline-composer {
  margin-top: 0;
}

.variant-inline .composer-placeholder {
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  border-radius: 8px;
  padding: 0.85rem 1rem;
  font-size: 0.9rem;
  color: #94a3b8;
}

.variant-inline .composer-expanded textarea {
  border-radius: 8px;
  border-color: #f1f5f9;
}

</style>