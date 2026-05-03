import Time "mo:base/Time";
import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Float "mo:base/Float";
import Nat "mo:base/Nat";
import Nat32 "mo:base/Nat32";
import Nat64 "mo:base/Nat64";
import Int "mo:base/Int";
import Int64 "mo:base/Int64";
import Array "mo:base/Array";
import Hash "mo:base/Hash";

/**
 * ✅ ATTICUS TREASURY CANISTER
 * Handles deposits, withdrawals, and wallet management
 * Following odin.fun pattern: Essential treasury functions only
 */

persistent actor AtticusTreasury {
    // ✅ TREASURY TYPES
    public type UserData = {
        principal: Principal;
        balance: Float;
        total_deposits: Float;
        total_withdrawals: Float;
        created_at: Int;
    };

    public type PlatformWallet = {
        balance: Float;
        total_deposits: Float;
        total_withdrawals: Float;
        address: Text;
    };

    public type UserTransaction = {
        id: Text;
        user: Principal;
        transaction_type: { #Deposit; #Withdrawal };
        amount: Float;
        deposit_id: ?Text;
        tx_hash: ?Text;
        timestamp: Int;
        status: { #Pending; #Confirmed; #Failed };
    };

    public type WithdrawalRequest = {
        id: Nat;
        user: Principal;
        amount: Float;
        to_address: Text;
        status: { #Pending; #Approved; #Processed; #Rejected };
        created_at: Int;
        processed_at: ?Int;
        tx_hash: ?Text;
        reason: ?Text;
    };

    // ✅ STABLE STATE
    private stable var next_user_id: Nat = 1;
    private stable var next_withdrawal_id: Nat = 1;
    private stable var users: [(Principal, UserData)] = [];
    private stable var user_transactions: [UserTransaction] = [];
    private stable var withdrawal_requests: [(Nat, WithdrawalRequest)] = [];
    private stable var user_address_mapping: [(Text, Principal)] = [];
    
    private stable var platform_wallet: PlatformWallet = {
        balance = 0.0;
        total_deposits = 0.0;
        total_withdrawals = 0.0;
        address = "bc1q9t8fk860xk7hgwggjf8hqdnz0zwtakne6cv5h0n85s0jhzkvxc4qmx3fn0"; // Air-gapped wallet
    };

    // ✅ USER MANAGEMENT
    public func create_user(user: Principal) : async Result.Result<UserData, Text> {
        switch (Array.find(users, func((p, _)) = p == user)) {
            case (?existing_user) {
                #ok(existing_user.1);
            };
            case null {
                let new_user: UserData = {
                    principal = user;
                    balance = 0.0;
                    total_deposits = 0.0;
                    total_withdrawals = 0.0;
                    created_at = Time.now();
                };
                users := Array.append(users, [(user, new_user)]);
                #ok(new_user);
            };
        };
    };

    public func get_user(user: Principal) : async Result.Result<UserData, Text> {
        switch (Array.find(users, func((p, _)) = p == user)) {
            case (?user_data) {
                #ok(user_data.1);
            };
            case null {
                #err("User not found");
            };
        };
    };

    // ✅ WALLET GENERATION
    public func generate_user_wallet(user: Principal) : async Result.Result<Text, Text> {
        switch (await generate_unique_deposit_address(user)) {
            case (#ok(_instructions)) { 
                let address = platform_wallet.address;
                #ok(address);
            };
            case (#err(error)) { #err(error) };
        };
    };

    public func generate_unique_deposit_address(user: Principal) : async Result.Result<Text, Text> {
        let timestamp = Time.now();
        let user_text = Principal.toText(user);
        let hash = Text.hash(user_text # Nat.toText(Int.abs(timestamp)));
        
        let user_hash_short = Nat32.toNat(hash) % 1000000;
        let timestamp_short = Int.abs(timestamp) % 1000000;
        
        let unique_deposit_id = "DEP_" # Nat.toText(user_hash_short) # "_" # Nat.toText(timestamp_short);
        
        // Store the mapping
        user_address_mapping := Array.append(user_address_mapping, [(unique_deposit_id, user)]);
        
        // Check if user exists, if not create them
        switch (Array.find(users, func((p, _)) = p == user)) {
            case (?user_data) {
                let (_, user_data_record) = user_data;
                // For existing users, just update the deposit address mapping
                // The Treasury UserData doesn't have unique_deposit_address field
                // We'll store this in the user_address_mapping instead
                
                let instructions = "Send BTC to: " # platform_wallet.address # "\n" #
                                  "Include memo: " # unique_deposit_id # "\n" #
                                  "This ensures your deposit is credited to your account.";
                #ok(instructions);
            };
            case null { 
                // Create user if they don't exist
                let new_user_data = {
                    principal = user;
                    balance = 0.0;
                    total_deposits = 0.0;
                    total_withdrawals = 0.0;
                    created_at = Time.now();
                };
                users := Array.append(users, [(user, new_user_data)]);
                
                let instructions = "Send BTC to: " # platform_wallet.address # "\n" #
                                  "Include memo: " # unique_deposit_id # "\n" #
                                  "This ensures your deposit is credited to your account.";
                #ok(instructions);
            };
        };
    };

    public query func get_user_deposit_address(user: Principal) : async Result.Result<Text, Text> {
        switch (Array.find(users, func((p, _)) = p == user)) {
            case (?user_data) {
                #ok(platform_wallet.address);
            };
            case null {
                #err("User not found");
            };
        };
    };

    // ✅ DEPOSIT PROCESSING
    public func deposit_bitcoin(user: Principal, amount_satoshis: Nat) : async Result.Result<Text, Text> {
        let amount_btc = Float.fromInt(Int.abs(amount_satoshis)) / 100000000.0;
        
        ignore await create_user(user);
        
        switch (Array.find(users, func((p, _)) = p == user)) {
            case (?user_data) {
                let (_, user_data_record) = user_data;
                let updated = {
                    user_data_record with
                    balance = user_data_record.balance + amount_btc;
                    total_deposits = user_data_record.total_deposits + amount_btc;
                };
                users := Array.map(users, func((p, u)) = if (p == user) { (p, updated) } else { (p, u) });

                platform_wallet := {
                    platform_wallet with
                    balance = platform_wallet.balance + amount_btc;
                    total_deposits = platform_wallet.total_deposits + amount_btc;
                };

                // Create transaction record
                let now = Time.now();
                let tx_id = "DEP_" # Nat.toText(Int.abs(now));
                let transaction: UserTransaction = {
                    id = tx_id;
                    user = user;
                    transaction_type = #Deposit;
                    amount = amount_btc;
                    deposit_id = null;
                    tx_hash = null;
                    timestamp = now;
                    status = #Confirmed;
                };
                user_transactions := Array.append(user_transactions, [transaction]);

                #ok("Deposit processed: " # Float.toText(amount_btc) # " BTC");
            };
            case null { #err("User creation failed") };
        };
    };

    // ✅ WITHDRAWAL PROCESSING
    public func withdraw_bitcoin(user: Principal, amount_satoshis: Nat, to_address: Text) : async Result.Result<Text, Text> {
        let amount_btc = Float.fromInt(Int.abs(amount_satoshis)) / 100000000.0;
        
        ignore await create_user(user);
        
        switch (Array.find(users, func((p, _)) = p == user)) {
            case (?user_data) {
                let (_, user_data_record) = user_data;
                if (user_data_record.balance < amount_btc) {
                    #err("Insufficient balance");
                } else {
                    // Create withdrawal request
                    let request_id = next_withdrawal_id;
                    next_withdrawal_id += 1;
                    
                    let withdrawal_request: WithdrawalRequest = {
                        id = request_id;
                        user = user;
                        amount = amount_btc;
                        to_address = to_address;
                        status = #Pending;
                        created_at = Time.now();
                        processed_at = null;
                        tx_hash = null;
                        reason = null;
                    };
                    
                    withdrawal_requests := Array.append(withdrawal_requests, [(request_id, withdrawal_request)]);
                    
                    #ok("Withdrawal request created: " # Nat.toText(request_id));
                };
            };
            case null { #err("User not found") };
        };
    };

    // ✅ QUERY FUNCTIONS
    public query func get_platform_wallet() : async PlatformWallet {
        platform_wallet;
    };

    public query func get_user_transactions(user: Principal) : async [UserTransaction] {
        Array.filter(user_transactions, func(tx) = tx.user == user);
    };

    public query func get_withdrawal_requests(user: Principal) : async [WithdrawalRequest] {
        let user_requests = Array.filter(withdrawal_requests, func((_, req)) = req.user == user);
        Array.map(user_requests, func((_, req)) = req);
    };

    public query func get_all_withdrawal_requests() : async [WithdrawalRequest] {
        Array.map(withdrawal_requests, func((_, req)) = req);
    };

    // ✅ ADMIN FUNCTIONS (for treasury management)
    public func admin_approve_withdrawal(request_id: Nat) : async Result.Result<Text, Text> {
        switch (Array.find(withdrawal_requests, func((id, _)) = id == request_id)) {
            case (?request) {
                let updated_request = {
                    request.1 with
                    status = #Approved;
                };
                withdrawal_requests := Array.map(withdrawal_requests, func((id, req)) = 
                    if (id == request_id) { (id, updated_request) } else { (id, req) }
                );
                #ok("Withdrawal approved");
            };
            case null { #err("Withdrawal request not found") };
        };
    };

    public func admin_reject_withdrawal(request_id: Nat, reason: Text) : async Result.Result<Text, Text> {
        switch (Array.find(withdrawal_requests, func((id, _)) = id == request_id)) {
            case (?request) {
                let updated_request = {
                    request.1 with
                    status = #Rejected;
                    reason = ?reason;
                };
                withdrawal_requests := Array.map(withdrawal_requests, func((id, req)) = 
                    if (id == request_id) { (id, updated_request) } else { (id, req) }
                );
                #ok("Withdrawal rejected");
            };
            case null { #err("Withdrawal request not found") };
        };
    };

    public func admin_mark_withdrawal_processed(request_id: Nat, tx_hash: Text) : async Result.Result<Text, Text> {
        switch (Array.find(withdrawal_requests, func((id, _)) = id == request_id)) {
            case (?request) {
                let updated_request = {
                    request.1 with
                    status = #Processed;
                    processed_at = ?Time.now();
                    tx_hash = ?tx_hash;
                };
                withdrawal_requests := Array.map(withdrawal_requests, func((id, req)) = 
                    if (id == request_id) { (id, updated_request) } else { (id, req) }
                );
                #ok("Withdrawal marked as processed");
            };
            case null { #err("Withdrawal request not found") };
        };
    };
}
