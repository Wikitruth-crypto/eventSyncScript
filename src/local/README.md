# 本地调试/测试工具

此目录包含仅用于本地开发和调试的脚本和工具，**不应在 GitHub Actions 或生产环境中运行**。

## 目录结构

```
local/
├── decodeEventsExample.ts    # 事件解码工具
├── downloadIpfsFile.ts       # IPFS 下载测试工具
└── state/                    # 基于文件系统的状态存储（本地调试）
    ├── syncStateStore.ts     # 本地文件系统状态存储
    ├── recordStartBlockHeight.ts  # 记录起始区块高度
    └── index.ts              # 导出文件
```

## 文件说明

### `decodeEventsExample.ts`
- **用途**: 从 JSON 文件解码事件数据，用于本地调试
- **用法**: `npm run decode:events` 或 `tsx src/local/decodeEventsExample.ts`
- **功能**: 
  - 读取保存的事件 JSON 文件
  - 解码事件数据
  - 显示统计信息和解码示例
  - 保存解码后的数据到新文件

### `downloadIpfsFile.ts`
- **用途**: 测试从 IPFS 下载文件，用于本地调试
- **用法**: `npm run download:ipfs` 或 `tsx src/local/downloadIpfsFile.ts`
- **功能**:
  - 从 IPFS 下载指定 CID 的文件
  - 支持多个网关重试
  - 保存文件到本地（可选）
  - 显示文件内容

### `state/` 目录
- **用途**: 基于本地文件系统的状态存储实现（`syncState.json`）
- **说明**: 
  - 这些工具使用本地文件系统存储同步状态
  - 在生产环境中，应使用 `src/core/state/supabaseStateStore.ts`（基于 Supabase）
  - 本地调试时可以使用这些工具来测试状态存储功能

## 注意事项

⚠️ **这些工具会写入本地文件系统，不应在 CI/CD 环境中运行**

- 这些工具仅用于本地开发和调试
- 在生产环境（GitHub Actions）中：
  - 应使用 `src/scripts/fetchTruthBoxEvents.ts` 等生产脚本
  - 状态存储使用 Supabase `sync_status` 表（`src/core/state/supabaseStateStore.ts`）
  - 生产脚本通过环境变量 `EVENT_SYNC_SAVE_JSON` 控制是否保存文件，默认不保存

