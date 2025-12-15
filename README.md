# WikiTruth Event Sync Script

Blockchain event synchronization script for syncing event data from Oasis Network to Supabase database.

## Features

- ✅ Supports event synchronization for multiple contracts (TruthBox, TruthNFT, Exchange, FundManager, UserId)
- ✅ Incremental synchronization with automatic progress tracking
- ✅ Automatic IPFS metadata fetching
- ✅ Supports proxy mode (local development) and direct connection mode (GitHub Actions)
- ✅ Complete error handling and logging

## Quick Start

### Local Development

1. **Install Dependencies**
   ```bash
   cd eventSyncScript
   npm install
   ```

2. **Configure Environment Variables**
   ```bash
   # Copy public configuration template
   cp .env.example .env
   
   # Create local configuration file (contains sensitive information)
   cp .env.example .env.local
   # Edit .env.local file and fill in Supabase configuration:
   # - SUPABASE_URL
   # - SUPABASE_ANON_KEY
   # - SUPABASE_SERVICE_ROLE_KEY
   ```
   
   **Note**:
   - `.env` file contains public configuration and can be committed to the repository
   - `.env.local` file contains sensitive information (Supabase configuration) and will not be committed
   - Configuration in `.env.local` will override same-named configuration in `.env`

3. **Run Script**
   ```bash
   npm start
   ```

### GitHub Actions Deployment

1. **Configure GitHub Secrets**
   - Go to repository settings: `Settings` > `Secrets and variables` > `Actions`
   - Add the following Secrets:
     - `SUPABASE_URL`: Supabase project URL
     - `SUPABASE_SERVICE_ROLE_KEY`: Supabase Service Role Key

2. **Workflow Runs Automatically**
   - Scheduled trigger: Every 5 minutes
   - Manual trigger: Click "Run workflow" on the GitHub Actions page

## Environment Variable Configuration

### File Structure

The project supports two types of environment variable files:

1. **`.env`** - Public configuration, **can be committed to repository**
   - Contains public configuration for event sync script
   - Does not contain sensitive information
   - Example: `.env.example` (template file)

2. **`.env.local`** - Local configuration, **not committed to repository**
   - Contains sensitive information such as Supabase credentials
   - Overrides same-named configuration in `.env`
   - Already added to `.gitignore`

### Configuration Priority

Environment variable loading priority (from highest to lowest):
1. `.env.local` file (local configuration, overrides other configurations)
2. `.env` file (public configuration)
3. System environment variables

### Required Configuration (place in `.env.local`)

- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase Service Role Key

### Optional Configuration (can be placed in `.env` or `.env.local`)

- `EVENT_SYNC_USE_PROXY`: Whether to use proxy (`true`/`1` to enable, disabled by default)
- `EVENT_SYNC_SAVE_JSON`: Whether to save JSON files (`true`/`1` to enable, disabled by default)
- `EVENT_SYNC_FROM_BLOCK`: Specify starting block height
- `EVENT_SYNC_LIMIT`: Limit on number of events per query
- `EVENT_SYNC_BATCH_SIZE`: Batch size
- `HTTP_PROXY`: HTTP proxy address (used when proxy is enabled)
- `HTTPS_PROXY`: HTTPS proxy address (used when proxy is enabled)

## Development Tools

### Local Debugging Tools

Located in `src/local/` directory:

- `decodeEventsExample.ts` - Event decoding example
- `downloadIpfsFile.ts` - IPFS file download tool

Run with:
```bash
npm run decode:events
npm run download:ipfs
```

## Troubleshooting

### Common Issues

1. **Proxy Connection Failed**
   - Check `EVENT_SYNC_USE_PROXY` setting
   - Verify `HTTP_PROXY` or `HTTPS_PROXY` configuration is correct

2. **Supabase Connection Failed**
   - Check if `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct
   - Verify Supabase project status is normal

3. **Sync Progress Not Updating**
   - Check if `sync_status` table is updated correctly
   - Check logs to confirm if there are any errors

## License

[According to project license]

