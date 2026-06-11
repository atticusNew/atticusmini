import React, { useState } from 'react';
import styled from 'styled-components';
import { useLiteSession } from '../state/LiteSessionProvider';
import {
  Screen, ScreenBody, TopBar, Brand, BalanceTag, BigButton, Avatar, StatRow,
} from './ui';
import {
  MAX_AMOUNT_USD, MAX_WAGER_USD, MIN_AMOUNT_USD, MIN_WAGER_USD,
} from '../services/matchEngine';
import { winRate } from '../services/profileService';

const ProfileCard = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--bg-elev);
  border: 2px solid var(--border-strong);
  border-radius: 18px;
  padding: 14px;
  box-shadow: var(--shadow-hard);
  .meta { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .name { font-family: var(--font-display); font-weight: 700; font-size: 18px; }
  .bio { color: var(--text-dim); font-size: 13px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
`;

const Panel = styled.div`
  background: var(--bg-elev);
  border: 2px solid var(--border-strong);
  border-radius: 18px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: var(--shadow-hard);
`;

const PanelHead = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  .label { font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--text-dim); }
  .val { font-family: var(--font-display); font-variant-numeric: tabular-nums; font-weight: 700; font-size: 26px; color: var(--accent); -webkit-text-stroke: 0.6px var(--border-strong); }
`;

const Chips = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
`;

const Chip = styled.button<{ active: boolean }>`
  appearance: none;
  cursor: pointer;
  border-radius: 12px;
  padding: 12px 4px;
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-weight: 800;
  font-size: 14px;
  background: ${p => (p.active ? 'var(--accent)' : 'var(--bg-elev-2)')};
  color: var(--text);
  border: 2px solid var(--border-strong);
  box-shadow: ${p => (p.active ? '2px 2px 0 var(--border-strong)' : 'none')};
  transition: 80ms ease-out;
  &:active { transform: translate(2px, 2px); box-shadow: none; }
`;

const Stepper = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  button {
    appearance: none; cursor: pointer; width: 42px; height: 42px;
    border-radius: 12px; border: 2px solid var(--border-strong);
    background: var(--bg-elev-2); color: var(--text); font-size: 22px; font-weight: 700;
    box-shadow: 2px 2px 0 var(--border-strong);
  }
  button:active:not(:disabled) { transform: translate(2px,2px); box-shadow: none; }
  button:disabled { opacity: 0.4; cursor: not-allowed; box-shadow: none; }
`;

const WAGER_CHIPS = [2, 10, 25, 50];
const AMOUNT_CHIPS = [5, 10, 25, 50];

export const LobbyScreen: React.FC = () => {
  const {
    profile, balance, wagerUSD, amountUSD, setWager, setAmount, deposit, openSwipe, startSolo,
  } = useLiteSession();
  const [depositing, setDepositing] = useState(false);

  const wr = profile ? Math.round(winRate(profile.stats) * 100) : 0;

  return (
    <Screen>
      <TopBar>
        <Brand>
          <img src="/images/atticus-logo.jpg" alt="Atticus" />
          <span>Atticus</span>
          <span className="lite">Lite</span>
        </Brand>
        <BalanceTag>${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</BalanceTag>
      </TopBar>

      <ScreenBody>
        {profile && (
          <ProfileCard>
            <Avatar src={profile.avatar} size={56} />
            <div className="meta">
              <span className="name">{profile.name}</span>
              <span className="bio">{profile.bio || 'Ready to trade.'}</span>
              <StatRow>
                <span>streak <span className="v">{profile.stats.streak}</span></span>
                <span>wins <span className="v">{profile.stats.wins}</span></span>
                <span>win% <span className="v">{wr}</span></span>
              </StatRow>
            </div>
          </ProfileCard>
        )}

        <Panel>
          <PanelHead>
            <span className="label">Wager (winner takes)</span>
            <span className="val">${wagerUSD}</span>
          </PanelHead>
          <Chips>
            {WAGER_CHIPS.map(v => (
              <Chip key={v} active={wagerUSD === v} onClick={() => setWager(v)}>${v}</Chip>
            ))}
          </Chips>
          <Stepper>
            <button onClick={() => setWager(wagerUSD - 1)} disabled={wagerUSD <= MIN_WAGER_USD}>−</button>
            <div style={{ flex: 1, textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
              ${wagerUSD} <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>/ max ${MAX_WAGER_USD}</span>
            </div>
            <button onClick={() => setWager(wagerUSD + 1)} disabled={wagerUSD >= MAX_WAGER_USD}>+</button>
          </Stepper>
        </Panel>

        <Panel>
          <PanelHead>
            <span className="label">Your trade size</span>
            <span className="val">${amountUSD}</span>
          </PanelHead>
          <Chips>
            {AMOUNT_CHIPS.map(v => (
              <Chip key={v} active={amountUSD === v} onClick={() => setAmount(v)}>${v}</Chip>
            ))}
          </Chips>
          <Stepper>
            <button onClick={() => setAmount(amountUSD - 1)} disabled={amountUSD <= MIN_AMOUNT_USD}>−</button>
            <div style={{ flex: 1, textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
              ${amountUSD} <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>/ max ${MAX_AMOUNT_USD}</span>
            </div>
            <button onClick={() => setAmount(amountUSD + 1)} disabled={amountUSD >= MAX_AMOUNT_USD}>+</button>
          </Stepper>
        </Panel>

        <div style={{ flex: 1 }} />

        <BigButton onClick={openSwipe}>Swipe to find an opponent</BigButton>
        <BigButton tone="ghost" onClick={startSolo}>Solo trade ($)</BigButton>
        <BigButton
          tone="ghost"
          onClick={() => { setDepositing(true); deposit(1000); setTimeout(() => setDepositing(false), 600); }}
        >
          {depositing ? 'Funds added ✓' : 'Deposit funds (demo +$1,000)'}
        </BigButton>
      </ScreenBody>
    </Screen>
  );
};
