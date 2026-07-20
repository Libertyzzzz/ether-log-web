<template>
  <footer class="footer-wrap">
    <div class="footer-inner">
      <div class="footer-brand">
        <div class="footer-logo-row">
          <span class="footer-logo">N</span>
          <span class="footer-name">NEXTIFY</span>
        </div>
        <p class="footer-desc">
          Ether 的个人 IP 与数字花园，记录技术写作、AI 助手、量化实验和长期思考。
        </p>
      </div>

      <div class="footer-product">
        <span class="footer-kicker">Built around</span>
        <div class="footer-modules">
          <span>Blog</span>
          <span>ETHER</span>
          <span>Quant Lab</span>
          <span>估值实验</span>
        </div>
      </div>

      <div class="footer-meta">
        <span class="footer-copy">© 2026 NEXTIFY. All rights reserved.</span>
        <span class="footer-company">Personal IP by Ether.</span>
        <div class="footer-links">
          <!-- GitHub -->
          <a class="footer-icon-btn" href="https://github.com" target="_blank" rel="noopener" aria-label="GitHub">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
          </a>
          <!-- Twitter/X -->
          <a class="footer-icon-btn" href="https://twitter.com" target="_blank" rel="noopener" aria-label="Twitter">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </a>
          <!-- LinkedIn -->
          <a class="footer-icon-btn" href="https://linkedin.com" target="_blank" rel="noopener" aria-label="LinkedIn">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
          </a>
          <!-- RSS -->
          <a class="footer-icon-btn" href="/rss" aria-label="RSS">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6.18 15.64a2.18 2.18 0 012.18 2.18C8.36 19.01 7.38 20 6.18 20C4.98 20 4 19.01 4 17.82a2.18 2.18 0 012.18-2.18M4 4.44A15.56 15.56 0 0119.56 20h-2.83A12.73 12.73 0 004 7.27V4.44m0 5.66a9.9 9.9 0 019.9 9.9h-2.83A7.07 7.07 0 004 12.93V10.1z"/>
            </svg>
          </a>
        </div>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer-wrap {
  background: transparent;
  padding: 2rem 0 2.75rem;
}
.footer-inner {
  max-width: 68rem;
  margin: 0 auto;
  padding: 1.35rem 1.5rem 0;
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(12rem, 0.7fr) auto;
  align-items: start;
  gap: 1.5rem;
  border-top: 1px solid rgba(148,163,184,0.22);
}
.footer-brand,
.footer-product,
.footer-meta {
  min-width: 0;
}
.footer-logo-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.footer-logo {
  width: 1.65rem;
  height: 1.65rem;
  border-radius: 0.42rem;
  background: #0f172a;
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.76rem;
  font-weight: 900;
}
.footer-name {
  color: #0f172a;
  font-size: 0.82rem;
  font-weight: 900;
  letter-spacing: 0.12em;
}
.footer-desc {
  max-width: 26rem;
  margin: 0.65rem 0 0;
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.75;
}
.footer-product {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.footer-kicker {
  color: #94a3b8;
  font-size: 0.66rem;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.footer-modules {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.footer-modules span {
  padding: 0.28rem 0.58rem;
  border-radius: 999px;
  background: rgba(255,255,255,0.72);
  border: 1px solid rgba(203,213,225,0.5);
  color: #475569;
  font-size: 0.68rem;
  font-weight: 800;
}
.footer-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.35rem;
  text-align: right;
}
.footer-copy {
  font-size: 0.78rem;
  color: #64748b;
  font-weight: 700;
}
.footer-company {
  color: #94a3b8;
  font-size: 0.7rem;
  font-weight: 700;
}
.footer-links {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.footer-icon-btn {
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  background: transparent;
  color: #334155;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  transition: background 0.2s, color 0.2s;
}
.footer-icon-btn:hover {
  background: rgba(79,124,255,0.1);
  color: #3b82f6;
}

@media (max-width: 640px) {
  .footer-wrap {
    padding: 0.9rem 0 5.8rem;
  }
  .footer-inner {
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 0.85rem;
    padding: 0.9rem 1rem 0;
  }
  .footer-brand {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }
  .footer-logo { width: 1.55rem; height: 1.55rem; border-radius: 0.42rem; }
  .footer-name { font-size: 0.78rem; letter-spacing: 0.1em; }
  .footer-desc {
    display: none;
  }
  .footer-product {
    display: none;
  }
  .footer-meta {
    display: contents;
  }
  .footer-copy {
    grid-column: 1 / -1;
    grid-row: 2;
    font-size: 0.68rem;
    color: #94a3b8;
  }
  .footer-company {
    display: none;
  }
  .footer-links {
    grid-column: 2;
    grid-row: 1;
    gap: 0.25rem;
    margin-top: 0;
  }
  .footer-icon-btn {
    width: 1.8rem;
    height: 1.8rem;
    border-radius: 0.6rem;
    background: transparent;
    border: none;
  }
}

</style>
