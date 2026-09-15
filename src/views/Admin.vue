<template>
  <div>
    <!-- 提示条：首次登录强制改密 -->
    <div v-if="mustChangePwd" class="notice">
      ⚠ 您使用的是初始密码，请先修改密码（已为您定位到「我的密码」）
    </div>

    <!-- Tab 切换 -->
    <div class="card">
      <div class="tabs">
        <button :class="['tab', { active: tab === 'students' }]" @click="switchTab('students')">学生管理</button>
        <button v-if="isAdmin" :class="['tab', { active: tab === 'teachers' }]" @click="switchTab('teachers')">教师管理</button>
        <button v-if="isAdmin" :class="['tab', { active: tab === 'invites' }]" @click="switchTab('invites')">邀请码管理</button>
        <button v-if="isStaff" :class="['tab', { active: tab === 'parents' }]" @click="switchTab('parents')">家长管理</button>
        <button :class="['tab', { active: tab === 'pwd' }]" @click="switchTab('pwd')">我的密码</button>
      </div>
    </div>

    <div v-if="msg" :class="['msg', msgType]">{{ msg }}</div>

    <!-- ============ 学生管理 ============ -->
    <div v-show="tab === 'students'">
      <div class="card">
        <div class="row between">
          <h2>学生列表</h2>
          <div class="row">
            <select v-model="filterClass" class="select" @change="loadStudents">
              <option value="">全部班级</option>
              <option v-for="c in classrooms" :key="c" :value="c">{{ c }}</option>
            </select>
            <button class="btn" @click="showAdd = true">+ 单条添加</button>
            <button class="btn outline" @click="downloadTemplate">下载模板</button>
            <label class="btn outline">
              批量导入
              <input type="file" accept=".csv" hidden @change="onFile" />
            </label>
          </div>
        </div>

        <div class="grid">
          <div v-for="s in students" :key="s.id" class="student-card" @click="$router.push('/student/' + s.id)">
            <div class="avatar">{{ s.name.charAt(0) }}</div>
            <div class="meta">
              <div class="name">{{ s.name }}</div>
              <div class="sub">{{ s.className }}</div>
            </div>
            <span class="badge" :class="{ warn: s.homeworkRate < 0.9 }">作业 {{ Math.round(s.homeworkRate * 100) }}%</span>
            <div class="card-actions no-print">
              <button class="btn outline sm" @click.stop="openEditStudent(s)">编辑</button>
              <button class="btn danger sm" @click.stop="askDeleteStudent(s)">删除</button>
            </div>
          </div>
          <div v-if="!students.length" class="empty">暂无学生，点击「单条添加」或「批量导入」</div>
        </div>
      </div>
    </div>

    <!-- ============ 教师管理（仅管理员） ============ -->
    <div v-show="tab === 'teachers' && isAdmin">
      <div class="card">
        <div class="row between">
          <h2>教师账号</h2>
          <button class="btn" @click="showAddTeacher = true">+ 添加教师</button>
        </div>
        <table class="tbl">
          <thead>
            <tr><th>工号</th><th>姓名</th><th>角色</th><th>班级</th><th>状态</th><th>操作</th></tr>
          </thead>
          <tbody>
            <tr v-for="t in teachers" :key="t.id">
              <td>{{ t.account }}</td>
              <td>{{ t.name }}</td>
              <td>{{ t.role === 'admin' ? '管理员' : '教师' }}</td>
              <td>{{ t.class_name }}</td>
              <td>{{ t.status === 'active' ? '正常' : t.status }}</td>
              <td>
                <button class="btn outline sm" @click="openEditTeacher(t)">编辑</button>
                <button class="btn danger sm" @click="askDeleteTeacher(t)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ============ 邀请码管理（仅管理员） ============ -->
    <div v-show="tab === 'invites' && isAdmin">
      <InviteManager />
    </div>

    <!-- ============ 家长管理（教师/管理员） ============ -->
    <div v-show="tab === 'parents' && isStaff">
      <ParentManager />
    </div>

    <!-- ============ 我的密码 ============ -->
    <div v-show="tab === 'pwd'">
      <div class="card" style="max-width:480px">
        <h2>修改密码</h2>
        <div class="field">
          <label>原密码</label>
          <input v-model="oldPwd" type="password" class="input" />
        </div>
        <div class="field">
          <label>新密码（至少 6 位）</label>
          <input v-model="newPwd" type="password" class="input" />
        </div>
        <button class="btn" :disabled="pwdLoading" @click="doChangePwd">{{ pwdLoading ? '提交中…' : '确认修改' }}</button>
      </div>
    </div>

    <!-- ============ 单条添加学生 模态 ============ -->
    <div v-if="showAdd" class="modal-mask" @click.self="showAdd = false">
      <div class="modal">
        <h3>添加学生</h3>
        <div class="field"><label>学号 *</label><input v-model="form.account" class="input" placeholder="如 2024005" /></div>
        <div class="field"><label>姓名 *</label><input v-model="form.name" class="input" placeholder="如 张三" /></div>
        <div class="field"><label>班级 *</label><input v-model="form.className" class="input" placeholder="如 高三(2)班" /></div>
        <div class="field"><label>初始密码（留空=学号）</label><input v-model="form.password" class="input" placeholder="留空则默认学号" /></div>
        <div class="modal-actions">
          <button class="btn outline" @click="showAdd = false">取消</button>
          <button class="btn" :disabled="addLoading" @click="doAddStudent">{{ addLoading ? '保存中…' : '保存' }}</button>
        </div>
      </div>
    </div>

    <!-- ============ 添加教师 模态 ============ -->
    <div v-if="showAddTeacher" class="modal-mask" @click.self="showAddTeacher = false">
      <div class="modal">
        <h3>添加教师</h3>
        <div class="field"><label>工号 *</label><input v-model="tForm.account" class="input" placeholder="如 T2025" /></div>
        <div class="field"><label>姓名 *</label><input v-model="tForm.name" class="input" /></div>
        <div class="field"><label>初始密码 *</label><input v-model="tForm.password" class="input" type="password" /></div>
        <div class="field"><label>角色 *</label>
          <select v-model="tForm.role" class="select"><option value="teacher">教师</option><option value="admin">管理员</option></select>
        </div>
        <div class="field"><label>负责班级 *</label><input v-model="tForm.className" class="input" placeholder="如 高三(2)班" /></div>
        <div class="modal-actions">
          <button class="btn outline" @click="showAddTeacher = false">取消</button>
          <button class="btn" :disabled="tLoading" @click="doAddTeacher">{{ tLoading ? '保存中…' : '保存' }}</button>
        </div>
      </div>
    </div>

    <!-- ============ 编辑学生 模态 ============ -->
    <div v-if="showEditStudent" class="modal-mask" @click.self="showEditStudent = false">
      <div class="modal">
        <h3>编辑学生</h3>
        <div class="field"><label>学号</label><input :value="editStudentForm.id" class="input" disabled /></div>
        <div class="field"><label>姓名 *</label><input v-model="editStudentForm.name" class="input" /></div>
        <div class="field"><label>班级 *</label><input v-model="editStudentForm.className" class="input" /></div>
        <div class="field"><label>重置密码（留空则不修改）</label><input v-model="editStudentForm.password" class="input" type="password" placeholder="留空不改" /></div>
        <div class="modal-actions">
          <button class="btn outline" @click="showEditStudent = false">取消</button>
          <button class="btn" :disabled="editLoading" @click="doEditStudent">{{ editLoading ? '保存中…' : '保存' }}</button>
        </div>
      </div>
    </div>

    <!-- ============ 编辑教师 模态 ============ -->
    <div v-if="showEditTeacher" class="modal-mask" @click.self="showEditTeacher = false">
      <div class="modal">
        <h3>编辑教师/管理员</h3>
        <div class="field"><label>工号</label><input :value="editTeacherForm.id" class="input" disabled /></div>
        <div class="field"><label>姓名 *</label><input v-model="editTeacherForm.name" class="input" /></div>
        <div class="field"><label>角色 *</label>
          <select v-model="editTeacherForm.role" class="select"><option value="teacher">教师</option><option value="admin">管理员</option></select>
        </div>
        <div class="field"><label>负责班级 *</label><input v-model="editTeacherForm.className" class="input" /></div>
        <div class="field"><label>重置密码（留空则不修改）</label><input v-model="editTeacherForm.password" class="input" type="password" placeholder="留空不改" /></div>
        <div class="modal-actions">
          <button class="btn outline" @click="showEditTeacher = false">取消</button>
          <button class="btn" :disabled="editTeacherLoading" @click="doEditTeacher">{{ editTeacherLoading ? '保存中…' : '保存' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getRole, getMustChangePwd, changePassword, updateTeacher, deleteTeacher } from '../api/auth.js'
import InviteManager from '../components/InviteManager.vue'
import ParentManager from '../components/ParentManager.vue'
import { getStudents, getClassrooms, createStudent, importStudents, getTeachers, createTeacher, updateStudent, deleteStudent } from '../api/student.js'

const route = useRoute()
const isAdmin = getRole() === 'admin'
const isStaff = getRole() === 'teacher' || getRole() === 'admin'
const mustChangePwd = getMustChangePwd()

const tab = ref('students')
const msg = ref('')
const msgType = ref('ok')

const students = ref([])
const classrooms = ref([])
const filterClass = ref('')
const teachers = ref([])

const showAdd = ref(false)
const showAddTeacher = ref(false)
const addLoading = ref(false)
const tLoading = ref(false)
const pwdLoading = ref(false)

// 编辑/删除
const showEditStudent = ref(false)
const editStudentForm = ref({ id: '', name: '', className: '', password: '' })
const editLoading = ref(false)
const showEditTeacher = ref(false)
const editTeacherForm = ref({ id: '', name: '', className: '', role: 'teacher', password: '' })
const editTeacherLoading = ref(false)

const form = ref({ account: '', name: '', className: '', password: '' })
const tForm = ref({ account: '', name: '', password: '', role: 'teacher', className: '' })
const oldPwd = ref('')
const newPwd = ref('')

function setMsg(text, type = 'ok') { msg.value = text; msgType.value = type; setTimeout(() => (msg.value = ''), 4000) }
function switchTab(t) { tab.value = t; if (t === 'teachers') loadTeachers() }

async function loadStudents() {
  try {
    let list = await getStudents()
    if (filterClass.value) list = list.filter(s => s.className === filterClass.value)
    students.value = list
  } catch (e) { setMsg(e.message, 'err') }
}

async function loadTeachers() {
  if (!isAdmin) return
  try { teachers.value = await getTeachers() } catch (e) { setMsg(e.message, 'err') }
}

function downloadTemplate() {
  const csv = '学号,姓名,班级,初始密码\n2024005,张三,高三(2)班,\n2024006,李四,高三(2)班,\n'
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = '学生导入模板.csv'
  a.click()
  URL.revokeObjectURL(a.href)
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const rows = []
  for (let i = 0; i < lines.length; i++) {
    if (i === 0 && lines[0].includes('学号')) continue // 跳过表头
    const c = lines[i].split(',')
    const account = (c[0] || '').trim()
    const name = (c[1] || '').trim()
    const className = (c[2] || '').trim()
    const password = (c[3] || '').trim()
    if (account && name && className) rows.push({ account, name, className, password })
  }
  return rows
}

async function onFile(e) {
  const file = e.target.files[0]
  if (!file) return
  const text = await file.text()
  const rows = parseCSV(text)
  if (!rows.length) { setMsg('未解析到有效数据，请检查 CSV 格式', 'err'); return }
  try {
    const r = await importStudents(rows)
    let m = `导入完成：新增 ${r.created} 人`
    if (r.skipped) m += `，跳过重复 ${r.skipped} 人`
    if (r.errors && r.errors.length) m += `，失败 ${r.errors.length} 行`
    setMsg(m, r.errors && r.errors.length ? 'warn' : 'ok')
    if (r.errors && r.errors.length) console.warn('导入错误:', r.errors)
    loadStudents()
  } catch (err) { setMsg(err.message, 'err') }
  e.target.value = ''
}

async function doAddStudent() {
  const f = form.value
  if (!f.account || !f.name || !f.className) { setMsg('学号、姓名、班级为必填', 'err'); return }
  addLoading.value = true
  try {
    const r = await createStudent(f)
    if (r.success) { setMsg(`已添加学生 ${f.name}`, 'ok'); showAdd.value = false; form.value = { account: '', name: '', className: '', password: '' }; loadStudents() }
    else setMsg(r.error || '添加失败', 'err')
  } catch (e) { setMsg(e.message, 'err') }
  addLoading.value = false
}

async function doAddTeacher() {
  const f = tForm.value
  if (!f.account || !f.name || !f.password || !f.className) { setMsg('请填写完整', 'err'); return }
  tLoading.value = true
  try {
    const r = await createTeacher(f)
    if (r.success) { setMsg(`已添加教师 ${f.name}`, 'ok'); showAddTeacher.value = false; tForm.value = { account: '', name: '', password: '', role: 'teacher', className: '' }; loadTeachers() }
    else setMsg(r.error || '添加失败', 'err')
  } catch (e) { setMsg(e.message, 'err') }
  tLoading.value = false
}

// ===== 学生编辑/删除（教师/管理员）=====
function openEditStudent(s) {
  editStudentForm.value = { id: s.id, name: s.name, className: s.className, password: '' }
  showEditStudent.value = true
}
async function doEditStudent() {
  const f = editStudentForm.value
  if (!f.name || !f.className) { setMsg('姓名、班级为必填', 'err'); return }
  editLoading.value = true
  try {
    const payload = { name: f.name, className: f.className }
    if (f.password) payload.resetPassword = f.password
    const r = await updateStudent(f.id, payload)
    if (r.success) { setMsg('学生信息已更新', 'ok'); showEditStudent.value = false; loadStudents() }
    else setMsg(r.error || '更新失败', 'err')
  } catch (e) { setMsg(e.message, 'err') }
  editLoading.value = false
}
async function askDeleteStudent(s) {
  if (!confirm(`确认删除学生 ${s.name}（${s.id}）？将同时删除其成绩、行为、事件等全部数据。`)) return
  try {
    const r = await deleteStudent(s.id)
    if (r.success) { setMsg('已删除', 'ok'); loadStudents() }
    else setMsg(r.error || '删除失败', 'err')
  } catch (e) { setMsg(e.message, 'err') }
}

// ===== 教师编辑/删除（管理员）=====
function openEditTeacher(t) {
  editTeacherForm.value = { id: t.id, name: t.name, className: t.class_name, role: t.role || 'teacher', password: '' }
  showEditTeacher.value = true
}
async function doEditTeacher() {
  const f = editTeacherForm.value
  if (!f.name || !f.className) { setMsg('姓名、班级为必填', 'err'); return }
  editTeacherLoading.value = true
  try {
    const payload = { name: f.name, className: f.className, role: f.role }
    if (f.password) payload.resetPassword = f.password
    const r = await updateTeacher(f.id, payload)
    if (r.ok) { setMsg('教师信息已更新', 'ok'); showEditTeacher.value = false; loadTeachers() }
    else setMsg((r.data && r.data.error) || '更新失败', 'err')
  } catch (e) { setMsg(e.message, 'err') }
  editTeacherLoading.value = false
}
async function askDeleteTeacher(t) {
  if (!confirm(`确认删除教师/管理员 ${t.name}（${t.account}）？`)) return
  try {
    const r = await deleteTeacher(t.id)
    if (r.ok) { setMsg('已删除', 'ok'); loadTeachers() }
    else setMsg((r.data && r.data.error) || '删除失败', 'err')
  } catch (e) { setMsg(e.message, 'err') }
}

async function doChangePwd() {
  if (!oldPwd.value || !newPwd.value) { setMsg('请填写完整', 'err'); return }
  if (newPwd.value.length < 6) { setMsg('新密码至少 6 位', 'err'); return }
  pwdLoading.value = true
  try {
    const r = await changePassword(oldPwd.value, newPwd.value)
    if (r.success) { setMsg('密码已修改', 'ok'); oldPwd.value = ''; newPwd.value = ''; mustChangePwd && (mustChangePwd.value = false) }
    else setMsg(r.error || '修改失败', 'err')
  } catch (e) { setMsg(e.message, 'err') }
  pwdLoading.value = false
}

onMounted(async () => {
  const q = route.query.tab
  if (q === 'pwd' || q === 'teachers' || q === 'students' || q === 'invites' || q === 'parents') tab.value = q
  if (mustChangePwd.value) tab.value = 'pwd'
  try { classrooms.value = await getClassrooms() } catch {}
  loadStudents()
  if (isAdmin && tab.value === 'teachers') loadTeachers()
})

watch(() => route.query.tab, (t) => { if (t) tab.value = t })
</script>

<style scoped>
.tabs { display: flex; gap: 8px; }
.tab {
  padding: 10px 20px; border: none; background: var(--bg); color: var(--muted);
  border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500;
}
.tab.active { background: var(--primary); color: #fff; }
.row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.row.between { justify-content: space-between; }
.select, .input {
  padding: 9px 12px; border: 1.5px solid #e0e4ea; border-radius: 8px; font-size: 14px;
  color: var(--text); background: #fff; outline: none;
}
.select:focus, .input:focus { border-color: var(--primary); }
.field { margin-bottom: 14px; }
.field label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; color: var(--text); }
.empty { padding: 24px; text-align: center; color: var(--muted); }
.tbl { width: 100%; border-collapse: collapse; font-size: 14px; }
.tbl th, .tbl td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #eef1f5; }
.tbl th { color: var(--muted); font-weight: 600; }
.notice {
  background: #fdf3e0; color: var(--warn); padding: 10px 16px; border-radius: 8px;
  margin-bottom: 16px; font-size: 14px;
}
.msg { padding: 10px 16px; border-radius: 8px; margin-bottom: 16px; font-size: 14px; }
.msg.ok { background: #e8f6ef; color: var(--primary); }
.msg.warn { background: #fdf3e0; color: var(--warn); }
.msg.err { background: #fbe9e9; color: var(--danger); }
.modal-mask {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex;
  align-items: center; justify-content: center; z-index: 100;
}
.modal { background: #fff; border-radius: 12px; padding: 24px; width: 380px; max-width: 92vw; box-shadow: 0 8px 40px rgba(0,0,0,0.2); }
.modal h3 { margin-bottom: 16px; color: var(--primary); }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }
.btn.sm { padding: 5px 10px; font-size: 12px; }
.btn.danger { background: var(--danger); }
.btn.danger:hover { opacity: 0.9; }
.student-card { flex-wrap: wrap; }
.card-actions { flex-basis: 100%; display: flex; gap: 6px; margin-top: 6px; }
</style>
