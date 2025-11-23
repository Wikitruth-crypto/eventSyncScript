# WikiTruth Event Sync Script

区块链事件同步脚本，用于将 Oasis Network 上的事件数据同步到 Supabase 数据库。

## 功能特性

- ✅ 支持多个合约的事件同步（TruthBox、TruthNFT、Exchange、FundManager、UserId）
- ✅ 增量同步，自动记录同步进度
- ✅ IPFS 元数据自动获取
- ✅ 支持代理模式（本地开发）和直连模式（GitHub Actions）
- ✅ 完整的错误处理和日志记录

## 快速开始

### 本地开发

1. **安装依赖**
   ```bash
   cd eventSyncScript
   npm install
   ```

2. **配置环境变量**
   ```bash
   # 复制公共配置模板
   cp .env.example .env
   
   # 创建本地配置文件（包含敏感信息）
   cp .env.example .env.local
   # 编辑 .env.local 文件，填入 Supabase 配置：
   # - SUPABASE_URL
   # - SUPABASE_ANON_KEY
   # - SUPABASE_SERVICE_ROLE_KEY
   ```
   
   **注意**：
   - `.env` 文件包含公共配置，可以提交到仓库
   - `.env.local` 文件包含敏感信息（Supabase 配置），不会提交到仓库
   - `.env.local` 中的配置会覆盖 `.env` 中的同名配置

3. **运行脚本**
   ```bash
   npm start
   ```

### GitHub Actions 部署

1. **配置 GitHub Secrets**
   - 进入仓库设置：`Settings` > `Secrets and variables` > `Actions`
   - 添加以下 Secrets：
     - `SUPABASE_URL`: Supabase 项目 URL
     - `SUPABASE_SERVICE_ROLE_KEY`: Supabase Service Role Key

2. **工作流会自动运行**
   - 定时触发：每小时整点（UTC 时间）
   - 手动触发：在 GitHub Actions 页面点击 "Run workflow"

## 环境变量配置

### 文件结构

项目支持两种环境变量文件：

1. **`.env`** - 公共配置，**可以提交到仓库**
   - 包含事件同步脚本的公共配置
   - 不包含敏感信息
   - 示例：`.env.example`（模板文件）

2. **`.env.local`** - 本地配置，**不提交到仓库**
   - 包含 Supabase 等敏感信息
   - 会覆盖 `.env` 中的同名配置
   - 已添加到 `.gitignore`

### 配置优先级

环境变量的加载优先级（从高到低）：
1. `.env.local` 文件（本地配置，覆盖其他配置）
2. `.env` 文件（公共配置）
3. 系统环境变量

### 必需配置（放在 `.env.local`）

- `SUPABASE_URL`: Supabase 项目 URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase Service Role Key

### 可选配置（可以放在 `.env` 或 `.env.local`）

- `EVENT_SYNC_USE_PROXY`: 是否使用代理（`true`/`1` 启用，默认禁用）
- `EVENT_SYNC_SAVE_JSON`: 是否保存 JSON 文件（`true`/`1` 启用，默认禁用）
- `EVENT_SYNC_FROM_BLOCK`: 指定起始区块高度
- `EVENT_SYNC_LIMIT`: 每次查询的事件数量限制
- `EVENT_SYNC_BATCH_SIZE`: 批次大小
- `HTTP_PROXY`: HTTP 代理地址（启用代理时使用）
- `HTTPS_PROXY`: HTTPS 代理地址（启用代理时使用）

## 项目结构

```
eventSyncScript/
├── src/
│   ├── config/              # 配置文件
│   ├── contractsConfig/     # 合约配置
│   ├── core/                # 核心逻辑
│   │   ├── events/          # 事件获取
│   │   ├── state/           # 状态管理
│   │   └── sync/            # 同步逻辑
│   ├── scripts/             # 各合约的 fetch 脚本
│   ├── services/            # 服务层
│   │   ├── ipfs/           # IPFS 元数据获取
│   │   └── supabase/       # Supabase 数据写入
│   ├── utils/              # 工具函数
│   └── index.ts            # 入口文件
├── .github/workflows/      # GitHub Actions 工作流
└── package.json
```

## 支持的合约和事件

### TruthBox
- `BoxCreated` - 创建 Box 记录和元数据
- `BoxStatusChanged` - 更新 Box 状态
- `PriceChanged` - 更新价格
- `DeadlineChanged` - 更新截止时间
- `PrivateKeyPublished` - 更新私钥

### TruthNFT
- `Transfer` - 更新 Box 的 owner_address

### Exchange
- `BoxListed` - 更新上架信息
- `BoxPurchased` - 更新购买信息
- `BidPlaced` - 记录竞标者
- `CompleterAssigned` - 更新完成者信息
- `RequestDeadlineChanged` - 更新退款截止时间
- `ReviewDeadlineChanged` - 更新审核截止时间
- `RefundPermitChanged` - 更新退款权限

### FundManager
- `OrderAmountPaid` - 记录支付
- `OrderAmountWithdraw` - 记录提取
- `RewardAmountAdded` - 记录奖励添加
- `HelperRewrdsWithdraw` - 记录 Helper 奖励提取
- `MinterRewardsWithdraw` - 记录 Minter 奖励提取

### UserId
- `Blacklist` - 更新用户黑名单状态

## 开发工具

### 本地调试工具

位于 `src/local/` 目录：

- `decodeEventsExample.ts` - 解码事件示例
- `downloadIpfsFile.ts` - IPFS 文件下载工具

运行方式：
```bash
npm run decode:events
npm run download:ipfs
```

## 故障排查

### 常见问题

1. **代理连接失败**
   - 检查 `EVENT_SYNC_USE_PROXY` 设置
   - 确认 `HTTP_PROXY` 或 `HTTPS_PROXY` 配置正确

2. **Supabase 连接失败**
   - 检查 `SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY` 是否正确
   - 确认 Supabase 项目状态正常

3. **同步进度不更新**
   - 检查 `sync_status` 表是否正确更新
   - 查看日志确认是否有错误

## 许可证

[根据项目许可证]

