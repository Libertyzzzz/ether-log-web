<script setup lang="ts">
import { ref, computed } from 'vue'
import { ArrowRight, ArrowUpRight, FileText, Sparkles, FlaskConical, Search, Package, Coffee, Code2 } from 'lucide-vue-next'

type IconType = typeof FileText

type DownloadItem = {
  key: string
  title: string
  desc: string
  meta: string
  category: string
  icon: IconType
  href: string
  tone: 'yellow' | 'blue' | 'pink' | 'green' | 'gray'
}

const items = ref<DownloadItem[]>([
  {
    key: 'resume',
    title: 'Resume',
    desc: 'Latest resume PDF - one page',
    meta: 'PDF - 124 KB',
    category: 'Personal',
    icon: FileText,
    href: '#',
    tone: 'yellow'
  },
  {
    key: 'writing-templates',
    title: 'Writing Templates',
    desc: 'Obsidian / Notion writing template pack',
    meta: 'Markdown - 8 files',
    category: 'Writing',
    icon: Sparkles,
    href: '#',
    tone: 'blue'
  },
  {
    key: 'quant-toolkit',
    title: 'Quant Toolkit',
    desc: 'Quant strategy code snippets - Python',
    meta: 'Python - 2.4 MB',
    category: 'Quant',
    icon: FlaskConical,
    href: '#',
    tone: 'pink'
  },
  {
    key: 'prompt-library',
    title: 'Prompt Library',
    desc: 'AI assistant prompt collection',
    meta: 'JSON - 56 KB',
    category: 'AI',
    icon: Search,
    href: '#',
    tone: 'green'
  },
  {
    key: 'dotfiles',
    title: 'Dotfiles',
    desc: 'Neovim / Zsh / Tmux config',
    meta: 'Git repo',
    category: 'Dev',
    icon: Code2,
    href: '#',
    tone: 'gray'
  },
  {
    key: 'project-starters',
    title: 'Project Starters',
    desc: 'Next.js / Vue / FastAPI scaffolding',
    meta: '3 repos',
    category: 'Dev',
    icon: Package,
    href: '#',
    tone: 'yellow'
  },
  {
    key: 'reading-list',
    title: 'Reading List',
    desc: 'Books - tech / design / philosophy',
    meta: 'Markdown - 1 file',
    category: 'Personal',
    icon: Coffee,
    href: '#',
    tone: 'blue'
  },
  {
    key: 'aether-dataset',
    title: 'Aether Dataset',
    desc: 'Valuation public dataset - desensitized',
    meta: 'CSV - 1.8 MB',
    category: 'Aether',
    icon: FlaskConical,
    href: '#',
    tone: 'pink'
  }
])

const categories = computed(() => {
  const set = new Set(items.value.map((i) => i.category))
  return ['All', ...Array.from(set)]
})

const activeCategory = ref('All')

const filteredItems = computed(() => {
  if (activeCategory.value === 'All') return items.value
  return items.value.filter((i) => i.category === activeCategory.value)
})
</script>

<template>
  <main class="dl-page">
    <section class="dl-hero">
      <span class="dl-eyebrow">Resource Hub</span>
      <h1>Things you can<br />take with you.</h1>
      <p class="dl-sub">Toolkits, templates, code, resume - if you are building something, maybe this helps. All free.</p>
    </section>

    <nav class="dl-filter">
      <button
        v-for="cat in categories"
        :key="cat"
        type="button"
        class="dl-filter-btn"
        :class="{ 'is-active': activeCategory === cat }"
        @click="activeCategory = cat"
      >
        {{ cat }}
      </button>
    </nav>

    <section class="dl-grid">
      <a
        v-for="item in filteredItems"
        :key="item.key"
        class="dl-card"
        :class="'tone-' + item.tone"
        :href="item.href"
        target="_blank"
        rel="noopener"
      >
        <div class="dl-card-icon">
          <component :is="item.icon" :size="24" />
        </div>
        <div class="dl-card-body">
          <span class="dl-card-tag">{{ item.category }}</span>
          <h3>{{ item.title }}</h3>
          <p>{{ item.desc }}</p>
          <span class="dl-card-meta">{{ item.meta }}</span>
        </div>
        <span class="dl-card-arrow"><ArrowUpRight :size="16" /></span>
      </a>
    </section>

    <section class="dl-cta">
      <h2>Can't find what<br />you need?</h2>
      <p>Email me what tools or templates you want, I might have one.</p>
      <a href="mailto:hello@ether.works" class="dl-cta-btn">
        Say hello <ArrowRight :size="15" />
      </a>
    </section>
  </main>
</template>

<style scoped>
.dl-page {
  max-width: 1180px;
  margin: 0 auto;
  padding: 6rem 2rem 4rem;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  color: #111111;
}

.dl-hero {
  max-width: 720px;
  margin-bottom: 3rem;
}

.dl-eyebrow {
  display: inline-block;
  padding: 0.3rem 0.9rem;
  background: #FDF800;
  color: #111111;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border-radius: 999px;
  margin-bottom: 1.5rem;
}

.dl-hero h1 {
  margin: 0;
  font-size: clamp(2.8rem, 7vw, 5.5rem);
  font-weight: 400;
  line-height: 0.95;
  letter-spacing: -0.02em;
}

.dl-sub {
  margin: 1.2rem 0 0;
  color: rgba(0, 0, 0, 0.55);
  font-size: 1.05rem;
  line-height: 1.7;
  max-width: 560px;
}

.dl-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 2.5rem;
}

.dl-filter-btn {
  padding: 0.45rem 1.2rem;
  border-radius: 999px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  background: #ffffff;
  font-size: 0.82rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, color 0.2s;
}

.dl-filter-btn:hover {
  border-color: #111111;
  color: #111111;
}

.dl-filter-btn.is-active {
  background: #FDF800;
  border-color: #FDF800;
  color: #111111;
}

.dl-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 5rem;
}

.dl-card {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  padding: 1.5rem;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 16px;
  text-decoration: none;
  color: #111111;
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
  position: relative;
  overflow: hidden;
}

.dl-card:hover {
  transform: translateY(-4px);
  border-color: #111111;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.1);
}

.dl-card:hover .dl-card-arrow {
  top: 1rem;
  right: 1rem;
  opacity: 1;
}

.dl-card-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  flex-shrink: 0;
}

.tone-yellow .dl-card-icon { background: #FDF800; color: #111111; }
.tone-blue .dl-card-icon   { background: #C9E8FF; color: #0a4c7e; }
.tone-pink .dl-card-icon   { background: #FFD6EC; color: #7a1a4e; }
.tone-green .dl-card-icon  { background: #D4F0D0; color: #2d6a2a; }
.tone-gray .dl-card-icon   { background: #EDEDED; color: #333333; }

.dl-card-body {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
}

.dl-card-tag {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(0, 0, 0, 0.4);
}

.dl-card-body h3 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.dl-card-body p {
  margin: 0;
  font-size: 0.88rem;
  color: rgba(0, 0, 0, 0.55);
  line-height: 1.55;
}

.dl-card-meta {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(0, 0, 0, 0.35);
  margin-top: 0.25rem;
}

.dl-card-arrow {
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  color: rgba(0, 0, 0, 0.3);
  opacity: 0;
  transition: opacity 0.25s ease, top 0.25s ease, right 0.25s ease;
}

.dl-cta {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 4rem 1rem;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.dl-cta h2 {
  margin: 0 0 0.75rem;
  font-size: clamp(1.8rem, 4vw, 2.6rem);
  font-weight: 700;
  letter-spacing: -0.02em;
}

.dl-cta p {
  margin: 0 0 1.5rem;
  color: rgba(0, 0, 0, 0.5);
  font-size: 0.95rem;
}

.dl-cta-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.75rem 1.6rem;
  background: #111111;
  color: #ffffff;
  text-decoration: none;
  border-radius: 999px;
  font-size: 0.88rem;
  font-weight: 600;
  transition: transform 0.2s, background 0.2s;
}

.dl-cta-btn:hover {
  transform: translateY(-2px);
  background: #333333;
}

@media (max-width: 960px) {
  .dl-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 700px) {
  .dl-grid { grid-template-columns: repeat(2, 1fr); }
  .dl-page { padding: 4rem 1.25rem 3rem; }
}
@media (max-width: 460px) {
  .dl-grid { grid-template-columns: 1fr; }
}
</style>