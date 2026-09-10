# 部署指南：GitHub + Cloudflare Pages

本项目是用 Vue3 + Vite + ECharts 构建的纯前端应用，已通过本地 `npm run build` 验证。
下面把代码推到 GitHub，再用 Cloudflare Pages 连接仓库自动部署。

## 1. 推送到 GitHub
（在 student-growth-archive 目录已 git init 并提交，按自己账号操作）

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

## 3. 常见坑
- **构建报 node 版本错误**：在 CF Pages 项目 **设置 → 环境变量** 添加 `NODE_VERSION = 22`（生产环境），重新部署。
- **页面空白/刷新 404**：本项目已用 hash 路由（`#/student/xxx`），CF Pages 静态托管无需额外配置即可刷新。
- **图表不显示**：确认 `dist/assets/` 下的 js/css 已随构建上传（正常部署都会带上）。

## 4. 后续接真实数据（不改前端，只改一个文件）
打开 `src/api/student.js`：
- 把 `USE_WORKER = false` 改为 `true`
- 把 `WORKER_URL` 填成你的 CF Workers 地址
- Workers 端返回与 mock（见 `src/data/mock.js` 结构）一致的数据即可
前端所有页面无需改动。
