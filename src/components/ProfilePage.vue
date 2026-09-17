<script setup lang="ts">
import { Github, Twitter, Linkedin, Rss, User, Shield, Globe, Camera, Save, Settings, Lock, Bell, Palette, Loader2 } from 'lucide-vue-next'
import type { LoginUser } from '../types/blog'
import { getLoginUserName } from '../utils/article'
import { ref, watch } from 'vue'

const props = defineProps<{
  loginUser: Partial<LoginUser>
  isSaving?: boolean
}>()

const emit = defineEmits<{
  updateProfile: [data: { nickname: string; motto: string; email: string; avatar: string }]
  uploadAvatar: [event: Event]
}>()

const nickname = ref(props.loginUser.nickname || '')
const motto = ref(props.loginUser.motto || '')
const email = ref(props.loginUser.email || '')
const avatar = ref(props.loginUser.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ether')

const avatarInput = ref<HTMLInputElement | null>(null)

function triggerAvatarUpload() {
  avatarInput.value?.click()
}

function handleAvatarChange(event: Event) {
  emit('uploadAvatar', event)
}

watch(() => props.loginUser, (newVal) => {
  if (newVal) {
    nickname.value = newVal.nickname || newVal.username || ''
    motto.value = newVal.motto || ''
    email.value = newVal.email || ''
    avatar.value = newVal.avatar || avatar.value
  }
}, { deep: true, immediate: true })

const saveProfile = () => {
  if (props.isSaving) return
  emit('updateProfile', {
    nickname: nickname.value,
    motto: motto.value,
    email: email.value,
    avatar: avatar.value,
  })
}

const toggleDarkMode = (event: Event) => {
  const isChecked = (event.target as HTMLInputElement).checked
  console.log('深色模式:', isChecked ? '开启' : '关闭')
}

const toggleEmailNotifications = (event: Event) => {
  const isChecked = (event.target as HTMLInputElement).checked
  console.log('邮件通知:', isChecked ? '开启' : '关闭')
}
</script>

<template>
  <div class="pp-page">

    <div class="pp-hero">
      <div class="pp-hero-bg-wrap">
        <div class="pp-hero-bg" aria-hidden="true">
          <div class="pp-hero-orb pp-orb-1"></div>
          <div class="pp-hero-orb pp-orb-2"></div>
        </div>
        <div class="pp-hero-inner">
          <div class="pp-avatar-wrap" @click="triggerAvatarUpload">
            <img
              class="pp-avatar"
              :src="loginUser.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ether'"
              alt="avatar"
            />
            <div class="pp-avatar-overlay">
              <Camera :size="14" />
              <span>点击更换</span>
            </div>
            <button class="pp-avatar-edit" title="更换头像" type="button">
              <Camera :size="14" />
            </button>
            <input 
              ref="avatarInput" 
              type="file" 
              accept="image/*" 
              hidden 
              @change="handleAvatarChange"
              @click.stop
            />
          </div>
          <div class="pp-hero-info">
            <div class="pp-hero-name-row">
              <h1 class="pp-hero-name">{{ getLoginUserName(loginUser) }}</h1>
              <span class="pp-verified">✦</span>
            </div>
            <p class="pp-hero-role">Profile & Site Settings</p>
            <p class="pp-hero-motto">{{ loginUser.motto || '探索世界，记录思考，创造价值。' }}</p>
            <div class="pp-social">
              <a class="pp-social-btn" href="https://github.com" target="_blank" aria-label="GitHub"><Github :size="15"/></a>
              <a class="pp-social-btn" href="https://twitter.com" target="_blank" aria-label="Twitter"><Twitter :size="15"/></a>
              <a class="pp-social-btn" href="https://linkedin.com" target="_blank" aria-label="LinkedIn"><Linkedin :size="15"/></a>
              <a class="pp-social-btn" href="/rss" aria-label="RSS"><Rss :size="15"/></a>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="pp-body">
      <div class="pp-settings-grid">
        <div class="pp-settings-main">
          <div class="pp-card">
            <div class="pp-card-header">
              <div class="pp-card-title-row">
                <User :size="18" class="pp-card-icon"/>
                <h2 class="pp-card-title">基本资料</h2>
              </div>
            </div>
            <div class="pp-settings-form">
              <div class="pp-form-item">
                <label>公开昵称</label>
                <input type="text" v-model="nickname" placeholder="Your nickname" />
              </div>
              <div class="pp-form-item">
                <label>个人签名 (Motto)</label>
                <textarea rows="3" v-model="motto" placeholder="Write something about yourself..."></textarea>
              </div>
              <div class="pp-form-item">
                <label>电子邮箱</label>
                <input type="email" v-model="email" placeholder="email@example.com" />
              </div>
            </div>
            <div class="pp-card-actions-footer">
              <button class="pp-btn-save" :disabled="isSaving" @click="saveProfile">
                <Loader2 v-if="isSaving" :size="16" class="pp-spinner" />
                <Save v-else :size="16" />
                {{ isSaving ? '保存中...' : '保存资料更改' }}
              </button>
            </div>
          </div>

        </div>

        <div class="pp-settings-side">
          <div class="pp-card pp-mini-card">
            <div class="pp-card-title-row">
              <Shield :size="16" class="pp-card-icon"/>
              <h2 class="pp-card-title">账号安全</h2>
            </div>
            <p class="pp-card-desc">管理密码和安全选项。</p>
            <button class="pp-btn-outline"><Lock :size="14" /> 修改密码</button>
          </div>

          <div class="pp-card pp-mini-card">
            <div class="pp-card-title-row">
              <Settings :size="16" class="pp-card-icon"/>
              <h2 class="pp-card-title">偏好设置</h2>
            </div>
            <div class="pp-pref-list">
              <div class="pp-pref-item">
                <div class="pp-pref-info">
                  <Bell :size="14" />
                  <span>邮件通知</span>
                </div>
                <input type="checkbox" checked @change="toggleEmailNotifications" />
              </div>
              <div class="pp-pref-item">
                <div class="pp-pref-info">
                  <Palette :size="14" />
                  <span>深色模式</span>
                </div>
                <input type="checkbox" @change="toggleDarkMode" />
              </div>
            </div>
          </div>

          <div class="pp-system-info">
            <p>Version 2.0.4-stable</p>
            <p>© 2026 NEXTIFY</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pp-page { background:#f5f5f7; min-height:100vh; padding-top: 5.5rem; }
.pp-body { max-width: var(--nav-content-max-width); margin:0 auto; padding:2rem 0.9rem 5rem; display:flex; flex-direction:column; gap:2rem; }

.pp-hero {
  max-width: var(--nav-content-max-width);
  margin: 0 auto;
  padding: 0 0.9rem;
}
.pp-hero-bg-wrap {
  position: relative;
  overflow: hidden;
  border-radius: 1.75rem;
  background: linear-gradient(160deg, #0a0e1a 0%, #0f172a 40%, #1e1b4b 100%);
  min-height: 200px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.1);
}
.pp-hero-bg { position:absolute; inset:0; pointer-events:none; }
.pp-hero-orb {
  position:absolute; border-radius:50%;
  background:radial-gradient(circle,rgba(99,102,241,0.3),transparent 70%);
}
.pp-orb-1 { width:400px;height:400px;top:-150px;right:-80px; }
.pp-orb-2 { width:200px;height:200px;bottom:-40px;right:200px;background:radial-gradient(circle,rgba(129,140,248,0.15),transparent 70%); }
.pp-hero-inner {
  position:relative; z-index:1;
  padding:2.5rem 1.5rem 2.5rem;
  display:flex; align-items:center; gap:1.5rem;
}
.pp-avatar-wrap { flex-shrink:0; position:relative; cursor:pointer; }
.pp-avatar {
  width:80px; height:80px; border-radius:50%;
  border:4px solid rgba(255, 255, 255, 0.15);
  box-shadow:0 0 24px rgba(99,102,241,0.3);
  object-fit:cover;
  transition: filter 0.25s;
}
.pp-avatar-overlay {
  position:absolute; inset:0; border-radius:50%;
  background: rgba(15, 23, 42, 0.65);
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  gap: 0.25rem;
  color: white; font-size: 0.65rem; font-weight: 600;
  opacity:0; transition: opacity 0.25s;
  pointer-events:none;
}
.pp-avatar-wrap:hover .pp-avatar-overlay { opacity:1; }
.pp-avatar-edit {
  position: absolute; bottom: 0; right: 0;
  width: 24px; height: 24px; border-radius: 50%;
  background: #4f46e5; border: 2px solid white; color: white;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}
.pp-hero-info { display:flex; flex-direction:column; gap:0.3rem; }
.pp-hero-name-row { display:flex; align-items:center; gap:0.5rem; }
.pp-hero-name { margin:0; font-size:1.75rem; font-weight:950; color:#f8fafc; letter-spacing: -0.02em; }
.pp-verified { color:#818cf8; font-size:1rem; }
.pp-hero-role { margin:0; font-size:0.85rem; color:#818cf8; font-weight:700; letter-spacing: 0.05em; text-transform: uppercase; }
.pp-hero-motto { margin:0.2rem 0 0; font-size:0.85rem; color:#64748b; line-height:1.6; font-weight: 500; }
.pp-social { display:flex; gap:0.4rem; margin-top:0.25rem; }
.pp-social-btn {
  width:2rem; height:2rem; border-radius:0.5rem;
  background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1);
  color:#94a3b8; display:inline-flex; align-items:center; justify-content:center;
  text-decoration:none; transition:background 0.2s,color 0.2s;
}
.pp-social-btn:hover { background:rgba(129,140,248,0.2); color:#a5b4fc; }

.pp-settings-grid {
  display:grid; grid-template-columns:1.6fr 1fr; gap:1.5rem;
  animation: fadeIn 0.4s ease-out;
}
.pp-card {
  background:white; border-radius:1.5rem; padding:1.5rem;
  border: 1px solid rgba(255, 255, 255, 1);
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.03), 0 1px 3px rgba(15, 23, 42, 0.02);
  display:flex; flex-direction:column; gap:1.25rem;
}
.pp-mini-card { padding: 1.25rem; gap: 0.75rem; }
.pp-card-desc { font-size: 0.8rem; color: #64748b; margin: 0; }

.pp-card-title-row { display:flex; align-items:center; gap:0.5rem; }
.pp-card-icon { color:#4f46e5; }
.pp-card-title { margin:0; font-size:0.95rem; font-weight:800; color:#0f172a; }

.pp-settings-form { display: flex; flex-direction: column; gap: 1rem; }
.pp-form-item { display: flex; flex-direction: column; gap: 0.5rem; }
.pp-form-item label {
  font-size: 0.75rem; font-weight: 800; color: #94a3b8;
  text-transform: uppercase; letter-spacing: 0.05em;
  display: flex; align-items: center; gap: 0.4rem;
}
.pp-form-item input, .pp-form-item textarea {
  padding: 0.8rem 1rem; border-radius: 0.8rem; border: 1px solid #edf2f7;
  background: #f8fafc; font-size: 0.9rem; outline: none; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  color: #1e293b; font-weight: 550;
}
.pp-form-item input:focus, .pp-form-item textarea:focus {
  border-color: #4f46e5; background: white;
  box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.08), 0 2px 4px rgba(0, 0, 0, 0.02);
}

.pp-card-actions-footer { margin-top: 1.5rem; display: flex; justify-content: center; }
.pp-card-actions-footer .pp-btn-save {
  width: 100%;
  padding: 0.85rem 1.75rem; border-radius: 0.8rem;
  border: 1px solid #edf2f7;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  color: #334155;
  font-size: 0.88rem; font-weight: 800; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 0.6rem;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  letter-spacing: 0.02em;
}
.pp-btn-save:hover:not(:disabled) {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-color: #e2e8f0;
  transform: translateY(-0.5px);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.06);
}
.pp-btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}
.pp-spinner { animation: pp-spin 0.8s linear infinite; }
@keyframes pp-spin { to { transform: rotate(360deg); } }

.pp-btn-outline {
  padding: 0.6rem; border-radius: 0.8rem; border: 1px solid #e2e8f0;
  background: white; color: #475569; font-size: 0.75rem; font-weight: 800; cursor: pointer;
  transition: all 0.2s;
}
.pp-btn-outline:hover { background: #f8fafc; border-color: #cbd5e1; }

.pp-pref-list { display: flex; flex-direction: column; gap: 0.75rem; }
.pp-pref-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.5rem 0;
}
.pp-pref-info { display: flex; align-items: center; gap: 0.6rem; color: #475569; font-size: 0.88rem; font-weight: 500; }
.pp-pref-item input[type="checkbox"] {
  width: 1.75rem; height: 1rem; appearance: none;
  background: #cbd5e1; border-radius: 1rem; position: relative;
  cursor: pointer; transition: background 0.2s;
}
.pp-pref-item input[type="checkbox"]:checked { background: #10b981; }
.pp-pref-item input[type="checkbox"]::before {
  content: ''; position: absolute; left: 2px; top: 2px;
  width: 12px; height: 12px; background: white; border-radius: 50%;
  transition: transform 0.2s;
}
.pp-pref-item input[type="checkbox"]:checked::before { transform: translateX(12px); }

.pp-system-info {
  margin-top: 1rem; text-align: center;
  color: #94a3b8; font-size: 0.7rem; font-weight: 600;
  display: flex; flex-direction: column; gap: 0.2rem;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width:900px) {
  .pp-page { padding-top: 5rem; }
  .pp-body { padding: 1.5rem 0.9rem 4rem; }
  .pp-settings-grid { grid-template-columns: 1fr; }
}
@media (max-width:600px) {
  .pp-page { padding-top: 4.5rem; }
  .pp-hero-inner { flex-direction: column; text-align: center; }
  .pp-social { justify-content: center; }
  .pp-avatar { width: 64px; height: 64px; }
}
</style>