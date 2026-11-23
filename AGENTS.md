# 项目约定

- Electron + React JavaScript 课程项目，包名 `usy-project-studio`。
- 界面代码在 `src/renderer/src`；主进程 `src/main` 和预加载 `src/preload` 按 11 月 16 日课程任务提供固定 IPC：原生目录操作及本地 JSON 持久化。共用校验位于 `src/shared/projects.mjs`。
- 保留已有三页紧凑浅色设计；老师的截图用于核对功能，不照搬样式，不添加未要求的业务功能。
- `npm run dev` 启动桌面开发窗口；`npm run build` 构建；`npm run lint` 检查代码。
- 修改后验证构建、代码检查及相关界面交互。禁止记录凭据。
- 原生数据验收 `node docs/verify-native-store.mjs`、`node docs/verify-native-electron.mjs`；测试使用隔离目录。安装包 `npm run build:win`，输出 `dist/`。打包文件只允许应用产物与必要运行依赖，不包含 docs、历史备份或 out 下的测试配置。
