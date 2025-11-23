/**
 * 环境变量加载配置
 * 支持加载 .env 和 .env.local 文件
 * .env.local 中的配置会覆盖 .env 中的同名配置
 * 
 * 优先级：.env.local > .env > 系统环境变量
 */

import { config } from 'dotenv'
import path from 'node:path'

/**
 * 加载环境变量
 * 优先级：.env.local > .env > 系统环境变量
 */
export const loadEnv = () => {
  const envDir = process.cwd()

  // 先加载 .env（公共配置，可以提交到仓库）
  // 如果文件不存在，dotenv 会静默忽略
  const envResult = config({ path: path.join(envDir, '.env') })
  if (envResult.error) {
    const error = envResult.error as NodeJS.ErrnoException
    if (error.code !== 'ENOENT') {
      console.warn('⚠️  加载 .env 文件时出错:', error.message)
    }
  }

  // 再加载 .env.local（本地配置，不提交到仓库，会覆盖 .env 中的同名配置）
  // 如果文件不存在，dotenv 会静默忽略（这是正常的，因为 .env.local 是可选的）
  const localResult = config({ path: path.join(envDir, '.env.local'), override: true })
  if (localResult.error) {
    const error = localResult.error as NodeJS.ErrnoException
    if (error.code !== 'ENOENT') {
      console.warn('⚠️  加载 .env.local 文件时出错:', error.message)
    }
  }
}

// 在模块加载时自动执行
loadEnv()

