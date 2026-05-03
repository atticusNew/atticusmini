import React, { useState } from 'react';
import styled from 'styled-components';
import { BybitAuthClient, BybitAccountInfo } from '../../services/hedging/connectors/BybitAuthClient';

const Panel = styled.div`
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1rem;
  margin: 1rem 0;
  font-family: 'Inter', sans-serif;
`;

const Title = styled.h3`
  font-size: 1rem;
  margin-bottom: 0.5rem;
  color: var(--text);
`;

const Note = styled.div`
  font-size: 0.75rem;
  color: var(--text-dim);
  margin-bottom: 0.75rem;
  line-height: 1.4;
`;

const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--text-dim);
  margin: 0.5rem 0;
`;

const Input = styled.input`
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.5rem 0.65rem;
  color: var(--text);
  font-family: monospace;
  font-size: 0.85rem;
`;

const Toggle = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--text-dim);
  margin: 0.5rem 0;
`;

const Button = styled.button`
  background: var(--accent);
  color: #1a1a1a;
  border: none;
  border-radius: 8px;
  padding: 0.55rem 1rem;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  margin-top: 0.5rem;

  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const Result = styled.pre<{ ok?: boolean }>`
  font-family: monospace;
  font-size: 0.75rem;
  color: ${p => (p.ok === undefined ? 'var(--text)' : p.ok ? 'var(--green)' : 'var(--red)')};
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.75rem;
  margin-top: 0.75rem;
  white-space: pre-wrap;
  word-break: break-all;
`;

const envFallback = (key: string): string => {
  if (typeof import.meta !== 'undefined' && (import.meta as { env?: Record<string, string | undefined> }).env) {
    return ((import.meta as { env: Record<string, string | undefined> }).env[key] as string | undefined) ?? '';
  }
  return '';
};

export const BybitDiagnostic: React.FC = () => {
  const [apiKey, setApiKey] = useState(envFallback('VITE_BYBIT_API_KEY'));
  const [apiSecret, setApiSecret] = useState(envFallback('VITE_BYBIT_API_SECRET'));
  const [testnet, setTestnet] = useState(envFallback('VITE_BYBIT_TESTNET') === 'true');
  const [info, setInfo] = useState<BybitAccountInfo | null>(null);
  const [busy, setBusy] = useState(false);

  const canTest = apiKey.trim().length > 0 && apiSecret.trim().length > 0 && !busy;

  const handleTest = async () => {
    if (!canTest) return;
    setBusy(true);
    setInfo(null);
    try {
      const client = new BybitAuthClient({ apiKey: apiKey.trim(), apiSecret: apiSecret.trim(), testnet });
      setInfo(await client.getAccountInfo());
    } catch (e) {
      setInfo({ reachable: false, authenticated: false, retMsg: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel>
      <Title>Bybit credentials check</Title>
      <Note>
        Read-only signed call to <code>/v5/account/wallet-balance</code>. No orders are placed and
        no funds can move regardless of permissions on the key.
        Inputs live in memory only — they are not stored anywhere and disappear on reload.
      </Note>
      <Field>
        API key
        <Input
          type="text"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder="Bybit API key"
          autoComplete="off"
          spellCheck={false}
        />
      </Field>
      <Field>
        API secret
        <Input
          type="password"
          value={apiSecret}
          onChange={e => setApiSecret(e.target.value)}
          placeholder="Bybit API secret"
          autoComplete="off"
          spellCheck={false}
        />
      </Field>
      <Toggle>
        <input type="checkbox" checked={testnet} onChange={e => setTestnet(e.target.checked)} />
        Use Bybit testnet (api-testnet.bybit.com)
      </Toggle>
      <Button onClick={handleTest} disabled={!canTest}>
        {busy ? 'Testing…' : 'Test connection'}
      </Button>
      {info && (
        <Result ok={info.authenticated}>
{`reachable:       ${info.reachable}
authenticated:   ${info.authenticated}
retCode:         ${info.retCode ?? '-'}
retMsg:          ${info.retMsg ?? '-'}
accountType:     ${info.accountType ?? '-'}
totalEquityUSD:  ${info.totalEquityUSD ?? '-'}`}
        </Result>
      )}
    </Panel>
  );
};
