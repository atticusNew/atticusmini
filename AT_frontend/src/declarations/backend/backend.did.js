export const idlFactory = ({ IDL }) => {
  const Result = IDL.Variant({ 'ok' : IDL.Text, 'err' : IDL.Text });
  const UserData = IDL.Record({
    'principal' : IDL.Principal,
    'bitcoin_address' : IDL.Text,
    'balance' : IDL.Float64,
    'total_deposits' : IDL.Float64,
    'total_withdrawals' : IDL.Float64,
    'created_at' : IDL.Int,
    'unique_deposit_address' : IDL.Opt(IDL.Text),
  });
  const Result_5 = IDL.Variant({ 'ok' : UserData, 'err' : IDL.Text });
  const Result_4 = IDL.Variant({ 'ok' : IDL.Principal, 'err' : IDL.Text });
  const TradeStatus = IDL.Variant({
    'Active' : IDL.Null,
    'Expired' : IDL.Null,
    'Settled' : IDL.Null,
  });
  const OptionType = IDL.Variant({ 'Put' : IDL.Null, 'Call' : IDL.Null });
  const Position = IDL.Record({
    'id' : IDL.Nat,
    'pnl' : IDL.Float64,
    'status' : TradeStatus,
    'option_type' : OptionType,
    'strike_price' : IDL.Float64,
    'opened_at' : IDL.Int,
    'size' : IDL.Float64,
    'user' : IDL.Principal,
    'expiry_timestamp' : IDL.Int,
    'expiry' : IDL.Text,
    'current_value' : IDL.Float64,
    'entry_premium' : IDL.Float64,
    'settlement_price' : IDL.Opt(IDL.Float64),
    'entry_price' : IDL.Float64,
    'settled_at' : IDL.Opt(IDL.Int),
  });
  const AdminLog = IDL.Record({
    'action' : IDL.Text,
    'timestamp' : IDL.Int,
    'details' : IDL.Text,
  });
  const UserTransaction = IDL.Record({
    'id' : IDL.Text,
    'status' : IDL.Variant({
      'Failed' : IDL.Null,
      'Confirmed' : IDL.Null,
      'Pending' : IDL.Null,
    }),
    'transaction_type' : IDL.Variant({
      'Deposit' : IDL.Null,
      'Withdrawal' : IDL.Null,
    }),
    'deposit_id' : IDL.Opt(IDL.Text),
    'user' : IDL.Principal,
    'timestamp' : IDL.Int,
    'tx_hash' : IDL.Opt(IDL.Text),
    'amount' : IDL.Float64,
  });
  const WithdrawalRequest = IDL.Record({
    'id' : IDL.Nat,
    'status' : IDL.Variant({
      'Approved' : IDL.Null,
      'Processed' : IDL.Null,
      'Rejected' : IDL.Null,
      'Pending' : IDL.Null,
    }),
    'user' : IDL.Principal,
    'created_at' : IDL.Int,
    'to_address' : IDL.Text,
    'processed_at' : IDL.Opt(IDL.Int),
    'rejection_reason' : IDL.Opt(IDL.Text),
    'tx_hash' : IDL.Opt(IDL.Text),
    'amount' : IDL.Float64,
  });
  const PlatformTradingSummary = IDL.Record({
    'total_pnl' : IDL.Float64,
    'total_trades' : IDL.Nat,
    'win_rate' : IDL.Float64,
    'total_volume' : IDL.Float64,
  });
  const PlatformWallet = IDL.Record({
    'balance' : IDL.Float64,
    'total_deposits' : IDL.Float64,
    'total_withdrawals' : IDL.Float64,
    'address' : IDL.Text,
  });
  const UserTradeSummary = IDL.Record({
    'loss_count' : IDL.Nat,
    'trades' : IDL.Vec(Position),
    'total_pnl' : IDL.Float64,
    'total_trades' : IDL.Nat,
    'win_count' : IDL.Nat,
  });
  const Result_3 = IDL.Variant({ 'ok' : IDL.Nat, 'err' : IDL.Text });
  const SettlementResult = IDL.Record({
    'profit' : IDL.Float64,
    'outcome' : IDL.Text,
    'payout' : IDL.Float64,
  });
  const Result_2 = IDL.Variant({ 'ok' : SettlementResult, 'err' : IDL.Text });
  const Result_1 = IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text });
  return IDL.Service({
    'admin_add_liquidity' : IDL.Func([IDL.Float64], [Result], []),
    'admin_approve_withdrawal' : IDL.Func([IDL.Nat], [Result], []),
    'admin_clean_test_accounts' : IDL.Func([], [IDL.Text], []),
    'admin_credit_user_balance' : IDL.Func(
        [IDL.Principal, IDL.Float64],
        [Result],
        [],
      ),
    'admin_mark_withdrawal_processed' : IDL.Func(
        [IDL.Nat, IDL.Text],
        [Result],
        [],
      ),
    'admin_reconcile_balances' : IDL.Func([], [IDL.Text], []),
    'admin_reject_withdrawal' : IDL.Func([IDL.Nat, IDL.Text], [Result], []),
    'admin_reset_platform_data' : IDL.Func([], [IDL.Text], []),
    'admin_withdraw_liquidity' : IDL.Func(
        [IDL.Float64, IDL.Text],
        [Result],
        [],
      ),
    'create_user' : IDL.Func([IDL.Principal], [Result_5], []),
    'deposit_bitcoin' : IDL.Func([IDL.Principal, IDL.Nat], [Result], []),
    'find_user_by_deposit_address' : IDL.Func(
        [IDL.Text],
        [Result_4],
        ['query'],
      ),
    'generate_unique_deposit_address' : IDL.Func([IDL.Principal], [Result], []),
    'generate_user_wallet' : IDL.Func([IDL.Principal], [Result], []),
    'get_active_positions' : IDL.Func(
        [IDL.Principal],
        [IDL.Vec(Position)],
        ['query'],
      ),
    'get_admin_logs' : IDL.Func([], [IDL.Vec(AdminLog)], ['query']),
    'get_all_positions' : IDL.Func([], [IDL.Vec(Position)], ['query']),
    'get_all_transactions' : IDL.Func(
        [],
        [IDL.Vec(UserTransaction)],
        ['query'],
      ),
    'get_all_user_addresses' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(IDL.Principal, IDL.Text))],
        ['query'],
      ),
    'get_all_users' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(IDL.Principal, UserData))],
        ['query'],
      ),
    'get_all_withdrawals' : IDL.Func(
        [],
        [IDL.Vec(WithdrawalRequest)],
        ['query'],
      ),
    'get_btc_price' : IDL.Func([], [IDL.Float64], ['query']),
    'get_pending_withdrawals' : IDL.Func(
        [],
        [IDL.Vec(WithdrawalRequest)],
        ['query'],
      ),
    'get_platform_trading_summary' : IDL.Func(
        [],
        [PlatformTradingSummary],
        ['query'],
      ),
    'get_platform_wallet' : IDL.Func([], [PlatformWallet], ['query']),
    'get_user' : IDL.Func([IDL.Principal], [IDL.Opt(UserData)], ['query']),
    'get_user_deposit_address' : IDL.Func([IDL.Principal], [Result], ['query']),
    'get_user_trade_summary' : IDL.Func(
        [IDL.Principal],
        [UserTradeSummary],
        ['query'],
      ),
    'get_user_transactions' : IDL.Func(
        [IDL.Principal],
        [IDL.Vec(UserTransaction)],
        ['query'],
      ),
    'get_user_wallet' : IDL.Func(
        [IDL.Principal],
        [IDL.Opt(IDL.Text)],
        ['query'],
      ),
    'initialize_platform_wallet' : IDL.Func([], [Result], []),
    'log_admin_action' : IDL.Func([IDL.Text, IDL.Text], [], []),
    'place_option_order' : IDL.Func(
        [
          IDL.Principal,
          OptionType,
          IDL.Nat,
          IDL.Text,
          IDL.Nat,
          IDL.Opt(IDL.Float64),
        ],
        [Result_3],
        [],
      ),
    'request_withdrawal' : IDL.Func(
        [IDL.Principal, IDL.Nat, IDL.Text],
        [Result_3],
        [],
      ),
    'set_platform_bitcoin_address' : IDL.Func([IDL.Text], [Result], []),
    'settleTrade' : IDL.Func(
        [IDL.Nat, IDL.Nat64, IDL.Principal],
        [Result_2],
        [],
      ),
    'update_btc_price' : IDL.Func([IDL.Float64], [Result_1], []),
    'withdraw_bitcoin' : IDL.Func(
        [IDL.Principal, IDL.Nat, IDL.Text],
        [Result],
        [],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
