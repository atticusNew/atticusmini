import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import { Button, Card, Chip, Label, Stack } from '../ui/primitives';
import { pricingService, Tenor } from '../services/pricing/PricingService';
import { useBalance } from '../contexts/BalanceProvider';
import { useAuth } from '../contexts/AuthProvider';
import { geoFenceService } from '../services/geofence/GeoFenceService';
import { TradeReviewSheet } from './TradeReviewSheet';

export interface TradeFormProps {
  currentPrice: number;
  optionType: 'call' | 'put' | null;
  strikeOffset: number;
  isTradeActive: boolean;
  isTradeInProgress: boolean;
  isConnected: boolean;
  isDemoMode: boolean;
  onOptionTypeSelect: (t: 'call' | 'put') => void;
  onStrikeOffsetSelect: (offset: number) => void;
  onExpirySelect: (expiry: string) => void;
  onTradeStart: (
    contracts: number,
    override?: { optionType?: 'call' | 'put'; strikeOffset?: number; expiry?: string },
  ) => Promise<void>;
}

const STRIKE_OFFSETS = [5, 10, 25, 50, 100] as const;
const TENORS: Tenor[] = ['30s', '1m', '5m', '15m'];
const STAKE_PRESETS = [1, 5, 25, 100] as const;
const STAKE_MIN = 1;
const STAKE_MAX = 100;

const Container = styled(Card)`
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const ChipGrid4 = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
`;

const DirectionGroup = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
`;

const DirectionButton = styled.button<{ active?: boolean; tone: 'up' | 'down' }>`
  appearance: none;
  border: 1px solid ${p => (p.active ? (p.tone === 'up' ? 'var(--up)' : 'var(--down)') : 'var(--border)')};
  background: ${p =>
    p.active ? (p.tone === 'up' ? 'var(--up-dim)' : 'var(--down-dim)') : 'var(--bg-elev-2)'};
  color: ${p => (p.active ? (p.tone === 'up' ? 'var(--up)' : 'var(--down)') : 'var(--text-dim)')};
  border-radius: 12px;
  padding: 14px 16px;
  font-family: var(--font-sans);
  font-weight: 700;
  font-size: 16px;
  letter-spacing: 0.04em;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: 120ms ease-out;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  small {
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.08em;
    opacity: 0.7;
    text-transform: uppercase;
  }
`;

const StrikeChipInner = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
`;

const StrikeChip = styled.button<{ active?: boolean; tone: 'up' | 'down' }>`
  appearance: none;
  border: 1px solid ${p => (p.active ? (p.tone === 'up' ? 'var(--up)' : 'var(--down)') : 'var(--border)')};
  background: ${p => (p.active ? 'var(--bg-elev-2)' : 'transparent')};
  border-radius: 10px;
  padding: 8px 12px;
  cursor: pointer;
  color: var(--text);
  font-family: var(--font-sans);
  text-align: left;
  transition: 120ms ease-out;
  &:disabled { opacity: 0.45; cursor: not-allowed; }
  &:hover:not(:disabled) {
    border-color: ${p => (p.tone === 'up' ? 'var(--up)' : 'var(--down)')};
  }
  span.offset {
    font-weight: 700;
    font-size: 13px;
    color: ${p => (p.tone === 'up' ? 'var(--up)' : 'var(--down)')};
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
  }
  span.meta {
    font-size: 11px;
    color: var(--text-dim);
    letter-spacing: 0.02em;
  }
`;

const StakeRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const StakePresetGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-top: 8px;
`;

const StakeStepper = styled.div`
  display: inline-flex;
  align-items: center;
  background: var(--bg-elev-2);
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
`;

const StepperButton = styled.button`
  appearance: none;
  background: transparent;
  border: none;
  color: var(--text);
  width: 36px;
  height: 40px;
  font-size: 18px;
  cursor: pointer;
  &:hover:not(:disabled) { background: var(--border); }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const StakeValue = styled.div`
  min-width: 64px;
  text-align: center;
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  font-size: 16px;
  color: var(--text);
`;

const RiskRewardLine = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 12px 14px;
  background: var(--bg-elev-2);
  border: 1px solid var(--border);
  border-radius: 12px;

  .label { color: var(--text-dim); font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; }
  .pair { display: flex; align-items: baseline; gap: 8px; }
  .risk { color: var(--text-dim); font-family: var(--font-mono); }
  .arrow { color: var(--text-muted); }
  .win { color: var(--up); font-family: var(--font-mono); font-weight: 700; font-size: 18px; }
  .multiplier { color: var(--text-dim); font-family: var(--font-mono); font-size: 12px; margin-left: 4px; }
`;

const Cta = styled(Button).attrs({ variant: 'primary' as const, size: 'lg' as const })`
  width: 100%;
  padding: 16px;
  font-size: 17px;
  letter-spacing: 0.04em;
`;

const ContextLine = styled.div`
  font-family: var(--font-sans);
  font-size: 12px;
  color: var(--text-dim);
  text-align: center;
  span.strike { color: var(--text); font-family: var(--font-mono); }
`;

const ErrorLine = styled.div`
  color: var(--down);
  font-size: 12px;
  font-weight: 600;
  text-align: center;
`;

const formatUSD = (n: number): string =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const TradeForm: React.FC<TradeFormProps> = ({
  currentPrice,
  optionType,
  strikeOffset,
  isTradeActive,
  isTradeInProgress,
  isConnected,
  isDemoMode,
  onOptionTypeSelect,
  onStrikeOffsetSelect,
  onExpirySelect,
  onTradeStart,
}) => {
  const { user } = useAuth();
  const { userBalance } = useBalance();
  const [tenor, setTenor] = useState<Tenor>('1m');
  const [stake, setStake] = useState<number>(5);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  // No default direction: novice must explicitly pick UP or DOWN before
  // anything else lights up. `direction` is only used for tone/strike
  // chip math when `optionType` is set; otherwise the rest of the form
  // is gated by `directionPicked` below.
  const direction = optionType ?? 'call';
  const directionPicked = optionType != null;
  const tone: 'up' | 'down' = direction === 'call' ? 'up' : 'down';

  const tenorReady = !!tenor;
  const ready =
    directionPicked &&
    strikeOffset > 0 &&
    tenorReady &&
    stake >= STAKE_MIN &&
    stake <= STAKE_MAX &&
    (isDemoMode || isConnected) &&
    !isTradeActive &&
    !isTradeInProgress &&
    !submitting;

  const live = useMemo(() => {
    if (!optionType || !strikeOffset || !tenor || !currentPrice) return null;
    return pricingService.quote({
      optionType,
      spotUSD: currentPrice,
      strikeOffsetUSD: strikeOffset,
      tenor,
      contracts: stake,
    });
  }, [optionType, strikeOffset, tenor, currentPrice, stake]);

  const setStakeClamped = (n: number) => setStake(Math.min(STAKE_MAX, Math.max(STAKE_MIN, Math.round(n))));

  const openReview = () => {
    if (!ready) return;
    setErrorMsg(null);
    const geo = geoFenceService.evaluate((user as { countryCode?: string } | null)?.countryCode);
    if (!geo.allowed) {
      setErrorMsg('Trading not available in your region');
      return;
    }
    if (!isDemoMode && stake > userBalance) {
      setErrorMsg('Insufficient balance');
      return;
    }
    setReviewOpen(true);
  };

  const handleConfirm = async () => {
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await onTradeStart(stake, { optionType: direction, strikeOffset, expiry: tenor });
      setReviewOpen(false);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Trade failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDirection = (next: 'call' | 'put') => {
    onOptionTypeSelect(next);
  };

  const handleStrike = (offset: number) => {
    onStrikeOffsetSelect(offset);
  };

  const handleTenor = (t: Tenor) => {
    setTenor(t);
    onExpirySelect(t);
  };

  return (
    <Container>
      <Section>
        <Label>Direction</Label>
        <DirectionGroup>
          <DirectionButton
            type="button"
            tone="up"
            active={optionType === 'call'}
            disabled={isTradeActive || isTradeInProgress}
            onClick={() => handleDirection('call')}
          >
            ↑ UP <small>CALL</small>
          </DirectionButton>
          <DirectionButton
            type="button"
            tone="down"
            active={optionType === 'put'}
            disabled={isTradeActive || isTradeInProgress}
            onClick={() => handleDirection('put')}
          >
            ↓ DOWN <small>PUT</small>
          </DirectionButton>
        </DirectionGroup>
      </Section>

      <Section>
        <Label>Strike</Label>
        <Row>
          {STRIKE_OFFSETS.map(offset => {
            const q = optionType && currentPrice
              ? pricingService.quote({
                  optionType,
                  spotUSD: currentPrice,
                  strikeOffsetUSD: offset,
                  tenor,
                  contracts: stake,
                })
              : null;
            const probPct = q ? Math.round(q.digitalProb * 100) : null;
            const mult = q ? q.payoutMultiple : null;
            const sign = direction === 'call' ? '+' : '-';
            return (
              <StrikeChip
                type="button"
                key={offset}
                tone={tone}
                active={strikeOffset === offset}
                disabled={!optionType || isTradeActive || isTradeInProgress}
                onClick={() => handleStrike(offset)}
              >
                <StrikeChipInner>
                  <span className="offset">{sign}${offset}</span>
                  <span className="meta">
                    {probPct != null ? `${probPct}% likely · ${mult!.toFixed(2)}×` : 'pick UP or DOWN first'}
                  </span>
                </StrikeChipInner>
              </StrikeChip>
            );
          })}
        </Row>
      </Section>

      <Section>
        <Label>Tenor</Label>
        <ChipGrid4>
          {TENORS.map(t => (
            <Chip
              type="button"
              key={t}
              active={tenor === t}
              tone="accent"
              onClick={() => handleTenor(t)}
              disabled={isTradeActive || isTradeInProgress}
            >
              {t}
            </Chip>
          ))}
        </ChipGrid4>
      </Section>

      <Section>
        <Label>Stake</Label>
        <StakeRow>
          <StakeStepper>
            <StepperButton onClick={() => setStakeClamped(stake - 1)} disabled={stake <= STAKE_MIN}>−</StepperButton>
            <StakeValue>${stake}</StakeValue>
            <StepperButton onClick={() => setStakeClamped(stake + 1)} disabled={stake >= STAKE_MAX}>+</StepperButton>
          </StakeStepper>
        </StakeRow>
        <StakePresetGrid>
          {STAKE_PRESETS.map(p => (
            <Chip
              type="button"
              key={p}
              active={stake === p}
              onClick={() => setStakeClamped(p)}
              disabled={isTradeActive || isTradeInProgress}
            >
              ${p}
            </Chip>
          ))}
        </StakePresetGrid>
      </Section>

      <Stack gap={10}>
        {live && optionType && (
          <RiskRewardLine>
            <span className="label">Risk → Win</span>
            <span className="pair">
              <span className="risk">${formatUSD(live.premiumUSD.toNumber())}</span>
              <span className="arrow">→</span>
              <span className="win">${formatUSD(live.potentialPayoutUSD.toNumber())}</span>
              <span className="multiplier">{live.payoutMultiple.toFixed(2)}×</span>
            </span>
          </RiskRewardLine>
        )}

        {live && optionType && (
          <ContextLine>
            wins if BTC {direction === 'call' ? '≥' : '≤'}{' '}
            <span className="strike">${formatUSD(live.strikeUSD)}</span> in {tenor}
          </ContextLine>
        )}

        {errorMsg && <ErrorLine>{errorMsg}</ErrorLine>}

        <Cta
          type="button"
          disabled={!ready || !live}
          onClick={openReview}
        >
          {submitting
            ? 'Placing…'
            : isTradeActive
              ? 'Trade in progress'
              : !optionType
                ? 'Pick UP or DOWN to start'
                : !strikeOffset
                  ? 'Pick a target price'
                  : `Review · $${stake}`}
        </Cta>
      </Stack>

      <TradeReviewSheet
        open={reviewOpen && !!live && !!optionType}
        optionType={direction}
        tenor={tenor}
        stake={stake}
        spotUSD={currentPrice}
        quote={live}
        submitting={submitting}
        onConfirm={handleConfirm}
        onCancel={() => setReviewOpen(false)}
      />
    </Container>
  );
};

export default TradeForm;
