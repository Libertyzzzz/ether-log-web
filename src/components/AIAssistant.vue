<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import { Bot, Sparkles, X, Check, RefreshCw, Send } from 'lucide-vue-next'
import { useAIAssistant } from '../composables/useAIAssistantGlobal'
import type { AIQuickAction } from '../composables/useAIAssistantGlobal'
import { toast } from '../utils/toast'
import { useDarkMode } from '../composables/useDarkMode'

const { isDark } = useDarkMode()
const {
  isOpen,
  messages,
  isLoading,
  currentStyle,
  styles,
  userInput,
  chatContainerRef,
  quickActions,
  context,
  contextLabel,
  open,
  close,
  clearChat,
  sendQuickAction,
  sendFreeChat,
} = useAIAssistant()

const copiedId = ref<string | null>(null)

function setChatContainerRef(el: Element | ComponentPublicInstance | null) {
  chatContainerRef.value = el as HTMLElement | null
}

function onQuickAction(action: AIQuickAction) {
  void sendQuickAction(action.key, action.hint)
}

function onSendChat() {
  if (!userInput.value.trim() || isLoading.value) return
  void sendFreeChat(userInput.value)
}

async function copyContent(text: string, id: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    copiedId.value = id
    toast('已复制', 'success')
    setTimeout(() => {
      copiedId.value = null
    }, 1500)
  } catch {
    toast('复制失败', 'error')
  }
}

function applyCandidate(text: string) {
  void navigator.clipboard?.writeText(text)
  toast('已复制到剪贴板', 'success')
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    onSendChat()
  }
}

function onGlobalKey(e: KeyboardEvent) {
  // Ctrl + J 快捷打开/关闭
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
    e.preventDefault()
    isOpen.value ? close() : open()
  }
  // Esc 关闭
  if (e.key === 'Escape' && isOpen.value) {
    close()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onGlobalKey)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalKey)
})

const summary = computed(() => {
  const chars = (context.value.content || '').length
  if (chars > 0) return `全文 ${chars} 字`
  if (context.value.title) return context.value.title
  return contextLabel.value
})

const contextIntro = computed(() => {
  const subtitle = context.value.subtitle?.trim()
  if (subtitle) return subtitle
  const map: Record<string, string> = {
    home: '按当前站点内容推荐阅读和检索方向',
    'post-list': '围绕文章列表做筛选、推荐和主题查找',
    'post-detail': '基于当前文章提供摘要、追问和文本检查',
    publish: '面向编辑流程生成标题、摘要、续写和润色建议',
    dashboard: '把后台数据转成可理解的趋势、待办和汇报',
    'quant-lab': '辅助解读图表、异常波动和数据结论',
    'media-hub': '帮助素材补描述、归类、命名和清理',
    'sensitive-word': '辅助判断命中原因、替代表达和规则质量',
    assessment: '把评估结果整理成结论、建议和分享文案',
    guestbook: '帮你整理留言回复和沟通语气',
  }
  return map[context.value.key] || '根据当前页面上下文回答你的问题'
})
</script>

<template>
  <!-- 悬浮入口已移除：AI 助手仅通过页面内按钮（Hero/TOC/sidebar）或 Ctrl+J 打开 -->

  <!-- 右侧抽屉面板（非阻塞浮层，无遮罩） -->
  <transition name="ai-slide">
    <aside
      v-if="isOpen"
      class="ai-drawer"
    >
      <!-- 顶部标题栏 -->
      <header class="ai-header">
        <div class="ai-header-left">
          <span class="ai-badge">
            <Sparkles :size="12" />
            <span>AI 助手</span>
          </span>
          <span class="ai-subtitle">{{ contextLabel }}</span>
        </div>
        <div class="ai-header-right">
          <button class="ai-icon-btn" @click="clearChat" title="重置对话">
            <RefreshCw :size="14" />
          </button>
          <button class="ai-icon-btn" @click="close" title="关闭（Esc）">
            <X :size="14" />
          </button>
        </div>
      </header>

      <!-- 可滚动内容区：推荐标签 + 对话内容一起滚动 -->
      <div :ref="setChatContainerRef" class="ai-chat-scroll">
        <!-- 当前页任务面板 -->
        <section class="ai-task-panel">
          <div class="ai-task-head">
            <div>
              <p class="ai-task-eyebrow">当前页任务</p>
              <h2>{{ contextLabel }}</h2>
            </div>
            <span class="ai-context-pill">{{ summary }}</span>
          </div>
          <p class="ai-task-intro">{{ contextIntro }}</p>
          <div class="ai-actions">
            <button
              v-for="a in quickActions"
              :key="a.label"
              class="ai-action-btn"
              :class="{ disabled: isLoading }"
              :disabled="isLoading"
              @click="onQuickAction(a)"
              :title="a.hint"
            >
              <span class="ai-action-icon">{{ a.icon }}</span>
              <span class="ai-action-copy">
                <span class="ai-action-label">{{ a.label }}</span>
                <span class="ai-action-hint">{{ a.hint }}</span>
              </span>
            </button>
          </div>
        </section>

        <!-- 风格切换 -->
        <div class="ai-style-row">
          <span class="ai-style-label">回复风格</span>
          <div class="ai-style-chips">
            <button
              v-for="s in styles"
              :key="s.key"
              class="ai-style-chip"
              :class="{ active: currentStyle === s.key }"
              @click="currentStyle = s.key"
            >
              <span class="ai-style-emoji">{{ s.emoji }}</span>
              <span class="ai-style-text">{{ s.label }}</span>
            </button>
          </div>
        </div>

        <!-- 对话消息 -->
        <div class="ai-chat-messages">
          <template v-for="msg in messages" :key="msg.id">
          <!-- 用户消息 -->
          <div v-if="msg.role === 'user'" class="ai-bubble-wrap ai-user-wrap">
            <div class="ai-bubble ai-user-bubble">
              <span>{{ msg.content }}</span>
            </div>
          </div>

          <!-- AI 消息 -->
          <div v-else class="ai-bubble-wrap ai-assistant-wrap">
            <div class="ai-bubble ai-assistant-bubble">
              <div class="ai-assistant-avatar">
                <Bot :size="14" />
              </div>
              <div class="ai-assistant-content">
                <pre class="ai-assistant-text">{{ msg.content }}</pre>

                <!-- 候选结果列表 -->
                <div v-if="msg.candidates && msg.candidates.length > 0" class="ai-candidates">
                  <div
                    v-for="(c, idx) in msg.candidates"
                    :key="idx"
                    class="ai-candidate-item"
                  >
                    <span class="ai-candidate-text">{{ c }}</span>
                    <button
                      class="ai-candidate-apply"
                      @click="applyCandidate(c)"
                    >
                        <Check :size="12" />
                        复制
                    </button>
                  </div>
                </div>

                <!-- 操作按钮 -->
                <div class="ai-bubble-actions">
                  <button class="ai-bubble-btn" @click="copyContent(msg.content, msg.id)">
                    <template v-if="copiedId === msg.id">
                      <Check :size="12" />
                      已复制
                    </template>
                    <template v-else>
                      <span style="font-size:12px;">📋</span>
                      复制
                    </template>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </template>

          <!-- 加载指示 -->
          <div v-if="isLoading" class="ai-bubble-wrap ai-assistant-wrap">
            <div class="ai-bubble ai-assistant-bubble is-thinking">
              <div class="ai-assistant-avatar">
                <Bot :size="14" />
              </div>
              <div class="ai-thinking">
                <span></span>
                <span></span>
                <span></span>
                <em>正在思考…</em>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 输入栏 -->
      <footer class="ai-input-area">
        <textarea
          v-model="userInput"
          class="ai-input"
          placeholder="问 AI 任何问题…（Enter 发送 / Shift+Enter 换行）"
          rows="2"
          :disabled="isLoading"
          @keydown="handleKeydown"
        ></textarea>
        <button
          class="ai-send-btn"
          :class="{ active: userInput.trim().length > 0 }"
          :disabled="isLoading || !userInput.trim()"
          @click="onSendChat"
        >
          <Send :size="16" />
        </button>
      </footer>
    </aside>
  </transition>
</template>

<style scoped>
/* ── 全局悬浮入口（默认圆形，hover 展开胶囊） ── */
.ai-fab {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 9998;

  /* 默认紧凑圆形 */
  width: 52px;
  height: 52px;
  padding: 0;

  display: flex;
  align-items: center;
  justify-content: center;

  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: #ffffff;
  border: 2px solid rgba(255, 255, 255, 0.85);
  border-radius: 50%;
  cursor: pointer;

  box-shadow:
    0 8px 24px rgba(99, 102, 241, 0.4),
    0 2px 6px rgba(0, 0, 0, 0.08);

  transition:
    width 0.35s cubic-bezier(0.16, 1, 0.3, 1),
    height 0.35s cubic-bezier(0.16, 1, 0.3, 1),
    border-radius 0.35s cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 0.3s ease,
    transform 0.2s ease;

  overflow: hidden;
  animation: aiFabEntrance 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both;
}

/* 进入页面的"跳一下"动画，锁定视觉 */
@keyframes aiFabEntrance {
  0%   { transform: scale(0.5) translateY(40px); opacity: 0; }
  50%  { transform: scale(1.15) translateY(-4px); opacity: 1; }
  75%  { transform: scale(0.95) translateY(2px); }
  100% { transform: scale(1) translateY(0); opacity: 1; }
}

/* 呼吸光晕 - 持续吸引注意 */
.ai-fab-halo {
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.45) 0%, rgba(139, 92, 246, 0) 70%);
  pointer-events: none;
  animation: aiHaloBreathe 3s ease-in-out infinite;
  z-index: -1;
}

@keyframes aiHaloBreathe {
  0%, 100% { transform: scale(1); opacity: 0.55; }
  50%      { transform: scale(1.25); opacity: 0.9; }
}

/* 图标区 */
.ai-fab-icon {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #ffffff;
}

/* 图标上的微脉冲点 */
.ai-fab-pulse {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #4ade80;
  border: 2px solid #ffffff;
  animation: aiPulseDot 1.8s ease-in-out infinite;
}

@keyframes aiPulseDot {
  0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.6); }
  50%      { transform: scale(1.2); box-shadow: 0 0 0 6px rgba(74, 222, 128, 0); }
}

/* 文字区 - 默认折叠隐藏 */
.ai-fab-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 1px;
  padding-left: 8px;
  white-space: nowrap;
  opacity: 0;
  max-width: 0;
  transform: translateX(-8px);
  transition:
    opacity 0.25s ease 0.08s,
    max-width 0.35s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.ai-fab-label {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.3px;
  line-height: 1;
}

.ai-fab-hint {
  font-size: 10px;
  opacity: 0.8;
  font-weight: 500;
  letter-spacing: 0.3px;
  line-height: 1;
}

/* ── 展开状态（hover） ── */
.ai-fab:hover,
.ai-fab.is-expanded {
  width: auto;
  height: auto;
  padding: 12px 18px 12px 14px;
  border-radius: 999px;
  transform: translateY(-2px);

  box-shadow:
    0 14px 36px rgba(99, 102, 241, 0.5),
    0 4px 12px rgba(0, 0, 0, 0.12),
    0 0 0 4px rgba(139, 92, 246, 0.15);
}

.ai-fab:hover .ai-fab-text,
.ai-fab.is-expanded .ai-fab-text {
  opacity: 1;
  max-width: 200px;
  transform: translateX(0);
}

.ai-fab:hover .ai-fab-halo,
.ai-fab.is-expanded .ai-fab-halo {
  inset: -6px;
  animation: none;
  opacity: 0.5;
  transform: scale(1.1);
}

/* 暗色模式 */
.ai-fab.is-dark {
  background: linear-gradient(135deg, #818cf8 0%, #a78bfa 100%);
  border-color: rgba(15, 23, 42, 0.5);
  box-shadow:
    0 8px 24px rgba(129, 140, 248, 0.5),
    0 2px 6px rgba(0, 0, 0, 0.25);
}

.ai-fab.is-dark:hover {
  box-shadow:
    0 14px 36px rgba(129, 140, 248, 0.6),
    0 4px 12px rgba(0, 0, 0, 0.25),
    0 0 0 4px rgba(129, 140, 248, 0.2);
}

/* 眨眼 emoji 动画 */
.ai-fab-wink {
  position: absolute;
  top: -18px;
  right: 4px;
  font-size: 20px;
  animation: aiWinkFloat 0.8s ease-out;
}

@keyframes aiWinkFloat {
  0%   { transform: scale(0) translateY(10px); opacity: 0; }
  40%  { transform: scale(1.3) translateY(-4px); opacity: 1; }
  100% { transform: scale(1) translateY(0); opacity: 1; }
}

.ai-wink-enter-active,
.ai-wink-leave-active {
  transition: all 0.3s ease;
}

.ai-wink-enter-from,
.ai-wink-leave-to {
  opacity: 0;
  transform: scale(0) translateY(10px);
}

/* ── 遮罩层 ── */
.ai-drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(2px);
  z-index: 9999;
}

/* ── 抽屉面板 ── */
.ai-drawer {
  --ai-bg: #ffffff;
  --ai-surface: #f8fafc;
  --ai-border: #e2e8f0;
  --ai-border-soft: #f1f5f9;
  --ai-text: #0f172a;
  --ai-text-soft: #475569;
  --ai-text-muted: #94a3b8;
  --ai-brand: #6366f1;
  --ai-brand-soft: #eef2ff;
  --ai-user-bubble: #6366f1;
  --ai-user-text: #ffffff;
  --ai-shadow: 0 12px 32px rgba(2, 6, 23, 0.08);
  --ai-radius: 14px;
  --ai-radius-sm: 10px;

  position: fixed;
  top: 0;
  right: 0;
  height: 100vh;
  width: 400px;
  max-width: 92vw;
  background: var(--ai-bg);
  z-index: 10000;
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 24px rgba(15, 23, 42, 0.08), -16px 0 48px rgba(15, 23, 42, 0.12);
  border-left: 1px solid var(--ai-border);
  overflow: hidden;
}

.ai-drawer.is-dark {
  --ai-bg: #0f172a;
  --ai-surface: #1e293b;
  --ai-border: #334155;
  --ai-border-soft: #1e293b;
  --ai-text: #f1f5f9;
  --ai-text-soft: #cbd5e1;
  --ai-text-muted: #94a3b8;
  --ai-brand: #818cf8;
  --ai-brand-soft: #312e81;
  --ai-user-bubble: #6366f1;
  --ai-user-text: #ffffff;
  --ai-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
}

/* 顶部标题栏 */
.ai-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--ai-border-soft);
  flex-shrink: 0;
}

.ai-header-left {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.ai-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: var(--ai-brand-soft);
  color: var(--ai-brand);
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
}

.ai-subtitle {
  font-size: 10px;
  color: var(--ai-text-muted);
  letter-spacing: 0.8px;
  text-transform: uppercase;
}

.ai-header-right {
  display: flex;
  gap: 4px;
}

.ai-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: transparent;
  border: 1px solid transparent;
  color: var(--ai-text-soft);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.ai-icon-btn:hover {
  background: var(--ai-surface);
  border-color: var(--ai-border);
  color: var(--ai-text);
}

/* 当前页任务面板（位于滚动区内部，随对话一起滚动） */
.ai-task-panel {
  padding: 14px 18px 12px;
  border-bottom: 1px solid var(--ai-border-soft);
  background: var(--ai-bg);
}

.ai-task-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.ai-task-eyebrow {
  margin: 0 0 3px;
  font-size: 10px;
  color: var(--ai-text-muted);
  font-weight: 700;
  letter-spacing: 1px;
}

.ai-task-head h2 {
  margin: 0;
  font-size: 16px;
  line-height: 1.2;
  color: var(--ai-text);
  font-weight: 750;
}

.ai-context-pill {
  max-width: 128px;
  padding: 5px 8px;
  border: 1px solid var(--ai-border);
  border-radius: 999px;
  color: var(--ai-text-soft);
  background: var(--ai-surface);
  font-size: 10px;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ai-task-intro {
  margin: 8px 0 12px;
  color: var(--ai-text-soft);
  font-size: 12px;
  line-height: 1.55;
}

/* 风格切换（位于滚动区内部，随对话一起滚动） */
.ai-style-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 18px;
  border-bottom: 1px solid var(--ai-border-soft);
}

.ai-style-label {
  font-size: 10px;
  color: var(--ai-text-muted);
  letter-spacing: 1px;
  text-transform: uppercase;
  flex-shrink: 0;
}

.ai-style-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.ai-style-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: var(--ai-surface);
  border: 1px solid var(--ai-border);
  border-radius: 999px;
  font-size: 11px;
  color: var(--ai-text-soft);
  cursor: pointer;
  transition: all 0.15s ease;
}

.ai-style-chip:hover {
  border-color: var(--ai-brand);
  color: var(--ai-text);
}

.ai-style-chip.active {
  background: var(--ai-brand);
  border-color: var(--ai-brand);
  color: #ffffff;
}

.ai-style-emoji {
  font-size: 11px;
}

/* 快捷操作 */
.ai-actions {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.ai-action-btn {
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 10px;
  min-height: 58px;
  padding: 10px 12px;
  background: var(--ai-surface);
  border: 1px solid var(--ai-border);
  border-radius: 8px;
  color: var(--ai-text-soft);
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
}

.ai-action-btn {
  flex-direction: row;
  align-items: center;
}

.ai-action-btn:hover:not(.disabled) {
  background: var(--ai-bg);
  border-color: var(--ai-brand);
  color: var(--ai-text);
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(99, 102, 241, 0.12);
}

.ai-action-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ai-action-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--ai-bg);
  border: 1px solid var(--ai-border-soft);
  font-size: 14px;
  flex-shrink: 0;
}

.ai-action-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ai-action-label {
  font-size: 12px;
  color: var(--ai-text);
  font-weight: 700;
}

.ai-action-hint {
  display: block;
  font-size: 10.5px;
  color: var(--ai-text-muted);
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 上下文提示 */
.ai-context-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 18px;
  font-size: 11px;
  color: var(--ai-text-muted);
  background: var(--ai-surface);
  border-bottom: 1px solid var(--ai-border-soft);
  flex-shrink: 0;
  text-align: center;
}

/* 可滚动内容区：包含推荐标签 + 风格切换 + 对话消息，全部一起滚动 */
.ai-chat-scroll {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}

.ai-chat-scroll::-webkit-scrollbar {
  width: 6px;
}

.ai-chat-scroll::-webkit-scrollbar-thumb {
  background: var(--ai-border);
  border-radius: 3px;
}

/* 对话消息容器 */
.ai-chat-messages {
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ai-bubble-wrap {
  display: flex;
  width: 100%;
}

.ai-user-wrap {
  justify-content: flex-end;
}

.ai-assistant-wrap {
  justify-content: flex-start;
}

.ai-bubble {
  max-width: 88%;
  padding: 10px 12px;
  border-radius: var(--ai-radius);
  font-size: 12.5px;
  line-height: 1.7;
  word-break: break-word;
}

.ai-user-bubble {
  background: var(--ai-user-bubble);
  color: var(--ai-user-text);
  border-bottom-right-radius: 4px;
}

.ai-assistant-bubble {
  display: flex;
  gap: 10px;
  background: var(--ai-surface);
  border: 1px solid var(--ai-border);
  color: var(--ai-text);
  border-bottom-left-radius: 4px;
}

.ai-assistant-avatar {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--ai-brand-soft);
  color: var(--ai-brand);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 0px;
}

.ai-assistant-content {
  flex: 1;
  min-width: 0;
}

.ai-assistant-text {
  margin: 0 0 8px 0;
  white-space: pre-wrap;
  font-family: inherit;
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--ai-text);
  background: transparent;
  border: none;
  padding: 0;
}

/* 候选结果列表 */
.ai-candidates {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 6px 0 8px 0;
  padding-top: 8px;
  border-top: 1px dashed var(--ai-border);
}

.ai-candidate-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  background: var(--ai-bg);
  border: 1px solid var(--ai-border);
  border-radius: 8px;
  transition: all 0.15s ease;
}

.ai-candidate-item:hover {
  border-color: var(--ai-brand);
}

.ai-candidate-text {
  font-size: 11.5px;
  color: var(--ai-text-soft);
  flex: 1;
}

.ai-candidate-apply {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--ai-brand);
  color: #ffffff;
  border: none;
  border-radius: 6px;
  font-size: 10px;
  cursor: pointer;
  flex-shrink: 0;
}

/* 气泡操作按钮 */
.ai-bubble-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.ai-bubble-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--ai-bg);
  border: 1px solid var(--ai-border);
  border-radius: 6px;
  font-size: 10.5px;
  color: var(--ai-text-soft);
  cursor: pointer;
  transition: all 0.15s ease;
}

.ai-bubble-btn:hover {
  border-color: var(--ai-brand);
  color: var(--ai-text);
}

/* 思考中 */
.ai-bubble.is-thinking .ai-assistant-content {
  padding-top: 2px;
}

.ai-thinking {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.ai-thinking span {
  width: 5px;
  height: 5px;
  background: var(--ai-brand);
  border-radius: 50%;
  animation: ai-bounce 1.2s ease-in-out infinite;
  opacity: 0.5;
}

.ai-thinking span:nth-child(2) {
  animation-delay: 0.15s;
}

.ai-thinking span:nth-child(3) {
  animation-delay: 0.3s;
}

.ai-thinking em {
  font-size: 11px;
  color: var(--ai-text-muted);
  font-style: normal;
  margin-left: 4px;
}

@keyframes ai-bounce {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-4px);
    opacity: 1;
  }
}

/* 输入栏 */
.ai-input-area {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 12px 18px 16px 18px;
  border-top: 1px solid var(--ai-border-soft);
  background: var(--ai-bg);
  flex-shrink: 0;
}

.ai-input {
  flex: 1;
  resize: none;
  padding: 10px 12px;
  background: var(--ai-surface);
  border: 1px solid var(--ai-border);
  border-radius: var(--ai-radius-sm);
  font-size: 12.5px;
  font-family: inherit;
  color: var(--ai-text);
  line-height: 1.6;
  outline: none;
  transition: all 0.15s ease;
  max-height: 120px;
  min-height: 42px;
}

.ai-input:focus {
  border-color: var(--ai-brand);
  background: var(--ai-bg);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.ai-input::placeholder {
  color: var(--ai-text-muted);
  font-size: 11.5px;
}

.ai-send-btn {
  width: 42px;
  height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--ai-surface);
  border: 1px solid var(--ai-border);
  border-radius: var(--ai-radius-sm);
  color: var(--ai-text-muted);
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.ai-send-btn:hover:not(:disabled) {
  background: var(--ai-brand);
  border-color: var(--ai-brand);
  color: #ffffff;
}

.ai-send-btn.active {
  background: var(--ai-brand);
  border-color: var(--ai-brand);
  color: #ffffff;
}

.ai-send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ── 动画：淡入淡出 ── */
.ai-fade-enter-active,
.ai-fade-leave-active {
  transition: opacity 0.25s ease;
}

.ai-fade-enter-from,
.ai-fade-leave-to {
  opacity: 0;
}

/* ── 动画：滑入滑出 ── */
.ai-slide-enter-active,
.ai-slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.ai-slide-enter-from,
.ai-slide-leave-to {
  transform: translateX(100%);
}

/* ── 响应式 ── */
@media (max-width: 640px) {
  .ai-drawer {
    width: 100vw;
    max-width: 100vw;
  }
  .ai-fab {
    right: 16px;
    bottom: 16px;
    width: 46px;
    height: 46px;
  }
  .ai-fab:hover,
  .ai-fab.is-expanded {
    padding: 10px 14px 10px 12px;
  }
  .ai-actions {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 900px) {
  .ai-actions {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>