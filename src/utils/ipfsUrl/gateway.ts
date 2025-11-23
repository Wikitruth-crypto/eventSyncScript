import { IPFS_GATEWAY_CONFIG, IPFS_GATEWAY_URLS } from '../../config/ipfs'
import { fetchWithProxy } from '../fetchWithProxy'

// 定义网关接口
interface Gateway {
    url: string;
    isHealthy: boolean;
    lastCheck: number;
    responseTime: number;
    failureCount: number;
}

export const network = 'https://';
export const end = '.ipfs.w3s.link/'; // 已舍弃，这是fleek的网关，已失效

// 初始化网关列表
const gateways: Gateway[] = IPFS_GATEWAY_URLS.map(url => ({
    url,
    isHealthy: true,
    lastCheck: 0,
    responseTime: 0,
    failureCount: 0,
}));

// 网关状态缓存
const gatewayCache = new Map<string, { url: string; timestamp: number }>();

/**
 * 清除网关缓存（用于强制重新选择网关）
 */
export const clearGatewayCache = () => {
    gatewayCache.clear();
};

/**
 * 检查网关健康状态
 * @param gateway 网关对象
 * @returns Promise<boolean>
 */
const checkGatewayHealth = async (gateway: Gateway): Promise<boolean> => {
    try {
        const testCid = 'bafkreieyxodax5zukwimho62kdqzelt4iythp6cy6xwahtnvw3dryouw7i';
        const startTime = Date.now();

        const response = await fetchWithProxy(
            gateway.url.replace('{cid}', testCid),
            {},
            IPFS_GATEWAY_CONFIG.TIMEOUT
        );

        if (response.ok) {
            gateway.responseTime = Date.now() - startTime;
            gateway.failureCount = 0;
            gateway.isHealthy = true;
            gateway.lastCheck = Date.now();
            return true;
        }

        gateway.failureCount++;
        if (gateway.failureCount >= IPFS_GATEWAY_CONFIG.MAX_FAILURES) {
            gateway.isHealthy = false;
        }
        gateway.lastCheck = Date.now();
        return false;
    } catch (error) {
        gateway.failureCount++;
        if (gateway.failureCount >= IPFS_GATEWAY_CONFIG.MAX_FAILURES) {
            gateway.isHealthy = false;
        }
        gateway.lastCheck = Date.now();
        return false;
    }
};

/**
 * 获取最佳网关
 * @param cid IPFS CID
 * @returns Promise<string>
 */
export const getIpfsGateway = async (cid: string): Promise<string> => {
    // 检查缓存
    const cached = gatewayCache.get(cid);
    if (cached && Date.now() - cached.timestamp < IPFS_GATEWAY_CONFIG.CACHE_DURATION) {
        return cached.url;
    }

    // 首先尝试使用第一个网关
    const primaryGateway = gateways[0];
    
    // 如果第一个网关不健康，检查其状态
    if (!primaryGateway.isHealthy) {
        const isHealthy = await checkGatewayHealth(primaryGateway);
        if (isHealthy) {
            const gatewayUrl = primaryGateway.url.replace('{cid}', cid);
            gatewayCache.set(cid, {
                url: gatewayUrl,
                timestamp: Date.now(),
            });
            return gatewayUrl;
        }
    } else {
        // 如果第一个网关健康，直接使用
        const gatewayUrl = primaryGateway.url.replace('{cid}', cid);
        gatewayCache.set(cid, {
            url: gatewayUrl,
            timestamp: Date.now(),
        });
        return gatewayUrl;
    }

    // 如果第一个网关不可用，尝试其他网关
    const backupGateways = gateways.slice(1);
    const healthyBackupGateways = backupGateways.filter(g => g.isHealthy);

    // 如果没有健康的备用网关，尝试重新检查所有备用网关
    if (healthyBackupGateways.length === 0) {
        await Promise.all(backupGateways.map(checkGatewayHealth));
    }

    // 按响应时间排序
    const sortedGateways = [...backupGateways]
        .filter(g => g.isHealthy)
        .sort((a, b) => a.responseTime - b.responseTime);

    if (sortedGateways.length === 0) {
        throw new Error('No healthy gateways available');
    }

    const selectedGateway = sortedGateways[0];
    const gatewayUrl = selectedGateway.url.replace('{cid}', cid);

    // 更新缓存
    gatewayCache.set(cid, {
        url: gatewayUrl,
        timestamp: Date.now(),
    });

    return gatewayUrl;
};

/**
 * 定期检查所有网关的健康状态
 */
// const startHealthCheck = () => {
//     setInterval(async () => {
//         await Promise.all(gateways.map(checkGatewayHealth));
//     }, GATEWAY_CONFIG.HEALTH_CHECK_INTERVAL);
// };

// // 启动健康检查
// startHealthCheck();

/**
 * 强制刷新网关状态
 */
export const refreshGatewayStatus = async () => {
    await Promise.all(gateways.map(checkGatewayHealth));
};

/**
 * 获取当前网关状态
 */
export const getGatewayStatus = () => {
    return gateways.map(g => ({
        url: g.url,
        isHealthy: g.isHealthy,
        responseTime: g.responseTime,
        failureCount: g.failureCount,
        lastCheck: g.lastCheck,
    }));
};