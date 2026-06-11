import React, { useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { useLiteSession } from '../state/LiteSessionProvider';
import { Avatar, Input, TextArea, BigButton } from './ui';
import { winRate } from '../services/profileService';
import { downscaleImage } from '../services/image';
import { loadSettings, saveSettings } from '../services/settings';

const APP_VERSION = '2.0.0';

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100;
  background: var(--overlay);
  display: flex;
  align-items: flex-end;
  justify-content: center;
`;

const slideUp = keyframes`from { transform: translateY(100%); } to { transform: translateY(0); }`;

const Sheet = styled.div`
  width: 100%;
  max-width: 480px;
  max-height: 92vh;
  overflow-y: auto;
  background: var(--bg);
  border-top-left-radius: 22px;
  border-top-right-radius: 22px;
  border: 2px solid var(--border-strong);
  border-bottom: none;
  box-shadow: 0 -8px 30px rgba(0,0,0,0.3);
  animation: ${slideUp} 220ms ease-out;
  padding: 14px 16px calc(24px + env(safe-area-inset-bottom));
`;

const Grabber = styled.div`
  width: 44px; height: 5px; border-radius: 999px;
  background: var(--border-strong); opacity: 0.5;
  margin: 0 auto 14px;
`;

const Head = styled.div`
  display: flex; align-items: center; gap: 12px; margin-bottom: 14px;
  .meta { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .name { font-family: var(--font-display); font-weight: 700; font-size: 19px; }
  .bio { color: var(--text-dim); font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
`;

const StatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 16px;
  .cell {
    background: var(--bg-elev); border: 2px solid var(--border-strong); border-radius: 12px;
    padding: 10px 4px; text-align: center;
  }
  .v { font-family: var(--font-mono); font-variant-numeric: tabular-nums; font-weight: 800; font-size: 18px; color: var(--text); }
  .k { font-size: 10px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--text-dim); margin-top: 2px; }
`;

const Section = styled.div`
  border-top: 1px solid var(--border);
  padding: 14px 0 4px;
  .title { font-family: var(--font-display); font-weight: 700; font-size: 14px; margin-bottom: 10px; }
`;

const Row = styled.div`
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 8px 0;
  .label { font-weight: 600; font-size: 14px; color: var(--text); }
  .desc { font-size: 12px; color: var(--text-dim); }
`;

const Toggle = styled.button<{ on: boolean }>`
  appearance: none; cursor: pointer; width: 50px; height: 28px; border-radius: 999px;
  border: 2px solid var(--border-strong);
  background: ${p => (p.on ? 'var(--up)' : 'var(--bg-elev-2)')};
  position: relative; flex-shrink: 0; transition: background 160ms ease;
  &::after {
    content: ''; position: absolute; top: 1px; left: ${p => (p.on ? '23px' : '1px')};
    width: 20px; height: 20px; border-radius: 50%; background: #fff; border: 1px solid var(--border-strong);
    transition: left 160ms ease;
  }
`;

const LinkBtn = styled.button`
  appearance: none; cursor: pointer; background: transparent; border: none;
  color: var(--text); font-family: var(--font-sans); font-weight: 700; font-size: 14px;
  padding: 10px 0; text-align: left; width: 100%;
  display: flex; align-items: center; justify-content: space-between;
  &.danger { color: var(--down); }
`;

const Note = styled.p`
  font-size: 12px; color: var(--text-dim); line-height: 1.5; margin: 4px 0 0;
`;

const SmallBtnRow = styled.div`
  display: flex; gap: 8px; margin-top: 10px;
  button { flex: 1; padding: 12px; font-size: 14px; }
`;

const formatUSD = (n: number): string =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type Panel = 'menu' | 'edit' | 'howto' | 'responsible';

export const ProfileMenu: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { profile, balance, updateProfile, resetBalance, signOut } = useLiteSession();
  const [panel, setPanel] = useState<Panel>('menu');
  const [name, setName] = useState(profile?.name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [avatar, setAvatar] = useState(profile?.avatar ?? '');
  const [hapticsOn, setHapticsOn] = useState(loadSettings().haptics);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!profile) return null;

  const wr = Math.round(winRate(profile.stats) * 100);

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    downscaleImage(file).then(setAvatar).catch(e2 => setErr(e2.message));
  };

  const saveEdit = () => {
    updateProfile({ name, bio, avatar });
    setPanel('menu');
  };

  const toggleHaptics = () => {
    const next = !hapticsOn;
    setHapticsOn(next);
    saveSettings({ ...loadSettings(), haptics: next });
  };

  return (
    <Overlay onClick={onClose}>
      <Sheet onClick={e => e.stopPropagation()} role="dialog" aria-label="Profile and settings">
        <Grabber />

        {panel === 'menu' && (
          <>
            <Head>
              <Avatar src={profile.avatar} size={56} />
              <div className="meta">
                <span className="name">{profile.name}</span>
                <span className="bio">{profile.bio || 'No bio yet'}</span>
              </div>
            </Head>

            <StatGrid>
              <div className="cell"><div className="v">${formatUSD(balance)}</div><div className="k">Balance</div></div>
              <div className="cell"><div className="v">{profile.stats.wins}</div><div className="k">Wins</div></div>
              <div className="cell"><div className="v">{profile.stats.losses}</div><div className="k">Losses</div></div>
              <div className="cell"><div className="v">{wr}%</div><div className="k">Win rate</div></div>
            </StatGrid>

            <Section>
              <div className="title">Account</div>
              <LinkBtn onClick={() => setPanel('edit')}>Edit profile <span>›</span></LinkBtn>
            </Section>

            <Section>
              <div className="title">Preferences</div>
              <Row>
                <div>
                  <div className="label">Haptics</div>
                  <div className="desc">Subtle vibration feedback</div>
                </div>
                <Toggle on={hapticsOn} onClick={toggleHaptics} aria-label="Toggle haptics" aria-pressed={hapticsOn} />
              </Row>
            </Section>

            <Section>
              <div className="title">Help</div>
              <LinkBtn onClick={() => setPanel('howto')}>How to play <span>›</span></LinkBtn>
              <LinkBtn onClick={() => setPanel('responsible')}>Responsible play <span>›</span></LinkBtn>
            </Section>

            <Section>
              <div className="title">Demo</div>
              <Note>This is paper money for demo play. Real deposits/withdrawals require identity verification (coming soon).</Note>
              <SmallBtnRow>
                <BigButton tone="ghost" onClick={resetBalance}>Reset balance</BigButton>
              </SmallBtnRow>
            </Section>

            <Section>
              <LinkBtn className="danger" onClick={signOut}>Sign out &amp; clear profile</LinkBtn>
              <Note>bitMATCH · v{APP_VERSION}</Note>
            </Section>

            <SmallBtnRow>
              <BigButton onClick={onClose}>Done</BigButton>
            </SmallBtnRow>
          </>
        )}

        {panel === 'edit' && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <button
                onClick={() => fileRef.current?.click()}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, alignSelf: 'center', color: 'var(--text-dim)', fontWeight: 700, fontSize: 12 }}
              >
                <Avatar src={avatar} size={96} />
                Change photo
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickFile} />
              </button>
              {err && <Note style={{ color: 'var(--down)', textAlign: 'center' }}>{err}</Note>}
              <Input value={name} maxLength={24} placeholder="Name" onChange={e => setName(e.target.value)} />
              <TextArea value={bio} maxLength={120} placeholder="Short bio" onChange={e => setBio(e.target.value)} />
              <SmallBtnRow>
                <BigButton tone="ghost" onClick={() => setPanel('menu')}>Cancel</BigButton>
                <BigButton onClick={saveEdit} disabled={name.trim().length < 2}>Save</BigButton>
              </SmallBtnRow>
            </div>
          </>
        )}

        {panel === 'howto' && (
          <>
            <div className="title" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, marginBottom: 10 }}>How to play</div>
            <Note>1. Set your wager and trade size in the lobby.</Note>
            <Note>2. Swipe to find an opponent (or play solo).</Note>
            <Note>3. You get 10 seconds to pick HIGH or LOW — that locks your entry on the live BTC price.</Note>
            <Note>4. Over the next 30 seconds, sell to lock your profit/loss or hold to expiry.</Note>
            <Note>5. Whoever profits the most wins the wager. Equal results are a push.</Note>
            <SmallBtnRow><BigButton onClick={() => setPanel('menu')}>Back</BigButton></SmallBtnRow>
          </>
        )}

        {panel === 'responsible' && (
          <>
            <div className="title" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, marginBottom: 10 }}>Responsible play</div>
            <Note>Trading and wagering involve risk of loss. Only ever stake what you can afford to lose.</Note>
            <Note>Set limits for yourself and take breaks. This demo uses paper money only.</Note>
            <Note>Real-money play requires identity verification (KYC/AML) and is unavailable where prohibited by law.</Note>
            <Note>If gambling stops being fun, step away and seek support.</Note>
            <SmallBtnRow><BigButton onClick={() => setPanel('menu')}>Back</BigButton></SmallBtnRow>
          </>
        )}
      </Sheet>
    </Overlay>
  );
};
