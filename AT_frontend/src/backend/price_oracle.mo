import Timer "mo:base/Timer";
import Time "mo:base/Time";
import Float "mo:base/Float";
import Text "mo:base/Text";
import Result "mo:base/Result";
import Principal "mo:base/Principal";
import Array "mo:base/Array";

persistent actor PriceOracle {
    // Types
    public type PriceData = {
        price: Float;
        timestamp: Int;
        source: Text;
    };

    public type PriceUpdateCallback = {
        callback: shared (PriceData) -> async ();
        principal: Principal;
    };

    // State
    private stable var btc_price: Float = 0.0;
    private stable var last_update: Int = 0;
    private stable var price_history: [(Int, Float)] = [];
    private transient var callbacks: [PriceUpdateCallback] = [];
    private stable var price_source: Text = "coinbase_pro";
    
    // ✅ CRITICAL FIX: Add throttling variables
    private stable var last_price_update: Int = 0;
    private let MIN_UPDATE_INTERVAL_NS: Int = 1_000_000_000; // 1 second in nanoseconds
    private stable var rejected_updates: Nat = 0; // Track rejected updates for monitoring

    // Initialize with current time
    private func initialize() {
        last_update := Time.now();
        last_price_update := Time.now();
    };

    // Call initialize when actor starts
    initialize();

    // ✅ CRITICAL FIX: Throttled price updates to save cycles
    public func set_btc_price(price: Float) : async Result.Result<(), Text> {
        let now = Time.now();
        
        // ✅ CYCLES SAVER: Only process updates that are at least 1 second apart
        if (now - last_price_update < MIN_UPDATE_INTERVAL_NS) {
            rejected_updates += 1;
            return #ok(); // Silently ignore rapid updates to save cycles
        };
        
        if (price <= 0.0) {
            return #err("Invalid price: must be positive");
        };
        
        btc_price := price;
        last_update := now;
        last_price_update := now;
        
        // Store in price history (keep last 1000 points)
        price_history := Array.append(price_history, [(last_update, price)]);
        if (Array.size(price_history) > 1000) {
            price_history := Array.tabulate<(Int, Float)>(
                Array.size(price_history) - 1,
                func(i) = price_history[i + 1]
            );
        };
        
        // ✅ OPTIMIZED: Only notify subscribers for accepted updates
        let price_data: PriceData = {
            price = price;
            timestamp = last_update;
            source = price_source;
        };
        
        // ✅ CYCLES CONSCIOUS: Use try-catch to prevent one callback failure from breaking others
        for (callback in callbacks.vals()) {
            try {
                await callback.callback(price_data);
            } catch (e) {
                // Continue with other callbacks if one fails - don't waste cycles
            };
        };
        
        #ok()
    };

    // ✅ ENHANCED: Get latest real price with metadata including throttling stats
    public query func get_btc_price() : async {
        price: Float;
        timestamp: Int;
        source: Text;
        age_seconds: Int;
        rejected_updates: Nat;
    } {
        let now = Time.now();
        let age = (now - last_update) / 1_000_000_000; // Convert to seconds
        
        {
            price = btc_price;
            timestamp = last_update;
            source = price_source;
            age_seconds = age;
            rejected_updates = rejected_updates;
        }
    };

    // ✅ NEW: Check if price data is fresh
    public query func is_price_fresh(max_age_seconds: Int) : async Bool {
        let now = Time.now();
        let age = (now - last_update) / 1_000_000_000;
        age <= max_age_seconds
    };

    // ✅ ENHANCED: Get recent price history
    public query func get_price_history(limit: ?Nat) : async [(Int, Float)] {
        let history_size = Array.size(price_history);
        let requested_limit = switch (limit) {
            case (?l) { if (l > history_size) history_size else l };
            case (null) { history_size };
        };
        
        if (requested_limit == 0) {
            []
        } else {
            Array.tabulate<(Int, Float)>(
                requested_limit,
                func(i) = price_history[history_size - requested_limit + i]
            )
        }
    };

    // ✅ NEW: Get price movements in last N minutes
    public query func get_recent_prices(minutes: Nat) : async [(Int, Float)] {
        let cutoff_time = Time.now() - (minutes * 60 * 1_000_000_000);
        Array.filter(price_history, func((timestamp, _)) = timestamp >= cutoff_time)
    };

    // Subscription management
    public func subscribe_to_price_updates(callback: shared (PriceData) -> async ()) : async () {
        let caller = Principal.fromActor(PriceOracle);
        let new_callback: PriceUpdateCallback = {
            callback = callback;
            principal = caller;
        };
        callbacks := Array.append(callbacks, [new_callback]);
    };

    public func unsubscribe_from_price_updates(principal: Principal) : async () {
        callbacks := Array.filter(
            callbacks,
            func(cb) = cb.principal != principal
        );
    };

    // ✅ ENHANCED: Get comprehensive stats including throttling info
    public query func get_price_stats() : async {
        current_price: Float;
        last_update: Int;
        history_size: Nat;
        subscribers: Nat;
        source: Text;
        is_fresh: Bool;
        rejected_updates: Nat;
        update_frequency: Text;
    } {
        let now = Time.now();
        let age = (now - last_update) / 1_000_000_000;
        
        {
            current_price = btc_price;
            last_update = last_update;
            history_size = Array.size(price_history);
            subscribers = Array.size(callbacks);
            source = price_source;
            is_fresh = age < 60; // Fresh if updated within 60 seconds
            rejected_updates = rejected_updates;
            update_frequency = "1 second throttle";
        }
    };

    // ✅ CYCLES MANAGEMENT: Health monitoring timer
    system func timer(setGlobalTimer : Nat64 -> ()) : async () {
        setGlobalTimer(30_000_000_000 : Nat64); // 30 seconds
        // Monitor system health - log rejected updates if too many
        if (rejected_updates > 1000) {
            rejected_updates := 0; // Reset counter
        };
    };

    system func preupgrade() {
        // Save state before upgrade
    };

    system func postupgrade() {
        // Restore state after upgrade
        initialize();
    };
}
