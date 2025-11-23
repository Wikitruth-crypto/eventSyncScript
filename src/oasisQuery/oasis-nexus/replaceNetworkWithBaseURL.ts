import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'

const ensureTrailingSlash = (value: string) => (value.endsWith('/') ? value : `${value}/`)

const getBaseUrl = (network: 'mainnet' | 'testnet' | 'localnet') => {
  const envKey =
    network === 'mainnet'
      ? 'REACT_APP_API'
      : network === 'testnet'
        ? 'REACT_APP_TESTNET_API'
        : 'REACT_APP_LOCALNET_API'
  const value = process.env[envKey]
  if (!value) {
    throw new Error(`Missing ${envKey} environment variable for Oasis Nexus API base URL`)
  }
  return ensureTrailingSlash(value.replace(/\/+$/, ''))
}

export const replaceNetworkWithBaseURL = <T>(
  config: AxiosRequestConfig,
  requestOverrides?: AxiosRequestConfig,
): Promise<AxiosResponse<T>> => {
  if (!config.url) {
    throw new Error('Request config must include url')
  }

  if (config.url.startsWith('/mainnet/')) {
    config.url = config.url.replace('/mainnet/', getBaseUrl('mainnet'))
  } else if (config.url.startsWith('/testnet/')) {
    config.url = config.url.replace('/testnet/', getBaseUrl('testnet'))
  } else if (config.url.startsWith('/localnet/')) {
    config.url = config.url.replace('/localnet/', getBaseUrl('localnet'))
  } else {
    throw new Error(`Expected URL to be prefixed with network: ${config.url}`)
  }

  return axios({ ...config, ...requestOverrides })
}

export default replaceNetworkWithBaseURL
