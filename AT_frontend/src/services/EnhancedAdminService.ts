/**
 * ✅ ENHANCED ADMIN SERVICE
 * Simplifies admin console data fetching with better error handling
 * Preserves existing functionality while improving reliability
 */

export interface PlatformMetrics {
  wallet: {
    balance: number;
    totalDeposits: number;
    totalWithdrawals: number;
  };
  ledger: {
    totalWinningTrades: number;
    totalLosingTrades: number;
    netPnl: number;
    totalTrades: number;
  };
  tradingSummary: {
    totalVolume: number;
    totalPnL: number;
    totalTrades: number;
    winRate: number;
  };
  blockchainBalance: number | null;
  lastUpdated: number;
}

export interface UserMetrics {
  principal: string;
  balance: number;
  totalWins: number;
  totalLosses: number;
  netPnl: number;
  totalDeposits: number;
  totalWithdrawals: number;
  createdAt: number;
}

export interface AdminData {
  platformMetrics: PlatformMetrics | null;
  userMetrics: UserMetrics[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: number;
}

export class EnhancedAdminService {
  private static instance: EnhancedAdminService;
  private atticusService: any = null;
  private treasuryService: any = null;
  private isConnected: boolean = false;
  private data: AdminData = {
    platformMetrics: null,
    userMetrics: [],
    isLoading: false,
    error: null,
    lastUpdated: 0
  };
  private listeners: Array<(data: AdminData) => void> = [];
  private refreshInterval: NodeJS.Timeout | null = null;
  private platformAddress: string = 'bc1q9t8fk860xk7hgwggjf8hqdnz0zwtakne6cv5h0n85s0jhzkvxc4qmx3fn0';

  private constructor() {
    // Private constructor for singleton
  }

  public static getInstance(): EnhancedAdminService {
    if (!EnhancedAdminService.instance) {
      EnhancedAdminService.instance = new EnhancedAdminService();
    }
    return EnhancedAdminService.instance;
  }

  /**
   * ✅ INITIALIZE SERVICE
   * Set up services and start real-time updates
   */
  public initialize(services: {
    atticusService: any;
    treasuryService: any;
    isConnected: boolean;
  }): void {
    this.atticusService = services.atticusService;
    this.treasuryService = services.treasuryService;
    this.isConnected = services.isConnected;

    console.log('🔄 EnhancedAdminService initialized');
    
    // Start real-time updates if connected
    if (this.isConnected) {
      this.startRealTimeUpdates();
    }
  }

  /**
   * ✅ GET CURRENT DATA
   * Returns current admin data
   */
  public getCurrentData(): AdminData {
    return { ...this.data };
  }

  /**
   * ✅ FETCH PLATFORM METRICS
   * Enhanced platform data fetching with better error handling
   */
  public async fetchPlatformMetrics(): Promise<PlatformMetrics | null> {
    if (!this.atticusService || !this.treasuryService) {
      console.warn('Services not available for platform metrics');
      return null;
    }

    try {
      console.log('🔄 Fetching platform metrics...');
      
      // Fetch all platform data in parallel
      const [wallet, ledger, tradingSummary, blockchainBalance] = await Promise.allSettled([
        this.atticusService.getPlatformWallet(),
        this.atticusService.getPlatformLedger(),
        this.atticusService.getPlatformTradingSummary(),
        this.fetchBlockchainBalance()
      ]);

      const platformMetrics: PlatformMetrics = {
        wallet: wallet.status === 'fulfilled' ? {
          balance: Number(wallet.value.balance) || 0,
          totalDeposits: Number(wallet.value.totalDeposits) || 0,
          totalWithdrawals: Number(wallet.value.totalWithdrawals) || 0
        } : { balance: 0, totalDeposits: 0, totalWithdrawals: 0 },
        
        ledger: ledger.status === 'fulfilled' ? {
          totalWinningTrades: Number(ledger.value.totalWinningTrades) || 0,
          totalLosingTrades: Number(ledger.value.totalLosingTrades) || 0,
          netPnl: Number(ledger.value.netPnl) || 0,
          totalTrades: Number(ledger.value.totalTrades) || 0
        } : { totalWinningTrades: 0, totalLosingTrades: 0, netPnl: 0, totalTrades: 0 },
        
        tradingSummary: tradingSummary.status === 'fulfilled' ? {
          totalVolume: Number(tradingSummary.value.totalVolume) || 0,
          totalPnL: Number(tradingSummary.value.totalPnL) || 0,
          totalTrades: Number(tradingSummary.value.totalTrades) || 0,
          winRate: Number(tradingSummary.value.winRate) || 0
        } : { totalVolume: 0, totalPnL: 0, totalTrades: 0, winRate: 0 },
        
        blockchainBalance: blockchainBalance.status === 'fulfilled' ? blockchainBalance.value : null,
        lastUpdated: Date.now()
      };

      console.log('✅ Platform metrics fetched successfully');
      return platformMetrics;
    } catch (error) {
      console.error('❌ Error fetching platform metrics:', error);
      return null;
    }
  }

  /**
   * ✅ FETCH USER METRICS
   * Enhanced user data fetching with better error handling
   */
  public async fetchUserMetrics(): Promise<UserMetrics[]> {
    if (!this.atticusService) {
      console.warn('Atticus service not available for user metrics');
      return [];
    }

    try {
      console.log('🔄 Fetching user metrics...');
      
      const allUsers = await this.atticusService.getAllUsers();
      
      const userMetrics: UserMetrics[] = allUsers.map((user: any) => ({
        principal: user.principal,
        balance: Number(user.balance) || 0,
        totalWins: Number(user.totalWins) || 0,
        totalLosses: Number(user.totalLosses) || 0,
        netPnl: Number(user.netPnl) || 0,
        totalDeposits: Number(user.totalDeposits) || 0,
        totalWithdrawals: Number(user.totalWithdrawals) || 0,
        createdAt: Number(user.createdAt) || 0
      }));

      console.log('✅ User metrics fetched successfully:', userMetrics.length, 'users');
      return userMetrics;
    } catch (error) {
      console.error('❌ Error fetching user metrics:', error);
      return [];
    }
  }

  /**
   * ✅ FETCH ALL ADMIN DATA
   * Fetch both platform and user metrics
   */
  public async fetchAllData(): Promise<boolean> {
    this.data.isLoading = true;
    this.data.error = null;
    this.notifyListeners();

    try {
      console.log('🔄 Fetching all admin data...');
      
      // Fetch platform and user data in parallel
      const [platformMetrics, userMetrics] = await Promise.allSettled([
        this.fetchPlatformMetrics(),
        this.fetchUserMetrics()
      ]);

      // Update data
      this.data.platformMetrics = platformMetrics.status === 'fulfilled' ? platformMetrics.value : null;
      this.data.userMetrics = userMetrics.status === 'fulfilled' ? userMetrics.value : [];
      this.data.lastUpdated = Date.now();
      this.data.isLoading = false;

      // Check for errors
      if (platformMetrics.status === 'rejected') {
        this.data.error = 'Failed to fetch platform metrics';
      } else if (userMetrics.status === 'rejected') {
        this.data.error = 'Failed to fetch user metrics';
      }

      console.log('✅ All admin data fetched successfully');
      this.notifyListeners();
      return true;
    } catch (error) {
      console.error('❌ Error fetching admin data:', error);
      this.data.error = error instanceof Error ? error.message : 'Unknown error';
      this.data.isLoading = false;
      this.notifyListeners();
      return false;
    }
  }

  /**
   * ✅ FETCH BLOCKCHAIN BALANCE
   * Get real Bitcoin balance from blockchain
   */
  private async fetchBlockchainBalance(): Promise<number | null> {
    try {
      const corsProxy = 'https://api.allorigins.win/raw?url=';
      const apiUrls = [
        `${corsProxy}${encodeURIComponent(`https://blockstream.info/api/address/${this.platformAddress}`)}`,
        `${corsProxy}${encodeURIComponent(`https://mempool.space/api/address/${this.platformAddress}`)}`,
        `https://blockstream.info/api/address/${this.platformAddress}`,
        `https://mempool.space/api/address/${this.platformAddress}`
      ];

      for (const url of apiUrls) {
        try {
          const response = await fetch(url, { 
            method: 'GET',
            headers: { 'Accept': 'application/json' }
          });
          
          if (!response.ok) continue;
          
          const data = await response.json();
          
          if (data.chain_stats) {
            const balanceSatoshis = data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum;
            const balanceBTC = balanceSatoshis / 100000000;
            return balanceBTC;
          }
        } catch (error) {
          console.log('Trying next API...');
          continue;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Failed to fetch blockchain balance:', error);
      return null;
    }
  }

  /**
   * ✅ START REAL-TIME UPDATES
   * Begin automatic data updates
   */
  private startRealTimeUpdates(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    // Refresh every 60 seconds
    this.refreshInterval = setInterval(async () => {
      if (this.isConnected) {
        await this.fetchAllData();
      }
    }, 60000);

    console.log('🔄 Started real-time admin updates');
  }

  /**
   * ✅ STOP REAL-TIME UPDATES
   * Stop automatic data updates
   */
  public stopRealTimeUpdates(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    console.log('⏹️ Stopped real-time admin updates');
  }

  /**
   * ✅ ADD DATA LISTENER
   * Subscribe to data updates
   */
  public addDataListener(callback: (data: AdminData) => void): void {
    this.listeners.push(callback);
  }

  /**
   * ✅ REMOVE DATA LISTENER
   * Unsubscribe from data updates
   */
  public removeDataListener(callback: (data: AdminData) => void): void {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  /**
   * ✅ NOTIFY LISTENERS
   * Notify all listeners of data updates
   */
  private notifyListeners(): void {
    this.listeners.forEach(callback => {
      try {
        callback({ ...this.data });
      } catch (error) {
        console.error('❌ Error in admin data listener:', error);
      }
    });
  }

  /**
   * ✅ UPDATE CONNECTION STATUS
   * Update connection status and restart updates if needed
   */
  public updateConnectionStatus(isConnected: boolean): void {
    const wasConnected = this.isConnected;
    this.isConnected = isConnected;

    if (isConnected && !wasConnected) {
      this.startRealTimeUpdates();
    } else if (!isConnected && wasConnected) {
      this.stopRealTimeUpdates();
    }
  }

  /**
   * ✅ EXPORT DATA TO CSV
   * Export admin data to CSV format
   */
  public exportToCSV(): string {
    const csvData = [];
    
    // Add platform metrics
    if (this.data.platformMetrics) {
      csvData.push(['Platform Metrics', '']);
      csvData.push(['Wallet Balance (BTC)', this.data.platformMetrics.wallet.balance.toString()]);
      csvData.push(['Total Deposits (BTC)', this.data.platformMetrics.wallet.totalDeposits.toString()]);
      csvData.push(['Total Withdrawals (BTC)', this.data.platformMetrics.wallet.totalWithdrawals.toString()]);
      csvData.push(['Blockchain Balance (BTC)', this.data.platformMetrics.blockchainBalance?.toString() || 'N/A']);
      csvData.push(['Total Winning Trades (USD)', this.data.platformMetrics.ledger.totalWinningTrades.toString()]);
      csvData.push(['Total Losing Trades (USD)', this.data.platformMetrics.ledger.totalLosingTrades.toString()]);
      csvData.push(['Net PnL (USD)', this.data.platformMetrics.ledger.netPnl.toString()]);
      csvData.push(['Total Trades', this.data.platformMetrics.ledger.totalTrades.toString()]);
      csvData.push(['Total Volume (USD)', this.data.platformMetrics.tradingSummary.totalVolume.toString()]);
      csvData.push(['Win Rate (%)', (this.data.platformMetrics.tradingSummary.winRate * 100).toFixed(2)]);
      csvData.push(['', '']);
    }

    // Add user metrics
    if (this.data.userMetrics.length > 0) {
      csvData.push(['User Metrics', '']);
      csvData.push(['Principal', 'Balance (BTC)', 'Total Wins (BTC)', 'Total Losses (BTC)', 'Net PnL (BTC)', 'Total Deposits (BTC)', 'Total Withdrawals (BTC)']);
      
      this.data.userMetrics.forEach(user => {
        csvData.push([
          user.principal,
          user.balance.toString(),
          user.totalWins.toString(),
          user.totalLosses.toString(),
          user.netPnl.toString(),
          user.totalDeposits.toString(),
          user.totalWithdrawals.toString()
        ]);
      });
    }

    csvData.push(['', '']);
    csvData.push(['Generated At', new Date().toISOString()]);

    return csvData.map(row => row.join(',')).join('\n');
  }

  /**
   * ✅ CLEANUP
   * Clean up resources
   */
  public cleanup(): void {
    this.stopRealTimeUpdates();
    this.listeners = [];
    this.data = {
      platformMetrics: null,
      userMetrics: [],
      isLoading: false,
      error: null,
      lastUpdated: 0
    };
    console.log('🧹 EnhancedAdminService cleaned up');
  }
}

// ✅ SINGLETON INSTANCE
export const enhancedAdminService = EnhancedAdminService.getInstance();
