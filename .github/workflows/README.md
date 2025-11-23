# GitHub Actions 工作流配置

## Event Sync 工作流

### 概述

`event-sync.yml` 工作流用于定期同步区块链事件数据到 Supabase 数据库。

### 触发条件

1. **定时触发**：每5分钟（UTC 时间）自动运行
2. **手动触发**：可以在 GitHub Actions 页面手动触发
3. **代码推送**：当 `eventSyncScript/` 目录或工作流文件发生变化时触发

### 所需 Secrets

在 GitHub 仓库设置中添加以下 Secrets：

- `SUPABASE_URL`: Supabase 项目 URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase Service Role Key（用于写入数据库）

### 配置步骤

1. 进入 GitHub 仓库设置页面
2. 导航到 `Settings` > `Secrets and variables` > `Actions`
3. 点击 `New repository secret` 添加以下 secrets：
   - `SUPABASE_URL`: 你的 Supabase 项目 URL
   - `SUPABASE_SERVICE_ROLE_KEY`: 你的 Supabase Service Role Key

### 环境变量

工作流中已配置以下环境变量：

- `EVENT_SYNC_USE_PROXY=false`: 禁用代理（GitHub Actions 中不需要）
- `EVENT_SYNC_SAVE_JSON=false`: 不保存 JSON 文件（节省存储空间）

可选环境变量（可通过 GitHub Secrets 配置）：

- `EVENT_SYNC_FROM_BLOCK`: 指定起始区块高度
- `EVENT_SYNC_LIMIT`: 每次查询的事件数量限制
- `EVENT_SYNC_BATCH_SIZE`: 批次大小

### 监控和调试

- 工作流运行日志可以在 GitHub Actions 页面查看
- 如果运行失败，日志文件会自动上传为 artifact
- 检查 Supabase 数据库中的 `sync_status` 表来查看同步状态

### 注意事项

- 确保 Supabase 数据库已正确配置并包含所有必要的表
- 工作流使用 Node.js 18.18.0，确保与本地开发环境一致
- 定时任务使用 UTC 时间，每5分钟运行一次
- 注意：GitHub Actions 的免费额度有限，频繁运行可能消耗较多 Actions 分钟数

