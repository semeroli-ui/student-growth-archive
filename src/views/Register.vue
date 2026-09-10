<template>
  <div class="reg-page">
    <div class="reg-card">
      <div class="reg-head">
        <div class="reg-logo">🎫</div>
        <h2>教师自助开户</h2>
        <p>使用管理员下发的邀请码，自行注册教师账号</p>
      </div>

      <form @submit.prevent="handleRegister">
        <div class="field">
          <label>邀请码 *</label>
          <input v-model="form.code" class="input" placeholder="8 位邀请码，如 AB12CD34" maxlength="8" />
        </div>
        <div class="field">
          <label>工号 *</label>
          <input v-model="form.account" class="input" placeholder="如 T2026" />
        </div>
        <div class="field">
          <label>姓名 *</label>
          <input v-model="form.name" class="input" placeholder="如 王老师" />
        </div>
        <div class="field">
          <label>负责班级（可选，留空用邀请码默认班级）</label>
          <input v-model="form.className" class="input" placeholder="如 高三(2)班" />
        </div>
        <div class="field">
          <label>密码（至少 6 位）*</label>
          <input v-model="form.password" :type="showPwd ? 'text' : 'password'" class="input" placeholder="设置登录密码" />
        </div>
        <div class="field">
          <label>确认密码 *</label>
          <input v-model="confirm" :type="showPwd ? 'text' : 'password'" class="input" placeholder="再次输入密码" />
        </div>

        <label class="show-pwd"><input type="checkbox" v-model="showPwd" /> 显示密码</label>

        <button type="submit" class="reg-btn" :disabled="loading">
          <span v-if="loading" class="spinner"></span>{{ loading ? '注册中…' : '注册并登录' }}
        </button>

        <div v-if="errorMsg" class="err">⚠ {{ errorMsg }}</div>
      </form>

      <div class="reg-foot">
        已有账号？<router-link to="/login">前往登录</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { register } from '../api/auth.js'

const router = useRouter()
const form = ref({ code: '', account: '', name: '', className: '', password: '' })
const confirm = ref('')
const showPwd = ref(false)
const loading = ref(false)
const errorMsg = ref('')

function saveSession(result) {
  localStorage.setItem('sga_token', result.token)
  localStorage.setItem('sga_role', result.role)
  localStorage.setItem('sga_user', JSON.stringify(result.user))
}

async function handleRegister() {
  errorMsg.value = ''
  const f = form.value
  if (!f.code || !f.account || !f.name || !f.password) { errorMsg.value = '请填写邀请码、工号、姓名与密码'; return }
  if (f.password.length < 6) { errorMsg.value = '密码至少 6 位'; return }
  if (f.password !== confirm.value) { errorMsg.value = '两次输入的密码不一致'; return }

  loading.value = true
  try {
    const r = await register(f)
    if (r.success) {
      saveSession(r)
      const target = r.user.mustChangePwd ? '/admin?tab=pwd' : '/app'
      router.push(target)
    } else {
      errorMsg.value = r.error || '注册失败，请检查邀请码'
    }
  } catch (e) {
    errorMsg.value = '网络错误，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.reg-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f3f7f6 0%, #eef3fb 100%);
  padding: 24px;
}
.reg-card {
  width: 100%;
  max-width: 400px;
  background: #fff;
  border-radius: 16px;
  padding: 32px 28px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.08);
}
.reg-head { text-align: center; margin-bottom: 24px; }
.reg-logo { font-size: 40px; margin-bottom: 8px; }
.reg-head h2 { margin: 0 0 4px; color: var(--text); font-size: 22px; }
.reg-head p { margin: 0; color: var(--muted); font-size: 13px; }
.field { margin-bottom: 14px; }
.field label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; color: var(--text); }
.input {
  width: 100%; padding: 11px 12px; border: 1.5px solid #e0e4ea; border-radius: 9px;
  font-size: 14px; color: var(--text); background: #fff; box-sizing: border-box;
}
.input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(47,125,110,0.1); }
.show-pwd { font-size: 12px; color: var(--muted); display: flex; align-items: center; gap: 6px; margin-bottom: 16px; }
.reg-btn {
  width: 100%; padding: 12px; border: none; border-radius: 10px;
  background: linear-gradient(135deg, var(--primary), var(--accent)); color: #fff;
  font-size: 15px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
}
.reg-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.spinner { width: 15px; height: 15px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.err { margin-top: 14px; padding: 9px 12px; background: #fbe9e9; color: var(--danger); border-radius: 8px; font-size: 13px; text-align: center; }
.reg-foot { margin-top: 18px; text-align: center; font-size: 13px; color: var(--muted); }
.reg-foot a { color: var(--accent); text-decoration: none; }
</style>
