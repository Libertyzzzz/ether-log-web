<script setup lang="ts">
defineProps<{
  rows?: number
  variant?: 'table' | 'card' | 'text'
}>()
</script>

<template>
  <div class="skl-wrapper" :class="`skl-${variant || 'text'}`">
    <div v-for="i in (rows || 3)" :key="i" class="skl-row">
      <div v-if="variant === 'table'" class="skl-table-row">
        <div class="skl-cell skl-cover" />
        <div class="skl-cell skl-title" />
        <div class="skl-cell skl-cat" />
        <div class="skl-cell skl-actions" />
      </div>
      <div v-else-if="variant === 'card'" class="skl-card">
        <div class="skl-card-cover" />
        <div class="skl-card-body">
          <div class="skl-line skl-line--title" />
          <div class="skl-line skl-line--summary" />
          <div class="skl-line skl-line--meta" />
        </div>
      </div>
      <div v-else class="skl-line" :style="{ width: (90 - i * 15) + '%' }" />
    </div>
  </div>
</template>

<style scoped>
.skl-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding: 0.5rem 0;
}
.skl-line {
  height: 0.85rem;
  border-radius: 0.45rem;
  background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
  background-size: 200% 100%;
  animation: skl-shimmer 1.5s ease-in-out infinite;
}
.skl-row {
  width: 100%;
}

/* table variant */
.skl-table-row {
  display: grid;
  grid-template-columns: 32px 2fr 1fr 1.4fr;
  align-items: center;
  gap: 0.5rem;
  padding: 0.85rem 0.5rem;
}
.skl-cell {
  height: 0.85rem;
  border-radius: 0.45rem;
  background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
  background-size: 200% 100%;
  animation: skl-shimmer 1.5s ease-in-out infinite;
}
.skl-cover {
  width: 32px;
  height: 32px;
  border-radius: 0.5rem;
}
.skl-title {
  width: 70%;
}
.skl-cat {
  width: 50%;
}
.skl-actions {
  width: 60%;
}

/* card variant */
.skl-card {
  border-radius: 1rem;
  overflow: hidden;
  background: #f8fafc;
}
.skl-card-cover {
  height: 140px;
  background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
  background-size: 200% 100%;
  animation: skl-shimmer 1.5s ease-in-out infinite;
}
.skl-card-body {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.skl-line--title {
  width: 70%;
  height: 1rem;
  border-radius: 0.5rem;
  background: linear-gradient(90deg, #e2e8f0 25%, #cbd5e1 50%, #e2e8f0 75%);
  background-size: 200% 100%;
  animation: skl-shimmer 1.5s ease-in-out infinite;
}
.skl-line--summary {
  width: 90%;
}
.skl-line--meta {
  width: 40%;
}

@keyframes skl-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>