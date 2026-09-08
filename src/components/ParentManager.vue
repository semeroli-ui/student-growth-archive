<template>
  <div class="card">
    <h2>家长账号管理</h2>
    <p class="sub">创建家长账号并关联其孩子。家长登录后仅可查看已关联孩子的档案（心理画像不展示）。</p>

    <div class="gen-box">
      <div class="row">
        <div class="field grow">
          <label>家长账号 *</label>
          <input v-model="form.account" class="input" placeholder="如 liming_father" />
        </div>
        <div class="field grow">
          <label>家长姓名 *</label>
          <input v-model="form.name" class="input" placeholder="如 李明家长" />
        </div>
        <div class="field grow">
          <label>初始密码（至少 6 位）*</label>
          <input v-model="form.password" class="input" placeholder="如 abc123" />
        </div>
      </div>
      <div class="field" style="margin-top:12px">
        <label>关联孩子（可多选）</label>
        <select v-model="form.studentIds" multiple class="input mult">
          <option v-for="s in students" :key="s.id" :value="s.id">{{ s.name }}（{{ s.className }} · {{ s.id }}）</option>
        </select>
        <span class="hint">按住 Ctrl/Cmd 多选</span>
      </div>
      <button class="btn" :disabled="saving" @click="doCreate" style="margin-top:12px">{{ saving ? '创建中…' : '创建家长账号' }}</button>
    </div>

    <div v-if="msg" :class="['msg', msgType]">{{ msg }}</div>

    <h3 style="margin-top:24px">家长列表</h3>
    <table class="tbl">
      <thead>
        <tr><th>账号</th><th>姓名</th><th>关联孩子</th><th>操作</th></tr>
      </thead>
      <tbody>
        <tr v-for="p in parents" :key="p.id">
          <td>{{ p.account }}</td>
          <td>{{ p.name }}</td>
          <td>
            <span v-if="!p.children.length" class="sub">未关联</span>
            <span v-else>
              <span v-for="c in p.children" :key="c.id" class="tag">{{ c.name }}</span>
            </span>
          </td>
          <td>
            <select v-model="linkSel[p.id]" class="sel-sm">
              <option value="">关联更多孩子…</option>
              <option v-for="s in students" :key="s.id" :value="s.id">{{ s.name }}（{{ s.className }}）</option>
            </select>
            <button class="btn outline sm" :disabled="!linkSel[p.id]" @click="doLink(p.id, linkSel[p.id])">+ 关联</button>
          </td>
        </tr>
        <tr v-if="!parents.length"><td colspan="4" class="sub" style="padding:16px">暂无家长账号</td></tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { getParents, createParent, linkParentStudent } from '../api/auth.js'
import { getStudents } from '../api/student.js'

const parents = ref([])
const students = ref([])
const form = reactive({ account: '', name: '', password: '', studentIds: [] })
const linkSel = reactive({})
const saving = ref(false)
const msg = ref('')
const msgType = ref('ok')

function setMsg(t, type = 'ok') { msg.value = t; msgType.value = type; setTimeout(() => (msg.value = ''), 4000) }

async function load() {
  try {
    const [p, s] = await Promise.all([getParents(), getStudents()])
    parents.value = p.ok ? p.data || [] : []
    students.value = Array.isArray(s) ? s : []
  } catch (e) {}
}

async function doCreate() {
  saving.value = true
  try {
    const r = await createParent({ account: form.account, name: form.name, password: form.password, studentIds: form.studentIds })
    if (r.ok) {
      setMsg('家长账号已创建', 'ok')
      form.account = ''; form.name = ''; form.password = ''; form.studentIds = []
      load()
    } else setMsg((r.data && r.data.error) || '创建失败', 'err')
  } catch (e) { setMsg(e.message || '创建失败', 'err') }
  saving.value = false
}

async function doLink(parentId, studentId) {
  if (!studentId) return
  try {
    const r = await linkParentStudent(parentId, studentId)
    if (r.ok) setMsg('关联成功', 'ok'); else setMsg((r.data && r.data.error) || '关联失败', 'err')
    linkSel[parentId] = ''
    load()
  } catch (e) { setMsg(e.message, 'err') }
}

onMounted(load)
</script>

<style scoped>
.sub { color: var(--muted); font-size: 13px; }
.gen-box { background: var(--bg); border-radius: 10px; padding: 16px; margin: 12px 0; }
.row { display: flex; gap: 12px; flex-wrap: wrap; }
.field { display: flex; flex-direction: column; }
.field.grow { flex: 1; min-width: 140px; }
.field label { font-size: 12px; font-weight: 600; margin-bottom: 6px; color: var(--text); }
.input { padding: 9px 12px; border: 1.5px solid #e0e4ea; border-radius: 8px; font-size: 14px; color: var(--text); background: #fff; outline: none; }
.input:focus { border-color: var(--primary); }
.mult { min-height: 96px; }
.hint { font-size: 11px; color: var(--muted); margin-top: 4px; }
.btn { padding: 9px 16px; border: none; background: var(--primary); color: #fff; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
.btn.outline { background: #fff; border: 1.5px solid var(--primary); color: var(--primary); }
.btn.sm { padding: 5px 10px; font-size: 12px; margin-left: 6px; }
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th, .tbl td { text-align: left; padding: 9px 10px; border-bottom: 1px solid #eef1f5; vertical-align: middle; }
.tbl th { color: var(--muted); font-weight: 600; }
.tag { display: inline-block; background: var(--bg); color: var(--primary); border-radius: 6px; padding: 2px 8px; margin: 2px 4px 2px 0; font-size: 12px; }
.sel-sm { padding: 5px 8px; border: 1.5px solid #e0e4ea; border-radius: 7px; font-size: 12px; outline: none; max-width: 180px; }
.msg { padding: 10px 16px; border-radius: 8px; margin: 12px 0; font-size: 14px; }
.msg.ok { background: #e8f6ef; color: var(--primary); }
.msg.err { background: #fbe9e9; color: var(--danger); }
.msg.warn { background: #fdf3e0; color: var(--warn); }
</style>
