# 部署指南：GitHub + Cloudflare Pages

本项目是用 Vue3 + Vite + ECharts 构建的纯前端应用（后端为 Cloudflare Pages Functions + D1）。
下面把代码推到 GitHub，再用 Cloudflare Pages 连接仓库自动部署。

---

## ⚠️ 0. 最重要的一节：生产分支必须和 main 一致

**这是本项目最容易踩、且最难自查的坑。请看懂再往下。**

Cloudflare Pages 有一个「生产分支」（Production branch）设置，它决定**哪个 Git 分支的提交会部署到生产域名**
（本项目生产域名：`geixinghua.kdns.fr` / `pages.dev` 根域名）。

其他分支的提交只会生成 **Preview 预览部署**（一长串带 hash 的临时域名）。

**症状**：你在 GitHub 上明明看到代码更新了，Cloudflare 的部署列表里也有新记录，但**线上站点还是老样子**——
因为那条新记录标的是 `Preview` 而不是 `Production`。

**本项目当前的实际状态**（2026-09-16 排查确认）：

| 分支 | 用途 | 部署环境 |
|---|---|---|
| `main` | 日常开发主线 | 只产生 Preview |
| `production` | 生产 | **Production（线上就是这个）** |

所以每次改完代码，必须**同时推送两个分支**，否则线上不会更新：

```bash
git push origin main                 # 更新 main（触发预览部署）
git push origin main:production      # 把 production 追平 main（触发生产部署）
```

> `main:production` 的含义：把本地 `main` 推到远程的 `production` 分支。
> 只要 `production` 是 `main` 的祖先，这就是一次快进（fast-forward）推送，不会丢东西。

### 推荐：一劳永逸地改掉它

在 Cloudflare 控制台 → **Workers 和 Pages** → 选择项目 → **设置（Settings）** → **构建和部署（Builds & deployments）**
→ 找到 **生产分支（Production branch）** → 改成 `main` → 保存。

改完之后，以后只要 `git push origin main` 就会直接上线生产，不用再推两个分支。
（`production` 分支可以留着不用，也可以删掉。）

---

## 1. 推送到 GitHub

```bash
git branch -M main
git remote add origin https://github.com/<你的用户名>/student-growth-archive.git
git push -u origin main
```
> 若还没有 GitHub 仓库，先去 github.com 新建一个空仓库（不要勾 README），再用上面的命令关联。

## 2. Cloudflare Pages 连接部署

1. 登录 Cloudflare 控制台 → 左侧 **Workers 和 Pages** → **创建** → 选 **Pages** → **连接到 Git**
2. 授权并选择 `student-growth-archive` 仓库
3. 构建设置：
   - Framework preset：**Vite**（或自定义）
   - Build command：`npm run build`
   - Build output directory：`dist`
4. 点击 **保存并部署**
5. 约 1 分钟后得到 `https://<项目名>.pages.dev` 域名，即可访问

## 3. 后端与数据库（D1）

后端是单文件 catch-all：`functions/api/[[path]].js`，所有接口都在里面按 `path` + `method` 分发。

- **绑定**：项目 → 设置 → **函数（Functions）** → **D1 数据库绑定**，变量名必须是 `DB`。
- **会话 KV**：另需一个 KV 命名空间绑定，变量名 `SESSIONS`（用于登录态）。
- **建表**：`homework_assignments`、`homework_records` 两张表由后端
  `ensureHomeworkTables()` 在**首次调用作业接口时自动创建**，部署时无需手工执行 SQL。
  `schema/homework-detail.sql` 是同结构的归档版本，供手工/CI 初始化使用。
- **好消息**：新表是纯增量，**不影响已有数据**；自动建表失败时接口会降级（档案仍可正常读取）。

> ⚠️ 注意：Cloudflare Pages 允许给 **Preview 和 Production 绑定不同的 D1 数据库**。
> 如果你在预览环境录入了测试数据，切到生产看不到，多半是两边绑定了不同的库。
> 想让两边数据一致，把 Production 的 D1 绑定改成和 Preview 同一个即可。

## 4. 常见坑

- **改了代码线上没变** → 最常见原因是「生产分支」问题，见第 0 节。
- **构建报 node 版本错误**：在 CF Pages 项目 **设置 → 环境变量** 添加 `NODE_VERSION = 22`（生产环境），重新部署。
- **页面空白/刷新 404**：本项目用 hash 路由（`#/student/xxx`），CF Pages 静态托管无需额外配置即可刷新。
- **图表不显示**：确认 `dist/assets/` 下的 js/css 已随构建上传（正常部署都会带上）。
- **作业管理页报「表不存在」**：确认 D1 绑定变量名是 `DB`，再随便打开一次作业管理页触发自动建表。

## 5. 验证部署是否真的生效（不用等别人告诉你）

每次部署后，可以用构建产物的文件名核对线上到底跑的是哪一版：

```bash
# 1) 本地构建，记下入口文件名（形如 index-XXXXXXXX.js）
ls dist/assets/

# 2) 拉线上 HTML，看它引用的是哪个文件名
curl -s https://<你的域名>/ | grep -o 'assets/[A-Za-z0-9_.-]*\.js'
```

两边文件名一致 = 线上已是最新；不一致 = 部署还没完成，或者你推的分支不是生产分支。

## 6. 后续接真实数据（不改前端，只改一个文件）

打开 `src/api/student.js`：
- 把 `USE_WORKER = false` 改为 `true`
- 把 `WORKER_URL` 填成你的 CF 地址
