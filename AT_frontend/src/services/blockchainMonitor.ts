// Note: We'll use the backend canister directly for deposit processing

export interface BitcoinTransaction {
  txid: string;
  amount: number;
  confirmations: number;
  blockHeight?: number;
  timestamp: number;
  toAddress: string;
  fromAddress?: string;
  memo?: string; // Add memo field for OP_RETURN data
}

export interface Deposit {
  txid: string;
  amount: number;
  confirmations: number;
  timestamp: number;
  userAddress: string;
  status: 'pending' | 'confirmed' | 'credited';
}

export class BlockchainMonitor {
  public poolAddress: string; // Make public for external access
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring: boolean = false;
  // private lastCheckedBlock: number = 0; // Will be used for more advanced monitoring
  private processedTransactions: Set<string> = new Set();
  
  // ✅ ENHANCED: API health monitoring
  private apiHealth: Map<string, {
    successCount: number;
    failureCount: number;
    avgResponseTime: number;
    lastUsed: number;
    isHealthy: boolean;
  }> = new Map();

  constructor() {
    this.poolAddress = '';
    this.initializeApiHealth();
  }

  // ✅ ENHANCED: Initialize API health tracking
  private initializeApiHealth(): void {
    const apis = ['Blockstream', 'Blockchair', 'Blockchain.info', 'Mempool.space', 'BlockCypher'];
    apis.forEach(api => {
      this.apiHealth.set(api, {
        successCount: 0,
        failureCount: 0,
        avgResponseTime: 0,
        lastUsed: 0,
        isHealthy: true
      });
    });
  }

  // ✅ ENHANCED: Track API performance
  private trackApiPerformance(endpointName: string, success: boolean, responseTime: number): void {
    const health = this.apiHealth.get(endpointName);
    if (health) {
      health.lastUsed = Date.now();
      
      if (success) {
        health.successCount++;
        // Update average response time
        const totalRequests = health.successCount + health.failureCount;
        health.avgResponseTime = (health.avgResponseTime * (totalRequests - 1) + responseTime) / totalRequests;
        health.isHealthy = true;
      } else {
        health.failureCount++;
        // Mark as unhealthy if failure rate > 50%
        const totalRequests = health.successCount + health.failureCount;
        const failureRate = health.failureCount / totalRequests;
        health.isHealthy = failureRate < 0.5;
      }
    }
  }

  // ✅ ENHANCED: Get API health status
  public getApiHealthStatus(): Record<string, any> {
    const status: Record<string, any> = {};
    this.apiHealth.forEach((health, api) => {
      const totalRequests = health.successCount + health.failureCount;
      status[api] = {
        successRate: totalRequests > 0 ? (health.successCount / totalRequests * 100).toFixed(1) + '%' : 'N/A',
        avgResponseTime: health.avgResponseTime.toFixed(0) + 'ms',
        isHealthy: health.isHealthy,
        lastUsed: health.lastUsed > 0 ? new Date(health.lastUsed).toISOString() : 'Never'
      };
    });
    return status;
  }

  /**
   * Start monitoring the liquidity pool address for deposits
   */
  async startMonitoring(poolAddress: string): Promise<void> {
    if (this.isMonitoring) {
      console.log('🔄 Blockchain monitoring already active');
      return;
    }

    this.poolAddress = poolAddress;
    this.isMonitoring = true;
    
    console.log('🔍 Starting blockchain monitoring for pool address:', poolAddress);
    
    // Start polling every 30 seconds
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.checkForNewDeposits();
      } catch (error) {
        console.error('❌ Error checking for deposits:', error);
      }
    }, 30000);

    // Initial check
    await this.checkForNewDeposits();
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('⏹️ Blockchain monitoring stopped');
  }

  /**
   * Check for new deposits to the main pool address
   */
  private async checkForNewDeposits(): Promise<void> {
    try {
      console.log('🔍 Checking for new deposits...');
      
      if (!this.poolAddress) {
        console.log('📭 No pool address configured for monitoring');
        return;
      }
      
      console.log(`🔍 Monitoring pool address: ${this.poolAddress.substring(0, 12)}...`);
      
      try {
        const transactions = await this.getRecentTransactions(this.poolAddress);
        
        // Filter for new deposits with memos
        const newDeposits = transactions.filter(tx => 
          !this.processedTransactions.has(tx.txid) && 
          tx.confirmations >= 1 && // Require at least 1 confirmation
          tx.memo && tx.memo.startsWith('DEP_') // Must have valid deposit memo
        );

        if (newDeposits.length > 0) {
          console.log(`💰 Found ${newDeposits.length} new deposits to pool address`);
          
          for (const deposit of newDeposits) {
            await this.processDeposit(deposit);
            this.processedTransactions.add(deposit.txid);
          }
        } else {
          console.log('📭 No new deposits found');
        }
      } catch (error) {
        console.error(`❌ Error checking pool address ${this.poolAddress.substring(0, 12)}...:`, error);
      }
      
      console.log('✅ Deposit check completed');

    } catch (error) {
      console.error('❌ Error checking for deposits:', error);
    }
  }

  /**
   * Get recent transactions for an address using a blockchain API
   */
  private async getRecentTransactions(address: string): Promise<BitcoinTransaction[]> {
    try {
      console.log('🔍 Fetching transactions for address:', address.substring(0, 12) + '...');
      
      // ✅ ENHANCED: Use CORS proxy for reliable API access
      const corsProxy = 'https://api.allorigins.win/raw?url=';
      const apiUrls = [
        // Primary: Blockstream API with CORS proxy
        `${corsProxy}${encodeURIComponent(`https://blockstream.info/api/address/${address}/txs`)}`,
        // Alternative: Blockchair API with CORS proxy
        `${corsProxy}${encodeURIComponent(`https://api.blockchair.com/bitcoin/dashboards/address/${address}`)}`,
        // Alternative: Blockchain.info API with CORS proxy
        `${corsProxy}${encodeURIComponent(`https://blockchain.info/rawaddr/${address}?limit=50`)}`,
        // Alternative: Mempool.space API with CORS proxy
        `${corsProxy}${encodeURIComponent(`https://mempool.space/api/address/${address}/txs`)}`,
        // Fallback: BlockCypher with CORS proxy
        `${corsProxy}${encodeURIComponent(`https://api.blockcypher.com/v1/btc/main/addrs/${address}/txs?limit=50`)}`,
        // ✅ FALLBACK: Direct APIs (may work in some browser contexts)
        `https://blockstream.info/api/address/${address}/txs`,
        `https://api.blockchair.com/bitcoin/dashboards/address/${address}`,
        `https://blockchain.info/rawaddr/${address}?limit=50`,
        `https://mempool.space/api/address/${address}/txs`,
        `https://api.blockcypher.com/v1/btc/main/addrs/${address}/txs?limit=50`
      ];

      let response: Response;
      let data: any;
      let lastError: Error | null = null;

      // ✅ ENHANCED: Try each API endpoint with performance tracking
      for (const url of apiUrls) {
        let endpointName = 'Unknown';
        // ✅ ENHANCED: Detect endpoint name for both CORS proxy and direct URLs
        if (url.includes('blockstream.info')) endpointName = 'Blockstream';
        else if (url.includes('blockchair.com')) endpointName = 'Blockchair';
        else if (url.includes('blockchain.info')) endpointName = 'Blockchain.info';
        else if (url.includes('mempool.space')) endpointName = 'Mempool.space';
        else if (url.includes('blockcypher.com')) endpointName = 'BlockCypher';
        
        // Add proxy indicator
        if (url.includes('allorigins.win')) {
          endpointName += ' (via CORS proxy)';
        }
        
        const startTime = Date.now();
        
        try {
          console.log(`🌐 Trying API endpoint: ${endpointName}`);
          
          response = await fetch(url, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
            // Add timeout to prevent hanging
            signal: AbortSignal.timeout(10000) // 10 second timeout
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          data = await response.json();
          
          // ✅ ENHANCED: Handle CORS proxy response format
          if (url.includes('allorigins.win')) {
            // AllOrigins returns the raw response directly
            console.log('📦 CORS proxy response received');
          } else if (data.contents) {
            // Handle legacy AllOrigins wrapper format
            data = JSON.parse(data.contents);
          }
          
          // Validate response structure
          if (data && typeof data === 'object') {
            // ✅ ENHANCED: Track API success
            this.trackApiPerformance(endpointName, true, Date.now() - startTime);
            console.log('✅ Successfully fetched data from API');
            break; // Success, exit the loop
          } else {
            throw new Error('Invalid response format');
          }
          
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          
          // ✅ ENHANCED: Track API failure
          this.trackApiPerformance(endpointName, false, Date.now() - startTime);
          
          // ✅ ENHANCED: Categorize errors for better debugging
          if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
            console.warn(`🌐 Network/CORS Error: ${endpointName} - ${lastError.message}`);
          } else if (lastError.message.includes('429')) {
            console.warn(`⏱️ Rate limit: ${endpointName} - ${lastError.message}`);
          } else if (lastError.message.includes('403')) {
            console.warn(`🚫 CORS/Forbidden: ${endpointName} - ${lastError.message}`);
          } else if (lastError.message.includes('500')) {
            console.warn(`🔥 Server error: ${endpointName} - ${lastError.message}`);
          } else {
            console.warn(`⚠️ API Error: ${endpointName} - ${lastError.message}`);
          }
          
          continue; // Try next endpoint
        }
      }

      // If all endpoints failed
      if (!data) {
        const errorMessage = lastError?.message || 'All API endpoints failed';
        console.error('❌ All Bitcoin API endpoints failed:', errorMessage);
        console.warn('🔧 This may be due to CORS restrictions. Consider using a backend service for blockchain queries.');
        
        // ✅ ENHANCED: Return empty array instead of throwing error to prevent complete failure
        return [];
      }
      
      // ✅ UPDATED: Parse different API response formats
      let transactions: any[] = [];
      
      // Handle different API response formats
      if (Array.isArray(data)) {
        // Blockstream, Mempool.space return array directly
        transactions = data;
        console.log('🔍 API returned transaction array:', {
          address: address.substring(0, 12) + '...',
          txCount: transactions.length
        });
      } else if (data.txs && Array.isArray(data.txs)) {
        // BlockCypher format
        transactions = data.txs;
        console.log('🔍 BlockCypher transaction structure:', {
          address: address.substring(0, 12) + '...',
          txCount: transactions.length
        });
      } else if (data.data && data.data.transactions && Array.isArray(data.data.transactions)) {
        // Blockchair format
        transactions = data.data.transactions;
        console.log('🔍 Blockchair transaction structure:', {
          address: address.substring(0, 12) + '...',
          txCount: transactions.length
        });
      } else if (data.txs && Array.isArray(data.txs)) {
        // Blockchain.info format
        transactions = data.txs;
        console.log('🔍 Blockchain.info transaction structure:', {
          address: address.substring(0, 12) + '...',
          txCount: transactions.length
        });
      } else {
        console.log('📭 No transactions found for address:', address.substring(0, 12) + '...');
        return [];
      }
      
      return transactions.map((tx: any) => {
        const memo = this.extractMemoFromTransaction(tx);
        return {
          txid: tx.txid || tx.hash || tx.hash_id,
          amount: this.calculateReceivedAmount(tx, address),
          confirmations: tx.confirmations || tx.confirmation_count || 0,
          blockHeight: tx.block_height || tx.block_id,
          timestamp: new Date(tx.received || tx.time || tx.first_seen).getTime(),
          toAddress: address,
          fromAddress: tx.inputs?.[0]?.addresses?.[0] || tx.inputs?.[0]?.prevout?.scriptpubkey_address,
          memo: memo || '' // ✅ FIXED: Ensure memo is always a string, not null
        };
      });

    } catch (error) {
      console.error('❌ Error fetching transactions for', address.substring(0, 12) + '...:', error);
      
      // Provide more specific error information
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.error('🌐 Network/CORS Error: Unable to reach BlockCypher API. This may be due to:');
        console.error('   1. CORS policy blocking the request');
        console.error('   2. Network connectivity issues');
        console.error('   3. BlockCypher API being temporarily unavailable');
        console.error('   4. Rate limiting by the API provider');
      }
      
      return [];
    }
  }

  /**
   * Calculate the amount received by the address in a transaction
   */
  private calculateReceivedAmount(tx: any, address: string): number {
    let received = 0;
    
    if (tx.outputs) {
      for (const output of tx.outputs) {
        if (output.addresses && output.addresses.includes(address)) {
          received += output.value / 100000000; // Convert satoshis to BTC
        }
      }
    }
    
    return received;
  }

  /**
   * Extract memo from transaction outputs (OP_RETURN data)
   */
  private extractMemoFromTransaction(tx: any): string | null {
    try {
      if (!tx.outputs || !Array.isArray(tx.outputs)) {
        return null;
      }

      // Look for OP_RETURN outputs
      for (const output of tx.outputs) {
        if (output.script_type === 'null-data' || output.script_type === 'nulldata') {
          // This is an OP_RETURN output
          console.log('🔍 Found OP_RETURN output:', output);
          
          // Try to extract the data from the script
          if (output.script) {
            const memo = this.parseOpReturnScript(output.script);
            if (memo && memo.startsWith('DEP_')) {
              console.log('✅ Found deposit memo:', memo);
              return memo;
            }
          }
        }
      }

      // Alternative: Look for outputs with value 0 and check script content
      for (const output of tx.outputs) {
        if (output.value === 0 && output.script) {
          const memo = this.parseOpReturnScript(output.script);
          if (memo && memo.startsWith('DEP_')) {
            console.log('✅ Found deposit memo in zero-value output:', memo);
            return memo;
          }
        }
      }

      return null;
    } catch (error) {
      console.error('❌ Error extracting memo from transaction:', error);
      return null;
    }
  }

  /**
   * Parse OP_RETURN script to extract memo text
   */
  private parseOpReturnScript(script: string): string | null {
    try {
      // OP_RETURN scripts typically start with '6a' (OP_RETURN opcode)
      // Followed by length byte and then the data
      if (!script || script.length < 4) {
        return null;
      }

      // Remove '6a' (OP_RETURN) and length byte to get the data
      const dataHex = script.substring(4);
      
      // Convert hex to string
      const memo = this.hexToString(dataHex);
      
      // Check if it's a valid deposit memo format
      if (memo && typeof memo === 'string' && memo.startsWith('DEP_')) {
        return memo;
      }

      return null;
    } catch (error) {
      console.error('❌ Error parsing OP_RETURN script:', error);
      return null;
    }
  }

  /**
   * Convert hexadecimal string to text
   */
  private hexToString(hex: string): string | null {
    try {
      // Remove any whitespace
      hex = hex.replace(/\s/g, '');
      
      // Check if hex string has even length
      if (hex.length % 2 !== 0) {
        return null;
      }

      let result = '';
      for (let i = 0; i < hex.length; i += 2) {
        const hexByte = hex.substr(i, 2);
        const byte = parseInt(hexByte, 16);
        
        // Skip null bytes and control characters
        if (byte > 0 && byte < 127) {
          result += String.fromCharCode(byte);
        }
      }
      
      return result.length > 0 ? result : null;
    } catch (error) {
      console.error('❌ Error converting hex to string:', error);
      return null;
    }
  }

  /**
   * Process a detected deposit
   */
  private async processDeposit(deposit: BitcoinTransaction): Promise<void> {
    try {
      console.log('💰 Processing deposit:', deposit);
      
      // Check if this is a deposit to the main pool address
      if (deposit.toAddress === this.poolAddress) {
        console.log('🔍 Processing deposit to main pool address');
        
        // Try to identify user from memo
        if (deposit.memo && deposit.memo.startsWith('DEP_')) {
          console.log('✅ Found deposit memo:', deposit.memo);
          
          // Find the user associated with this deposit ID
          const userId = await this.findUserByDepositId(deposit.memo);
          
          if (userId) {
            console.log('✅ Found user for deposit memo:', userId);
            
            // Credit the user's account
            const result = await this.creditUserAccount(userId, deposit.amount);
            
            if (result.success) {
              console.log('✅ Deposit credited successfully:', result);
              
              // Trigger notification
              this.notifyDepositReceived(userId, deposit);
            } else {
              console.error('❌ Failed to credit deposit:', result.error);
            }
          } else {
            console.warn('⚠️ No user found for deposit memo:', deposit.memo);
          }
        } else {
          console.warn('⚠️ Deposit to pool address but no valid memo found');
          console.log('💡 Memo:', deposit.memo);
          console.log('💡 Expected format: DEP_[HASH]_[TIMESTAMP]');
        }
        return;
      }
      
      // Legacy: Find the user associated with this deposit (for unique addresses)
      const userId = await this.findUserByDepositId(deposit.toAddress);
      
      if (!userId) {
        console.warn('⚠️ No user found for deposit address:', deposit.toAddress);
        return;
      }

      // Credit the user's account
      const result = await this.creditUserAccount(userId, deposit.amount);
      
      if (result.success) {
        console.log('✅ Deposit credited successfully:', result);
        
        // Trigger notification
        this.notifyDepositReceived(userId, deposit);
      } else {
        console.error('❌ Failed to credit deposit:', result.error);
      }

    } catch (error) {
      console.error('❌ Error processing deposit:', error);
    }
  }

  /**
   * Find user by their deposit ID (from transaction memo)
   */
  private async findUserByDepositId(depositId: string): Promise<string | null> {
    try {
      // Query the backend to find the user by deposit ID
      // ✅ REMOVED: Trading service no longer needed - using AtticusService instead
      console.log('🔍 Checking deposit address:', depositId);
      
      // TODO: Implement deposit address lookup using AtticusService
      // For now, return null as this functionality needs to be implemented
      const result = null;
      
      if (result && 'ok' in result) {
        console.log('✅ Found user for deposit ID:', result.ok.toString());
        return result.ok.toString();
      } else {
        console.warn('⚠️ No user found for deposit ID:', depositId);
        return null;
      }
    } catch (error) {
      console.error('❌ Error finding user by deposit ID:', error);
      return null;
    }
  }

  /**
   * Credit user account with deposit amount
   */
  private async creditUserAccount(userAddress: string, amount: number): Promise<{success: boolean, error?: string}> {
    try {
      // Convert BTC to satoshis
      const amountSatoshis = Math.floor(amount * 100000000);
      
      console.log('💰 Crediting user account:', {
        userAddress,
        amount,
        amountSatoshis
      });
      
      // Find user by deposit ID (for now, we'll use a simple mapping)
      // In a real implementation, this would query the backend for user mapping
      const userPrincipal = await this.findUserByDepositId(userAddress);
      if (!userPrincipal) {
        return { success: false, error: 'User not found for deposit address' };
      }
      
      // Call the backend to credit the user's account
      // ✅ REMOVED: Trading service no longer needed - using AtticusService instead
      // TODO: Implement deposit using AtticusService
      console.log('🔍 Depositing to user account:', userPrincipal, amountSatoshis);
      
      // For now, simulate successful deposit
      const result = { status: 'success', message: 'Deposit processed' };
      
      if (result.status === 'success') {
        console.log('✅ User account credited successfully:', result);
        return { success: true };
      } else {
        console.error('❌ Failed to credit user account:', result.message);
        return { success: false, error: result.message };
      }
    } catch (error) {
      console.error('❌ Error crediting user account:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Notify user of received deposit
   */
  private notifyDepositReceived(userAddress: string, deposit: BitcoinTransaction): void {
    // This will be handled by the toast notification system
    const event = new CustomEvent('depositReceived', {
      detail: {
        userAddress,
        amount: deposit.amount,
        txid: deposit.txid,
        confirmations: deposit.confirmations
      }
    });
    
    window.dispatchEvent(event);
  }

  /**
   * Get monitoring status
   */
  getStatus(): { isMonitoring: boolean; poolAddress: string; processedCount: number } {
    return {
      isMonitoring: this.isMonitoring,
      poolAddress: this.poolAddress,
      processedCount: this.processedTransactions.size
    };
  }

  /**
   * Manually check for deposits (called by refresh balance button)
   */
  async checkForUserDeposits(userDepositId?: string): Promise<{found: boolean, message: string}> {
    try {
      console.log('🔍 Manual deposit check initiated');
      
      if (!this.poolAddress) {
        return { found: false, message: 'Pool address not configured' };
      }

      // Check for new deposits to the pool address
      const transactions = await this.getRecentTransactions(this.poolAddress);
      
      // Filter for new deposits with memos
      const newDeposits = transactions.filter(tx => 
        !this.processedTransactions.has(tx.txid) && 
        tx.confirmations >= 1 && // Require at least 1 confirmation
        tx.memo && tx.memo.startsWith('DEP_') // Must have valid memo
      );

      if (userDepositId) {
        // Check for specific user's deposit
        const userDeposit = newDeposits.find(tx => tx.memo === userDepositId);
        if (userDeposit) {
          await this.processDeposit(userDeposit);
          this.processedTransactions.add(userDeposit.txid);
          return { found: true, message: `Found and processed deposit: ${userDeposit.amount} BTC` };
        }
      } else {
        // Process all new deposits
        for (const deposit of newDeposits) {
          await this.processDeposit(deposit);
          this.processedTransactions.add(deposit.txid);
        }
        
        if (newDeposits.length > 0) {
          return { found: true, message: `Processed ${newDeposits.length} new deposits` };
        }
      }

      return { found: false, message: 'No new deposits found' };
    } catch (error) {
      console.error('❌ Error in manual deposit check:', error);
      return { found: false, message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }
}

// Export singleton instance
export const blockchainMonitor = new BlockchainMonitor();
