<script setup lang="ts">
import { MessageSquare, FileText, Eye, BookOpen, Edit3, ArrowUpRight, Github, Twitter, Linkedin, Rss } from 'lucide-vue-next'
import type { ArticleListItem, CommentItem, LoginUser } from '../types/blog'
import { getLoginUserName } from '../utils/article'

defineProps<{
  loginUser: Partial<LoginUser>
  articles: ArticleListItem[]
  recentArticles: ArticleListItem[]
  myComments: CommentItem[]
  commentCount: number
  totalViews: number
}>()

defineEmits<{
  openArticle: [article: ArticleListItem]
  editArticle: [article: ArticleListItem]
  newArticle: []
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
function fmtDate(d: string) { return d?.slice(0, 10) || '' }
</script>

<template>
  <div class="pp-page">

    <!-- ── Hero Banner：和 navbar 等宽，两侧留白对齐 ── -->
    <div class="pp-hero">
      <div class="pp-hero-bg-wrap">
        <div class="pp-hero-bg" aria-hidden="true">
          <div class="pp-hero-orb pp-orb-1"></div>
          <div class="pp-hero-orb pp-orb-2"></div>
          <div class="pp-hero-figure"></div>
        </div>
        <div class="pp-hero-inner">
          <div class="pp-avatar-wrap">
            <img
              class="pp-avatar"
              :src="loginUser.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ether'"
              alt="avatar"
            />
          </div>
          <div class="pp-hero-info">
            <div class="pp-hero-name-row">
              <h1 class="pp-hero-name">{{ getLoginUserName(loginUser) }}</h1>
              <span class="pp-verified">✦</span>
            </div>
            <p class="pp-hero-role">Blogger &amp; Developer</p>
            <p class="pp-hero-motto">{{ loginUser.motto || '探索世界，记录思考，创造价值。' }}</p>
            <div class="pp-social">
              <a class="pp-social-btn" href="https://github.com" target="_blank" aria-label="GitHub"><Github :size="15"/></a>
              <a class="pp-social-btn" href="https://twitter.com" target="_blank" aria-label="Twitter"><Twitter :size="15"/></a>
              <a class="pp-social-btn" href="https://linkedin.com" target="_blank" aria-label="LinkedIn"><Linkedin :size="15"/></a>
              <a class="pp-social-btn" href="/rss" aria-label="RSS"><Rss :size="15"/></a>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="pp-body">
      <div class="pp-stats-grid">
        <div class="pp-stat-card">
          <div class="pp-stat-icon" style="background:rgba(99,102,241,0.1);color:#6366f1"><FileText :size="18"/></div>
          <span class="pp-stat-label">文章总数</span>
          <strong class="pp-stat-value">{{ articles.length }}</strong>
          <div class="pp-stat-wave pp-wave-blue"></div>
        </div>
        <div class="pp-stat-card">
          <div class="pp-stat-icon" style="background:rgba(34,197,94,0.1);color:#22c55e"><MessageSquare :size="18"/></div>
          <span class="pp-stat-label">评论总数</span>
          <strong class="pp-stat-value">{{ commentCount }}</strong>
          <div class="pp-stat-wave pp-wave-green"></div>
        </div>
        <div class="pp-stat-card">
          <div class="pp-stat-icon" style="background:rgba(249,115,22,0.1);color:#f97316"><Eye :size="18"/></div>
          <span class="pp-stat-label">总浏览</span>
          <strong class="pp-stat-value">{{ totalViews }}</strong>
          <div class="pp-stat-wave pp-wave-orange"></div>
        </div>
        <div class="pp-stat-card">
          <div class="pp-stat-icon" style="background:rgba(168,85,247,0.1);color:#a855f7"><BookOpen :size="18"/></div>
          <span class="pp-stat-label">草稿</span>
          <strong class="pp-stat-value">0</strong>
          <div class="pp-stat-wave pp-wave-purple"></div>
        </div>
      </div>

      <!-- ── 文章列表 + 评论管理 ── -->
      <div class="pp-main-grid">

        <!-- 我的文章 -->
        <div class="pp-card">
          <div class="pp-card-header">
            <div class="pp-card-title-row">
              <FileText :size="15" class="pp-card-icon"/>
              <h2 class="pp-card-title">我的文章</h2>
            </div>
            <button class="pp-btn-new" type="button" @click="$emit('newArticle')">
              + 新建文章
            </button>
          </div>
          <div class="pp-table-head">
            <span>标题</span><span>分类</span><span>状态</span><span>操作</span>
          </div>
          <div v-if="!articles.length" class="pp-empty">暂无文章</div>
          <div v-for="(post, i) in articles" :key="post.id" class="pp-table-row">
            <div class="pp-row-title">
              <div class="pp-row-cover" :style="getCover(post, i)"></div>
              <span>{{ post.title }}</span>
            </div>
            <span class="pp-row-cat">{{ post.categoryName || '—' }}</span>
            <span class="pp-row-status" :class="post.isTop ? 'top' : 'pub'">
              {{ post.isTop ? '置顶' : '公开' }}
            </span>
            <div class="pp-row-actions">
              <button type="button" class="pp-action-btn edit" @click="$emit('editArticle', post)">
                <Edit3 :size="12"/> 编辑
              </button>
              <button type="button" class="pp-action-btn view" @click="$emit('openArticle', post)">
                <ArrowUpRight :size="12"/> 查看
              </button>
            </div>
          </div>
        </div>

        <!-- 评论管理 -->
        <div class="pp-card">
          <div class="pp-card-header">
            <div class="pp-card-title-row">
              <MessageSquare :size="15" class="pp-card-icon"/>
              <h2 class="pp-card-title">评论管理</h2>
            </div>
          </div>
          <div v-if="!myComments.length" class="pp-empty">暂无评论</div>
          <div v-for="comment in myComments" :key="comment.id" class="pp-comment-item">
            <p class="pp-comment-text">{{ comment.content }}</p>
            <p class="pp-comment-meta">{{ comment.author }} · {{ comment.articleTitle }}</p>
            <div class="pp-comment-actions">
              <button type="button" class="pp-action-btn view">查看文章</button>
              <button type="button" class="pp-action-btn edit">审核</button>
            </div>
          </div>
        </div>

      </div>

      <!-- ── 引言 Banner（固定静态） ── -->
      <div class="pp-quote">
        <span class="pp-quote-mark">"</span>
        <blockquote class="pp-quote-text">
          写作，是把模糊的思考变得清晰，<br/>也是与未来的自己对话。
        </blockquote>
        <cite class="pp-quote-author">— Ether</cite>
        <div class="pp-quote-deco" aria-hidden="true"></div>
      </div>

      <!-- ── 关于我（固定静态） ── -->
      <div class="pp-about">
        <div class="pp-about-avatar-wrap">
          <img
            class="pp-about-avatar"
            :src="loginUser.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ether'"
            alt="avatar"
          />
          <span class="pp-about-badge">Blogger &amp; Developer</span>
        </div>
        <div class="pp-about-content">
          <h2 class="pp-about-title">探索世界，记录思考，创造价值。</h2>
          <p class="pp-about-desc">热爱于技术、设计与产品，重新把你的想法解构成逻辑，用代码和文字来构建属于自己的数字花园。</p>
          <div class="pp-about-stats">
            <div class="pp-about-stat"><strong>{{ articles.length }}</strong><span>文章</span></div>
            <div class="pp-about-stat"><strong>52K</strong><span>阅读</span></div>
            <div class="pp-about-stat"><strong>3.2K</strong><span>喜欢</span></div>
            <div class="pp-about-stat"><strong>2019</strong><span>加入</span></div>
          </div>
        </div>
        <div class="pp-about-deco" aria-hidden="true">
          <svg width="110" height="110" viewBox="0 0 110 110" fill="none">
            <g opacity="0.2">
              <template v-for="r in 5" :key="r">
                <template v-for="c in 5" :key="c">
                  <circle :cx="(c-1)*24+5" :cy="(r-1)*24+5" r="3" fill="#4f46e5"/>
                </template>
              </template>
            </g>
          </svg>
        </div>
      </div>

    </div><!-- /pp-body -->
  </div>
</template>

<style scoped>
/* ── 페이지 컨테이너 ── */
.pp-page { background:#f5f5f7; min-height:100vh; padding-top:6.5rem; }
.pp-body { max-width:64rem; margin:0 auto; padding:0 1.5rem 5rem; display:flex; flex-direction:column; gap:1.5rem; }

/* ── Hero Banner：和 navbar 等宽，两侧留白对齐 ── */
.pp-hero {
  max-width: 64rem;
  margin: 0 auto;
  padding: 0 1rem;
}
.pp-hero-bg-wrap {
  position: relative;
  overflow: hidden;
  border-radius: 1.75rem;
  background: linear-gradient(160deg, #0a0e1a 0%, #0f172a 40%, #1e1b4b 100%);
  min-height: 200px;
}
.pp-hero-bg { position:absolute; inset:0; pointer-events:none; }
.pp-hero-orb {
  position:absolute; border-radius:50%;
  background:radial-gradient(circle,rgba(99,102,241,0.25),transparent 70%);
}
.pp-orb-1 { width:400px;height:400px;top:-100px;right:-80px; }
.pp-orb-2 { width:200px;height:200px;bottom:-40px;right:200px;background:radial-gradient(circle,rgba(129,140,248,0.15),transparent 70%); }
.pp-hero-figure {
  position:absolute; right:8%; bottom:0; width:180px; height:180px;
  background:radial-gradient(ellipse at 50% 80%,rgba(99,102,241,0.2),transparent 70%);
}
.pp-hero-inner {
  position:relative; z-index:1;
  padding:2.5rem 1.5rem 2.5rem;
  display:flex; align-items:center; gap:1.5rem;
}
.pp-avatar-wrap { flex-shrink:0; }
.pp-avatar {
  width:72px; height:72px; border-radius:50%;
  border:3px solid rgba(129,140,248,0.4);
  box-shadow:0 0 24px rgba(99,102,241,0.3);
  object-fit:cover;
}
.pp-hero-info { display:flex; flex-direction:column; gap:0.4rem; }
.pp-hero-name-row { display:flex; align-items:center; gap:0.5rem; }
.pp-hero-name { margin:0; font-size:1.5rem; font-weight:900; color:#f8fafc; }
.pp-verified { color:#818cf8; font-size:1rem; }
.pp-hero-role { margin:0; font-size:0.8rem; color:#818cf8; font-weight:600; }
.pp-hero-motto { margin:0; font-size:0.88rem; color:#94a3b8; line-height:1.6; }
.pp-social { display:flex; gap:0.4rem; margin-top:0.25rem; }
.pp-social-btn {
  width:2rem; height:2rem; border-radius:0.5rem;
  background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1);
  color:#94a3b8; display:inline-flex; align-items:center; justify-content:center;
  text-decoration:none; transition:background 0.2s,color 0.2s;
}
.pp-social-btn:hover { background:rgba(129,140,248,0.2); color:#a5b4fc; }

/* ── 统计卡片 ── */
.pp-stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:1rem; }
.pp-stat-card {
  background:white; border-radius:1.25rem; padding:1.25rem 1.25rem 1rem;
  border:1px solid rgba(226,232,240,0.8);
  box-shadow:0 2px 8px rgba(15,23,42,0.04);
  display:flex; flex-direction:column; gap:0.35rem; position:relative; overflow:hidden;
}
.pp-stat-icon {
  width:2.25rem; height:2.25rem; border-radius:0.65rem;
  display:flex; align-items:center; justify-content:center; margin-bottom:0.25rem;
}
.pp-stat-label { font-size:0.75rem; color:#94a3b8; font-weight:600; }
.pp-stat-value { font-size:1.75rem; font-weight:900; color:#0f172a; line-height:1; }
/* 波形装饰（纯 CSS） */
.pp-stat-wave {
  position:absolute; bottom:0; left:0; right:0; height:32px;
  background-repeat:no-repeat; background-size:100% 100%;
  opacity:0.35;
}
.pp-wave-blue   { background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 32'%3E%3Cpath d='M0 20 Q25 8 50 20 Q75 32 100 20 Q125 8 150 20 Q175 32 200 20 L200 32 L0 32Z' fill='%236366f1'/%3E%3C/svg%3E"); }
.pp-wave-green  { background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 32'%3E%3Cpath d='M0 20 Q25 8 50 20 Q75 32 100 20 Q125 8 150 20 Q175 32 200 20 L200 32 L0 32Z' fill='%2322c55e'/%3E%3C/svg%3E"); }
.pp-wave-orange { background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 32'%3E%3Cpath d='M0 20 Q25 8 50 20 Q75 32 100 20 Q125 8 150 20 Q175 32 200 20 L200 32 L0 32Z' fill='%23f97316'/%3E%3C/svg%3E"); }
.pp-wave-purple { background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 32'%3E%3Cpath d='M0 20 Q25 8 50 20 Q75 32 100 20 Q125 8 150 20 Q175 32 200 20 L200 32 L0 32Z' fill='%23a855f7'/%3E%3C/svg%3E"); }

/* ── 主内容双栏 ── */
.pp-main-grid { display:grid; grid-template-columns:1.4fr 1fr; gap:1.25rem; }
.pp-card {
  background:white; border-radius:1.5rem; padding:1.5rem;
  border:1px solid rgba(226,232,240,0.8);
  box-shadow:0 2px 8px rgba(15,23,42,0.04);
  display:flex; flex-direction:column; gap:0;
}
.pp-card-header {
  display:flex; align-items:center; justify-content:space-between;
  margin-bottom:1rem;
}
.pp-card-title-row { display:flex; align-items:center; gap:0.5rem; }
.pp-card-icon { color:#4f46e5; }
.pp-card-title { margin:0; font-size:0.95rem; font-weight:800; color:#0f172a; }
.pp-btn-new {
  padding:0.35rem 0.9rem; border:none; border-radius:9999px;
  background:#4f46e5; color:white; font-size:0.75rem; font-weight:800;
  cursor:pointer; transition:background 0.2s;
}
.pp-btn-new:hover { background:#4338ca; }

/* 表格头 */
.pp-table-head {
  display:grid; grid-template-columns:2fr 1fr 0.7fr 1.2fr;
  padding:0.5rem 0.5rem; border-bottom:1px solid #f1f5f9;
  font-size:0.7rem; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.08em;
  margin-bottom:0.25rem;
}
.pp-table-row {
  display:grid; grid-template-columns:2fr 1fr 0.7fr 1.2fr;
  align-items:center; padding:0.65rem 0.5rem;
  border-bottom:1px solid #f8fafc; gap:0.5rem;
  transition:background 0.15s; border-radius:0.75rem;
}
.pp-table-row:hover { background:#f8fafc; }
.pp-row-title { display:flex; align-items:center; gap:0.6rem; min-width:0; }
.pp-row-cover {
  width:32px; height:32px; border-radius:0.5rem; flex-shrink:0;
  background-size:cover; background-position:center;
}
.pp-row-title span { font-size:0.82rem; font-weight:700; color:#0f172a; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.pp-row-cat { font-size:0.75rem; color:#64748b; }
.pp-row-status {
  display:inline-flex; padding:0.15rem 0.55rem; border-radius:9999px;
  font-size:0.68rem; font-weight:800;
}
.pp-row-status.top { background:#eff6ff; color:#2563eb; }
.pp-row-status.pub { background:#f0fdf4; color:#16a34a; }
.pp-row-actions { display:flex; gap:0.35rem; }
.pp-action-btn {
  display:inline-flex; align-items:center; gap:0.25rem;
  padding:0.25rem 0.6rem; border:none; border-radius:9999px;
  font-size:0.7rem; font-weight:700; cursor:pointer; transition:background 0.2s;
}
.pp-action-btn.edit { background:rgba(79,70,229,0.08); color:#4f46e5; }
.pp-action-btn.edit:hover { background:rgba(79,70,229,0.15); }
.pp-action-btn.view { background:#f1f5f9; color:#475569; }
.pp-action-btn.view:hover { background:#e2e8f0; }
.pp-empty { padding:2rem; text-align:center; color:#94a3b8; font-size:0.85rem; }

/* 评论 */
.pp-comment-item {
  padding:1rem; border-radius:1rem; background:#f8fafc;
  margin-bottom:0.75rem; display:flex; flex-direction:column; gap:0.4rem;
}
.pp-comment-text { margin:0; font-size:0.85rem; color:#334155; line-height:1.55; }
.pp-comment-meta { margin:0; font-size:0.72rem; color:#94a3b8; }
.pp-comment-actions { display:flex; gap:0.4rem; }

/* ── 引言 Banner ── */
.pp-quote {
  position:relative; background:#0f172a; border-radius:1.75rem;
  padding:3rem 3.5rem; overflow:hidden;
  display:flex; flex-direction:column; gap:0.85rem;
}
.pp-quote-mark { font-size:4.5rem; line-height:0.8; color:#4f46e5; font-family:Georgia,serif; font-weight:900; opacity:0.8; }
.pp-quote-text { margin:0; font-size:clamp(1.1rem,2vw,1.5rem); font-weight:700; color:#f1f5f9; line-height:1.65; font-style:normal; }
.pp-quote-author { font-size:0.88rem; color:#64748b; font-style:normal; font-weight:600; }
.pp-quote-deco {
  position:absolute; right:-40px; top:-40px; width:200px; height:200px; border-radius:50%;
  background:radial-gradient(circle,rgba(99,102,241,0.15),transparent 70%);
}

/* ── 关于我 ── */
.pp-about {
  background:white; border-radius:2rem; padding:2.5rem;
  border:1px solid rgba(226,232,240,0.8);
  box-shadow:0 2px 8px rgba(15,23,42,0.04);
  display:grid; grid-template-columns:auto 1fr auto; gap:2.5rem; align-items:center;
}
.pp-about-avatar-wrap { display:flex; flex-direction:column; align-items:center; gap:0.6rem; }
.pp-about-avatar { width:80px; height:80px; border-radius:50%; object-fit:cover; border:3px solid rgba(79,70,229,0.2); box-shadow:0 8px 24px rgba(79,70,229,0.2); }
.pp-about-badge { padding:0.2rem 0.65rem; border-radius:9999px; background:#eff6ff; color:#4f46e5; font-size:0.65rem; font-weight:800; white-space:nowrap; }
.pp-about-content { display:flex; flex-direction:column; gap:0.85rem; }
.pp-about-title { margin:0; font-size:1.2rem; font-weight:900; color:#0f172a; }
.pp-about-desc { margin:0; font-size:0.85rem; color:#64748b; line-height:1.75; }
.pp-about-stats { display:flex; gap:2rem; flex-wrap:wrap; }
.pp-about-stat { display:flex; flex-direction:column; gap:0.1rem; }
.pp-about-stat strong { font-size:1.3rem; font-weight:900; color:#0f172a; }
.pp-about-stat span { font-size:0.7rem; color:#94a3b8; font-weight:600; }
.pp-about-deco { opacity:0.7; }

/* ── 响应式 ── */
@media (max-width:900px) {
  .pp-stats-grid { grid-template-columns:repeat(2,1fr); }
  .pp-main-grid { grid-template-columns:1fr; }
  .pp-about { grid-template-columns:1fr; text-align:center; }
  .pp-about-avatar-wrap { align-items:center; }
  .pp-about-stats { justify-content:center; }
  .pp-about-deco { display:none; }
}
@media (max-width:600px) {
  .pp-stats-grid { grid-template-columns:repeat(2,1fr); }
  .pp-table-head,
  .pp-table-row { grid-template-columns:1fr auto; }
  .pp-table-head span:nth-child(2),
  .pp-table-head span:nth-child(3),
  .pp-table-row .pp-row-cat,
  .pp-table-row .pp-row-status { display:none; }
  .pp-quote { padding:2rem 1.5rem; }
}
</style>
