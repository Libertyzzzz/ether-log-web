<script setup lang="ts">
import { ShieldCheck, Coffee, Zap } from 'lucide-vue-next'
import CommentSection from './CommentSection.vue'
import type { LoginUser } from '../types/blog'

defineProps<{
  isLoggedIn: boolean;
  loginUser: Partial<LoginUser>;
}>();

</script>

<template>
  <div class="gb-page">
    <div class="gb-shell">
      <div class="gb-container">
        <!-- content area: comments + sidebar -->
        <main class="gb-main-card">
          <section class="gb-comments-area">
            <CommentSection :article-id="0" :is-logged-in="isLoggedIn" :login-user="loginUser" :allow-anonymous="true" />
          </section>

          <aside class="gb-sidebar-card">
            <div class="gb-card">
              <h3 class="gb-card-title"><ShieldCheck :size="16" /> 留言须知</h3>
              <ul class="gb-rules">
                <li>请保持言论友善，尊重他人。</li>
                <li>支持 Markdown 语法。</li>
                <li>广告、垃圾信息会被自动清理。</li>
              </ul>
            </div>

            <div class="gb-card featured">
              <h3 class="gb-card-title"><Zap :size="16" /> 站长寄语</h3>
              <p class="gb-card-text">你的每一条留言我都会认真阅读。如为 BUG 报告或技术交流，会尽快回复。</p>
              <div class="gb-card-footer"><Coffee :size="14" /> <span>Enjoy stay here.</span></div>
            </div>
          </aside>
        </main>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Guestbook Header */
.gb-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.gb-header-inner {
  max-width: var(--nav-content-max-width);
  margin: 0 auto;
  height: 56px;
  padding: 0 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.gb-logo {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0;
  background: transparent;
  border: 0;
  color: #0f172a;
  font: inherit;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.gb-logo:hover {
  opacity: 0.7;
}

.gb-logo-icon {
  font-size: 1.3rem;
  line-height: 1;
}

.gb-logo-text {
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.gb-nav {
  display: flex;
  align-items: center;
  gap: 0.15rem;
}

.gb-nav > button {
  padding: 0.4rem 0.9rem;
  background: transparent;
  border: 0;
  color: #64748b;
  font: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.gb-nav > button:hover {
  background: rgba(0, 0, 0, 0.04);
  color: #0f172a;
}

.gb-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.gb-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  color: #475569;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.gb-action-btn:hover {
  background: rgba(255, 255, 255, 0.8);
  border-color: rgba(0, 0, 0, 0.12);
  color: #0f172a;
}

.gb-page { min-height: 100vh; background: #ffffff; padding-top: 5.5rem; }

.gb-shell { display: flex; justify-content: center; padding: 1.5rem 0; }
.gb-container { width: 100%; max-width: var(--nav-content-max-width); margin: 0 auto; padding: 0 0.9rem; }

.gb-hero-card { display:none }

.gb-label { display: inline-flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; font-weight: 800; letter-spacing: 0.2em; color: #c7cfff; margin-bottom: 0.75rem; }
.gb-icon-sparkle { animation: pulse 2s infinite; }

.gb-title { margin: 0 0 0.5rem; font-size: 2rem; font-weight: 900; letter-spacing: -0.02em; }
.gb-subtitle { margin: 0 0 1rem; font-size: 1rem; color: #d1d5db; line-height: 1.6; }
.gb-stats { display: flex; gap: 1rem; margin-top: 0.5rem; }
.gb-stat-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: #cbd5e1; }

.gb-main-card { display: grid; grid-template-columns: 1fr 320px; gap: 1.5rem; margin-top: 0.75rem; align-items: stretch; }
.gb-comments-area { min-width: 0; }
.gb-sidebar-card { display: flex; flex-direction: column; gap: 1.6rem; margin-top: 1.25rem; align-items: flex-start }
.gb-sidebar-card > .gb-card:first-child { min-height: 140px; margin-top: 1.8rem }

.gb-comments-header { display:none }

.gb-card { background: white; border-radius: 12px; padding: 1rem; border: 1px solid rgba(226,232,240,0.9); box-shadow: 0 6px 18px rgba(15,23,42,0.04); width:100% }
.gb-card.featured { background: linear-gradient(135deg,#f8fafc 0%,#eff6ff 100%); border-color: #dbeafe; }
.gb-card-title { display: flex; align-items: center; gap: 0.5rem; font-size: 0.95rem; font-weight: 800; color: #0f172a; margin: 0 0 1rem; }
.gb-rules { padding: 0; margin: 0; list-style: none; display: flex; flex-direction: column; gap: 0.6rem; }
.gb-rules li { font-size: 0.85rem; color: #475569; padding-left: 1.1rem; position: relative; }
.gb-rules li::before { content: "•"; position: absolute; left: 0; color: #3b82f6; font-weight: 700; }
.gb-card-text { font-size: 0.9rem; color: #475569; line-height: 1.6; margin-bottom: 0.5rem; }
.gb-card-footer { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: #3b82f6; font-weight: 700; }

.gb-orb { position: absolute; border-radius: 50%; filter: blur(40px); opacity: 0.4; }
.gb-orb-1 { width: 260px; height: 260px; right: -60px; top: -80px; background: rgba(79,70,229,0.18); }

@keyframes pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.03); } }

/* ════════════════════════════════
   iOS 移动端响应式
   ════════════════════════════════ */
@media (max-width: 980px) {
  .gb-main-card { grid-template-columns: 1fr; }
  .gb-hero-right { display: none; }
}

@media (max-width: 768px) {
  .gb-page { padding-top: 4rem; }
  .gb-shell { padding: 1rem 0.75rem; }
  .gb-container { padding: 0; }
  .gb-title { font-size: 1.55rem; margin-bottom: 0.35rem; }
  .gb-subtitle { font-size: 0.95rem; line-height: 1.55; }
  .gb-stats { flex-wrap: wrap; gap: 0.75rem; }
  .gb-stat-item { font-size: 0.82rem; }
  .gb-main-card { margin-top: 0.5rem; gap: 1rem; }
  .gb-sidebar-card { margin-top: 0; gap: 0.75rem; }
  .gb-sidebar-card > .gb-card:first-child { margin-top: 0; min-height: auto; }
  .gb-card { border-radius: 14px; padding: 1rem 1.1rem; }
  .gb-card-title { font-size: 0.9rem; }
  .gb-rules li { font-size: 0.82rem; }
  .gb-card-text { font-size: 0.85rem; }
  .gb-action-btn {
    width: 40px;
    height: 40px;
    border-radius: 12px;
  }
}

@media (max-width: 480px) {
  .gb-page { padding-top: 3.6rem; }
  .gb-shell { padding: 0.75rem 0.5rem; }
  .gb-title { font-size: 1.4rem; }
  .gb-subtitle { font-size: 0.9rem; }
}

</style>