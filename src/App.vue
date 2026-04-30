<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Zap, Github, ArrowUpRight, Mail, Cpu, Globe } from 'lucide-vue-next'

// 定义文章模拟数据 (后续对接后端)
const articles = [
  { id: 1, title: '重新开始的艺术', summary: '有时候，彻底删除是为了更好的构建。', tag: 'Thought' },
  { id: 2, title: 'Spring Boot 3 实战', summary: '探索 Java 17 带来的性能飞跃。', tag: 'Code' }
]

const systemStatus = ref('INITIALIZING')

onMounted(() => {
  setTimeout(() => { systemStatus.value = 'SYSTEM READY' }, 1000)
})
</script>

<template>
  <div class="min-h-screen p-6 md:p-12 lg:p-24">
    <!-- 导航 -->
    <nav class="fixed top-8 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-4xl glass-card rounded-full px-8 py-4 flex justify-between items-center shadow-sm">
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-bold italic">E</div>
        <span class="font-bold tracking-tighter text-lg">ETHERLOG</span>
      </div>
      <div class="hidden md:flex space-x-10 text-xs font-bold text-gray-400 tracking-widest">
        <a href="#" class="hover:text-black transition-colors uppercase">Logs</a>
        <a href="#" class="hover:text-black transition-colors uppercase">Stack</a>
        <a href="#" class="hover:text-black transition-colors uppercase">About</a>
      </div>
      <div class="px-4 py-1 bg-green-50 text-green-600 text-[10px] font-black rounded-full tracking-tighter">
        {{ systemStatus }}
      </div>
    </nav>

    <!-- 标题 -->
    <header class="max-w-6xl mx-auto mt-32 mb-20">
      <h1 class="text-7xl md:text-9xl font-bold tracking-tighter leading-[0.9] mb-8">
        Crafting <span class="text-gray-300 italic font-serif">Logic</span><br>
        Into <span class="text-apple-blue">Digital Art.</span>
      </h1>
      <p class="text-xl md:text-2xl text-gray-400 max-w-2xl font-light leading-relaxed">
        欢迎回到 EtherLog。这是一个追求极致极简与稳定逻辑的博客系统，由 Spring Boot 3 与 Vue 3 驱动。
      </p>
    </header>

    <!-- Bento Grid -->
    <main class="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6 auto-rows-[220px]">
      
      <!-- 个人卡片 -->
      <div class="md:col-span-2 glass-card rounded-5xl p-10 flex flex-col justify-between group hover:shadow-2xl transition-all duration-700">
        <div class="flex justify-between items-start">
          <div class="w-20 h-20 rounded-3xl bg-white p-1 shadow-sm overflow-hidden">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="avatar">
          </div>
          <Zap class="text-apple-blue group-hover:rotate-12 transition-transform" />
        </div>
        <div>
          <h2 class="text-4xl font-bold tracking-tight">Scribe</h2>
          <p class="text-gray-400 mt-2">重新出发，这一次我们要走得更稳。</p>
        </div>
      </div>

      <!-- 技术栈 -->
      <div class="md:col-span-1 bg-zinc-900 rounded-5xl p-8 text-white flex flex-col justify-end relative overflow-hidden">
        <div class="relative z-10">
          <Cpu class="text-zinc-700 mb-4" size="40" />
          <h3 class="text-2xl font-bold">Java 17 &<br/>Vite + Vue 3</h3>
        </div>
        <div class="absolute -right-4 -bottom-4 text-zinc-800 font-black text-8xl select-none">3</div>
      </div>

      <!-- 社交 -->
      <div class="md:col-span-1 glass-card rounded-5xl p-8 flex flex-col justify-center items-center space-y-6">
        <div class="flex space-x-4">
          <div class="w-14 h-14 rounded-2xl bg-white flex items-center justify-center hover:bg-black hover:text-white transition-all cursor-pointer shadow-sm">
            <Github size="20" />
          </div>
          <div class="w-14 h-14 rounded-2xl bg-white flex items-center justify-center hover:bg-apple-blue hover:text-white transition-all cursor-pointer shadow-sm text-xl font-bold">𝕏</div>
        </div>
        <span class="text-[10px] font-black tracking-[0.3em] text-gray-300 uppercase">Connect</span>
      </div>

      <!-- 动态内容渲染预览 -->
      <div v-for="post in articles" :key="post.id" class="md:col-span-2 glass-card rounded-5xl p-10 flex flex-col justify-between group cursor-pointer hover:bg-white transition-all">
        <div class="flex justify-between items-start">
          <span class="px-3 py-1 bg-apple-bg rounded-full text-[10px] font-bold text-gray-400 uppercase tracking-widest">{{ post.tag }}</span>
          <ArrowUpRight class="text-gray-300 group-hover:text-black transition-colors" />
        </div>
        <div>
          <h3 class="text-3xl font-bold leading-tight">{{ post.title }}</h3>
          <p class="text-gray-400 mt-2">{{ post.summary }}</p>
        </div>
      </div>

      <!-- 全局状态卡片 -->
      <div class="md:col-span-2 bg-apple-blue rounded-5xl p-10 text-white flex flex-col justify-between shadow-xl shadow-blue-100">
        <div class="text-4xl font-light italic opacity-80">"Simplicity is the ultimate sophistication."</div>
        <div class="flex justify-between items-center">
          <div class="flex items-center space-x-2">
            <Globe size="16" class="animate-spin-slow" />
            <span class="text-sm font-medium tracking-widest">ETHERLOG NETWORK</span>
          </div>
          <Mail size="20" />
        </div>
      </div>

    </main>

    <footer class="max-w-6xl mx-auto py-20 border-t border-gray-200 mt-20 flex flex-col md:flex-row justify-between items-center text-gray-300 text-[10px] tracking-[0.5em] font-black gap-8">
      <p>© 2026 ETHERLOG STUDIO. REBORN VERSION.</p>
      <div class="flex space-x-6">
        <span class="text-apple-blue">STABLE</span>
        <span>PRODUCTION</span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.animate-spin-slow {
  animation: spin 8s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>