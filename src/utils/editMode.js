/**
 * 全局编辑模式 —— 全站唯一的编辑状态源
 *
 * 设计意图：把「能不能改数据」收敛成一个开关，全站共用。
 *   开启 → 成绩录入、行为评分、作业提交情况、作业管理、学生/教师管理等编辑入口全部出现
 *   关闭 → 以上入口全部收起，页面回到干净的只读态（家长查看、投屏、打印都更清爽）
 *
 * 三条不可违背的规则（由 edit_mode_test.mjs 钉住）：
 *   1. 「关闭」就是全站锁定 —— 不允许任何页面自己保留一条可编辑的旁路；
 *   2. 学生 / 家长角色即使开关被打开也永远只读（前端双保险，后端另有 requireTeacher）；
 *   3. 用 sessionStorage 而不是 localStorage —— 编辑态是临时工作状态，
 *      关掉标签页就自动回到只读，避免隔天回来还以为页面在裸奔。
 *
 * 状态用 Vue ref 承载，所以任何读取它的 computed 都会随开关变化立即重算。
 * （反面教材：直接读 localStorage 不是响应式依赖，computed 会永久缓存首次结果。）
 */
import { computed, ref } from 'vue'
import { getRole } from '../api/auth.js'

const STORAGE_KEY = 'sga_edit_mode'

function readStored() {
  try { return sessionStorage.getItem(STORAGE_KEY) === '1' } catch { return false }
}

const editMode = ref(readStored())

function persist() {
  try {
    if (editMode.value) sessionStorage.setItem(STORAGE_KEY, '1')
    else sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* 隐私模式 / 存储被禁用时退化为内存态即可，不影响本次会话内的可用性 */
  }
}

/** 开关本身的状态（不含角色判断） */
export function isEditMode() { return editMode.value }

/** 当前账号此刻是否真的可以编辑：教职工 且 开关已开 */
export function canEditNow() {
  const r = getRole()
  return (r === 'teacher' || r === 'admin') && editMode.value
}

export function setEditMode(on) {
  editMode.value = !!on
  persist()
}

export function toggleEditMode() {
  setEditMode(!editMode.value)
}

/** 退出登录 / 切换到只读角色时归零，避免编辑态跨账号泄漏 */
export function resetEditMode() {
  setEditMode(false)
}

/**
 * 组件内用法：
 *   const { editMode, canEdit, toggleEditMode } = useEditMode()
 * 模板里 editMode / canEdit 会被自动解包，可直接当布尔值用。
 */
export function useEditMode() {
  return {
    editMode,
    canEdit: computed(() => canEditNow()),
    toggleEditMode
  }
}
