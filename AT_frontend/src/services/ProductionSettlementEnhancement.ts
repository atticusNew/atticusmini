/**
 * ✅ PRODUCTION SETTLEMENT ENHANCEMENT
 * Improves existing settlement recording with validation and error handling
 * Works with your live platform without breaking existing functionality
 */

import { enhancedSettlementService } from './EnhancedSettlementService';

export interface SettlementEnhancement {
  recordSettlement: (
    positionId: number,
    settlementResult: any,
    backendCanister?: any
  ) => Promise<boolean>;
  getSettlementMetrics: () => any;
  retryFailedSettlements: () => Promise<number>;
  isInitialized: boolean;
}

/**
 * ✅ PRODUCTION SETTLEMENT ENHANCEMENT
 * Wraps existing settlement logic with enhanced validation and error handling
 */
export class ProductionSettlementEnhancement {
  private static instance: ProductionSettlementEnhancement;
  private isInitialized: boolean = false;
  private atticusService: any = null;

  private constructor() {
    // Private constructor for singleton
  }

  public static getInstance(): ProductionSettlementEnhancement {
    if (!ProductionSettlementEnhancement.instance) {
      ProductionSettlementEnhancement.instance = new ProductionSettlementEnhancement();
    }
    return ProductionSettlementEnhancement.instance;
  }

  /**
   * ✅ INITIALIZE ENHANCEMENT
   * Set up enhanced settlement service
   */
  public initialize(atticusService: any, isConnected: boolean): void {
    this.atticusService = atticusService;
    this.isInitialized = true;
    
    // Initialize enhanced settlement service
    enhancedSettlementService.initialize({
      atticusService,
      isConnected
    });

    console.log('✅ Production settlement enhancement initialized');
  }

  /**
   * ✅ ENHANCED SETTLEMENT RECORDING
   * Records settlement with validation and error handling
   */
  public async recordSettlement(
    positionId: number,
    settlementResult: any,
    backendCanister?: any
  ): Promise<boolean> {
    if (!this.isInitialized) {
      console.warn('Settlement enhancement not initialized, using fallback');
      return this.fallbackSettlement(positionId, settlementResult, backendCanister);
    }

    try {
      // Use enhanced settlement service
      const success = await enhancedSettlementService.recordSettlement(
        positionId,
        settlementResult,
        backendCanister
      );

      if (success) {
        console.log(`✅ Settlement recorded successfully for position ${positionId}`);
      } else {
        console.error(`❌ Failed to record settlement for position ${positionId}`);
      }

      return success;
    } catch (error) {
      console.error('❌ Settlement enhancement failed, using fallback:', error);
      return this.fallbackSettlement(positionId, settlementResult, backendCanister);
    }
  }

  /**
   * ✅ FALLBACK SETTLEMENT
   * Original settlement logic as fallback
   */
  private async fallbackSettlement(
    positionId: number,
    settlementResult: any,
    backendCanister?: any
  ): Promise<boolean> {
    try {
      const canister = backendCanister || this.atticusService;
      if (!canister) {
        throw new Error('Backend canister not available');
      }

      // Convert to backend format (same as existing logic)
      const payoutCents = Math.round(settlementResult.payout * 100);
      const profitCents = Math.max(0, Math.round(settlementResult.profit * 100));
      const finalPriceCents = Math.round(settlementResult.finalPrice * 100);

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

      return true;
    } catch (error) {
      console.error('❌ Fallback settlement failed:', error);
      return false;
    }
  }

  /**
   * ✅ GET SETTLEMENT METRICS
   * Get settlement performance metrics
   */
  public getSettlementMetrics(): any {
    if (!this.isInitialized) {
      return {
        totalSettlements: 0,
        successfulSettlements: 0,
        failedSettlements: 0,
        successRate: 0,
        lastSettlement: 0
      };
    }

    return enhancedSettlementService.getSettlementMetrics();
  }

  /**
   * ✅ RETRY FAILED SETTLEMENTS
   * Retry any failed settlement recordings
   */
  public async retryFailedSettlements(): Promise<number> {
    if (!this.isInitialized) {
      console.warn('Settlement enhancement not initialized, cannot retry');
      return 0;
    }

    try {
      return await enhancedSettlementService.retryFailedSettlements();
    } catch (error) {
      console.error('❌ Failed to retry settlements:', error);
      return 0;
    }
  }

  /**
   * ✅ UPDATE CONNECTION STATUS
   * Update connection status for enhanced service
   */
  public updateConnectionStatus(isConnected: boolean): void {
    if (this.isInitialized) {
      enhancedSettlementService.updateConnectionStatus(isConnected);
    }
  }

  /**
   * ✅ GET ENHANCEMENT STATUS
   * Check if enhancement is available
   */
  public getEnhancementStatus(): SettlementEnhancement {
    return {
      recordSettlement: this.recordSettlement.bind(this),
      getSettlementMetrics: this.getSettlementMetrics.bind(this),
      retryFailedSettlements: this.retryFailedSettlements.bind(this),
      isInitialized: this.isInitialized
    };
  }

  /**
   * ✅ CLEANUP
   * Clean up resources
   */
  public cleanup(): void {
    if (this.isInitialized) {
      enhancedSettlementService.cleanup();
    }
    this.isInitialized = false;
    this.atticusService = null;
  }
}

// ✅ SINGLETON INSTANCE
export const productionSettlementEnhancement = ProductionSettlementEnhancement.getInstance();
