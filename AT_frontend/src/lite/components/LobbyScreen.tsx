import React, { useState } from 'react';
import styled from 'styled-components';
import { useLiteSession } from '../state/LiteSessionProvider';
import {
  Screen, ScreenBody, TopBar, Logo, BalanceTag, BigButton, Avatar, StatRow,
} from './ui';
import {
  MAX_AMOUNT_USD, MAX_WAGER_USD, MIN_AMOUNT_USD, MIN_WAGER_USD,
} from '../services/matchEngine';
import { winRate } from '../services/profileService';
import { ProfileMenu } from './ProfileMenu';

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
  gap: 8px;
  .label { font-family: var(--font-display); font-weight: 700; font-size: 17px; color: var(--text); }
  .hint { font-size: 11px; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; color: var(--text-dim); text-align: right; }
`;

const ValueRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  .val {
    flex: 1;
    text-align: center;
    font-family: var(--font-display);
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    font-size: 36px;
    color: var(--accent);
    -webkit-text-stroke: 0.9px var(--border-strong);
  }
  button {
    appearance: none; cursor: pointer; width: 48px; height: 48px;
    border-radius: 14px; border: 2px solid var(--border-strong);
    background: var(--bg-elev-2); color: var(--text); font-size: 26px; font-weight: 700;
    box-shadow: 2px 2px 0 var(--border-strong);
  }
  button:active:not(:disabled) { transform: translate(2px,2px); box-shadow: none; }
  button:disabled { opacity: 0.35; cursor: not-allowed; box-shadow: none; }
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
  padding: 11px 4px;
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

const DepositLink = styled.button`
  appearance: none;
  cursor: pointer;
  background: transparent;
  border: none;
  color: var(--text-dim);
  font-family: var(--font-sans);
  font-weight: 700;
  font-size: 13px;
  text-decoration: underline;
  padding: 6px;
  align-self: center;
`;

const WAGER_CHIPS = [2, 10, 25, 50];
const AMOUNT_CHIPS = [5, 10, 25, 50];

export const LobbyScreen: React.FC = () => {
  const {
    profile, balance, wagerUSD, amountUSD, setWager, setAmount, deposit, openSwipe, startSolo, quickMatch,
  } = useLiteSession();
  const [depositing, setDepositing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const wr = profile ? Math.round(winRate(profile.stats) * 100) : 0;

  return (
    <Screen>
      <TopBar>
        <Logo src="/images/lite-logo.png" alt="bitMATCH" />
        <BalanceTag>${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</BalanceTag>
      </TopBar>

      <ScreenBody>
        {profile && (
          <ProfileCard
            role="button"
            tabIndex={0}
            onClick={() => setMenuOpen(true)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setMenuOpen(true); }}
            style={{ cursor: 'pointer' }}
            aria-label="Open profile and settings"
          >
            <Avatar src={profile.avatar} size={56} />
            <div className="meta">
              <span className="name">{profile.name} <span style={{ color: 'var(--text-dim)', fontWeight: 600, fontSize: 13 }}>⚙</span></span>
              <span className="bio">{profile.bio || 'Tap to edit profile & settings'}</span>
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
            <span className="label">Wager</span>
            <span className="hint">winner takes · max ${MAX_WAGER_USD}</span>
          </PanelHead>
          <ValueRow>
            <button onClick={() => setWager(wagerUSD - 1)} disabled={wagerUSD <= MIN_WAGER_USD}>−</button>
            <span className="val">${wagerUSD}</span>
            <button onClick={() => setWager(wagerUSD + 1)} disabled={wagerUSD >= MAX_WAGER_USD}>+</button>
          </ValueRow>
          <Chips>
            {WAGER_CHIPS.map(v => (
              <Chip key={v} active={wagerUSD === v} onClick={() => setWager(v)}>${v}</Chip>
            ))}
          </Chips>
        </Panel>

        <Panel>
          <PanelHead>
            <span className="label">Trade size</span>
            <span className="hint">your stake each round · max ${MAX_AMOUNT_USD}</span>
          </PanelHead>
          <ValueRow>
            <button onClick={() => setAmount(amountUSD - 1)} disabled={amountUSD <= MIN_AMOUNT_USD}>−</button>
            <span className="val">${amountUSD}</span>
            <button onClick={() => setAmount(amountUSD + 1)} disabled={amountUSD >= MAX_AMOUNT_USD}>+</button>
          </ValueRow>
          <Chips>
            {AMOUNT_CHIPS.map(v => (
              <Chip key={v} active={amountUSD === v} onClick={() => setAmount(v)}>${v}</Chip>
            ))}
          </Chips>
        </Panel>

        <div style={{ flex: 1, minHeight: 8 }} />

        <BigButton onClick={quickMatch}>Quick Match · live opponent</BigButton>
        <BigButton tone="ghost" onClick={openSwipe}>Browse opponents</BigButton>
        <BigButton tone="ghost" onClick={startSolo}>Solo practice</BigButton>
        <DepositLink
          onClick={() => { setDepositing(true); deposit(1000); setTimeout(() => setDepositing(false), 600); }}
        >
          {depositing ? 'Funds added ✓' : '+ Add demo funds'}
        </DepositLink>
      </ScreenBody>

      {menuOpen && <ProfileMenu onClose={() => setMenuOpen(false)} />}
    </Screen>
  );
};
