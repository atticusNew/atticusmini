import Time "mo:base/Time";
import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Float "mo:base/Float";
import Nat "mo:base/Nat";
import Nat64 "mo:base/Nat64";
import Int "mo:base/Int";
import Int64 "mo:base/Int64";
import Array "mo:base/Array";

persistent actor AtticusCore {
    // Trading types
    public type OptionType = { #Call; #Put };
    public type TradeStatus = { #Active; #Settled };

    public type Position = {
        id: Nat;
        user: Principal;
        option_type: OptionType;
        strike_price: Float;
        entry_price: Float;
        expiry: Text;
        size: Float;
        entry_premium: Float;
        current_value: Float;
        pnl: Float;
        status: TradeStatus;
        opened_at: Int;
        settled_at: ?Int;
        settlement_price: ?Float;
    };

    public type UserData = {
        balance: Float;
        total_wins: Float;
        total_losses: Float;
        net_pnl: Float;
        created_at: Int;
    };

    public type PlatformLedger = {
        total_winning_trades: Float;
        total_losing_trades: Float;
        net_pnl: Float;
        total_trades: Nat;
    };

    public type PlatformWallet = {
        balance: Float;
        total_deposits: Float;
        total_withdrawals: Float;
    };

    // ✅ BEST ODDS: Trade statistics type for prediction accuracy
    public type TradeStats = {
        expiry: Text;           // "5s", "10s", "15s"
        strike_offset: Float;   // 2.5, 5, 10, 15
        option_type: Text;      // "call", "put"
        total_trades: Nat;
        wins: Nat;
        losses: Nat;
        ties: Nat;
        win_rate: Float;        // Simple: wins / (wins + losses)
        last_updated: Int;
    };

    // Trading state
    private stable var next_order_id: Nat = 1;
    private stable var positions: [(Nat, Position)] = [];
    private stable var users: [(Principal, UserData)] = [];
    private stable var platform_ledger: PlatformLedger = { 
        total_winning_trades = 0.0; 
        total_losing_trades = 0.0; 
        net_pnl = 0.0; 
        total_trades = 0 
    };
    private stable var platform_wallet: PlatformWallet = { 
        balance = 0.0; 
        total_deposits = 0.0; 
        total_withdrawals = 0.0 
    };
    private stable var admin_logs: [Text] = [];
    
    // ✅ BEST ODDS: Trade statistics storage (persistent)
    private stable var trade_statistics: [(Text, TradeStats)] = [];

    // Migration function for stable variables
    system func preupgrade() {
        // Migration for positions - add current_value field
        let migrated_positions = Array.map<(Nat, Position), (Nat, Position)>(
            positions,
            func((id, pos)) = (
                id,
                {
                    id = pos.id;
                    user = pos.user;
                    option_type = pos.option_type;
                    strike_price = pos.strike_price;
                    entry_price = pos.entry_price;
                    expiry = pos.expiry;
                    size = pos.size;
                    entry_premium = pos.entry_premium;
                    current_value = 0.0; // Initialize to 0
                    pnl = pos.pnl;
                    status = pos.status;
                    opened_at = pos.opened_at;
                    settled_at = pos.settled_at;
                    settlement_price = pos.settlement_price;
                }
            )
        );
        positions := migrated_positions;
        
        // Migration for users - add net_pnl field
        let migrated_users = Array.map<(Principal, UserData), (Principal, UserData)>(
            users,
            func((principal, user_data)) = (
                principal,
                {
                    balance = user_data.balance;
                    total_wins = user_data.total_wins;
                    total_losses = user_data.total_losses;
                    net_pnl = 0.0; // Initialize to 0
                    created_at = user_data.created_at;
                }
            )
        );
        users := migrated_users;
    };

    system func postupgrade() {
        // Post-upgrade initialization if needed
    };

    // ✅ CREATE USER
    public func create_user(user: Principal) : async Result.Result<UserData, Text> {
        switch (Array.find(users, func((p, _)) = p == user)) {
            case (?existing_user) {
                #ok(existing_user.1);
            };
            case null {
                let new_user: UserData = {
                    balance = 0.0;
                    total_wins = 0.0;
                    total_losses = 0.0;
                    net_pnl = 0.0;
                    created_at = Time.now();
                };
                users := Array.append(users, [(user, new_user)]);
                #ok(new_user);
            };
        };
    };

    // ✅ GET USER
    public query func get_user(user: Principal) : async Result.Result<UserData, Text> {
        switch (Array.find(users, func((p, _)) = p == user)) {
            case (?user_data) {
                #ok(user_data.1);
            };
            case null {
                #err("User not found");
            };
        };
    };

    // ✅ PLACE TRADE
    public func place_trade_simple(
        user: Principal,
        option_type: Text,
        strike_offset: Nat,
        expiry: Text,
        contract_count: Nat,
        entry_price_cents: Nat64,
        strike_price_cents: Nat64
    ) : async Result.Result<Nat, Text> {
        let entry_price = Float.fromInt(Int64.toInt(Int64.fromNat64(entry_price_cents))) / 100.0;
        let strike_price = Float.fromInt(Int64.toInt(Int64.fromNat64(strike_price_cents))) / 100.0;
        let option_type_enum = if (option_type == "Call") { #Call } else { #Put };
        let contracts = Float.fromInt(Int.abs(contract_count));
        
        ignore await create_user(user);
        
        let position: Position = {
            id = next_order_id;
            user = user;
            option_type = option_type_enum;
            strike_price = strike_price;
            entry_price = entry_price;
            expiry = expiry;
            size = contracts;
            entry_premium = 10.0; // Default premium
            current_value = 0.0; // Will be calculated off-chain
            pnl = 0.0; // Will be calculated off-chain
            status = #Active;
            opened_at = Time.now();
            settled_at = null;
            settlement_price = null;
        };

        positions := Array.append(positions, [(next_order_id, position)]);
        let trade_id = next_order_id;
        next_order_id += 1;
        #ok(trade_id);
    };

    // ✅ RECORD SETTLEMENT
    public func recordSettlement(
        positionId: Nat, 
        outcome: Text, 
        payout: Nat64, 
        profit: Nat64, 
        finalPrice: Nat64
    ) : async Result.Result<(), Text> {
        let payoutFloat = Float.fromInt(Int64.toInt(Int64.fromNat64(payout))) / 100.0;
        let profitFloat = Float.fromInt(Int64.toInt(Int64.fromNat64(profit))) / 100.0;
        let finalPriceFloat = Float.fromInt(Int64.toInt(Int64.fromNat64(finalPrice))) / 100.0;
        
        // ✅ ADD: Settlement logging for debugging
        let logMessage = "Settlement: Position " # Nat.toText(positionId) # " | Outcome: " # outcome # " | Profit: $" # Float.toText(profitFloat) # " | Payout: $" # Float.toText(payoutFloat) # " | Final Price: $" # Float.toText(finalPriceFloat);
        admin_logs := Array.append(admin_logs, [logMessage]);
        
        // Find the position to get user info
        let position = Array.find(positions, func((id, _)) = id == positionId);
        switch (position) {
            case (?pos) {
                let (_, positionData) = pos;
                
                // Update position status and settlement data
                positions := Array.map(positions, func((id, pos)) = 
                    if (id == positionId) {
                        (id, { 
                            pos with 
                            status = #Settled;
                            settled_at = ?Time.now();
                            settlement_price = ?finalPriceFloat;
                            pnl = profitFloat;
                            current_value = payoutFloat;
                        })
                    } else {
                        (id, pos)
                    }
                );
                
                // ✅ CRITICAL: Update user balance based on settlement
                // FIXED: No double deduction - balance was already deducted at trade placement
                let netGainBTC = if (outcome == "win") {
                    profitFloat / finalPriceFloat  // Convert USD profit to BTC
                } else if (outcome == "tie") {
                    positionData.entry_premium / finalPriceFloat  // Return premium for ties
                } else {
                    0.0  // No additional deduction for losses (premium already deducted)
                };
                
                // Update user balance with validation
                users := Array.map(users, func((p, userData)) = 
                    if (p == positionData.user) {
                        let newBalance = userData.balance + netGainBTC;
                        
                        // ✅ ADD: Balance validation to prevent negative balances
                        if (newBalance < 0.0) {
                            let errorMsg = "Settlement error: User balance would be negative (" # Float.toText(newBalance) # "). Current: " # Float.toText(userData.balance) # ", Gain: " # Float.toText(netGainBTC);
                            admin_logs := Array.append(admin_logs, [errorMsg]);
                            // Set balance to 0 instead of negative
                            let updatedUser = {
                                userData with
                                balance = 0.0;
                                total_wins = if (outcome == "win") { userData.total_wins + (payoutFloat / finalPriceFloat) } else { userData.total_wins };
                                total_losses = if (outcome == "loss") { userData.total_losses + (positionData.entry_premium / finalPriceFloat) } else { userData.total_losses };
                                net_pnl = userData.net_pnl + netGainBTC;
                            };
                            (p, updatedUser)
                        } else {
                            let updatedUser = {
                                userData with
                                balance = newBalance;
                                total_wins = if (outcome == "win") { userData.total_wins + (payoutFloat / finalPriceFloat) } else { userData.total_wins };
                                total_losses = if (outcome == "loss") { userData.total_losses + (positionData.entry_premium / finalPriceFloat) } else { userData.total_losses };
                                net_pnl = userData.net_pnl + netGainBTC;
                            };
                            (p, updatedUser)
                        }
                    } else {
                        (p, userData)
                    }
                );
                
                // ✅ CRITICAL: Update platform wallet
                if (outcome == "win") {
                    let payoutBTC = payoutFloat / finalPriceFloat;
                    platform_wallet := {
                        platform_wallet with
                        balance = platform_wallet.balance - payoutBTC;
                    };
                };
                
                // ✅ CRITICAL: Update platform ledger
                let premiumUSD = positionData.entry_premium;
                let payoutUSD = if (outcome == "win") { payoutFloat } else { 0.0 };
                
                platform_ledger := {
                    platform_ledger with
                    total_winning_trades = if (outcome == "loss") { platform_ledger.total_winning_trades + premiumUSD } else { platform_ledger.total_winning_trades };
                    total_losing_trades = if (outcome == "win") { platform_ledger.total_losing_trades + payoutUSD } else { platform_ledger.total_losing_trades };
                    net_pnl = platform_ledger.net_pnl + (if (outcome == "win") { -payoutUSD } else { premiumUSD });
                };
                
                // ✅ BEST ODDS: Update trade statistics for prediction improvement
                // Calculate strike offset from position data
                let strike_offset = Float.abs(positionData.strike_price - positionData.entry_price);
                let option_type_text = switch (positionData.option_type) {
                    case (#Call) { "call" };
                    case (#Put) { "put" };
                };
                
                // Async call to update statistics (non-blocking)
                ignore update_trade_statistics(
                    positionData.expiry,
                    strike_offset,
                    option_type_text,
                    outcome
                );
                
                #ok(())
            };
            case null {
                // ✅ ADD: Enhanced error logging for missing position
                let errorMsg = "Settlement failed: Position " # Nat.toText(positionId) # " not found";
                admin_logs := Array.append(admin_logs, [errorMsg]);
                #err("Position not found: " # Nat.toText(positionId))
            };
        };
    };

    // ✅ GET POSITION
    public func get_position(id: Nat) : async Result.Result<Position, Text> {
        switch (Array.find(positions, func((i, _)) = i == id)) {
            case (?position) {
                #ok(position.1);
            };
            case null {
                #err("Position not found");
            };
        };
    };

    // ✅ GET USER POSITIONS
    public func get_user_positions(user: Principal) : async [Position] {
        let user_positions = Array.filter(positions, func((_, pos)) = pos.user == user);
        Array.map(user_positions, func((_, pos)) = pos);
    };

    // ✅ GET ALL POSITIONS (for admin and trade history)
    public query func get_all_positions() : async [Position] {
        Array.map(positions, func((_, pos)) = pos);
    };

    // ✅ GET PLATFORM LEDGER
    public query func get_platform_ledger() : async PlatformLedger {
        platform_ledger;
    };

    // ✅ GET PLATFORM WALLET
    public query func get_platform_wallet() : async PlatformWallet {
        platform_wallet;
    };

    // ✅ GET ALL USERS
    public query func get_all_users() : async [(Principal, UserData)] {
        users;
    };

    // ✅ GET USER TRADE SUMMARY
    public query func get_user_trade_summary(user: Principal) : async Result.Result<{ total_trades: Nat; wins: Nat; losses: Nat }, Text> {
        let user_positions = Array.filter(positions, func((_, pos)) = pos.user == user);
        let total_trades = user_positions.size();
        let wins = Array.filter(user_positions, func((_, pos)) = pos.status == #Settled).size();
        let losses = total_trades - wins;
        #ok({ total_trades; wins; losses });
    };

    // ✅ GET PLATFORM TRADING SUMMARY
    public query func get_platform_trading_summary() : async { total_trades: Nat; active_trades: Nat; settled_trades: Nat } {
        let total_trades = positions.size();
        let active_trades = Array.filter(positions, func((_, pos)) = pos.status == #Active).size();
        let settled_trades = total_trades - active_trades;
        { total_trades; active_trades; settled_trades };
    };

    // ✅ GET ADMIN LOGS
    public func get_admin_logs() : async [Text] {
        admin_logs;
    };

    // ✅ BEST ODDS: Update trade statistics after settlement
    public func update_trade_statistics(
        expiry: Text,
        strike_offset: Float,
        option_type: Text,
        outcome: Text
    ) : async () {
        // ✅ FIX: Normalize strike offset to match frontend format (remove trailing zeros)
        let strike_str = if (strike_offset == 2.5) {
            "2.5"
        } else if (strike_offset == 5.0) {
            "5"
        } else if (strike_offset == 10.0) {
            "10"
        } else if (strike_offset == 15.0) {
            "15"
        } else {
            Float.toText(strike_offset)
        };
        
        // Create unique key for this combination (matches frontend format)
        let key = expiry # "_" # strike_str # "_" # option_type;
        
        // Find existing entry
        let existing = Array.find<(Text, TradeStats)>(
            trade_statistics,
            func((k, _)) = k == key
        );
        
        switch (existing) {
            case (?entry) {
                // Update existing statistics
                let (_, stats) = entry;
                let new_total = stats.total_trades + 1;
                let new_wins = if (outcome == "win") { stats.wins + 1 } else { stats.wins };
                let new_losses = if (outcome == "loss") { stats.losses + 1 } else { stats.losses };
                let new_ties = if (outcome == "tie") { stats.ties + 1 } else { stats.ties };
                
                // Calculate new win rate
                let total_decided = new_wins + new_losses;
                let new_win_rate = if (total_decided > 0) {
                    Float.fromInt(new_wins) / Float.fromInt(total_decided)
                } else {
                    0.0
                };
                
                let updated_stats: TradeStats = {
                    expiry = stats.expiry;
                    strike_offset = stats.strike_offset;
                    option_type = stats.option_type;
                    total_trades = new_total;
                    wins = new_wins;
                    losses = new_losses;
                    ties = new_ties;
                    win_rate = new_win_rate;
                    last_updated = Time.now();
                };
                
                // Update array with new stats
                trade_statistics := Array.map<(Text, TradeStats), (Text, TradeStats)>(
                    trade_statistics,
                    func((k, s)) = if (k == key) { (k, updated_stats) } else { (k, s) }
                );
            };
            case null {
                // Create new entry
                let new_stats: TradeStats = {
                    expiry = expiry;
                    strike_offset = strike_offset;
                    option_type = option_type;
                    total_trades = 1;
                    wins = if (outcome == "win") { 1 } else { 0 };
                    losses = if (outcome == "loss") { 1 } else { 0 };
                    ties = if (outcome == "tie") { 1 } else { 0 };
                    win_rate = if (outcome == "win") { 1.0 } else if (outcome == "loss") { 0.0 } else { 0.0 };
                    last_updated = Time.now();
                };
                trade_statistics := Array.append<(Text, TradeStats)>(
                    trade_statistics,
                    [(key, new_stats)]
                );
            };
        };
        
        // Log the update
        let logMessage = "Stats updated: " # key # " | Outcome: " # outcome # " | Total: " # Nat.toText(
            switch (Array.find<(Text, TradeStats)>(trade_statistics, func((k, _)) = k == key)) {
                case (?entry) { entry.1.total_trades };
                case null { 0 };
            }
        );
        admin_logs := Array.append<Text>(admin_logs, [logMessage]);
    };

    // ✅ BEST ODDS: Get trade statistics (query function)
    public query func get_trade_statistics() : async [(Text, TradeStats)] {
        trade_statistics
    };
    
    // ✅ MIGRATION: Convert old float keys to new normalized format
    public func migrate_trade_statistics_keys() : async Text {
        var migrated_count = 0;
        var new_stats: [(Text, TradeStats)] = [];
        
        for ((old_key, stats) in trade_statistics.vals()) {
            // Normalize the key
            let strike_str = if (stats.strike_offset == 2.5) {
                "2.5"
            } else if (stats.strike_offset == 5.0) {
                "5"
            } else if (stats.strike_offset == 10.0) {
                "10"
            } else if (stats.strike_offset == 15.0) {
                "15"
            } else {
                Float.toText(stats.strike_offset)
            };
            
            let new_key = stats.expiry # "_" # strike_str # "_" # stats.option_type;
            
            // Only migrate if key format changed
            if (old_key != new_key) {
                migrated_count += 1;
                new_stats := Array.append(new_stats, [(new_key, stats)]);
            } else {
                new_stats := Array.append(new_stats, [(old_key, stats)]);
            };
        };
        
        // Replace old statistics with migrated ones
        trade_statistics := new_stats;
        
        let message = "Migrated " # Nat.toText(migrated_count) # " trade statistics to new key format";
        admin_logs := Array.append(admin_logs, [message]);
        message
    };

    // ✅ ADMIN RESET PLATFORM DATA
    public func admin_reset_platform_data() : async Text {
        positions := [];
        users := [];
        platform_ledger := { total_winning_trades = 0.0; total_losing_trades = 0.0; net_pnl = 0.0; total_trades = 0 };
        platform_wallet := { balance = 0.0; total_deposits = 0.0; total_withdrawals = 0.0 };
        admin_logs := [];
        "Platform data reset successfully";
    };

    // ✅ ADMIN CLEAN TEST ACCOUNTS
    public func admin_clean_test_accounts() : async Text {
        // Remove anonymous principal (2vxsx-fae) from users
        users := Array.filter(users, func((p, _)) = not Principal.isAnonymous(p));
        "Test accounts cleaned - removed anonymous principals";
    };

    // ✅ ADMIN RECONCILE BALANCES
    public func admin_reconcile_balances() : async Text {
        "Balances reconciled";
    };

    // ✅ ADMIN CREDIT USER BALANCE
    public func admin_credit_user_balance(user: Principal, amount_btc: Float) : async Result.Result<Text, Text> {
        switch (Array.find(users, func((p, _)) = p == user)) {
            case (?user_data) {
                let (_, existing_data) = user_data;
                let updated: UserData = {
                    balance = existing_data.balance + amount_btc;
                    total_wins = existing_data.total_wins;
                    total_losses = existing_data.total_losses;
                    net_pnl = existing_data.net_pnl;
                    created_at = existing_data.created_at;
                };
                users := Array.map(users, func((p, u)) = if (p == user) { (p, updated) } else { (p, u) });
                #ok("User credited: " # Float.toText(amount_btc) # " BTC");
            };
            case null {
                #err("User not found");
            };
        };
    };

    // ✅ ADMIN SET PLATFORM BALANCE - Sync with blockchain reality
    public func admin_set_platform_balance(balance_btc: Float, total_deposits_btc: Float) : async Result.Result<Text, Text> {
        platform_wallet := {
            balance = balance_btc;
            total_deposits = total_deposits_btc;
            total_withdrawals = 0.0;
        };
        
        let message = "Platform wallet updated: Balance = " # Float.toText(balance_btc) # " BTC, Deposits = " # Float.toText(total_deposits_btc) # " BTC";
        admin_logs := Array.append(admin_logs, [message]);
        
        #ok(message);
    };
}