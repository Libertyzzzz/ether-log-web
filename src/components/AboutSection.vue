<script setup lang="ts">
import { FileText, BookOpen, Heart, Star } from 'lucide-vue-next'

const stats = [
  { icon: FileText, value: '128', label: '文章' },
  { icon: BookOpen, value: '52K', label: '阅读' },
  { icon: Heart, value: '3.2K', label: '喜欢' },
  { icon: Star, value: '2019', label: '加入' },
]
</script>

<template>
  <section id="about" class="about-wrap">
    <div class="about-inner">
      <div class="about-label">
        <span class="about-dot"></span>
        关于我
      </div>

      <div class="about-grid">
        <div class="about-profile">
          <div class="about-avatar-wrap">
            <div class="about-avatar-sky">
              <span class="about-avatar-moon"></span>
              <span class="about-avatar-person"></span>
            </div>
            <div class="about-avatar-img">
              <span class="about-avatar-letter">E</span>
            </div>
            <div class="about-avatar-badge">
              <strong>Ether</strong>
              <span>Blogger &amp; Developer</span>
            </div>
          </div>
        </div>

        <div class="about-content">
          <h2 class="about-title">探索世界，记录思考，创造价值。</h2>
          <p class="about-desc">
            热爱于技术、设计与产品，喜欢把复杂的想法拆解成清晰的逻辑，
            用代码和文字构建属于自己的数字花园。
          </p>
          <div class="about-stats">
            <div v-for="item in stats" :key="item.label" class="about-stat">
              <component :is="item.icon" :size="17" />
              <strong>{{ item.value }}</strong>
              <span>{{ item.label }}</span>
            </div>
          </div>
        </div>

        <div class="about-deco" aria-hidden="true">
          <div class="about-orbit orbit-one"></div>
          <div class="about-orbit orbit-two"></div>
          <div class="about-globe"></div>
          <span class="about-orbit-dot"></span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.about-wrap {
  padding: 0 0 2.75rem;
  background: transparent;
}
.about-inner {
  max-width: 64rem;
  margin: 0 auto;
  padding: 0 1.5rem;
}
.about-label {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: #0f172a;
  margin-bottom: 1.5rem;
}
.about-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: #4f7cff;
  box-shadow: 0 0 8px rgba(79,124,255,0.72);
}

.about-grid {
  padding: 0.5rem 0 0;
  display: grid;
  grid-template-columns: minmax(11rem, 0.7fr) minmax(0, 1.4fr) minmax(12rem, 0.8fr);
  gap: 3rem;
  align-items: center;
  position: relative;
  overflow: hidden;
}

/* 头像区 */
.about-profile { display: flex; align-items: center; }
.about-avatar-wrap {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 13rem;
  min-height: 13rem;
}
.about-avatar-sky {
  width: 11.5rem;
  height: 11.5rem;
  border-radius: 50%;
  background:
    radial-gradient(circle at 70% 25%, rgba(255,255,255,0.9) 0 0.55rem, transparent 0.6rem),
    radial-gradient(circle at 68% 22%, rgba(79,124,255,0.28), transparent 2.7rem),
    linear-gradient(145deg, #24385f 0%, #7f9fe0 48%, #eff6ff 100%);
  box-shadow: 0 24px 42px rgba(74, 96, 144, 0.22);
  position: relative;
  overflow: hidden;
}
.about-avatar-sky::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 2.1rem;
  height: 2.6rem;
  background: linear-gradient(150deg, transparent 18%, rgba(255,255,255,0.38) 19% 22%, transparent 23%),
    linear-gradient(175deg, transparent 8%, rgba(255,255,255,0.5) 9% 13%, transparent 14%);
  opacity: 0.8;
}
.about-avatar-person {
  position: absolute;
  left: 3.05rem;
  bottom: 2.1rem;
  width: 0.28rem;
  height: 2.25rem;
  border-radius: 999px;
  background: #0f172a;
  box-shadow: 0 -0.6rem 0 0.12rem #0f172a;
}
.about-avatar-person::after {
  content: '';
  position: absolute;
  left: -1.6rem;
  bottom: -0.1rem;
  width: 4.1rem;
  height: 0.15rem;
  background: rgba(15,23,42,0.42);
  transform: rotate(-9deg);
}
.about-avatar-img {
  position: absolute;
  left: 5.6rem;
  bottom: 0.75rem;
  width: 2.6rem; height: 2.6rem;
  border-radius: 50%;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 26px rgba(74, 96, 144, 0.18);
  z-index: 2;
}
.about-avatar-letter {
  font-size: 0.85rem;
  font-weight: 900;
  color: #4f7cff;
}
.about-avatar-badge {
  position: absolute;
  right: 0.2rem;
  bottom: -0.2rem;
  white-space: nowrap;
  padding: 0.6rem 0.9rem;
  border-radius: 9999px;
  background: rgba(255,255,255,0.9);
  color: #0f172a;
  box-shadow: 0 16px 38px rgba(74, 96, 144, 0.16);
  display: grid;
  gap: 0.05rem;
  z-index: 3;
}
.about-avatar-badge strong {
  font-size: 0.76rem;
  font-weight: 900;
}
.about-avatar-badge span {
  color: #64748b;
  font-size: 0.62rem;
  font-weight: 750;
}

/* 文案区 */
.about-content { display: flex; flex-direction: column; gap: 1.2rem; }
.about-title {
  margin: 0;
  font-size: clamp(1.35rem, 2vw, 1.75rem);
  font-weight: 900;
  color: #0f172a;
  line-height: 1.35;
}
.about-desc {
  margin: 0;
  font-size: 0.88rem;
  color: #475569;
  line-height: 1.75;
  max-width: 33rem;
}
.about-stats {
  display: flex;
  gap: clamp(1rem, 2.3vw, 2rem);
  flex-wrap: wrap;
  padding-top: 0.6rem;
}
.about-stat {
  display: grid;
  grid-template-columns: auto auto;
  column-gap: 0.45rem;
  row-gap: 0.1rem;
  align-items: center;
}
.about-stat svg { color: #3b82f6; }
.about-stat strong {
  font-size: 1.12rem;
  font-weight: 900;
  color: #0f172a;
}
.about-stat span {
  grid-column: 2;
  font-size: 0.72rem;
  color: #94a3b8;
  font-weight: 600;
}

/* 右侧星球点阵 */
.about-deco {
  width: 14rem;
  height: 12rem;
  position: relative;
  justify-self: end;
}
.about-globe {
  position: absolute;
  right: 1.5rem;
  top: 1.3rem;
  width: 8.7rem;
  height: 8.7rem;
  border-radius: 50%;
  background-image: radial-gradient(circle, rgba(79, 124, 255, 0.42) 1px, transparent 1.2px);
  background-size: 8px 8px;
  opacity: 0.58;
  mask-image: radial-gradient(circle, #000 64%, transparent 67%);
}
.about-orbit {
  position: absolute;
  border: 1px dashed rgba(79, 124, 255, 0.28);
  border-radius: 50%;
}
.orbit-one {
  width: 13.5rem;
  height: 6.4rem;
  right: 0.2rem;
  top: 3.5rem;
  transform: rotate(-22deg);
}
.orbit-two {
  width: 12rem;
  height: 5rem;
  right: 1rem;
  top: 4.1rem;
  transform: rotate(29deg);
}
.about-orbit-dot {
  position: absolute;
  right: 7.2rem;
  bottom: 1.8rem;
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 50%;
  background: #4f7cff;
  box-shadow: 0 0 0 8px rgba(79,124,255,0.12);
}

@media (max-width: 768px) {
  .about-grid {
    grid-template-columns: 1fr;
    text-align: center;
  }
  .about-profile { justify-content: center; }
  .about-stats { justify-content: center; }
  .about-deco { display: none; }
}
</style>
