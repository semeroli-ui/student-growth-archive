-- ============================================================
-- 作业明细模型：每次作业 × 每人提交状态
-- ============================================================
-- 解决的问题：汇总式 homework(total/missed/rate) 只能回答
-- 「提交率多少」，无法回答「这一次作业谁没交」。
--
-- 说明：后端 functions/api/[[path]].js 中的 ensureHomeworkTables()
-- 会在首次调用作业相关接口时自动执行同样的建表语句，因此
-- **不执行本文件也能正常使用**。本文件用于：
--   1) 需要提前建表的场景（例如 CI / 手工初始化 D1）
--   2) 作为数据库结构的可读归档
--
-- 手工执行方式：
--   npx wrangler d1 execute student-growth-archive --remote \
--     --file=./schema/homework-detail.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS homework_assignments (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  class_name    TEXT NOT NULL,              -- 所属班级
  subject       TEXT NOT NULL DEFAULT '',   -- 科目，可为空
  title         TEXT NOT NULL,              -- 作业标题
  due_date      TEXT NOT NULL,              -- 截止日期 YYYY-MM-DD
  note          TEXT DEFAULT '',
  created_by    TEXT,                       -- 创建者（教师工号）
  created_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS homework_records (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  assignment_id INTEGER NOT NULL,           -- → homework_assignments.id
  student_id    TEXT NOT NULL,              -- → users.id
  status        TEXT NOT NULL DEFAULT 'pending',
                -- submitted 已交 / late 补交 / missing 未交 /
                -- exempt 免交 / pending 待标记
  note          TEXT DEFAULT '',
  updated_at    TEXT DEFAULT (datetime('now'))
);

-- 同班级 + 同科目 + 同标题 + 同日期 视为同一次作业（幂等导入的关键）
CREATE UNIQUE INDEX IF NOT EXISTS idx_hw_asg_uniq
  ON homework_assignments (class_name, subject, title, due_date);

-- 一个学生一次作业只有一条记录
CREATE UNIQUE INDEX IF NOT EXISTS idx_hw_rec_uniq
  ON homework_records (assignment_id, student_id);

CREATE INDEX IF NOT EXISTS idx_hw_rec_student ON homework_records (student_id);
CREATE INDEX IF NOT EXISTS idx_hw_asg_class ON homework_assignments (class_name, due_date);

-- ============================================================
-- 统计口径（与后端 homeworkCountsToStats 保持一致）
--   已交   = submitted + late
--   应交   = submitted + late + missing   （pending / exempt 不计入分母）
--   提交率 = 已交 / 应交
-- 明细标记完成后，后端会把结果回写到 homework(student_id, total, missed, rate)，
-- 使班级概览、家长端、AI 报告的口径保持统一。
-- ============================================================
