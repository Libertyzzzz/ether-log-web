<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import axios from 'axios'
import type { CommentItem, CommentSubmitRequest, ResultResponse, LoginUser, BackendCommentVO } from '../types/blog'
import CommentItemComponent from './CommentItem.vue'

const props = defineProps<{
  articleId: number | null;
  isLoggedIn: boolean;
  loginUser: Partial<LoginUser>;
  allowAnonymous?: boolean;
}>();
const emit = defineEmits<{ (e: 'require-login'): void }>();

const comments = ref<CommentItem[]>([]);
const newCommentContent = ref('');
const isLoadingComments = ref(false);
const isSubmittingComment = ref(false);
const commentError = ref('');
const anonymousNickname = ref('');
const anonymousEmail = ref('');
const anonymousWebsite = ref('');
const composerOpen = ref(false);

const totalComments = computed(() => {
  function count(list: CommentItem[]): number {
    let n = list.length;
    for (const c of list) if (c.children) n += count(c.children);
    return n;
  }
  return count(comments.value);
});

function formatTime(t: string | null | undefined): string {
  if (!t) return '';
  try {
    const d = new Date(t);
    if (isNaN(d.getTime())) return t;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch { return t || ''; }
}

function mapComments(vos: BackendCommentVO[] | null | undefined): CommentItem[] {
  if (!vos || !Array.isArray(vos)) return [];
  return vos.map(v => ({
    id: v.id,
    author: v.nickname || '匿名用户',
    nickname: v.nickname || undefined,
    avatar: v.avatarUrl || undefined,
    content: v.content,
    status: 'approved',
    createTime: formatTime(v.createTime),
    website: v.website || undefined,
    parentNickname: v.parentNickname || undefined,
    children: v.children && v.children.length ? mapComments(v.children) : undefined,
  }));
}

function getAnonymousId(): string {
  let id = localStorage.getItem('anonymousCommentId');
  if (!id) {
    id = 'anon_' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('anonymousCommentId', id);
  }
  return id;
}

function saveAnonymousProfile(nickname: string, email: string, website: string) {
  localStorage.setItem('anonymousNickname', nickname);
  localStorage.setItem('anonymousEmail', email);
  localStorage.setItem('anonymousWebsite', website || '');
}

function loadAnonymousProfile() {
  if (localStorage.getItem('anonymousCommentId')) {
    const n = localStorage.getItem('anonymousNickname') || '';
    const e = localStorage.getItem('anonymousEmail') || '';
    const w = localStorage.getItem('anonymousWebsite') || '';
    anonymousNickname.value = n;
    anonymousEmail.value = e;
    anonymousWebsite.value = w;
  }
}

function clearAnonymousProfile() {
  localStorage.removeItem('anonymousCommentId');
  localStorage.removeItem('anonymousNickname');
  localStorage.removeItem('anonymousEmail');
  localStorage.removeItem('anonymousWebsite');
  anonymousNickname.value = '';
  anonymousEmail.value = '';
  anonymousWebsite.value = '';
}

const anonymousProfileReady = computed(() => {
  return !!localStorage.getItem('anonymousCommentId')
    && !!localStorage.getItem('anonymousNickname')
    && !!localStorage.getItem('anonymousEmail');
});

function getAuthHeaders() {
  const token = localStorage.getItem('authToken');
  return token ? { Authorization: token } : {};
}

async function fetchComments() {
  if (props.articleId === null) {
    comments.value = [];
    return;
  }
  isLoadingComments.value = true;
  commentError.value = '';
  try {
    const url = props.articleId === 0
      ? '/api/comment/list/guest-book'
      : `/api/comment/list/${props.articleId}`;
    const response = await axios.get<ResultResponse<BackendCommentVO[]>>(url);
    if (response.data.code === 200) {
      comments.value = mapComments(response.data.data || []);
    } else {
      commentError.value = response.data.message || '评论加载失败。';
      comments.value = [];
    }
  } catch (error) {
    commentError.value = axios.isAxiosError(error) && error.response?.data?.message
      ? error.response.data.message
      : '评论接口暂时不可用，请稍后重试。';
    comments.value = [];
  } finally {
    isLoadingComments.value = false;
  }
}

async function submitComment(): Promise<boolean> {
  if (!props.isLoggedIn && props.allowAnonymous === false) {
    commentError.value = '请登录后发表评论。';
    emit('require-login');
    return false;
  }
  if (!newCommentContent.value.trim()) {
    commentError.value = '评论内容不能为空。';
    return false;
  }
  if (props.articleId === null) {
    commentError.value = '无法获取文章ID，请刷新页面。';
    return false;
  }
  if (!props.isLoggedIn && !anonymousNickname.value.trim()) {
    commentError.value = '请填写昵称。';
    return false;
  }
  if (!props.isLoggedIn && !anonymousEmail.value.trim()) {
    commentError.value = '请填写邮箱。';
    return false;
  }

  isSubmittingComment.value = true;
  commentError.value = '';

  try {
    const payload: CommentSubmitRequest = {
      articleId: props.articleId,
      content: newCommentContent.value.trim(),
    };
    if (props.isLoggedIn) {
      payload.nickname = props.loginUser.nickname || props.loginUser.username || undefined;
      payload.avatarUrl = props.loginUser.avatar || undefined;
    } else {
      payload.nickname = anonymousNickname.value.trim();
      payload.email = anonymousEmail.value.trim();
      payload.website = anonymousWebsite.value.trim() || undefined;
      payload.anonymousId = getAnonymousId();
      saveAnonymousProfile(
        anonymousNickname.value.trim(),
        anonymousEmail.value.trim(),
        anonymousWebsite.value.trim()
      );
    }

    const response = await axios.post<ResultResponse<void>>(
      '/api/comment/publish',
      payload,
      { headers: getAuthHeaders() }
    );

    if (response.data.code === 200) {
      newCommentContent.value = '';
      await fetchComments();
      return true;
    } else {
      commentError.value = response.data.message || '评论提交失败。';
      return false;
    }
  } catch (error) {
    commentError.value = axios.isAxiosError(error) && error.response?.data?.message
      ? error.response.data.message
      : '评论提交失败，请稍后重试。';
  } finally {
    isSubmittingComment.value = false;
  }
  return false;
}

function openComposer() {
  composerOpen.value = true;
  nextTick(() => {
    const ta = document.querySelector('.inline-composer textarea') as HTMLTextAreaElement | null;
    if (ta) {
      ta.focus();
      ta.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
}

function cancelComposer() {
  composerOpen.value = false;
  newCommentContent.value = '';
  commentError.value = '';
}

async function submitFromComposer() {
  const ok = await submitComment();
  if (ok) composerOpen.value = false;
}

function handleChildPosted() {
  fetchComments();
}

watch(() => props.articleId, (newId) => {
  if (newId !== null) fetchComments();
  else comments.value = [];
}, { immediate: true });

onMounted(() => {
  loadAnonymousProfile();
  if (props.articleId !== null) fetchComments();
});
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
        <div v-if="!isLoggedIn && !anonymousProfileReady" class="anonymous-form">
          <input v-model="anonymousNickname" type="text" placeholder="昵称（必填）" :disabled="isSubmittingComment" />
          <input v-model="anonymousEmail" type="email" placeholder="邮箱（必填）" :disabled="isSubmittingComment" />
          <input v-model="anonymousWebsite" type="text" placeholder="个人网站（选填）" :disabled="isSubmittingComment" />
        </div>
        <div v-else-if="!isLoggedIn && anonymousProfileReady" class="anonymous-identity-hint">
          <span>以 <b>{{ anonymousNickname }}</b> 身份发表</span>
          <span class="identity-switch" @click="clearAnonymousProfile">切换身份</span>
        </div>
        <textarea v-model="newCommentContent" placeholder="发表你的评论..." rows="4" :disabled="isSubmittingComment"></textarea>
        <div class="composer-actions">
          <button @click="submitFromComposer" :disabled="isSubmittingComment || !newCommentContent.trim()">发布</button>
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