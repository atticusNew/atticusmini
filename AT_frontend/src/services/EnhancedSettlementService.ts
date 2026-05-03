/**
 * ✅ ENHANCED SETTLEMENT SERVICE
 * Improves existing settlement recording with better error handling and validation
 * Preserves existing settlement logic while adding reliability features
 */

export interface SettlementResult {
  outcome: 'win' | 'loss' | 'tie';
  payout: number;
  profit: number;
  finalPrice: number;
}

export interface SettlementRecord {
  positionId: number;
  settlementResult: SettlementResult;
  timestamp: number;
  success: boolean;
  error?: string;
}

export interface SettlementMetrics {
  totalSettlements: number;
  successfulSettlements: number;
  failedSettlements: number;
  successRate: number;
  lastSettlement: number;
}

export class EnhancedSettlementService {
  private static instance: EnhancedSettlementService;
  private settlementHistory: SettlementRecord[] = [];
  private atticusService: any = null;
  private isConnected: boolean = false;
  private listeners: Array<(record: SettlementRecord) => void> = [];

  private constructor() {
    // Private constructor for singleton
  }

  public static getInstance(): EnhancedSettlementService {
    if (!EnhancedSettlementService.instance) {
      EnhancedSettlementService.instance = new EnhancedSettlementService();
    }
    return EnhancedSettlementService.instance;
  }

  /**
   * ✅ INITIALIZE SERVICE
   * Set up service with backend connection
   */
  public initialize(services: {
    atticusService: any;
    isConnected: boolean;
  }): void {
    this.atticusService = services.atticusService;
    this.isConnected = services.isConnected;

    console.log('🔄 EnhancedSettlementService initialized');
  }

  /**
   * ✅ RECORD SETTLEMENT
   * Enhanced version of existing recordSettlement with better error handling
   */
  public async recordSettlement(
    positionId: number,
    settlementResult: SettlementResult,
    backendCanister?: any
  ): Promise<boolean> {
    const startTime = Date.now();
    const record: SettlementRecord = {
      positionId,
      settlementResult,
      timestamp: startTime,
      success: false
    };

    try {
      console.log('📝 Recording settlement:', {
        positionId,
        settlementResult
      });

      // Validate inputs
      if (!this.validateSettlementInputs(positionId, settlementResult)) {
        throw new Error('Invalid settlement inputs');
      }

      // Use provided backend canister or default service
      const canister = backendCanister || this.atticusService;
      if (!canister) {
        throw new Error('Backend canister not available');
      }

      // Convert to backend format (same logic as existing OffChainPricingEngine)
      const payoutCents = Math.round(settlementResult.payout * 100);
      const profitCents = Math.max(0, Math.round(settlementResult.profit * 100));
      const finalPriceCents = Math.round(settlementResult.finalPrice * 100);

      console.log('🔍 Settlement parameters:', {
        positionId,
        outcome: settlementResult.outcome,
        payoutCents,
        profitCents,
        finalPriceCents
      });

      // Call backend (same logic as existing recordSettlement)
      const result = await canister.recordSettlement(
        positionId,
        settlementResult.outcome,
        payoutCents,
        profitCents,
        finalPriceCents
      );

      if ('err' in result) {
        throw new Error(result.err);
      }

      // Record successful settlement
      record.success = true;
      this.settlementHistory.push(record);
      
      console.log('✅ Settlement recorded successfully');
      
      // Notify listeners
      this.notifyListeners(record);
      
      return true;
    } catch (error) {
      console.error('❌ Error recording settlement:', error);
      
      // Record failed settlement
      record.error = error instanceof Error ? error.message : 'Unknown error';
      this.settlementHistory.push(record);
      
      // Notify listeners
      this.notifyListeners(record);
      
      return false;
    }
  }

  /**
   * ✅ VALIDATE SETTLEMENT INPUTS
   * Validate settlement data before recording
   */
  private validateSettlementInputs(positionId: number, settlementResult: SettlementResult): boolean {
    // Validate position ID
    if (!positionId || positionId <= 0 || !Number.isInteger(positionId)) {
      console.error('❌ Invalid position ID:', positionId);
      return false;
    }

    // Validate outcome
    if (!['win', 'loss', 'tie'].includes(settlementResult.outcome)) {
      console.error('❌ Invalid outcome:', settlementResult.outcome);
      return false;
    }

    // Validate payout
    if (typeof settlementResult.payout !== 'number' || settlementResult.payout < 0) {
      console.error('❌ Invalid payout:', settlementResult.payout);
      return false;
    }

    // Validate profit
    if (typeof settlementResult.profit !== 'number') {
      console.error('❌ Invalid profit:', settlementResult.profit);
      return false;
    }

    // Validate final price
    if (typeof settlementResult.finalPrice !== 'number' || settlementResult.finalPrice <= 0) {
      console.error('❌ Invalid final price:', settlementResult.finalPrice);
      return false;
    }

    return true;
  }

  /**
   * ✅ GET SETTLEMENT HISTORY
   * Get recent settlement records
   */
  public getSettlementHistory(limit: number = 100): SettlementRecord[] {
    return this.settlementHistory
      .slice(-limit)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * ✅ GET SETTLEMENT METRICS
   * Get settlement performance metrics
   */
  public getSettlementMetrics(): SettlementMetrics {
    const totalSettlements = this.settlementHistory.length;
    const successfulSettlements = this.settlementHistory.filter(r => r.success).length;
    const failedSettlements = totalSettlements - successfulSettlements;
    const successRate = totalSettlements > 0 ? successfulSettlements / totalSettlements : 0;
    const lastSettlement = this.settlementHistory.length > 0 
      ? Math.max(...this.settlementHistory.map(r => r.timestamp))
      : 0;

    return {
      totalSettlements,
      successfulSettlements,
      failedSettlements,
      successRate,
      lastSettlement
    };
  }

  /**
   * ✅ GET SETTLEMENT BY POSITION ID
   * Find settlement record by position ID
   */
  public getSettlementByPositionId(positionId: number): SettlementRecord | null {
    return this.settlementHistory.find(record => record.positionId === positionId) || null;
  }

  /**
   * ✅ ADD SETTLEMENT LISTENER
   * Subscribe to settlement events
   */
  public addSettlementListener(callback: (record: SettlementRecord) => void): void {
    this.listeners.push(callback);
  }

  /**
   * ✅ REMOVE SETTLEMENT LISTENER
   * Unsubscribe from settlement events
   */
  public removeSettlementListener(callback: (record: SettlementRecord) => void): void {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  /**
   * ✅ NOTIFY LISTENERS
   * Notify all listeners of settlement events
   */
  private notifyListeners(record: SettlementRecord): void {
    this.listeners.forEach(callback => {
      try {
        callback(record);
      } catch (error) {
        console.error('❌ Error in settlement listener:', error);
      }
    });
  }

  /**
   * ✅ RETRY FAILED SETTLEMENTS
   * Retry failed settlement recordings
   */
  public async retryFailedSettlements(): Promise<number> {
    const failedSettlements = this.settlementHistory.filter(r => !r.success);
    let retryCount = 0;

    console.log(`🔄 Retrying ${failedSettlements.length} failed settlements...`);

    for (const record of failedSettlements) {
      try {
        const success = await this.recordSettlement(
          record.positionId,
          record.settlementResult
        );
        
        if (success) {
          retryCount++;
        }
      } catch (error) {
        console.error(`❌ Failed to retry settlement for position ${record.positionId}:`, error);
      }
    }

    console.log(`✅ Retried ${retryCount} settlements successfully`);
    return retryCount;
  }

  /**
   * ✅ EXPORT SETTLEMENT DATA
   * Export settlement history to CSV format
   */
  public exportSettlementData(): string {
    const csvData = [];
    
    // Add headers
    csvData.push([
      'Position ID',
      'Outcome',
      'Payout',
      'Profit',
      'Final Price',
      'Timestamp',
      'Success',
      'Error'
    ]);

    // Add settlement records
    this.settlementHistory.forEach(record => {
      csvData.push([
        record.positionId.toString(),
        record.settlementResult.outcome,
        record.settlementResult.payout.toString(),
        record.settlementResult.profit.toString(),
        record.settlementResult.finalPrice.toString(),
        new Date(record.timestamp).toISOString(),
        record.success.toString(),
        record.error || ''
      ]);
    });

    return csvData.map(row => row.join(',')).join('\n');
  }

  /**
   * ✅ UPDATE CONNECTION STATUS
   * Update connection status
   */
  public updateConnectionStatus(isConnected: boolean): void {
    this.isConnected = isConnected;
  }

  /**
   * ✅ CLEANUP
   * Clean up resources
   */
  public cleanup(): void {
    this.listeners = [];
    this.settlementHistory = [];
    console.log('🧹 EnhancedSettlementService cleaned up');
  }
}

// ✅ SINGLETON INSTANCE
export const enhancedSettlementService = EnhancedSettlementService.getInstance();
