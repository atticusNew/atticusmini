import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { TraderLedgerEntry } from '../services/ledger/LedgerService';

const isCredit = (k: TraderLedgerEntry['kind']): boolean =>
  k === 'payout_credit' ||
  k === 'sellback_refund_credit' ||
  k === 'tie_refund_credit' ||
  k === 'admin_credit';

test('credits and debits are classified correctly', () => {
  assert.equal(isCredit('payout_credit'), true);
  assert.equal(isCredit('sellback_refund_credit'), true);
  assert.equal(isCredit('tie_refund_credit'), true);
  assert.equal(isCredit('admin_credit'), true);
  assert.equal(isCredit('premium_debit'), false);
  assert.equal(isCredit('admin_debit'), false);
});

test('kind labels render trader-friendly names', () => {
  const KIND_LABEL: Record<TraderLedgerEntry['kind'], string> = {
    premium_debit: 'Stake placed',
    payout_credit: 'Win payout',
    sellback_refund_credit: 'Sold back',
    tie_refund_credit: 'Tie refund',
    admin_credit: 'Adjustment',
    admin_debit: 'Adjustment',
  };
  assert.equal(KIND_LABEL.premium_debit, 'Stake placed');
  assert.equal(KIND_LABEL.payout_credit, 'Win payout');
  assert.equal(KIND_LABEL.sellback_refund_credit, 'Sold back');
});
