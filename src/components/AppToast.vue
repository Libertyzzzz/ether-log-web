<template>
  <Transition name="toast-fade">
    <div v-if="show" :class="['app-toast', type]">
      <div class="toast-icon">
        <CheckCircle v-if="type === 'success'" :size="18" />
        <XCircle v-if="type === 'error'" :size="18" />
        <Info v-if="type === 'info'" :size="18" />
      </div>
      <span class="toast-message">{{ message }}</span>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { CheckCircle, XCircle, Info } from 'lucide-vue-next'

defineProps<{
  message: string;
  type: 'success' | 'error' | 'info';
  show: boolean;
}>();
</script>

<style scoped>
.app-toast {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 20px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  font-weight: 600;
  color: white;
  z-index: 2000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.app-toast.success { background-color: #10b981; /* emerald-500 */ }
.app-toast.error { background-color: #ef4444; /* red-500 */ }
.app-toast.info { background-color: #3b82f6; /* blue-500 */ }

.toast-icon { display: flex; align-items: center; justify-content: center; }

.toast-fade-enter-active, .toast-fade-leave-active { transition: all 0.3s ease; }
.toast-fade-enter-from, .toast-fade-leave-to { opacity: 0; transform: translateX(-50%) translateY(20px); }
</style>