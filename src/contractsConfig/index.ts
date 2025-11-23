/**
 * 合约配置模块统一导出
 * 简化版本 - 仅用于 eventSyncScript
 * 
 * 提供：
 * - 合约地址配置（按网络）
 * - 事件签名配置（按合约）
 */

// 导出合约地址配置
export * from './contracts';

// 导出事件签名配置
export * from './eventSignatures';

// 导出类型
export * from './types';

