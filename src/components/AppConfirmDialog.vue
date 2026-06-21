<script setup lang="ts">
import { AlertTriangle, X } from 'lucide-vue-next'

defineProps<{
  show: boolean
  title: string
  message?: string
  errorMessage?: string
  confirmText?: string
  cancelText?: string
  tone?: 'danger' | 'default'
}>()

defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <Teleport to="body">
    <Transition name="confirm-fade">
      <div v-if="show" class="confirm-overlay" @click.self="$emit('cancel')">
        <div class="confirm-dialog" role="dialog" aria-modal="true" :aria-label="title">
          <button class="confirm-close" type="button" aria-label="关闭" @click="$emit('cancel')">
            <X :size="16" />
          </button>
          <div class="confirm-icon" :class="tone || 'default'">
            <AlertTriangle :size="22" />
          </div>
          <h3>{{ title }}</h3>
          <div>
            <slot>
              <p>{{ message }}</p>
            </slot>
          </div>
          <div class="confirm-actions">
            <button class="confirm-btn ghost" type="button" @click="$emit('cancel')">
              {{ cancelText || '取消' }}
            </button>
            <button class="confirm-btn" :class="tone || 'default'" type="button" @click="$emit('confirm')">
              {{ confirmText || '确认' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 4200;
  display: grid;
  place-items: center;
  padding: 1.25rem;
  background: rgba(15, 23, 42, 0.36);
  backdrop-filter: blur(12px);
}
.confirm-dialog {
  position: relative;
  width: min(24rem, 100%);
  padding: 1.5rem;
  border-radius: 1.1rem;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(226, 232, 240, 0.86);
  box-shadow: 0 28px 70px rgba(15, 23, 42, 0.26);
}
.confirm-close {
  position: absolute;
  top: 0.85rem;
  right: 0.85rem;
  width: 2rem;
  height: 2rem;
  border: 0;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: #f8fafc;
  color: #64748b;
  cursor: pointer;
}
.confirm-close:hover {
  background: #f1f5f9;
  color: #0f172a;
}
.confirm-icon {
  width: 2.7rem;
  height: 2.7rem;
  display: grid;
  place-items: center;
  border-radius: 0.85rem;
  margin-bottom: 1rem;
}
.confirm-icon.default {
  background: #eff6ff;
  color: #2563eb;
}
.confirm-icon.danger {
  background: #fef2f2;
  color: #dc2626;
}
.confirm-dialog h3 {
  margin: 0 0 0.55rem;
  color: #0f172a;
  font-size: 1.05rem;
  font-weight: 900;
}
.confirm-dialog p {
  margin: 0;
  color: #64748b;
  font-size: 0.9rem;
  line-height: 1.7;
}
.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.7rem;
  margin-top: 1.35rem;
}
.confirm-btn {
  min-width: 5.2rem;
  border: 0;
  border-radius: 999px;
  padding: 0.7rem 1rem;
  color: #fff;
  background: #2563eb;
  font-size: 0.84rem;
  font-weight: 850;
  cursor: pointer;
}
.confirm-btn.danger {
  background: #dc2626;
}
.confirm-btn.ghost {
  color: #475569;
  background: #f1f5f9;
}
.confirm-btn:hover {
  filter: brightness(0.98);
}
.confirm-fade-enter-active,
.confirm-fade-leave-active {
  transition: opacity 0.18s ease;
}
.confirm-fade-enter-from,
.confirm-fade-leave-to {
  opacity: 0;
}

</style>