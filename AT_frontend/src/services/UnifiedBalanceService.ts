/**
 * ✅ UNIFIED BALANCE SERVICE
 * Enhances existing BalanceProvider without breaking current functionality
 * Provides real-time updates and better error handling
 */

import { Principal } from '@dfinity/principal';
import { Decimal } from 'decimal.js';

export interface BalanceData {
  userBalance: number;
  platformBalance: number;
  lastUpdated: number;
  isConnected: boolean;
  error: string | null;
}

export interface BalanceUpdate {
  type: 'user' | 'platform' | 'both';
  userBalance?: number;
  platformBalance?: number;
  timestamp: number;
}

export class UnifiedBalanceService {
  private static instance: UnifiedBalanceService;
  private userBalance: number = 0;
  private platformBalance: number = 0;
  private lastUpdated: number = 0;
  private isConnected: boolean = false;
  private error: string | null = null;
  private listeners: Array<(update: BalanceUpdate) => void> = [];
  private refreshInterval: NodeJS.Timeout | null = null;
  private atticusService: any = null;
  private treasuryService: any = null;
  private user: any = null;

  private constructor() {
    // Private constructor for singleton
  }

  public static getInstance(): UnifiedBalanceService {
    if (!UnifiedBalanceService.instance) {
      UnifiedBalanceService.instance = new UnifiedBalanceService();
    }
    return UnifiedBalanceService.instance;
  }

  /**
   * ✅ INITIALIZE SERVICE
   * Set up services and start real-time updates
   */
  public initialize(services: {
    atticusService: any;
    treasuryService: any;
    user: any;
    isConnected: boolean;
  }): void {
    this.atticusService = services.atticusService;
    this.treasuryService = services.treasuryService;
    this.user = services.user;
    this.isConnected = services.isConnected;

    console.log('🔄 UnifiedBalanceService initialized');
    
    // Start real-time updates if connected
    if (this.isConnected && this.user) {
      this.startRealTimeUpdates();
    }
  }

  /**
   * ✅ GET CURRENT BALANCE DATA
   * Returns current balance state
   */
  public getBalanceData(): BalanceData {
    return {
      userBalance: this.userBalance,
      platformBalance: this.platformBalance,
      lastUpdated: this.lastUpdated,
      isConnected: this.isConnected,
      error: this.error
    };
  }

  /**
   * ✅ REFRESH USER BALANCE
   * Enhanced version of existing refreshBalance with better error handling
   */
  public async refreshUserBalance(): Promise<boolean> {
    if (!this.user || !this.atticusService || !this.isConnected) {
      console.warn('Cannot refresh balance: missing user, service, or connection');
      this.error = 'Service not available';
      this.notifyListeners({
        type: 'user',
        timestamp: Date.now()
      });
      return false;
    }

    try {
      console.log('🔄 Refreshing user balance...');
      
      // Extract principal (same logic as existing BalanceProvider)
      let userPrincipal: Principal;
      if (this.user.principal instanceof Principal) {
        userPrincipal = this.user.principal;
      } else if (typeof this.user.principal === 'string') {
        userPrincipal = Principal.fromText(this.user.principal);
      } else if (this.user.principal && typeof this.user.principal === 'object' && this.user.principal.__principal__) {
        userPrincipal = Principal.fromText(this.user.principal.__principal__);
      } else {
        throw new Error('Invalid principal format');
      }

      // Get user data from backend
      const userData = await this.atticusService.getUser(userPrincipal.toString());
      
      // Handle response (same logic as existing BalanceProvider)
      let balance = 0;
      if (userData) {
        if (Array.isArray(userData) && userData.length > 0 && userData[0]) {
          balance = userData[0].balance || 0;
        } else if (typeof userData === 'object' && userData.balance !== undefined) {
          balance = userData.balance || 0;
        }
      }

      // Update state
      const previousBalance = this.userBalance;
      this.userBalance = balance;
      this.lastUpdated = Date.now();
      this.error = null;

      console.log('✅ User balance refreshed:', balance);

      // Notify listeners
      this.notifyListeners({
        type: 'user',
        userBalance: balance,
        timestamp: Date.now()
      });

      return true;
    } catch (error) {
      console.error('❌ Error refreshing user balance:', error);
      this.error = error instanceof Error ? error.message : 'Unknown error';
      
      this.notifyListeners({
        type: 'user',
        timestamp: Date.now()
      });
      
      return false;
    }
  }

  /**
   * ✅ REFRESH PLATFORM BALANCE
   * Get platform balance from treasury service
   */
  public async refreshPlatformBalance(): Promise<boolean> {
    if (!this.treasuryService || !this.isConnected) {
      console.warn('Cannot refresh platform balance: service not available');
      return false;
    }

    try {
      console.log('🔄 Refreshing platform balance...');
      
      const platformData = await this.treasuryService.getPlatformWallet();
      const balance = Number(platformData.balance) || 0;

      this.platformBalance = balance;
      this.lastUpdated = Date.now();

      console.log('✅ Platform balance refreshed:', balance);

      // Notify listeners
      this.notifyListeners({
        type: 'platform',
        platformBalance: balance,
        timestamp: Date.now()
      });

      return true;
    } catch (error) {
      console.error('❌ Error refreshing platform balance:', error);
      return false;
    }
  }

  /**
   * ✅ REFRESH ALL BALANCES
   * Refresh both user and platform balances
   */
  public async refreshAllBalances(): Promise<boolean> {
    const userSuccess = await this.refreshUserBalance();
    const platformSuccess = await this.refreshPlatformBalance();
    
    return userSuccess && platformSuccess;
  }

  /**
   * ✅ START REAL-TIME UPDATES
   * Begin automatic balance updates
   */
  private startRealTimeUpdates(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    // Refresh every 30 seconds
    this.refreshInterval = setInterval(async () => {
      if (this.isConnected && this.user) {
        await this.refreshUserBalance();
      }
    }, 30000);

    console.log('🔄 Started real-time balance updates');
  }

  /**
   * ✅ STOP REAL-TIME UPDATES
   * Stop automatic balance updates
   */
  public stopRealTimeUpdates(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    console.log('⏹️ Stopped real-time balance updates');
  }

  /**
   * ✅ ADD BALANCE LISTENER
   * Subscribe to balance updates
   */
  public addBalanceListener(callback: (update: BalanceUpdate) => void): void {
    this.listeners.push(callback);
  }

  /**
   * ✅ REMOVE BALANCE LISTENER
   * Unsubscribe from balance updates
   */
  public removeBalanceListener(callback: (update: BalanceUpdate) => void): void {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  /**
   * ✅ NOTIFY LISTENERS
   * Notify all listeners of balance updates
   */
  private notifyListeners(update: BalanceUpdate): void {
    this.listeners.forEach(callback => {
      try {
        callback(update);
      } catch (error) {
        console.error('❌ Error in balance listener:', error);
      }
    });
  }

  /**
   * ✅ VALIDATE TRADE BALANCE
   * Enhanced version of existing validateTradeBalance
   */
  public validateTradeBalance(contractCount: number, btcPrice: number): {
    isValid: boolean;
    requiredAmount: number;
    currentBalance: number;
    shortfall: number;
  } {
    const currentBalance = new Decimal(this.userBalance);
    const premiumUSD = new Decimal(contractCount).mul(0.50); // $0.50 per contract
    const requiredBTC = premiumUSD.div(btcPrice);
    const shortfall = requiredBTC.sub(currentBalance);
    
    return {
      isValid: currentBalance.greaterThanOrEqualTo(requiredBTC),
      requiredAmount: requiredBTC.toNumber(),
      currentBalance: currentBalance.toNumber(),
      shortfall: shortfall.greaterThan(0) ? shortfall.toNumber() : 0
    };
  }

  /**
   * ✅ GET BALANCE STATUS
   * Enhanced version of existing getBalanceStatus
   */
  public getBalanceStatus(requiredBalance: number, btcPrice: number): {
    status: 'sufficient' | 'insufficient' | 'low';
    message: string;
  } {
    const currentBalance = new Decimal(this.userBalance);
    const required = new Decimal(requiredBalance);
    const balanceUSD = currentBalance.mul(btcPrice);
    const requiredUSD = required.mul(btcPrice);
    
    if (currentBalance.greaterThanOrEqualTo(required)) {
      return { status: 'sufficient', message: 'Balance sufficient' };
    } else if (balanceUSD.greaterThan(requiredUSD.mul(0.5))) {
      return { status: 'low', message: 'Balance low' };
    } else {
      return { status: 'insufficient', message: 'Insufficient balance' };
    }
  }

  /**
   * ✅ GET BALANCE IN USD
   * Enhanced version of existing getBalanceInUSD
   */
  public getBalanceInUSD(btcPrice: number): number {
    return new Decimal(this.userBalance).mul(btcPrice).toNumber();
  }

  /**
   * ✅ CHECK MINIMUM BALANCE
   * Enhanced version of existing hasMinimumBalance
   */
  public hasMinimumBalance(requiredAmount: number): boolean {
    return new Decimal(this.userBalance).greaterThanOrEqualTo(new Decimal(requiredAmount));
  }

  /**
   * ✅ UPDATE CONNECTION STATUS
   * Update connection status and restart updates if needed
   */
  public updateConnectionStatus(isConnected: boolean, user?: any): void {
    const wasConnected = this.isConnected;
    this.isConnected = isConnected;
    
    if (user) {
      this.user = user;
    }

    if (isConnected && !wasConnected && this.user) {
      this.startRealTimeUpdates();
    } else if (!isConnected && wasConnected) {
      this.stopRealTimeUpdates();
    }
  }

  /**
   * ✅ CLEANUP
   * Clean up resources
   */
  public cleanup(): void {
    this.stopRealTimeUpdates();
    this.listeners = [];
    this.userBalance = 0;
    this.platformBalance = 0;
    this.error = null;
    console.log('🧹 UnifiedBalanceService cleaned up');
  }
}

// ✅ SINGLETON INSTANCE
export const unifiedBalanceService = UnifiedBalanceService.getInstance();
