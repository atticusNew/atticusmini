import React, { useRef, useState } from 'react';
import styled from 'styled-components';
import { useLiteSession } from '../state/LiteSessionProvider';
import {
  Screen, ScreenBody, TopBar, Logo, Title, Sub, Field, Input, TextArea, BigButton, Avatar,
} from './ui';
import type { RegistrationMethod } from '../types';

const AvatarPicker = styled.button`
  appearance: none;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  align-self: center;
  color: var(--text-dim);
  font-size: 12px;
  font-weight: 700;
`;

const MethodRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`;

const MethodButton = styled.button<{ active: boolean }>`
  appearance: none;
  cursor: pointer;
  border-radius: 12px;
  padding: 13px;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 14px;
  background: ${p => (p.active ? 'var(--accent)' : 'var(--bg-elev)')};
  border: 2px solid var(--border-strong);
  color: var(--text);
  box-shadow: ${p => (p.active ? '2px 2px 0 var(--border-strong)' : 'none')};
  transition: 80ms ease-out;
  &:active { transform: translate(2px,2px); box-shadow: none; }
`;

const defaultAvatar = (seed: string): string => {
  const bg = ['#f5c344', '#1bc47d', '#5b8def', '#c77dff', '#ff5d6c'][seed.length % 5];
  const initials = (seed.trim()[0] ?? 'A').toUpperCase();
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'>` +
    `<rect width='240' height='240' fill='${bg}'/>` +
    `<text x='50%' y='52%' font-family='Inter,sans-serif' font-size='110' ` +
    `font-weight='700' fill='#0a0d12' text-anchor='middle' dominant-baseline='middle'>${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const OnboardingScreen: React.FC = () => {
  const { completeOnboarding } = useLiteSession();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [method, setMethod] = useState<RegistrationMethod>('app');
  const fileRef = useRef<HTMLInputElement>(null);

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatar(typeof reader.result === 'string' ? reader.result : null);
    reader.readAsDataURL(file);
  };

  const effectiveAvatar = avatar ?? defaultAvatar(name || 'A');
  const canSubmit = name.trim().length >= 2;

  return (
    <Screen>
      <TopBar>
        <Logo src="/images/lite-logo.png" alt="bitMATCH" />
      </TopBar>
      <ScreenBody>
        <div>
          <Title>Create your profile</Title>
          <Sub>A pic, a name, a one-liner. This is what opponents see when you show up in their deck.</Sub>
        </div>

        <AvatarPicker type="button" onClick={() => fileRef.current?.click()}>
          <Avatar src={effectiveAvatar} size={104} />
          <span>Tap to add a photo</span>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickFile} />
        </AvatarPicker>

        <Field>
          Name / handle
          <Input
            value={name}
            maxLength={24}
            placeholder="e.g. SatoshiSlim"
            onChange={e => setName(e.target.value)}
          />
        </Field>

        <Field>
          Short bio
          <TextArea
            value={bio}
            maxLength={120}
            placeholder="Trash talk welcome. (max 120 chars)"
            onChange={e => setBio(e.target.value)}
          />
        </Field>

        <Field>
          Register with
          <MethodRow>
            <MethodButton type="button" active={method === 'app'} onClick={() => setMethod('app')}>
              The app
            </MethodButton>
            <MethodButton type="button" active={method === 'third_party'} onClick={() => setMethod('third_party')}>
              Third party
            </MethodButton>
          </MethodRow>
        </Field>

        <Sub>
          KYC / AML onboarding is handled by your registration provider before
          you can deposit real funds.
        </Sub>

        <div style={{ flex: 1 }} />

        <BigButton
          disabled={!canSubmit}
          onClick={() =>
            completeOnboarding({
              name,
              bio,
              avatar: effectiveAvatar,
              registrationMethod: method,
            })
          }
        >
          {canSubmit ? 'Enter the arena →' : 'Add a name to continue'}
        </BigButton>
      </ScreenBody>
    </Screen>
  );
};
