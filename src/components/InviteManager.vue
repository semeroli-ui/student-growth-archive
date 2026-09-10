<template>
  <div class="card">
    <h2>邀请码管理</h2>
    <p class="sub">生成邀请码后，教师可用邀请码在登录页自助注册开户（单码单次有效）。</p>

    <div class="gen-box">
      <div class="row">
        <div class="field">
          <label>默认班级（可选）</label>
          <input v-model="className" class="input" placeholder="如 高三(2)班" />
        </div>
        <div class="field small">
          <label>数量</label>
          <input v-model.number="count" type="number" min="1" max="20" class="input" />
        </div>
        <div class="field small">
          <label>有效期(天)</label>
          <input v-model.number="expiresInDays" type="number" min="1" max="365" class="input" />
        </div>
        <button class="btn" :disabled="genLoading" @click="doGen">{{ genLoading ? '生成中…' : '生成邀请码' }}</button>
      </div>
    </div>

    <div v-if="newCodes.length" class="new-codes">
      <div class="nc-title">✅ 新生成（请尽快分发给教师）：</div>
      <div v-for="c in newCodes" :key="c" class="code-chip">
        <code>{{ c }}</code>
        <button class="copy" @click="copy(c)">复制</button>
      </div>
    </div>

    <div v-if="msg" :class="['msg', msgType]">{{ msg }}</div>

    <h3 style="margin-top:24px">已有邀请码</h3>
    <table class="tbl">
      <thead>
        <tr><th>邀请码</th><th>班级</th><th>状态</th><th>使用人</th><th>过期时间</th><th></th></tr>
      </thead>
      <tbody>
        <tr v-for="c in codes" :key="c.code">
          <td><code>{{ c.code }}</code></td>
          <td>{{ c.class_name || '—' }}</td>
          <td>
            <span v-if="c.used" class="badge warn">已使用</span>
            <span v-else-if="isExpired(c.expires_at)" class="badge warn">已过期</span>
            <span v-else class="badge ok">可用</span>
          </td>
          <td>{{ c.used_by || '—' }}</td>
          <td>{{ fmt(c.expires_at) }}</td>
          <td>
            <button v-if="!c.used" class="btn outline sm" :disabled="revoking" @click="doRevoke(c.code)">撤销</button>
          </td>
        </tr>
        <tr v-if="!codes.length"><td colspan="6" class="sub" style="padding:16px">暂无邀请码</td></tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getInviteCodes, createInviteCodes, revokeInviteCode } from '../api/auth.js'

const codes = ref([])
const newCodes = ref([])
const className = ref('')
const count = ref(1)
const expiresInDays = ref(30)
const genLoading = ref(false)
const revoking = ref(false)
const msg = ref('')
const msgType = ref('ok')
const copied = ref('')

function setMsg(t, type = 'ok') { msg.value = t; msgType.value = type; setTimeout(() => (msg.value = ''), 4000) }
function fmt(s) { return s ? s.replace('T', ' ').slice(0, 16) : '—' }
function isExpired(s) { return s && new Date(s) < new Date() }

async function load() {
  try { const r = await getInviteCodes(); codes.value = r.ok ? r.data || [] : [] } catch (e) {}
}

async function doGen() {
  genLoading.value = true
  newCodes.value = []
  try {
    const r = await createInviteCodes({ className: className.value || undefined, count: count.value, expiresInDays: expiresInDays.value })
    if (r.ok && r.data && r.data.codes) { newCodes.value = r.data.codes; setMsg(`已生成 ${r.data.codes.length} 个邀请码`, 'ok') }
    else setMsg((r.data && r.data.error) || '生成失败', 'err')
    load()
  } catch (e) { setMsg(e.message || '生成失败', 'err') }
  genLoading.value = false
}

async function doRevoke(code) {
  revoking.value = true
  try {
    const r = await revokeInviteCode(code)
    if (r.ok) setMsg('已撤销', 'ok'); else setMsg((r.data && r.data.error) || '撤销失败', 'err')
    load()
  } catch (e) { setMsg(e.message, 'err') }
  revoking.value = false
}

function copy(code) {
  navigator.clipboard?.writeText(code).then(() => { copied.value = code; setTimeout(() => (copied.value = ''), 1500) })
}

onMounted(load)
</script>

<style scoped>
.sub { color: var(--muted); font-size: 13px; }
.gen-box { background: var(--bg); border-radius: 10px; padding: 16px; margin: 12px 0; }
.row { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
.field { display: flex; flex-direction: column; }
.field.small { width: 90px; }
.field label { font-size: 12px; font-weight: 600; margin-bottom: 6px; color: var(--text); }
.input { padding: 9px 12px; border: 1.5px solid #e0e4ea; border-radius: 8px; font-size: 14px; color: var(--text); background: #fff; outline: none; }
.input:focus { border-color: var(--primary); }
.btn { padding: 9px 16px; border: none; background: var(--primary); color: #fff; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
.btn.outline { background: #fff; border: 1.5px solid var(--primary); color: var(--primary); }
.btn.sm { padding: 5px 10px; font-size: 12px; }
.new-codes { background: #e8f6ef; border-radius: 10px; padding: 14px 16px; margin-bottom: 8px; }
.nc-title { font-size: 13px; font-weight: 600; margin-bottom: 8px; }
.code-chip { display: inline-flex; align-items: center; gap: 8px; background: #fff; border: 1px solid #d6ece3; border-radius: 8px; padding: 6px 10px; margin: 4px 6px 4px 0; }
.code-chip code { font-size: 15px; letter-spacing: 1px; color: var(--primary); }
.copy { border: none; background: none; color: var(--accent); cursor: pointer; font-size: 12px; }
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th, .tbl td { text-align: left; padding: 9px 10px; border-bottom: 1px solid #eef1f5; }
.tbl th { color: var(--muted); font-weight: 600; }
.badge { display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 12px; }
.badge.ok { background: #e8f6ef; color: var(--primary); }
.badge.warn { background: #fbe9e9; color: var(--danger); }
.msg { padding: 10px 16px; border-radius: 8px; margin: 12px 0; font-size: 14px; }
.msg.ok { background: #e8f6ef; color: var(--primary); }
.msg.err { background: #fbe9e9; color: var(--danger); }
.msg.warn { background: #fdf3e0; color: var(--warn); }
</style>
