<template>
  <div class="login-page">
    <!-- 左侧品牌区 -->
    <div class="login-brand">
      <div class="brand-content">
        <div class="brand-logo">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="10" fill="rgba(255,255,255,0.15)"/>
            <path d="M12 14h16M12 20h16M12 26h10" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
            <circle cx="30" cy="26" r="3" fill="#fff"/>
          </svg>
        </div>
        <h1 class="brand-title">学生成长档案系统</h1>
        <p class="brand-subtitle">Student Growth Archive System</p>
        <div class="brand-features">
          <div class="feature-item">
            <div class="feature-icon">📊</div>
            <div class="feature-text">
              <div class="feature-title">数据可视化</div>
              <div class="feature-desc">成绩趋势 · 行为雷达 · 成长时间线</div>
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-icon">🤖</div>
            <div class="feature-text">
              <div class="feature-title">AI 个性化分析</div>
              <div class="feature-desc">智能生成成长画像与家校沟通建议</div>
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-icon">🔒</div>
            <div class="feature-text">
              <div class="feature-title">安全可靠</div>
              <div class="feature-desc">角色权限分级 · 数据加密存储</div>
            </div>
          </div>
        </div>
        <div class="brand-footer">
          © 2026 Student Growth Archive · Powered by Cloudflare
        </div>
      </div>
      <!-- 装饰光斑 -->
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
      <div class="orb orb-3"></div>
    </div>

    <!-- 右侧登录表单 -->
    <div class="login-form-side">
      <div class="login-form-wrapper">
        <div class="login-header">
          <h2>欢迎回来</h2>
          <p>请使用您的账号登录</p>
        </div>

        <!-- 角色切换 -->
        <div class="role-switch">
          <button
            :class="['role-btn', { active: role === 'teacher' }]"
            @click="role = 'teacher'"
          >
            <span class="role-emoji">👨‍🏫</span> 教师登录
          </button>
          <button
            :class="['role-btn', { active: role === 'student' }]"
            @click="role = 'student'"
          >
            <span class="role-emoji">🎓</span> 学生登录
          </button>
        </div>

        <form @submit.prevent="handleLogin">
          <div class="field">
            <label>账号</label>
            <div class="input-wrap">
              <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="currentColor"/>
              </svg>
              <input
                v-model="account"
                type="text"
                :placeholder="role === 'teacher' ? '教师工号或手机号' : '学号或手机号'"
                autocomplete="username"
                required
              />
            </div>
          </div>

          <div class="field">
            <label>密码</label>
            <div class="input-wrap">
              <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3-9H9V6c0-1.66 1.34-3 3-3s3 1.34 3 3v2z" fill="currentColor"/>
              </svg>
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="请输入密码"
                autocomplete="current-password"
                required
              />
              <button type="button" class="toggle-pwd" @click="showPassword = !showPassword">
                {{ showPassword ? '🙈' : '👁' }}
              </button>
            </div>
          </div>

          <div class="form-options">
            <label class="remember">
              <input type="checkbox" v-model="remember" /> 记住我
            </label>
            <a href="#" class="forgot" @click.prevent="handleForgot">忘记密码？</a>
          </div>

          <button type="submit" class="login-btn" :disabled="loading">
            <span v-if="loading" class="spinner"></span>
            {{ loading ? '登录中…' : '登 录' }}
          </button>

          <div v-if="errorMsg" class="error-msg">
            ⚠ {{ errorMsg }}
          </div>
        </form>

        <div class="login-divider">
          <span>安全登录</span>
        </div>
        <div class="security-badges">
          <span class="sec-badge">🔒 SSL 加密</span>
          <span class="sec-badge">✅ D1 数据库</span>
          <span class="sec-badge">⚡ Cloudflare 边缘</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { login } from '../api/auth.js'

const router = useRouter()
const role = ref('teacher')
const account = ref('')
const password = ref('')
const showPassword = ref(false)
const remember = ref(true)
const loading = ref(false)
const errorMsg = ref('')

async function handleLogin() {
  errorMsg.value = ''
  loading.value = true
  try {
    const result = await login(role.value, account.value, password.value)
    if (result.success) {
      // 存储登录态
      if (remember.value) {
        localStorage.setItem('sga_token', result.token)
        localStorage.setItem('sga_role', result.role)
        localStorage.setItem('sga_user', JSON.stringify(result.user))
      } else {
        sessionStorage.setItem('sga_token', result.token)
        sessionStorage.setItem('sga_role', result.role)
        sessionStorage.setItem('sga_user', JSON.stringify(result.user))
      }
      const target = (result.user && result.user.mustChangePwd) ? '/admin?tab=pwd' : '/app'
      router.push(target)
    } else {
      errorMsg.value = result.error || '登录失败，请检查账号密码'
    }
  } catch (err) {
    errorMsg.value = '网络错误，请稍后重试'
  } finally {
    loading.value = false
  }
}

function handleForgot() {
  errorMsg.value = '请联系管理员重置密码'
}
</script>

<style scoped>
.login-page {
  display: flex;
  min-height: 100vh;
  background: var(--bg);
}

/* === 左侧品牌区 === */
.login-brand {
  flex: 1;
  position: relative;
  background: linear-gradient(135deg, #1a5c52 0%, #2f7d6e 30%, #3a7bd5 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  min-height: 100vh;
}
.brand-content {
  position: relative;
  z-index: 2;
  color: #fff;
  padding: 60px 48px;
  max-width: 480px;
}
.brand-logo {
  margin-bottom: 24px;
}
.brand-title {
  font-size: 32px;
  font-weight: 700;
  letter-spacing: -0.5px;
  margin-bottom: 8px;
}
.brand-subtitle {
  font-size: 15px;
  opacity: 0.7;
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-bottom: 48px;
}
.brand-features {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-bottom: 48px;
}
.feature-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}
.feature-icon {
  font-size: 28px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.1);
  border-radius: 12px;
  backdrop-filter: blur(10px);
}
.feature-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}
.feature-desc {
  font-size: 13px;
  opacity: 0.7;
}
.brand-footer {
  font-size: 12px;
  opacity: 0.4;
}

/* 装饰光斑 */
.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.3;
  animation: float 8s ease-in-out infinite;
}
.orb-1 { width: 300px; height: 300px; background: #3a7bd5; top: -50px; right: -80px; }
.orb-2 { width: 200px; height: 200px; background: #2f7d6e; bottom: 80px; left: -40px; animation-delay: 2s; }
.orb-3 { width: 150px; height: 150px; background: #1a5c52; top: 40%; right: 20%; animation-delay: 4s; }
@keyframes float {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(20px, -30px); }
}

/* === 右侧登录表单 === */
.login-form-side {
  width: 480px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
}
.login-form-wrapper {
  width: 100%;
  max-width: 360px;
  padding: 40px;
}
.login-header h2 {
  font-size: 26px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 6px;
}
.login-header p {
  color: var(--muted);
  font-size: 14px;
  margin-bottom: 32px;
}

/* 角色切换 */
.role-switch {
  display: flex;
  gap: 0;
  margin-bottom: 24px;
  background: var(--bg);
  border-radius: 10px;
  padding: 4px;
}
.role-btn {
  flex: 1;
  padding: 10px 16px;
  border: none;
  background: transparent;
  color: var(--muted);
  font-size: 14px;
  font-weight: 500;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}
.role-btn.active {
  background: #fff;
  color: var(--primary);
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}
.role-emoji {
  margin-right: 4px;
}

/* 表单 */
.field {
  margin-bottom: 20px;
}
.field label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 8px;
}
.input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.input-icon {
  position: absolute;
  left: 12px;
  color: var(--muted);
  pointer-events: none;
}
.input-wrap input {
  width: 100%;
  padding: 12px 12px 12px 40px;
  border: 1.5px solid #e0e4ea;
  border-radius: 10px;
  font-size: 14px;
  color: var(--text);
  background: #fff;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.input-wrap input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(47,125,110,0.1);
}
.toggle-pwd {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 4px;
}

/* 选项 */
.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  font-size: 13px;
}
.remember {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--muted);
  cursor: pointer;
}
.remember input {
  accent-color: var(--primary);
}
.forgot {
  color: var(--accent);
  text-decoration: none;
}
.forgot:hover {
  text-decoration: underline;
}

/* 登录按钮 */
.login-btn {
  width: 100%;
  padding: 13px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.1s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.login-btn:hover:not(:disabled) {
  opacity: 0.95;
}
.login-btn:active:not(:disabled) {
  transform: scale(0.98);
}
.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 错误消息 */
.error-msg {
  margin-top: 16px;
  padding: 10px 14px;
  background: #fbe9e9;
  color: var(--danger);
  border-radius: 8px;
  font-size: 13px;
  text-align: center;
}

/* 分割线 */
.login-divider {
  margin: 28px 0 16px;
  text-align: center;
  position: relative;
}
.login-divider::before {
  content: '';
  position: absolute;
  left: 0; right: 0; top: 50%;
  height: 1px;
  background: #e0e4ea;
}
.login-divider span {
  position: relative;
  background: #fff;
  padding: 0 16px;
  font-size: 12px;
  color: var(--muted);
}

/* 安全徽章 */
.security-badges {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}
.sec-badge {
  font-size: 11px;
  color: var(--muted);
}

/* === 响应式 === */
@media (max-width: 900px) {
  .login-page { flex-direction: column; }
  .login-brand { min-height: auto; padding: 40px 24px; }
  .brand-content { padding: 24px; max-width: 100%; }
  .brand-features { flex-direction: row; flex-wrap: wrap; gap: 16px; margin-bottom: 24px; }
  .feature-item { flex: 1; min-width: 200px; }
  .brand-footer { display: none; }
  .login-form-side { width: 100%; min-height: 60vh; }
  .login-form-wrapper { padding: 32px 24px; max-width: 100%; }
}
@media (max-width: 480px) {
  .brand-title { font-size: 24px; }
  .brand-subtitle { font-size: 13px; }
  .brand-features { flex-direction: column; }
  .feature-item { min-width: 100%; }
  .role-btn { font-size: 13px; padding: 8px 12px; }
}
</style>
