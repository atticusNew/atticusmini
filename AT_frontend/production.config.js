// Production Configuration for Atticus Bitcoin Options Trading Platform
// This configuration is used for mainnet deployment with real Bitcoin integration

export const productionConfig = {
  // ICP Network Configuration
  network: {
    environment: 'production',
    dfxNetwork: 'ic',
    internetIdentityUrl: 'https://identity.ic0.app',
    enableInternetIdentity: true
  },

  // Bitcoin Network Configuration
  bitcoin: {
    network: 'mainnet',
    blockstreamApi: 'https://blockstream.info/api',
    mempoolApi: 'https://mempool.space/api',
    confirmationBlocks: 6,
    feeRate: 10, // satoshis per byte
    enableRealBitcoin: true
  },

  // Platform Configuration
  platform: {
    name: 'Atticus',
    version: '1.0.0',
    domain: 'atticusmini.com',
    walletAddress: 'bc1q9t8fk860xk7hgwggjf8hqdnz0zwtakne6cv5h0n85s0jhzkvxc4qmx3fn0',
    minTradeAmount: 0.0001,
    maxTradeAmount: 1.0,
    defaultExpiryTimes: ['5s', '10s', '15s'],
    defaultStrikeRanges: [5, 10, 25, 50]
  },

  // Security Configuration
  security: {
    requireAuthentication: true,
    enableBitcoinTransactions: true,
    enableRealSettlements: true,
    platformWalletBalanceAlert: 0.1,
    platformWalletMinBalance: 0.01,
    settlementFeeRate: 0.001
  },

  // API Configuration
  api: {
    coinbaseWsUrl: 'wss://ws-feed.pro.coinbase.com',
    coinbaseApiUrl: 'https://api.coinbase.com/v2',
    bitcoinRpcUrl: 'https://blockstream.info/api'
  },

  // Monitoring Configuration
  monitoring: {
    enableAnalytics: true,
    logLevel: 'info',
    enableErrorReporting: true
  },

  // Production Warnings
  warnings: {
    realMoney: true,
    mainnetDeployment: true,
    bitcoinIntegration: true
  }
};

export default productionConfig;


