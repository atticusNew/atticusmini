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

/**
 * v3: strike picker is the offset only — `+$5 / +$10 / +$25 / +$50`
 * (signs flip to `−` when PUT is selected). Target price, distance
 * tag, and per-chip multiplier all moved off the chip; the trader
 * sees the trade economics in the Risk → Win line below as they tap.
 */
const STRIKE_OFFSETS = [5, 10, 25, 50] as const;
const TENORS: Tenor[] = ['30s', '1m', '5m', '15m'];
const STAKE_MIN = 1;
const STAKE_MAX = 100;

const Container = styled(Card)`
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
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
  border: 1.5px solid ${p =>
    p.active ? (p.tone === 'up' ? 'var(--up)' : 'var(--down)') : 'var(--border)'};
  background: ${p =>
    p.active ? (p.tone === 'up' ? 'var(--up-dim)' : 'var(--down-dim)') : 'var(--bg-elev-2)'};
  color: ${p => (p.active ? (p.tone === 'up' ? 'var(--up)' : 'var(--down)') : 'var(--text)')};
  border-radius: 14px;
  padding: 18px 16px;
  font-family: var(--font-sans);
  font-weight: 800;
  font-size: 18px;
  letter-spacing: 0.06em;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: 120ms ease-out;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  &:hover:not(:disabled) {
    border-color: ${p => (p.tone === 'up' ? 'var(--up)' : 'var(--down)')};
  }
`;

/**
 * v3: chip is just the signed offset (`+$5`, `−$10`). Active state is
 * an accent border + slightly elevated background so the chip reads at
 * a glance without color-coding direction redundantly with the
 * direction buttons above it.
 */
const StrikeChip = styled.button<{ active?: boolean }>`
  appearance: none;
  border: 1px solid ${p => (p.active ? 'var(--accent)' : 'var(--border)')};
  background: ${p => (p.active ? 'var(--bg-elev-2)' : 'transparent')};
  border-radius: 10px;
  padding: 10px 8px;
  cursor: pointer;
  color: var(--text);
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  font-size: 14px;
  text-align: center;
  letter-spacing: 0.02em;
  transition: 120ms ease-out;
  &:disabled { opacity: 0.45; cursor: not-allowed; }
  &:hover:not(:disabled) { border-color: var(--border-strong); }
`;

const StakeRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
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

/**
 * v3: Risk → Win is a single centered sentence — no card, no border.
 * The risk number is dim, the win number is the green emphasis.
 * Same data as the v2 panel, half the visual weight.
 */
const RiskWinLine = styled.div`
  font-family: var(--font-sans);
  font-size: 15px;
  font-weight: 600;
  text-align: center;
  color: var(--text-dim);
  padding: 4px 0;
  line-height: 1.3;

  .risk {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    color: var(--text);
    font-weight: 700;
  }
  .win {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    color: var(--up);
    font-weight: 800;
    font-size: 17px;
  }
`;

const Cta = styled(Button).attrs({ variant: 'primary' as const, size: 'lg' as const })`
  width: 100%;
  padding: 16px;
  font-size: 17px;
  letter-spacing: 0.04em;
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
        <DirectionGroup>
          <DirectionButton
            type="button"
            tone="up"
            active={optionType === 'call'}
            disabled={isTradeActive || isTradeInProgress}
            onClick={() => handleDirection('call')}
            aria-label="Bet that BTC will go up"
          >
            ▲ UP
          </DirectionButton>
          <DirectionButton
            type="button"
            tone="down"
            active={optionType === 'put'}
            disabled={isTradeActive || isTradeInProgress}
            onClick={() => handleDirection('put')}
            aria-label="Bet that BTC will go down"
          >
            ▼ DOWN
          </DirectionButton>
        </DirectionGroup>
      </Section>

      <Section>
        <Label>By how much</Label>
        <ChipGrid4>
          {STRIKE_OFFSETS.map(offset => {
            const sign = optionType === 'put' ? '−' : '+';
            return (
              <StrikeChip
                type="button"
                key={offset}
                active={strikeOffset === offset}
                disabled={!optionType || isTradeActive || isTradeInProgress}
                onClick={() => handleStrike(offset)}
              >
                {sign}${offset}
              </StrikeChip>
            );
          })}
        </ChipGrid4>
      </Section>

      <Section>
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
        <Label>How much</Label>
        <StakeRow>
          <StakeStepper>
            <StepperButton onClick={() => setStakeClamped(stake - 1)} disabled={stake <= STAKE_MIN}>−</StepperButton>
            <StakeValue>${stake}</StakeValue>
            <StepperButton onClick={() => setStakeClamped(stake + 1)} disabled={stake >= STAKE_MAX}>+</StepperButton>
          </StakeStepper>
        </StakeRow>
      </Section>

      <Stack gap={10}>
        {live && optionType && (
          <RiskWinLine aria-live="polite">
            Risk <span className="risk">${formatUSD(live.premiumUSD.toNumber())}</span>
            {' '}to win <span className="win">${formatUSD(live.potentialPayoutUSD.toNumber())}</span>
          </RiskWinLine>
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
