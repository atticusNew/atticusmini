/**
 * ✅ DEMO SERVICE - Mock canister calls for demo mode
 * Provides realistic demo experience without calling real canisters
 */

export interface DemoUser {
  principal: string;
  balance: number;
  totalWins: number;
  totalLosses: number;
  netPnl: number;
  createdAt: number;
}

export interface DemoPosition {
  id: number;
  user: string;
  option_type: 'Call' | 'Put';
  strike_price: number;
  entry_price: number;
  expiry: string;
  size: number;
  status: 'Active' | 'Settled';
  opened_at: number;
}

export class DemoService {
  private static instance: DemoService;
  private demoUsers: Map<string, DemoUser> = new Map();
  private demoPositions: Map<number, DemoPosition> = new Map();
  private nextPositionId: number = 1;

  public static getInstance(): DemoService {
    if (!DemoService.instance) {
      DemoService.instance = new DemoService();
    }
    return DemoService.instance;
  }

  /**
   * ✅ MOCK CANISTER CALLS
   * Simulate all canister functions for demo mode
   */
  
  // Mock create_user
  public async create_user(userPrincipal: string): Promise<{ ok: DemoUser } | { err: string }> {
    console.log('🎮 Demo: create_user called for', userPrincipal);
    
    if (this.demoUsers.has(userPrincipal)) {
      const user = this.demoUsers.get(userPrincipal)!;
      return { ok: user };
    }

    const newUser: DemoUser = {
      principal: userPrincipal,
      balance: 1000.0, // Demo balance
      totalWins: 0.0,
      totalLosses: 0.0,
      netPnl: 0.0,
      createdAt: Date.now()
    };

    this.demoUsers.set(userPrincipal, newUser);
    return { ok: newUser };
  }

  // Mock get_user
  public async get_user(userPrincipal: string): Promise<{ ok: DemoUser } | { err: string }> {
    console.log('🎮 Demo: get_user called for', userPrincipal);
    
    const user = this.demoUsers.get(userPrincipal);
    if (user) {
      return { ok: user };
    }
    return { err: 'User not found' };
  }

  // Mock place_trade_simple
  public async place_trade_simple(
    userPrincipal: string,
    optionType: string,
    strikeOffset: number,
    expiry: string,
    contractCount: number,
    entryPriceCents: number,
    strikePriceCents: number
  ): Promise<{ ok: number } | { err: string }> {
    console.log('🎮 Demo: place_trade_simple called', {
      userPrincipal,
      optionType,
      strikeOffset,
      expiry,
      contractCount,
      entryPriceCents,
      strikePriceCents
    });

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const positionId = this.nextPositionId++;
    const entryPrice = entryPriceCents / 100;
    const strikePrice = strikePriceCents / 100;

    const position: DemoPosition = {
      id: positionId,
      user: userPrincipal,
      option_type: optionType === 'Call' ? 'Call' : 'Put',
      strike_price: strikePrice,
      entry_price: entryPrice,
      expiry: expiry,
      size: contractCount,
      status: 'Active',
      opened_at: Date.now()
    };

    this.demoPositions.set(positionId, position);
    
    console.log('✅ Demo trade placed successfully:', positionId);
    return { ok: positionId };
  }

  // Mock recordSettlement
  public async recordSettlement(
    positionId: number,
    outcome: string,
    payout: number,
    profit: number,
    finalPrice: number
  ): Promise<{ ok: null } | { err: string }> {
    console.log('🎮 Demo: recordSettlement called', {
      positionId,
      outcome,
      payout,
      profit,
      finalPrice
    });

    const position = this.demoPositions.get(positionId);
    if (position) {
      position.status = 'Settled';
      this.demoPositions.set(positionId, position);
    }

    return { ok: null };
  }

  // Mock get_position
  public async get_position(positionId: number): Promise<{ ok: DemoPosition } | { err: string }> {
    console.log('🎮 Demo: get_position called for', positionId);
    
    const position = this.demoPositions.get(positionId);
    if (position) {
      return { ok: position };
    }
    return { err: 'Position not found' };
  }

  // Mock get_user_positions
  public async get_user_positions(userPrincipal: string): Promise<DemoPosition[]> {
    console.log('🎮 Demo: get_user_positions called for', userPrincipal);
    
    const userPositions: DemoPosition[] = [];
    for (const position of this.demoPositions.values()) {
      if (position.user === userPrincipal) {
        userPositions.push(position);
      }
    }
    
    return userPositions;
  }

  /**
   * ✅ DEMO TRADE SIMULATION
   * Simulate realistic trade outcomes for demo
   */
  public simulateTradeOutcome(
    optionType: 'call' | 'put',
    strikePrice: number,
    entryPrice: number,
    finalPrice: number
  ): { outcome: 'win' | 'loss' | 'tie'; payout: number; profit: number } {
    let outcome: 'win' | 'loss' | 'tie';
    let payout: number;
    let profit: number;

    if (optionType === 'call') {
      if (finalPrice > strikePrice) {
        outcome = 'win';
        payout = Math.max(0, finalPrice - strikePrice) * 100; // $100 per $1 above strike
        profit = payout - 10; // $10 premium cost
      } else {
        outcome = 'loss';
        payout = 0;
        profit = -10; // Lost premium
      }
    } else { // put
      if (finalPrice < strikePrice) {
        outcome = 'win';
        payout = Math.max(0, strikePrice - finalPrice) * 100; // $100 per $1 below strike
        profit = payout - 10; // $10 premium cost
      } else {
        outcome = 'loss';
        payout = 0;
        profit = -10; // Lost premium
      }
    }

    return { outcome, payout, profit };
  }

  /**
   * ✅ RESET DEMO DATA
   * Clear all demo data for fresh start
   */
  public resetDemoData(): void {
    this.demoUsers.clear();
    this.demoPositions.clear();
    this.nextPositionId = 1;
    console.log('🎮 Demo data reset');
  }
}
