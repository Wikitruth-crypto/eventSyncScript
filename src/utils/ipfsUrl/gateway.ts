import { IPFS_GATEWAY_CONFIG, IPFS_GATEWAY_URLS } from '../../config/ipfs'
import { fetchWithProxy } from '../fetchWithProxy'

interface Gateway {
    url: string;
    isHealthy: boolean;
    lastCheck: number;
    responseTime: number;
    failureCount: number;
}

export const network = 'https://';
export const end = '.ipfs.w3s.link/'; // This is the gateway of fleek, which is no longer available

// Initialize gateway list
const gateways: Gateway[] = IPFS_GATEWAY_URLS.map(url => ({
    url,
    isHealthy: true,
    lastCheck: 0,
    responseTime: 0,
    failureCount: 0,
}));

const gatewayCache = new Map<string, { url: string; timestamp: number }>();

/**
 * Clear gateway cache (used to force re-selection of gateway)
 */
export const clearGatewayCache = () => {
    gatewayCache.clear();
};

/**
 * Check gateway health status
 * @param gateway gateway object
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
 * Get the best gateway
 * @param cid IPFS CID
 * @returns Promise<string>
 */
export const getIpfsGateway = async (cid: string): Promise<string> => {
    // Check cache
    const cached = gatewayCache.get(cid);
    if (cached && Date.now() - cached.timestamp < IPFS_GATEWAY_CONFIG.CACHE_DURATION) {
        return cached.url;
    }

    // First try using the first gateway
    const primaryGateway = gateways[0];
    
    // If the first gateway is not healthy, check its status
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
        // If the first gateway is healthy, use it directly
        const gatewayUrl = primaryGateway.url.replace('{cid}', cid);
        gatewayCache.set(cid, {
            url: gatewayUrl,
            timestamp: Date.now(),
        });
        return gatewayUrl;
    }

    // If the first gateway is not available, try other gateways
    const backupGateways = gateways.slice(1);
    const healthyBackupGateways = backupGateways.filter(g => g.isHealthy);

    // If there are no healthy backup gateways, try to re-check all backup gateways
    if (healthyBackupGateways.length === 0) {
        await Promise.all(backupGateways.map(checkGatewayHealth));
    }

    // Sort by response time
    const sortedGateways = [...backupGateways]
        .filter(g => g.isHealthy)
        .sort((a, b) => a.responseTime - b.responseTime);

    if (sortedGateways.length === 0) {
        throw new Error('No healthy gateways available');
    }

    const selectedGateway = sortedGateways[0];
    const gatewayUrl = selectedGateway.url.replace('{cid}', cid);

    // Update cache
    gatewayCache.set(cid, {
        url: gatewayUrl,
        timestamp: Date.now(),
    });

    return gatewayUrl;
};

/**
 * Periodically check the health status of all gateways
 */
// const startHealthCheck = () => {
//     setInterval(async () => {
//         await Promise.all(gateways.map(checkGatewayHealth));
//     }, GATEWAY_CONFIG.HEALTH_CHECK_INTERVAL);
// };

// // Start health check
// startHealthCheck();

/**
 * Force refresh gateway status
 */
export const refreshGatewayStatus = async () => {
    await Promise.all(gateways.map(checkGatewayHealth));
};

/**
 * Get current gateway status
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