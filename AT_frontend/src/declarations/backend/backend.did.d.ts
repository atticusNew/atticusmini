import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface AdminLog {
  'action' : string,
  'timestamp' : bigint,
  'details' : string,
}
export type OptionType = { 'Put' : null } |
  { 'Call' : null };
export interface PlatformTradingSummary {
  'total_pnl' : number,
  'total_trades' : bigint,
  'win_rate' : number,
  'total_volume' : number,
}
export interface PlatformWallet {
  'balance' : number,
  'total_deposits' : number,
  'total_withdrawals' : number,
  'address' : string,
}
export interface Position {
  'id' : bigint,
  'pnl' : number,
  'status' : TradeStatus,
  'option_type' : OptionType,
  'strike_price' : number,
  'opened_at' : bigint,
  'size' : number,
  'user' : Principal,
  'expiry_timestamp' : bigint,
  'expiry' : string,
  'current_value' : number,
  'entry_premium' : number,
  'settlement_price' : [] | [number],
  'entry_price' : number,
  'settled_at' : [] | [bigint],
}
export type Result = { 'ok' : string } |
  { 'err' : string };
export type Result_1 = { 'ok' : null } |
  { 'err' : string };
export type Result_2 = { 'ok' : SettlementResult } |
  { 'err' : string };
export type Result_3 = { 'ok' : bigint } |
  { 'err' : string };
export type Result_4 = { 'ok' : Principal } |
  { 'err' : string };
export type Result_5 = { 'ok' : UserData } |
  { 'err' : string };
export interface SettlementResult {
  'profit' : number,
  'outcome' : string,
  'payout' : number,
}
export type TradeStatus = { 'Active' : null } |
  { 'Expired' : null } |
  { 'Settled' : null };
export interface UserData {
  'principal' : Principal,
  'bitcoin_address' : string,
  'balance' : number,
  'total_deposits' : number,
  'total_withdrawals' : number,
  'created_at' : bigint,
  'unique_deposit_address' : [] | [string],
}
export interface UserTradeSummary {
  'loss_count' : bigint,
  'trades' : Array<Position>,
  'total_pnl' : number,
  'total_trades' : bigint,
  'win_count' : bigint,
}
export interface UserTransaction {
  'id' : string,
  'status' : { 'Failed' : null } |
    { 'Confirmed' : null } |
    { 'Pending' : null },
  'transaction_type' : { 'Deposit' : null } |
    { 'Withdrawal' : null },
  'deposit_id' : [] | [string],
  'user' : Principal,
  'timestamp' : bigint,
  'tx_hash' : [] | [string],
  'amount' : number,
}
export interface WithdrawalRequest {
  'id' : bigint,
  'status' : { 'Approved' : null } |
    { 'Processed' : null } |
    { 'Rejected' : null } |
    { 'Pending' : null },
  'user' : Principal,
  'created_at' : bigint,
  'to_address' : string,
  'processed_at' : [] | [bigint],
  'rejection_reason' : [] | [string],
  'tx_hash' : [] | [string],
  'amount' : number,
}
export interface _SERVICE {
  'admin_add_liquidity' : ActorMethod<[number], Result>,
  'admin_approve_withdrawal' : ActorMethod<[bigint], Result>,
  'admin_clean_test_accounts' : ActorMethod<[], string>,
  'admin_credit_user_balance' : ActorMethod<[Principal, number], Result>,
  'admin_mark_withdrawal_processed' : ActorMethod<[bigint, string], Result>,
  'admin_reconcile_balances' : ActorMethod<[], string>,
  'admin_reject_withdrawal' : ActorMethod<[bigint, string], Result>,
  'admin_reset_platform_data' : ActorMethod<[], string>,
  'admin_withdraw_liquidity' : ActorMethod<[number, string], Result>,
  'create_user' : ActorMethod<[Principal], Result_5>,
  'deposit_bitcoin' : ActorMethod<[Principal, bigint], Result>,
  'find_user_by_deposit_address' : ActorMethod<[string], Result_4>,
  'generate_unique_deposit_address' : ActorMethod<[Principal], Result>,
  'generate_user_wallet' : ActorMethod<[Principal], Result>,
  'get_active_positions' : ActorMethod<[Principal], Array<Position>>,
  'get_admin_logs' : ActorMethod<[], Array<AdminLog>>,
  'get_all_positions' : ActorMethod<[], Array<Position>>,
  'get_all_transactions' : ActorMethod<[], Array<UserTransaction>>,
  'get_all_user_addresses' : ActorMethod<[], Array<[Principal, string]>>,
  'get_all_users' : ActorMethod<[], Array<[Principal, UserData]>>,
  'get_all_withdrawals' : ActorMethod<[], Array<WithdrawalRequest>>,
  'get_btc_price' : ActorMethod<[], number>,
  'get_pending_withdrawals' : ActorMethod<[], Array<WithdrawalRequest>>,
  'get_platform_trading_summary' : ActorMethod<[], PlatformTradingSummary>,
  'get_platform_wallet' : ActorMethod<[], PlatformWallet>,
  'get_user' : ActorMethod<[Principal], [] | [UserData]>,
  'get_user_deposit_address' : ActorMethod<[Principal], Result>,
  'get_user_trade_summary' : ActorMethod<[Principal], UserTradeSummary>,
  'get_user_transactions' : ActorMethod<[Principal], Array<UserTransaction>>,
  'get_user_wallet' : ActorMethod<[Principal], [] | [string]>,
  'initialize_platform_wallet' : ActorMethod<[], Result>,
  'log_admin_action' : ActorMethod<[string, string], undefined>,
  'place_option_order' : ActorMethod<
    [Principal, OptionType, bigint, string, bigint, [] | [number]],
    Result_3
  >,
  'request_withdrawal' : ActorMethod<[Principal, bigint, string], Result_3>,
  'set_platform_bitcoin_address' : ActorMethod<[string], Result>,
  'settleTrade' : ActorMethod<[bigint, bigint, Principal], Result_2>,
  'update_btc_price' : ActorMethod<[number], Result_1>,
  'withdraw_bitcoin' : ActorMethod<[Principal, bigint, string], Result>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
