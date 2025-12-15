
import { config } from 'dotenv'
import path from 'node:path'

export const loadEnv = () => {
  const envDir = process.cwd()

  // First load .env (public configuration, can be committed to repository)
  // If file doesn't exist, dotenv will silently ignore
  const envResult = config({ path: path.join(envDir, '.env') })
  if (envResult.error) {
    const error = envResult.error as NodeJS.ErrnoException
    if (error.code !== 'ENOENT') {
      console.warn('⚠️  Error loading .env file:', error.message)
    }
  }

  // Then load .env.local (local configuration, not committed, overrides same-named config in .env)
  // If file doesn't exist, dotenv will silently ignore (this is normal, as .env.local is optional)
  const localResult = config({ path: path.join(envDir, '.env.local'), override: true })
  if (localResult.error) {
    const error = localResult.error as NodeJS.ErrnoException
    if (error.code !== 'ENOENT') {
      console.warn('⚠️  Error loading .env.local file:', error.message)
    }
  }
}

// Automatically execute when module loads
loadEnv()

