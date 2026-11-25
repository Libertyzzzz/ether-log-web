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
      <!-- Unified Matte-Black Studio Hero -->
      <header class="gb-hero">
        <div class="gb-hero-main">
          <div class="gb-hero-title-row">
            <h1>留言板</h1>
            <span class="gb-status-pill">
              <MessageSquareHeart :size="13" />
              Open for Feedback
            </span>
          </div>
          <p class="gb-sub">欢迎留下你的想法、问题、建议，或者只是打个招呼。支持匿名访客与 Markdown 语法。</p>
        </div>

        <div class="gb-hero-aside">
          <div class="gb-aside-item">
            <span>支持格式</span>
            <strong>Markdown · 代码块</strong>
          </div>
          <div class="gb-aside-divider"></div>
          <div class="gb-aside-item">
            <span>访客权限</span>
            <strong>免登录直接留言</strong>
          </div>
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
              <Coffee :size="13" />
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
  padding: 5.5rem 0 4rem;
  color: #111111;
}

.gb-container {
  width: 100%;
  max-width: var(--nav-content-max-width, 1140px);
  margin: 0 auto;
  padding: 0 1.25rem;
  box-sizing: border-box;
}

/* ── Unified Matte-Black Studio Hero ── */
.gb-hero {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
  padding: 1.65rem 2rem;
  margin-bottom: 1.75rem;
  border-radius: 16px;
  background: #111111;
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #ffffff;
}

.gb-hero-title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.gb-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.28rem 0.75rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.72rem;
  font-weight: 650;
  white-space: nowrap;
}

.gb-hero h1 {
  margin: 0;
  font-size: clamp(1.85rem, 1.35rem + 1.8vw, 2.5rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.025em;
  color: #ffffff;
}

.gb-sub {
  margin: 0.65rem 0 0;
  color: rgba(255, 255, 255, 0.68);
  font-size: 0.92rem;
  line-height: 1.6;
  max-width: 520px;
}

.gb-hero-aside {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1rem 1.35rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.gb-aside-item {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.gb-aside-item span {
  font-size: 0.72rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
}

.gb-aside-item strong {
  font-size: 0.92rem;
  font-weight: 750;
  color: #ffffff;
  white-space: nowrap;
}

.gb-aside-divider {
  width: 1px;
  height: 2rem;
  background: rgba(255, 255, 255, 0.12);
}

/* ── Main Layout ── */
.gb-main-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 310px;
  gap: 1.5rem;
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
  top: 5.25rem;
}

.gb-card {
  background: #ffffff;
  border-radius: 14px;
  padding: 1.2rem;
  border: 1px solid rgba(0, 0, 0, 0.08);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.gb-card:hover {
  border-color: rgba(0, 0, 0, 0.15);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
}

.gb-card.featured {
  background: #fafaf9;
}

.gb-card-title {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  font-size: 0.92rem;
  font-weight: 750;
  color: #111111;
  margin: 0 0 0.85rem;
}

.gb-card-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 7px;
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
  gap: 0.5rem;
}

.gb-rules li {
  font-size: 0.83rem;
  color: rgba(0, 0, 0, 0.65);
  line-height: 1.5;
  padding-left: 0.95rem;
  position: relative;
}

.gb-rules li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.52em;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #111111;
}

.gb-card-text {
  font-size: 0.84rem;
  color: rgba(0, 0, 0, 0.65);
  line-height: 1.65;
  margin: 0 0 0.85rem;
}

.gb-card-footer {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.78rem;
  color: #111111;
  font-weight: 700;
  padding: 0.28rem 0.7rem;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 999px;
}

/* ── Responsive ── */
@media (max-width: 960px) {
  .gb-hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .gb-hero-aside {
    width: 100%;
    box-sizing: border-box;
    justify-content: space-between;
  }

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
    padding: 1.35rem;
    border-radius: 14px;
    gap: 1.1rem;
    margin-bottom: 1.25rem;
  }

  .gb-hero-aside {
    padding: 0.85rem 1rem;
    gap: 0.9rem;
  }

  .gb-sub {
    font-size: 0.88rem;
  }

  .gb-card {
    padding: 1.1rem;
    border-radius: 14px;
  }
}
</style>
