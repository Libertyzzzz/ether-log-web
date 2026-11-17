<script setup lang="ts">
import { ShieldCheck, Coffee, Zap, MessageSquareHeart } from 'lucide-vue-next'
import CommentSection from './CommentSection.vue'
import type { LoginUser } from '../types/blog'

defineProps<{
  isLoggedIn: boolean
  loginUser: Partial<LoginUser>
}>()
</script>

<template>
  <div class="gb-page">
    <div class="gb-container">
      <!-- Unified Editorial Hero -->
      <header class="gb-hero">
        <div class="gb-hero-main">
          <span class="gb-eyebrow">Community / Guestbook</span>
          <h1>留言板</h1>
          <p class="gb-sub">欢迎留下你的想法、问题、建议，或者只是打个招呼。支持匿名访客与 Markdown 语法。</p>
        </div>
        <div class="gb-hero-badge">
          <MessageSquareHeart :size="15" />
          <span>Open for Feedback</span>
        </div>
      </header>

      <!-- Content Grid: Comments + Sticky Sidebar -->
      <main class="gb-main-grid">
        <section class="gb-comments-area">
          <CommentSection :article-id="0" :is-logged-in="isLoggedIn" :login-user="loginUser" :allow-anonymous="true" />
        </section>

        <aside class="gb-sidebar">
          <div class="gb-card">
            <h3 class="gb-card-title">
              <span class="gb-card-icon"><ShieldCheck :size="15" /></span>
              留言须知
            </h3>
            <ul class="gb-rules">
              <li>请保持言论友善，尊重他人。</li>
              <li>支持 Markdown 语法与代码片段。</li>
              <li>广告、垃圾信息会被自动清理。</li>
            </ul>
          </div>

          <div class="gb-card featured">
            <h3 class="gb-card-title">
              <span class="gb-card-icon dark"><Zap :size="15" /></span>
              站长寄语
            </h3>
            <p class="gb-card-text">你的每一条留言我都会认真阅读。如果是 BUG 报告或技术交流，会尽快回复。</p>
            <div class="gb-card-footer">
              <Coffee :size="14" />
              <span>Enjoy your stay here.</span>
            </div>
          </div>
        </aside>
      </main>
    </div>
  </div>
</template>

<style scoped>
.gb-page {
  min-height: 100dvh;
  background: #ffffff;
  padding: 5.75rem 0 4rem;
  color: #111111;
}

.gb-container {
  width: 100%;
  max-width: var(--nav-content-max-width, 1140px);
  margin: 0 auto;
  padding: 0 1.25rem;
  box-sizing: border-box;
}

/* ── Unified Editorial Hero ── */
.gb-hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1.5rem;
  padding-bottom: 2rem;
  margin-bottom: 2rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.gb-eyebrow {
  display: inline-block;
  padding: 0.3rem 0.9rem;
  background: #FDF800;
  color: #111111;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border-radius: 999px;
  margin-bottom: 1rem;
}

.gb-hero h1 {
  margin: 0;
  font-size: clamp(2.1rem, 1.4rem + 2.5vw, 3.25rem);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.025em;
  color: #111111;
}

.gb-sub {
  margin: 0.85rem 0 0;
  color: rgba(0, 0, 0, 0.58);
  font-size: 0.98rem;
  line-height: 1.65;
  max-width: 560px;
}

.gb-hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.48rem 0.9rem;
  border-radius: 999px;
  background: #f8fafc;
  border: 1px solid rgba(0, 0, 0, 0.08);
  color: #111111;
  font-size: 0.78rem;
  font-weight: 650;
  white-space: nowrap;
  flex-shrink: 0;
}

/* ── Main Layout ── */
.gb-main-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 1.75rem;
  align-items: start;
}

.gb-comments-area {
  min-width: 0;
}

.gb-sidebar {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: sticky;
  top: 5.5rem;
}

.gb-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 1.25rem;
  border: 1px solid rgba(0, 0, 0, 0.08);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.gb-card:hover {
  border-color: rgba(0, 0, 0, 0.16);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
}

.gb-card.featured {
  background: #fafaf9;
  border-color: rgba(0, 0, 0, 0.1);
}

.gb-card-title {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  font-size: 0.94rem;
  font-weight: 750;
  color: #111111;
  margin: 0 0 0.9rem;
}

.gb-card-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: #FDF800;
  color: #111111;
  flex-shrink: 0;
}

.gb-card-icon.dark {
  background: #111111;
  color: #ffffff;
}

.gb-rules {
  padding: 0;
  margin: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.gb-rules li {
  font-size: 0.85rem;
  color: rgba(0, 0, 0, 0.65);
  line-height: 1.5;
  padding-left: 1rem;
  position: relative;
}

.gb-rules li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.5em;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #111111;
}

.gb-card-text {
  font-size: 0.88rem;
  color: rgba(0, 0, 0, 0.65);
  line-height: 1.65;
  margin: 0 0 0.85rem;
}

.gb-card-footer {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.8rem;
  color: #111111;
  font-weight: 700;
  padding: 0.3rem 0.7rem;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 999px;
}

/* ── Responsive ── */
@media (max-width: 960px) {
  .gb-main-grid {
    grid-template-columns: 1fr;
    gap: 1.25rem;
  }

  .gb-sidebar {
    position: static;
  }
}

@media (max-width: 640px) {
  .gb-page {
    padding: 4.75rem 0 3rem;
  }

  .gb-container {
    padding: 0 0.9rem;
  }

  .gb-hero {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
    padding-bottom: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .gb-sub {
    font-size: 0.92rem;
  }

  .gb-card {
    padding: 1.1rem;
    border-radius: 14px;
  }
}
</style>
