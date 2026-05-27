<template>
  <section id="about" class="about-wrap">
    <div class="about-inner">
      <div class="about-label">
        <span class="about-dot"></span>
        关于我
      </div>

      <div class="about-grid">
        <!-- 左侧：头像 + 简介 -->
        <div class="about-profile">
          <div class="about-avatar-wrap">
            <div class="about-avatar-ring"></div>
            <div class="about-avatar-img">
              <span class="about-avatar-letter">E</span>
            </div>
            <div class="about-avatar-badge">Blogger &amp; Developer</div>
          </div>
        </div>

        <!-- 右侧：文案 + 数据 -->
        <div class="about-content">
          <h2 class="about-title">探索世界，记录思考，创造价值。</h2>
          <p class="about-desc">
            热爱于技术、设计与产品，重新把你的想法解构成逻辑，
            用代码和文字来构建属于自己的数字花园。
          </p>
          <div class="about-stats">
            <div class="about-stat">
              <strong>128</strong>
              <span>文章</span>
            </div>
            <div class="about-stat">
              <strong>52K</strong>
              <span>阅读</span>
            </div>
            <div class="about-stat">
              <strong>3.2K</strong>
              <span>喜欢</span>
            </div>
            <div class="about-stat">
              <strong>2019</strong>
              <span>加入</span>
            </div>
          </div>
        </div>

        <!-- 右侧装饰点阵 -->
        <div class="about-deco" aria-hidden="true">
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
            <g opacity="0.25">
              <template v-for="row in 6" :key="row">
                <template v-for="col in 6" :key="col">
                  <circle
                    :cx="(col - 1) * 22 + 5"
                    :cy="(row - 1) * 22 + 5"
                    r="2.5"
                    fill="#4f46e5"
                  />
                </template>
              </template>
            </g>
          </svg>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.about-wrap {
  padding: 0 0 3rem;
  background: #f5f5f7;
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
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #4f46e5;
  margin-bottom: 1.5rem;
}
.about-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: #4f46e5;
  box-shadow: 0 0 6px #4f46e5;
}

.about-grid {
  background: white;
  border-radius: 2rem;
  border: 1px solid rgba(226,232,240,0.8);
  padding: 2.5rem;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 2.5rem;
  align-items: center;
  box-shadow: 0 4px 20px rgba(15,23,42,0.05);
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
  gap: 0.65rem;
}
.about-avatar-ring {
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  border: 2px solid rgba(79,70,229,0.25);
}
.about-avatar-img {
  width: 80px; height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4f46e5, #818cf8);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(79,70,229,0.3);
}
.about-avatar-letter {
  font-size: 2rem;
  font-weight: 900;
  color: white;
}
.about-avatar-badge {
  white-space: nowrap;
  padding: 0.2rem 0.65rem;
  border-radius: 9999px;
  background: #eff6ff;
  color: #4f46e5;
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.06em;
}

/* 文案区 */
.about-content { display: flex; flex-direction: column; gap: 1rem; }
.about-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 900;
  color: #0f172a;
  line-height: 1.35;
}
.about-desc {
  margin: 0;
  font-size: 0.88rem;
  color: #64748b;
  line-height: 1.75;
}
.about-stats {
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
}
.about-stat {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.about-stat strong {
  font-size: 1.35rem;
  font-weight: 900;
  color: #0f172a;
}
.about-stat span {
  font-size: 0.72rem;
  color: #94a3b8;
  font-weight: 600;
}

/* 点阵装饰 */
.about-deco { opacity: 0.6; }

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
