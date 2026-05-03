#!/usr/bin/env -S npx tsx
/**
 * reconcile-export
 *
 * Builds a partner reconcile CSV for a given UTC day from the in-memory ledger.
 * Real deployment will read from Postgres via the same LedgerStore interface.
 *
 * Usage:
 *   npx tsx scripts/reconcile-export.ts --date YYYY-MM-DD [--out path]
 */

import { writeFileSync } from 'node:fs';
import { ledgerService } from '../src/services/ledger/LedgerService';

const parseArgs = (): { date: string; out?: string } => {
  const args = process.argv.slice(2);
  const out: { date?: string; out?: string } = {};
  for (let i = 0; i < args.length; i++) {
    const k = args[i];
    if ((k === '--date' || k === '--out') && args[i + 1]) {
      const v = args[i + 1] as string;
      if (k === '--date') out.date = v;
      else out.out = v;
      i++;
    }
  }
  if (!out.date) {
    console.error('usage: reconcile-export --date YYYY-MM-DD [--out path]');
    process.exit(2);
  }
  return out as { date: string; out?: string };
};

const main = async () => {
  const { date, out } = parseArgs();
  const start = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(start)) {
    console.error(`invalid date: ${date}`);
    process.exit(2);
  }
  const window = { fromTs: start, toTs: start + 24 * 60 * 60 * 1000 };
  const { rows, entryIds } = await ledgerService.buildPartnerReconcile(window);
  const csv = ledgerService.exportPartnerReconcileCSV(rows);
  const batchId = `partner-reconcile-${date}`;

  if (out) {
    writeFileSync(out, csv);
    console.error(`wrote ${rows.length} rows (${entryIds.length} entries) to ${out}`);
  } else {
    process.stdout.write(csv);
  }
  await ledgerService.markReconciled(entryIds, batchId);
};

main().catch(err => {
  console.error(err);
  process.exit(1);
});
