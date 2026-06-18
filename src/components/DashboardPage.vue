<script setup lang="ts">
import { FileText, MessageSquare, Eye, BookOpen, Edit3, Trash2, ArrowUpRight, Plus, LayoutDashboard, Check } from 'lucide-vue-next'
import type { ArticleListItem, CommentItem } from '../types/blog'

defineProps<{
  articles: ArticleListItem[]
  pendingComments: CommentItem[]
  isLoadingPending: boolean
  commentCount: number
  totalViews: number
}>()

defineEmits<{
  newArticle: []
  editArticle: [article: ArticleListItem]
  deleteArticle: [articleId: number]
  openArticle: [article: ArticleListItem]
  approveComment: [commentId: number]
  deleteComment: [commentId: number]
}>()

const coverGradients = [
  'linear-gradient(135deg,#1e1b4b,#4338ca)',
  'linear-gradient(135deg,#0f172a,#1d4ed8)',
  'linear-gradient(135deg,#1a1a2e,#0f3460)',
  'linear-gradient(135deg,#0d1117,#21262d)',
  'linear-gradient(135deg,#1e293b,#334155)',
]
function getCover(post: ArticleListItem, i: number) {
  return post.coverImg
    ? `background-image:url('${post.coverImg}')`
    : `background:${coverGradients[i % coverGradients.length]}`
}
</script>

<template>
  <div class="db-page">

    <!-- ── 顶部 Banner ── -->
    <div class="db-hero">
      <div class="db-hero-bg-wrap">
        <div class="db-hero-bg" aria-hidden="true">
          <div class="db-orb db-orb-1"></div>
          <div class="db-orb db-orb-2"></div>
        </div>
        <div class="db-hero-inner">
          <div class="db-hero-icon">
            <LayoutDashboard :size="28" />
          </div>
          <div class="db-hero-info">
            <h1 class="db-hero-title">控制面板</h1>
            <p class="db-hero-sub">管理你的文章、评论与内容数据</p>
          </div>
          <button class="db-btn-new" type="button" @click="$emit('newArticle')">
            <Plus :size="15" />
            发布文章
          </button>
        </div>
      </div>
    </div>

    <div class="db-body">

      <!-- ── 统计卡片 ── -->
      <div class="db-stats-grid">
        <div class="db-stat-card">
          <div class="db-stat-icon" style="background:rgba(99,102,241,0.1);color:#6366f1"><FileText :size="18"/></div>
          <span class="db-stat-label">文章总数</span>
          <strong class="db-stat-value">{{ articles.length }}</strong>
          <div class="db-stat-wave db-wave-blue"></div>
        </div>
        <div class="db-stat-card">
          <div class="db-stat-icon" style="background:rgba(34,197,94,0.1);color:#22c55e"><MessageSquare :size="18"/></div>
          <span class="db-stat-label">待审核评论</span>
          <strong class="db-stat-value">{{ commentCount }}</strong>
          <div class="db-stat-wave db-wave-green"></div>
        </div>
        <div class="db-stat-card">
          <div class="db-stat-icon" style="background:rgba(249,115,22,0.1);color:#f97316"><Eye :size="18"/></div>
          <span class="db-stat-label">总浏览</span>
          <strong class="db-stat-value">{{ totalViews }}</strong>
          <div class="db-stat-wave db-wave-orange"></div>
        </div>
        <div class="db-stat-card">
          <div class="db-stat-icon" style="background:rgba(168,85,247,0.1);color:#a855f7"><BookOpen :size="18"/></div>
          <span class="db-stat-label">草稿</span>
          <strong class="db-stat-value">0</strong>
          <div class="db-stat-wave db-wave-purple"></div>
        </div>
      </div>

      <!-- ── 文章列表 + 评论管理 ── -->
      <div class="db-main-grid">

        <!-- 文章列表 -->
        <div class="db-card">
          <div class="db-card-header">
            <div class="db-card-title-row">
              <FileText :size="15" class="db-card-icon" />
              <h2 class="db-card-title">我的文章</h2>
            </div>
            <button class="db-btn-sm" type="button" @click="$emit('newArticle')">
              <Plus :size="13" /> 新建
            </button>
          </div>

          <div class="db-table-head">
            <span>标题</span>
            <span>分类</span>
            <span>状态</span>
            <span>操作</span>
          </div>

          <div v-if="!articles.length" class="db-empty">暂无文章，点击新建开始写作</div>

          <div v-for="(post, i) in articles" :key="post.id" class="db-table-row">
            <div class="db-row-title">
              <div class="db-row-cover" :style="getCover(post, i)"></div>
              <span>{{ post.title }}</span>
            </div>
            <span class="db-row-cat">{{ post.categoryName || '—' }}</span>
            <span class="db-row-status" :class="post.isTop ? 'top' : 'pub'">
              {{ post.isTop ? '置顶' : '公开' }}
            </span>
            <div class="db-row-actions">
              <button type="button" class="db-action-btn edit" @click="$emit('editArticle', post)">
                <Edit3 :size="11" /> 编辑
              </button>
              <button type="button" class="db-action-btn view" @click="$emit('openArticle', post)">
                <ArrowUpRight :size="11" /> 查看
              </button>
              <button type="button" class="db-action-btn danger" @click="$emit('deleteArticle', post.id)">
                <Trash2 :size="11" />
              </button>
            </div>
          </div>
        </div>

        <!-- 待审核评论 -->
        <div class="db-card">
          <div class="db-card-header">
            <div class="db-card-title-row">
              <MessageSquare :size="15" class="db-card-icon" />
              <h2 class="db-card-title">待审核评论</h2>
            </div>
          </div>

          <div v-if="isLoadingPending" class="db-empty">加载中...</div>
          <div v-else-if="!pendingComments.length" class="db-empty">暂无待审核的评论</div>

          <div v-for="comment in pendingComments" :key="comment.id" class="db-comment-item">
            <p class="db-comment-text">{{ comment.content }}</p>
            <p class="db-comment-meta">
              {{ comment.author }}
              <template v-if="comment.articleTitle"> · {{ comment.articleTitle }}</template>
              <template v-if="comment.createTime"> · {{ comment.createTime }}</template>
            </p>
            <div class="db-comment-actions">
              <button type="button" class="db-action-btn approve" @click="$emit('approveComment', comment.id)">
                <Check :size="11" /> 通过
              </button>
              <button type="button" class="db-action-btn danger" @click="$emit('deleteComment', comment.id)">
                <Trash2 :size="11" /> 删除
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
.db-page { background:#f5f5f7; min-height:100vh; padding-top: 6rem; }
.db-body { max-width:64rem; margin: 1.5rem auto 0; padding:0 1.5rem 5rem; display:flex; flex-direction:column; gap:2rem; }

/* ── Hero Banner ── */
.db-hero { max-width:64rem; margin:0 auto; padding:0 1.5rem; }
.db-hero-bg-wrap {
  position:relative; overflow:hidden; border-radius:1.75rem;
  background:linear-gradient(160deg,#0a0e1a 0%,#0f172a 40%,#1e1b4b 100%);
  min-height:120px;
}
.db-hero-bg { position:absolute; inset:0; pointer-events:none; }
.db-orb {
  position:absolute; border-radius:50%;
  background:radial-gradient(circle,rgba(99,102,241,0.25),transparent 70%);
}
.db-orb-1 { width:350px;height:350px;top:-120px;right:-60px; }
.db-orb-2 { width:180px;height:180px;bottom:-60px;right:180px;background:radial-gradient(circle,rgba(129,140,248,0.15),transparent 70%); }
.db-hero-inner {
  position:relative; z-index:1;
  padding: 2.5rem 2.5rem;
  display:flex; align-items:center; gap:1.25rem;
}
.db-hero-icon {
  width:56px; height:56px; border-radius:1.1rem; flex-shrink:0;
  background:rgba(129,140,248,0.15); border:1px solid rgba(129,140,248,0.25);
  display:flex; align-items:center; justify-content:center; color:#a5b4fc;
}
.db-hero-title { margin:0; font-size:1.5rem; font-weight:900; color:#f8fafc; }
.db-hero-sub { margin:0; font-size:0.85rem; color:#94a3b8; }
.db-btn-new {
  display:inline-flex; align-items:center; gap:0.4rem;
  padding:0.6rem 1.25rem; border:none; border-radius:9999px;
  background:#4f46e5; color:white; font-size:0.82rem; font-weight:800;
  cursor:pointer; transition:background 0.2s,transform 0.15s; flex-shrink:0;
}
.db-btn-new:hover { background:#4338ca; transform:translateY(-1px); }

/* ── 统计卡片 ── */
.db-stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:1rem; }
.db-stat-card {
  background:white; border-radius:1.25rem; padding:1.25rem 1.25rem 1rem;
  border:1px solid rgba(226,232,240,0.8); box-shadow:0 2px 8px rgba(15,23,42,0.04);
  display:flex; flex-direction:column; gap:0.35rem; position:relative; overflow:hidden;
}
.db-stat-icon { width:2.25rem;height:2.25rem;border-radius:0.65rem;display:flex;align-items:center;justify-content:center;margin-bottom:0.25rem; }
.db-stat-label { font-size:0.75rem;color:#94a3b8;font-weight:600; }
.db-stat-value { font-size:1.75rem;font-weight:900;color:#0f172a;line-height:1; }
.db-stat-wave { position:absolute;bottom:0;left:0;right:0;height:32px;background-repeat:no-repeat;background-size:100% 100%;opacity:0.35; }
.db-wave-blue   { background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 32'%3E%3Cpath d='M0 20 Q25 8 50 20 Q75 32 100 20 Q125 8 150 20 Q175 32 200 20 L200 32 L0 32Z' fill='%236366f1'/%3E%3C/svg%3E"); }
.db-wave-green  { background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 32'%3E%3Cpath d='M0 20 Q25 8 50 20 Q75 32 100 20 Q125 8 150 20 Q175 32 200 20 L200 32 L0 32Z' fill='%2322c55e'/%3E%3C/svg%3E"); }
.db-wave-orange { background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 32'%3E%3Cpath d='M0 20 Q25 8 50 20 Q75 32 100 20 Q125 8 150 20 Q175 32 200 20 L200 32 L0 32Z' fill='%23f97316'/%3E%3C/svg%3E"); }
.db-wave-purple { background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 32'%3E%3Cpath d='M0 20 Q25 8 50 20 Q75 32 100 20 Q125 8 150 20 Q175 32 200 20 L200 32 L0 32Z' fill='%23a855f7'/%3E%3C/svg%3E"); }

/* ── 主内容双栏 ── */
.db-main-grid { display:grid; grid-template-columns:1.4fr 1fr; gap:1.25rem; }
.db-card {
  background:white; border-radius:1.5rem; padding:1.5rem;
  border:1px solid rgba(226,232,240,0.8); box-shadow:0 2px 8px rgba(15,23,42,0.04);
  display:flex; flex-direction:column; gap:0;
}
.db-card-header { display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem; }
.db-card-title-row { display:flex;align-items:center;gap:0.5rem; }
.db-card-icon { color:#4f46e5; }
.db-card-title { margin:0;font-size:0.95rem;font-weight:800;color:#0f172a; }
.db-btn-sm {
  display:inline-flex;align-items:center;gap:0.3rem;
  padding:0.3rem 0.75rem;border:none;border-radius:9999px;
  background:#4f46e5;color:white;font-size:0.72rem;font-weight:800;cursor:pointer;transition:background 0.2s;
}
.db-btn-sm:hover { background:#4338ca; }

/* 表格 */
.db-table-head {
  display:grid;grid-template-columns:2fr 1fr 0.7fr 1.4fr;
  padding: 0.75rem 0.5rem; border-bottom:1px solid #f1f5f9;
  font-size:0.7rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.25rem;
}
.db-table-row {
  display:grid;grid-template-columns:2fr 1fr 0.7fr 1.4fr;
  align-items:center; padding: 0.85rem 0.5rem;
  border-bottom:1px solid #f8fafc;gap:0.5rem;
  transition:background 0.15s;border-radius:0.75rem;
}
.db-table-row:hover { background:#f8fafc; }
.db-row-title { display:flex;align-items:center;gap:0.6rem;min-width:0; }
.db-row-cover { width:32px;height:32px;border-radius:0.5rem;flex-shrink:0;background-size:cover;background-position:center; }
.db-row-title span { font-size:0.82rem;font-weight:700;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
.db-row-cat { font-size:0.75rem;color:#64748b; }
.db-row-status { display:inline-flex;padding:0.15rem 0.55rem;border-radius:9999px;font-size:0.68rem;font-weight:800; }
.db-row-status.top { background:#eff6ff;color:#2563eb; }
.db-row-status.pub { background:#f0fdf4;color:#16a34a; }
.db-row-actions { display:flex;gap:0.3rem;flex-wrap:wrap; }
.db-action-btn {
  display:inline-flex;align-items:center;gap:0.2rem;
  padding:0.22rem 0.55rem;border:none;border-radius:9999px;
  font-size:0.68rem;font-weight:700;cursor:pointer;transition:background 0.2s;
}
.db-action-btn.edit { background:rgba(79,70,229,0.08);color:#4f46e5; }
.db-action-btn.edit:hover { background:rgba(79,70,229,0.15); }
.db-action-btn.view { background:#f1f5f9;color:#475569; }
.db-action-btn.view:hover { background:#e2e8f0; }
.db-action-btn.danger { background:rgba(239,68,68,0.08);color:#dc2626; }
.db-action-btn.danger:hover { background:rgba(239,68,68,0.15); }
.db-action-btn.approve { background:rgba(34,197,94,0.08);color:#16a34a; }
.db-action-btn.approve:hover { background:rgba(34,197,94,0.15); }
.db-action-btn:disabled { opacity:0.4;cursor:not-allowed; }
.db-empty { padding:2rem;text-align:center;color:#94a3b8;font-size:0.85rem; }

/* 评论 */
.db-comment-item { padding:1rem;border-radius:1rem;background:#f8fafc;margin-bottom:0.75rem;display:flex;flex-direction:column;gap:0.4rem; }
.db-comment-text { margin:0;font-size:0.85rem;color:#334155;line-height:1.55; }
.db-comment-meta { margin:0;font-size:0.72rem;color:#94a3b8; }
.db-comment-actions { display:flex;gap:0.4rem; }

/* 响应式 */
@media (max-width:900px) {
  .db-stats-grid { grid-template-columns:repeat(2,1fr); }
  .db-main-grid { grid-template-columns:1fr; }
}
@media (max-width:600px) {
  .db-stats-grid { grid-template-columns:repeat(2,1fr); }
  .db-table-head,
  .db-table-row { grid-template-columns:1fr auto; }
  .db-table-head span:nth-child(2),
  .db-table-head span:nth-child(3),
  .db-table-row .db-row-cat,
  .db-table-row .db-row-status { display:none; }
  .db-hero-inner { flex-wrap:wrap; }
  .db-btn-new { width:100%; justify-content:center; }
}
</style>