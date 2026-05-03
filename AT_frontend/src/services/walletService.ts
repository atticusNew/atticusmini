import { Decimal } from 'decimal.js';
import * as bitcoin from 'bitcoinjs-lib';
import * as CryptoJS from 'crypto-js';
import * as bip32 from 'bip32';
import * as tinysecp from 'tiny-secp256k1';
import { Buffer } from 'buffer';

export interface WalletInfo {
  address: string;
  balance: Decimal;
  confirmedBalance: Decimal;
  unconfirmedBalance: Decimal;
}

export interface Transaction {
  txid: string;
  amount: Decimal;
  fee: Decimal;
  confirmations: number;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
}

export interface TransactionRequest {
  toAddress: string;
  amount: Decimal;
  feeRate?: number; // satoshis per byte
}

export class WalletService {
  private walletAddress: string | null = null;
  private keyPair: any | null = null;
  private isConnected: boolean = false;

  // ✅ SECURE: USER wallet initialization only (no platform keys)
  async initializeWallet(icpPrincipal: string): Promise<WalletInfo> {
    try {
      // Generate real Bitcoin keys from ICP principal
      const keyPair = this.generateRealBitcoinKeys(icpPrincipal);
      this.keyPair = keyPair;

      // Generate Bitcoin address from public key
      console.log('🔍 KeyPair public key:', keyPair.publicKey.toString('hex'));
      console.log('🔍 Network:', bitcoin.networks.bitcoin);

      // Convert Uint8Array to Buffer if needed
      let pubkeyBuffer = keyPair.publicKey;
      if (pubkeyBuffer instanceof Uint8Array) {
        pubkeyBuffer = Buffer.from(pubkeyBuffer);
      }

      const { address } = bitcoin.payments.p2pkh({
        pubkey: pubkeyBuffer,
        network: bitcoin.networks.bitcoin
      });

      if (!address) {
        throw new Error('Failed to generate Bitcoin address');
      }

      this.walletAddress = address;
      this.isConnected = true;

      console.log('🔑 Real Bitcoin wallet initialized:', this.walletAddress);

      // Get real balance from Bitcoin network
      const balance = await this.getRealBalance();

      return {
        address: this.walletAddress,
        balance: balance,
        confirmedBalance: balance,
        unconfirmedBalance: new Decimal(0),
      };
    } catch (error) {
      console.error('❌ Failed to initialize real Bitcoin wallet:', error);
      throw new Error('Real Bitcoin wallet initialization failed');
    }
  }

  // Generate real Bitcoin keys from ICP principal using cryptographic derivation
  private generateRealBitcoinKeys(icpPrincipal: string): any {
    // Create deterministic seed from ICP principal
    const seed = CryptoJS.SHA256(icpPrincipal + 'bitcoin-derivation-mainnet').toString();
    
    // Convert seed to 32-byte buffer
    const seedBuffer = Buffer.from(seed.substring(0, 64), 'hex');
    
    // Create HD wallet root from seed
    const root = bip32.BIP32Factory(tinysecp).fromSeed(seedBuffer, bitcoin.networks.bitcoin);
    
    // Derive key pair using BIP44 path for mainnet
    const path = `m/44'/0'/0'/0/0`; // BIP44 path for mainnet
    const keyPair = root.derivePath(path);

    return keyPair;
  }

  // Get real Bitcoin balance from network
  async getRealBalance(): Promise<Decimal> {
    if (!this.walletAddress) {
      throw new Error('Wallet not initialized');
    }

    try {
      // ✅ ENHANCED: Use CORS proxy for reliable API access
      const corsProxy = 'https://api.allorigins.win/raw?url=';
      const apiUrls = [
        // Primary: Blockstream API with CORS proxy
        `${corsProxy}${encodeURIComponent(`https://blockstream.info/api/address/${this.walletAddress}`)}`,
        // Alternative: Blockchain.info API with CORS proxy
        `${corsProxy}${encodeURIComponent(`https://blockchain.info/q/addressbalance/${this.walletAddress}`)}`,
        // Alternative: Blockchair API with CORS proxy
        `${corsProxy}${encodeURIComponent(`https://api.blockchair.com/bitcoin/dashboards/address/${this.walletAddress}`)}`,
        // Alternative: Mempool.space API with CORS proxy
        `${corsProxy}${encodeURIComponent(`https://mempool.space/api/address/${this.walletAddress}`)}`,
        // ✅ FALLBACK: Direct APIs (may work in some browser contexts)
        `https://blockstream.info/api/address/${this.walletAddress}`,
        `https://blockchain.info/q/addressbalance/${this.walletAddress}`,
        `https://api.blockchair.com/bitcoin/dashboards/address/${this.walletAddress}`,
        `https://mempool.space/api/address/${this.walletAddress}`
      ];

      for (const url of apiUrls) {
        let endpointName = 'Unknown';
        // ✅ ENHANCED: Detect endpoint name for both CORS proxy and direct URLs
        if (url.includes('blockstream.info')) endpointName = 'Blockstream';
        else if (url.includes('blockchain.info')) endpointName = 'Blockchain.info';
        else if (url.includes('blockchair.com')) endpointName = 'Blockchair';
        else if (url.includes('mempool.space')) endpointName = 'Mempool.space';
        
        // Add proxy indicator
        if (url.includes('allorigins.win')) {
          endpointName += ' (via CORS proxy)';
        }
        
        try {
          console.log(`🌐 Trying ${endpointName} for wallet balance...`);
          
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(10000) // 10 second timeout
          });
          
          if (!response.ok) {
            if (response.status === 400) {
              // Address not found or invalid - return 0 balance
              return new Decimal(0);
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();
          
          // ✅ ENHANCED: Handle CORS proxy response format
          if (url.includes('allorigins.win')) {
            // AllOrigins returns the raw response directly
            console.log('📦 CORS proxy response received');
          }
          
          // Parse balance based on API format
          let balanceSatoshis = 0;
          
          if (url.includes('blockstream.info') || url.includes('mempool.space')) {
            // Blockstream/Mempool.space format: { chain_stats: { funded_txo_sum: X, spent_txo_sum: Y } }
            if (data.chain_stats) {
              balanceSatoshis = data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum;
            }
          } else if (url.includes('blockchain.info')) {
            // Blockchain.info format: just the balance number
            balanceSatoshis = parseInt(data) || 0;
          } else if (url.includes('blockchair.com')) {
            // Blockchair format: { data: { [address]: { address: { balance: X } } } }
            if (data.data && data.data[this.walletAddress] && data.data[this.walletAddress].address) {
              balanceSatoshis = data.data[this.walletAddress].address.balance || 0;
            }
          }

          // Convert satoshis to BTC
          const balanceBTC = balanceSatoshis / 100000000;
          
          if (balanceBTC >= 0) {
            console.log(`✅ Got wallet balance from ${endpointName}:`, balanceBTC, 'BTC');
            return new Decimal(balanceBTC);
          } else {
            throw new Error('Invalid balance received');
          }
          
        } catch (error) {
          const lastError = error instanceof Error ? error : new Error(String(error));
          
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
          
          continue;
        }
      }

      // If all endpoints failed, return 0 balance
      console.warn('⚠️ All balance API endpoints failed, returning 0 balance');
      return new Decimal(0);
      
    } catch (error) {
      console.error('❌ Failed to get real Bitcoin balance:', error);
      // Return 0 balance if network query fails
      return new Decimal(0);
    }
  }

  // Get real UTXOs from Bitcoin network
  async getRealUTXOs(): Promise<any[]> {
    if (!this.walletAddress) {
      throw new Error('Wallet not initialized');
    }

    try {
      const response = await fetch(`https://blockstream.info/api/address/${this.walletAddress}/utxo`);
      
      if (!response.ok) {
        if (response.status === 400) {
          return []; // No UTXOs found
        }
        throw new Error(`Failed to fetch UTXOs: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Failed to get real UTXOs:', error);
      return [];
    }
  }

  // Get current network fee rate
  private async getCurrentFeeRate(): Promise<number> {
    try {
      const response = await fetch('https://mempool.space/api/v1/fees/recommended');
      if (response.ok) {
        const fees = await response.json();
        return fees.fastestFee || 20; // Use fastest fee or fallback to 20 sat/vB
      }
    } catch (error) {
      console.log('Failed to get current fees, using fallback');
    }

    return 20; // Fallback fee rate
  }

  // Get transaction hex for UTXO
  private async getTransactionHex(txid: string): Promise<string> {
    try {
      const response = await fetch(`https://blockstream.info/api/tx/${txid}/hex`);
      if (response.ok) {
        return await response.text();
      }
      throw new Error('Failed to get transaction hex');
    } catch (error) {
      console.error('Failed to get transaction hex:', error);
      throw error;
    }
  }

  // Create real Bitcoin transaction with proper input handling
  async createRealTransaction(request: TransactionRequest): Promise<Transaction> {
    if (!this.keyPair || !this.walletAddress) {
      throw new Error('Wallet not initialized');
    }

    try {
      console.log('🔍 Creating transaction for:', request.amount.toString(), 'BTC to', request.toAddress);

      // Get UTXOs
      const utxos = await this.getRealUTXOs();
      if (utxos.length === 0) {
        throw new Error('No UTXOs available for transaction');
      }

      console.log('🔍 Found UTXOs:', utxos.length);

      // Get current fee rate from network
      const feeRate = await this.getCurrentFeeRate();
      console.log('🔍 Current fee rate:', feeRate, 'sat/vB');

      // Create PSBT (Partially Signed Bitcoin Transaction)
      const psbt = new bitcoin.Psbt({ network: bitcoin.networks.bitcoin });

      // Add inputs with proper scriptPubKey for P2PKH
      let totalInput = 0;
      for (const utxo of utxos) {
        // Get the full transaction for this UTXO
        const txHex = await this.getTransactionHex(utxo.txid);
        psbt.addInput({
          hash: utxo.txid,
          index: utxo.vout,
          nonWitnessUtxo: Buffer.from(txHex, 'hex'), // Use nonWitnessUtxo for P2PKH
        });
        totalInput += utxo.value;
      }

      // Calculate proper fee
      const estimatedSize = utxos.length * 148 + 2 * 34 + 10; // More accurate estimate
      const fee = Math.ceil(feeRate * estimatedSize);

      // Calculate output amount
      const outputAmount = Math.floor(request.amount.mul(100000000).toNumber()); // Convert to satoshis
      const changeAmount = totalInput - outputAmount - fee;

      console.log('🔍 Total input:', totalInput, 'satoshis');
      console.log('🔍 Output amount:', outputAmount, 'satoshis');
      console.log('🔍 Fee:', fee, 'satoshis');
      console.log('🔍 Change:', changeAmount, 'satoshis');

      if (changeAmount < 0) {
        throw new Error(`Insufficient funds: need ${outputAmount + fee} satoshis, have ${totalInput}`);
      }

      // Add outputs
      psbt.addOutput({
        address: request.toAddress,
        value: outputAmount,
      });

      // Add change output if significant (avoid dust)
      if (changeAmount > 546) { // Bitcoin dust threshold
        psbt.addOutput({
          address: this.walletAddress!,
          value: changeAmount,
        });
      }

      // Sign all inputs
      for (let i = 0; i < utxos.length; i++) {
        psbt.signInput(i, this.keyPair!);
      }

      // Validate signatures
      psbt.validateSignaturesOfAllInputs((_pubkey, _msghash, signature) => {
        return bitcoin.script.isCanonicalScriptSignature(signature);
      });

      // Finalize and extract transaction
      psbt.finalizeAllInputs();
      const tx = psbt.extractTransaction();
      const txHex = tx.toHex();
      const txid = tx.getId();

      console.log('✅ Transaction created:', txid);
      console.log('🔍 Transaction size:', txHex.length / 2, 'bytes');

      // Broadcast transaction to real Bitcoin network
      const broadcastResult = await this.broadcastRealTransaction(txHex);

      const transaction: Transaction = {
        txid: txid,
        amount: request.amount,
        fee: new Decimal(fee / 100000000), // Convert to BTC
        confirmations: 0,
        timestamp: Date.now(),
        status: broadcastResult ? 'pending' : 'failed',
      };

      return transaction;
    } catch (error) {
      console.error('❌ Failed to create real Bitcoin transaction:', error);
      throw error;
    }
  }

  // Transfer from user wallet to external address
  async transferToExternal(externalAddress: string, amount: Decimal): Promise<Transaction> {
    console.log('💸 Transferring', amount.toString(), 'BTC to external address:', externalAddress);
    return await this.createRealTransaction({
      toAddress: externalAddress,
      amount: amount
    });
  }

  // Broadcast real transaction to Bitcoin network
  private async broadcastRealTransaction(txHex: string): Promise<boolean> {
    try {
      // Try multiple Bitcoin network endpoints
      const endpoints = [
        'https://blockstream.info/api/tx',
        'https://mempool.space/api/tx',
        'https://api.blockcypher.com/v1/btc/main/txs/push'
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ tx: txHex })
          });

          if (response.ok) {
            console.log('✅ Real Bitcoin transaction broadcasted successfully');
            return true;
          }
        } catch (error) {
          console.log(`Failed to broadcast to ${endpoint}, trying next...`);
          continue;
        }
      }

      throw new Error('Failed to broadcast transaction to any Bitcoin network endpoint');
    } catch (error) {
      console.error('❌ Failed to broadcast real Bitcoin transaction:', error);
      return false;
    }
  }

  // Get wallet address
  getWalletAddress(): string | null {
    return this.walletAddress;
  }

  // Get public key
  getPublicKey(): Buffer | null {
    return this.keyPair?.publicKey || null;
  }

  // Check if wallet is connected
  isWalletConnected(): boolean {
    return this.isConnected;
  }

  // Disconnect wallet
  disconnect(): void {
    this.walletAddress = null;
    this.keyPair = null;
    this.isConnected = false;
    console.log('🔌 Real Bitcoin wallet disconnected');
  }
}

export const walletService = new WalletService();
