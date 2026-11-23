# USY Studio

Electron + React + Ant Design 课程桌面项目。

## 运行

```powershell
git clone https://github.com/Lain006/usy-project-studio.git
cd usy-project-studio
npm ci
npm run dev
```

使用 Node.js 22.12+（推荐 24 LTS）和 npm；本机验收环境为 Windows 11 / Node.js 26。仓库公开供课程审阅，也可以下载仓库 ZIP，解压后在项目目录执行 `npm ci` 和 `npm run dev`。

首次安装需要下载 Electron 运行时。若下载超时，可在 PowerShell 设置 `$env:ELECTRON_MIRROR = 'https://npmmirror.com/mirrors/electron/'` 后重试 `npm ci`。使用已有 HTTP/HTTPS 代理且 Node.js 为 24.5+ 时，可设置 `$env:NODE_USE_ENV_PROXY = '1'` 让 Node 下载器使用现有代理配置；无需修改系统网络设置。

## 目录

界面代码在 `src/renderer/src`：

- `App.jsx`：布局、共享项目/任务状态和异步保存状态。
- `App.css`：截图对应的布局样式。
- `components/Sidebar.jsx`：左侧导航。
- `pages/Dashboard.jsx`、`Projects.jsx`、`Tasks.jsx`：三个基础页面。
- `assets/logo.png`、`logo1.png`、`pic2.png`：用户提供的图片原文件。

默认进入工作台首页，三页保留紧凑浅色布局。支持项目创建、编辑、删除，以及任务添加（按钮或回车）、勾选和删除，统计同步更新。编辑保留项目 ID、创建日期及全部任务；删除会再次确认，只删除应用记录，不操作磁盘文件夹。

桌面版通过 `src/preload/index.js` 暴露固定 IPC 接口，由 `src/main/index.js` 选择/打开本地目录。新建和编辑共用表单，可关联目录；路径不存在时给出错误提示。标题、窗口图标及 Windows 安装程序使用 USY Studio 标识。

桌面数据由 `src/main/project-store.mjs` 保存到 Electron `app.getPath('userData')/usy-data.json`（常见路径为 `%APPDATA%/usy-project-studio/usy-data.json`）。采用串行写入及临时文件替换，关闭窗口前等待已经排队的文件操作。首次无文件时，仅迁移当前应用来源的旧 localStorage（键 `usy-project-studio:projects`），保留旧记录；没有旧记录则为空项目。开发服务与构建程序的旧 localStorage 不保证共享，不自动扫描其他来源或电脑。`data.js` 的历史样例只供参考，不再自动加载。

坏文件暂停编辑及自动保存，支持下载原记录；恢复时先在文件旁生成唯一 `.recovery-*.bak` 再重置。保存失败持续提示并可重试。普通浏览器预览仍使用 localStorage，原生目录按钮不可用。换电脑或清除应用数据不会保留记录。

## 检查与构建

```powershell
npm run lint
npm run build
```

`npm run build` 生成运行代码，不生成安装包。Windows 安装包命令为 `npm run build:win`。

当前 Windows 构建复用 `node_modules/electron/dist`，避免重复下载运行时；构建需要已有完整的 Electron 安装。安装包输出为 `dist/usy-project-studio-1.0.0-setup.exe`，免安装目录为 `dist/win-unpacked/`，需保留整个目录。安装包未配置代码签名。

原生数据测试：`npm test`。构建后运行 `npm run test:electron` 检查真实 Electron，`npm run test:ui` 检查浏览器预览（需安装 Chrome/Edge，或设置 `CHROME_PATH`）。CDP 辅助模块已包含在 `docs/lib/`，无需安装 Codex 或配置本机技能路径。浏览器测试自动启动仅监听本机的预览服务并在结束后关闭。

Windows 打包产物可在 PowerShell 设置 `$env:USY_QA_EXECUTABLE = (Resolve-Path 'dist/win-unpacked/usy-project-studio.exe').Path`，再执行 `npm run test:electron`。测试输出位于 `docs/evidence/`；所有测试使用隔离目录，不访问真实用户项目。历史 `verify-office-*` 和 `verify-compact-electron.mjs` 对应早期版本，仅保留作开发参考，当前验收以以上三个 npm 命令为准。

## GitHub 完整性与隐私边界

仓库保留全部运行源码、原始图片/图标、依赖锁文件、构建与编辑器配置、当前验收脚本和项目说明。`npm ci` 安装与锁文件一致的依赖，`npm run build:win` 重新生成本机同功能的 Windows 应用。不同机器的安装包字节和签名可能不同，功能与源码以提交版本为准。

排除 `node_modules/`、`out/`、`dist/` 等可生成目录，以及开发截图、历史备份、缓存、个人 `MEMORY.md`、环境凭据和真实项目数据库。应用内已保存的项目/任务属于个人数据，不随源码上传，克隆后首次启动为空。原校徽与课程图片保留用于还原课程界面，相关素材权利归原权利人。

本次课程要求区分见 `docs/COURSE-2026-11-16.md`；最新验证结果和限制见 `docs/VERIFICATION.md` 的 2026-11-23 节。
